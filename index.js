require("dotenv").config();

const CONFIG = require("./config");

const { getPrice } = require("./services/priceService");

const {
    executeTrade,
    getBalance,
    getTradeHistory
} = require("./services/tradeService");

const {
    evaluateStrategy
} = require("./strategies/hybridStrategy");

const {
    getPosition,
    updatePosition,
    clearPosition
} = require("./state/positionManager");

// =========================
// PRICE HISTORY
// =========================

let priceHistory = [];

// =========================
// MAIN BOT LOOP
// =========================

async function runBot() {

    const price = await getPrice();

    if (!price) {
        console.log("❌ Failed to fetch price");
        return;
    }

    // =========================
    // STORE PRICE HISTORY
    // =========================

    priceHistory.push(price);

    // Keep rolling window size
    if (priceHistory.length > CONFIG.WINDOW) {
        priceHistory.shift();
    }

    // Wait until enough data collected
    if (priceHistory.length < CONFIG.WINDOW) {

        console.log(
            `📊 Collecting data... (${priceHistory.length}/${CONFIG.WINDOW})`
        );

        return;
    }

    // =========================
    // GET CURRENT POSITION
    // =========================

    const position = getPosition();

    // =========================
    // EVALUATE STRATEGY
    // =========================

    const signal = evaluateStrategy({
        price,
        history: priceHistory,
        position
    });

    // =========================
    // DISPLAY SIGNAL INFO
    // =========================

    console.log("\n=========================");
    console.log(`💰 BTC Price: ${price}`);
    console.log(`📈 Signal: ${signal.action}`);
    console.log(`🧠 Reason: ${signal.reason}`);
    console.log(`📊 Trend: ${signal.trend}`);
    console.log(`📉 Deviation: ${signal.deviation.toFixed(2)}%`);

    // =========================
    // BUY LOGIC
    // =========================

    if (
        signal.action === "BUY" &&
        !position
    ) {

        await executeTrade(
            "BUY",
            price
        );

        updatePosition({
            entryPrice: price,
            entryTime: Date.now(),
            side: "LONG"
        });

        console.log(
            `💵 Balance: $${getBalance().toFixed(2)}`
        );
    }

    // =========================
    // SELL LOGIC
    // =========================

    if (
        signal.action === "SELL" &&
        position
    ) {

        await executeTrade(
            "SELL",
            price
        );

        clearPosition();

        console.log(
            `💵 Balance: $${getBalance().toFixed(2)}`
        );
    }

    // =========================
    // ACTIVE POSITION DISPLAY
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
    }

    // =========================
    // LIVE STATS
    // =========================

    const trades = getTradeHistory();

    const completedTrades =
        trades.filter(
            trade => trade.type === "SELL"
        );

    const wins =
        completedTrades.filter(
            trade => parseFloat(trade.pnlUsd) > 0
        ).length;

    const losses =
        completedTrades.filter(
            trade => parseFloat(trade.pnlUsd) <= 0
        ).length;

    console.log("\n📊 LIVE STATS");
    console.log(`Trades: ${completedTrades.length}`);
    console.log(`Wins: ${wins}`);
    console.log(`Losses: ${losses}`);
    console.log(
        `Balance: $${getBalance().toFixed(2)}`
    );

    console.log("=========================\n");
}

// =========================
// START BOT
// =========================

console.log(
    "🚀 Hybrid Momentum BTC Bot Started...\n"
);

setInterval(
    runBot,
    CONFIG.INTERVAL
);