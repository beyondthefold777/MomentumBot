require("dotenv").config();

const CONFIG = require("../config");

const { fetchOHLCV } = require("./data");

const {
    buy,
    sell,
    getBalance,
    getPosition,
    getTrades
} = require("./broker");

const {
    calculateStats
} = require("./metrics");

const {
    evaluateStrategy
} = require("../strategies/hybridStrategy");

const {
    getMarketRegime
} = require("../utils/marketRegime");

const {
    getATR
} = require("../utils/indicators");

// =========================
// BACKTEST ENGINE v2
// ADVANCED ANALYTICS
// =========================

async function runBacktest() {

    console.log("🚀 Starting Backtest...\n");

    const candles = await fetchOHLCV();

    let priceHistory = [];

    // =========================
    // EQUITY TRACKING
    // =========================

    let equityCurve = [];

    let peakBalance =
        getBalance();

    let maxDrawdown = 0;

    // =========================
    // MAIN LOOP
    // =========================

    for (let i = 0; i < candles.length; i++) {

        const candle = candles[i];

        const price = candle.close;

        // =========================
        // STORE PRICE HISTORY
        // =========================

        priceHistory.push(price);

        if (priceHistory.length > CONFIG.WINDOW) {
            priceHistory.shift();
        }

        // wait for enough data
        if (priceHistory.length < CONFIG.WINDOW) {
            continue;
        }

        // =========================
        // MARKET CONDITIONS
        // =========================

        const regime =
            getMarketRegime(priceHistory);

        const atr =
            getATR(priceHistory);

        const position =
            getPosition();

        // =========================
        // STRATEGY SIGNAL
        // =========================

        const signal =
            evaluateStrategy({
                price,
                history: priceHistory,
                position,
                regime,
                atr
            });

        // =========================
        // BUY
        // =========================

        if (
            signal.action === "BUY" &&
            !position
        ) {

            buy(
                price,
                CONFIG.TRADE_SIZE_USD,
                {
                    regime,
                    atr,
                    score: signal.score,
                    time: candle.time
                }
            );
        }

        // =========================
        // SELL
        // =========================

        if (
            signal.action === "SELL" &&
            position
        ) {

            sell(
                price,
                {
                    regime,
                    atr,
                    score: signal.score,
                    time: candle.time
                }
            );
        }

        // =========================
        // EQUITY CURVE
        // =========================

        const balance =
            getBalance();

        equityCurve.push(balance);

        // =========================
        // MAX DRAWDOWN
        // =========================

        if (balance > peakBalance) {
            peakBalance = balance;
        }

        const drawdown =
            (
                (peakBalance - balance)
                / peakBalance
            ) * 100;

        if (drawdown > maxDrawdown) {
            maxDrawdown = drawdown;
        }
    }

    // =========================
    // FINAL STATS
    // =========================

    const trades =
        getTrades();

    const stats =
        calculateStats(
            trades,
            getBalance()
        );

    // =========================
    // ADVANCED METRICS
    // =========================

    const completedTrades =
        trades.filter(
            t => t.type === "SELL"
        );

    const winningTrades =
        completedTrades.filter(
            t => parseFloat(t.pnlUsd) > 0
        );

    const losingTrades =
        completedTrades.filter(
            t => parseFloat(t.pnlUsd) <= 0
        );

    // =========================
    // AVG WINNER
    // =========================

    const avgWinner =
        winningTrades.length > 0
            ? (
                winningTrades.reduce(
                    (acc, t) =>
                        acc + parseFloat(t.pnlUsd),
                    0
                ) / winningTrades.length
            ).toFixed(2)
            : 0;

    // =========================
    // AVG LOSER
    // =========================

    const avgLoser =
        losingTrades.length > 0
            ? (
                losingTrades.reduce(
                    (acc, t) =>
                        acc + Math.abs(parseFloat(t.pnlUsd)),
                    0
                ) / losingTrades.length
            ).toFixed(2)
            : 0;

    // =========================
    // PROFIT FACTOR
    // =========================

    const grossProfit =
        winningTrades.reduce(
            (acc, t) =>
                acc + parseFloat(t.pnlUsd),
            0
        );

    const grossLoss =
        losingTrades.reduce(
            (acc, t) =>
                acc + Math.abs(parseFloat(t.pnlUsd)),
            0
        );

    const profitFactor =
        grossLoss > 0
            ? (
                grossProfit / grossLoss
            ).toFixed(2)
            : 0;

    // =========================
    // EXPECTANCY
    // =========================

    const expectancy =
        completedTrades.length > 0
            ? (
                stats.totalPnL
                / completedTrades.length
            ).toFixed(2)
            : 0;

    // =========================
    // AVG TRADE DURATION
    // =========================

    const avgDuration =
        completedTrades.length > 0
            ? (
                completedTrades.reduce(
                    (acc, t) =>
                        acc + (
                            parseFloat(
                                t.durationMinutes || 0
                            )
                        ),
                    0
                ) / completedTrades.length
            ).toFixed(2)
            : 0;

    // =========================
    // REGIME ANALYSIS
    // =========================

    const scalpTrades =
        completedTrades.filter(
            t => t.regime === "SCALP"
        );

    const trendTrades =
        completedTrades.filter(
            t => t.regime === "TREND"
        );

    // =========================
    // RESULTS
    // =========================

    console.log("\n=========================");
    console.log("📊 BACKTEST RESULTS");

    console.log(
        `Trades: ${stats.trades}`
    );

    console.log(
        `Wins: ${stats.wins}`
    );

    console.log(
        `Losses: ${stats.losses}`
    );

    console.log(
        `Win Rate: ${stats.winRate}%`
    );

    console.log(
        `Total PnL: $${stats.totalPnL}`
    );

    console.log(
        `Final Balance: $${stats.finalBalance}`
    );

    console.log(
        `Max Drawdown: ${maxDrawdown.toFixed(2)}%`
    );

    console.log(
        `Profit Factor: ${profitFactor}`
    );

    console.log(
        `Expectancy Per Trade: $${expectancy}`
    );

    console.log(
        `Average Winner: $${avgWinner}`
    );

    console.log(
        `Average Loser: -$${avgLoser}`
    );

    console.log(
        `Average Trade Duration: ${avgDuration} min`
    );

    console.log(
        `SCALP Trades: ${scalpTrades.length}`
    );

    console.log(
        `TREND Trades: ${trendTrades.length}`
    );

    console.log("\n📌 Open Position:");
    console.log(getPosition());

    console.log("=========================");
}

runBacktest();