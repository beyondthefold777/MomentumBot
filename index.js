require("dotenv").config();

const CONFIG = require("./config");

const { getPrice } = require("./services/priceService");

const {
    executeTrade,
    getBalance,
    getTradeHistory,
    getPosition
} = require("./services/tradeService");

const {
    evaluateStrategy
} = require("./strategies/hybridStrategy");

const {
    getMarketRegime
} = require("./utils/marketRegime");

const {
    getATR
} = require("./utils/indicators");

// =========================
// PRICE HISTORY
// =========================

let priceHistory = [];

// =========================
// PERFORMANCE TRACKING
// =========================

let startBalance = getBalance();

// =========================
// MAIN BOT LOOP
// =========================

async function runBot() {

    const price = await getPrice();

    if (!price) {
        console.log("❌ Failed to fetch BTC price");
        return;
    }

    // =========================
    // STORE PRICE HISTORY
    // =========================

    priceHistory.push(price);

    if (priceHistory.length > CONFIG.WINDOW) {
        priceHistory.shift();
    }

    // =========================
    // WAIT FOR ENOUGH DATA
    // =========================

    if (priceHistory.length < CONFIG.WINDOW) {

        console.log(
            `📊 Collecting data... (${priceHistory.length}/${CONFIG.WINDOW})`
        );

        return;
    }

    // =========================
    // MARKET REGIME
    // =========================

    const regime = getMarketRegime(priceHistory);

    // =========================
    // ATR VOLATILITY ENGINE
    // =========================

    const atr = getATR(priceHistory);

    // =========================
    // CURRENT POSITION
    // =========================

    const position = getPosition();

    // =========================
    // STRATEGY SIGNAL
    // =========================

    const signal = evaluateStrategy({
        price,
        history: priceHistory,
        position,
        regime,
        atr
    });

    // =========================
    // DISPLAY INFO
    // =========================

    console.log("\n=========================");
    console.log(`💰 BTC Price: ${price}`);
    console.log(`🧭 Mode: ${regime}`);
    console.log(`📊 ATR: ${atr.toFixed(2)}`);
    console.log(`📈 Signal: ${signal.action}`);
    console.log(`🧠 Reason: ${signal.reason}`);
    console.log(`📊 Trend: ${signal.trend}`);
    console.log(`📉 Deviation: ${signal.deviation.toFixed(2)}%`);

    // =========================
    // BUY LOGIC
    // =========================

    if (signal.action === "BUY" && !position) {

        await executeTrade(
            "BUY",
            price,
            { regime, atr }
        );

        console.log(
            `💵 Balance: $${getBalance().toFixed(2)}`
        );
    }

    // =========================
    // SELL LOGIC
    // =========================

    if (signal.action === "SELL" && position) {

        await executeTrade(
            "SELL",
            price
        );

        console.log(
            `💵 Balance: $${getBalance().toFixed(2)}`
        );
    }

    // =========================
    // ACTIVE POSITION
    // =========================

    const activePosition = getPosition();

    if (activePosition) {

        const pnl =
            (
                (price - activePosition.entryPrice)
                / activePosition.entryPrice
            ) * 100;

        console.log(
            `🟢 Open Position | Entry: ${activePosition.entryPrice} | PnL: ${pnl.toFixed(2)}%`
        );

        console.log(
            `⚡ Position Regime: ${activePosition.regime}`
        );
    }

    // =========================
    // LIVE STATS
    // =========================

    const trades = getTradeHistory();

    const completedTrades =
        trades.filter(t => t.type === "SELL");

    const wins =
        completedTrades.filter(
            t => parseFloat(t.pnlUsd) > 0
        ).length;

    const losses =
        completedTrades.filter(
            t => parseFloat(t.pnlUsd) <= 0
        ).length;

    const totalPnL =
        completedTrades.reduce(
            (acc, t) => acc + parseFloat(t.pnlUsd),
            0
        );

    const balance = getBalance();
    const roi = ((balance - startBalance) / startBalance) * 100;

    console.log("\n📊 LIVE STATS");
    console.log(`Trades: ${completedTrades.length}`);
    console.log(`Wins: ${wins}`);
    console.log(`Losses: ${losses}`);

    console.log(
        `Win Rate: ${
            completedTrades.length > 0
                ? ((wins / completedTrades.length) * 100).toFixed(2)
                : 0
        }%`
    );

    console.log(`Total PnL: $${totalPnL.toFixed(2)}`);
    console.log(`ROI: ${roi.toFixed(2)}%`);
    console.log(`Balance: $${balance.toFixed(2)}`);

    console.log("=========================\n");
}

// =========================
// START BOT
// =========================

console.log(
    "🚀 Hybrid Momentum + ATR Scalp BTC Bot Started...\n"
);

setInterval(runBot, CONFIG.INTERVAL);