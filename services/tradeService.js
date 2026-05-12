const CONFIG = require("../config");
const { recordTrade } = require("../utils/adaptiveEngine");

// =========================
// SIMULATED EXCHANGE FEES
// =========================

const FEE_RATE = 0.001; // 0.1%

// =========================
// PORTFOLIO STATE
// =========================

let cash = 1000;
let position = null;
let tradeHistory = [];

// =========================
// GETTERS
// =========================

function getBalance() {
    return cash;
}

function getPosition() {
    return position;
}

function getTradeHistory() {
    return tradeHistory;
}

// =========================
// EXECUTE TRADE ENGINE
// =========================

async function executeTrade(action, price, metadata = {}) {

    // =========================
    // BUY
    // =========================
    if (action === "BUY" && !position) {

        const size = CONFIG.TRADE_SIZE_USD;
        const fee = size * FEE_RATE;

        if (cash < size + fee) {
            console.log("❌ Not enough cash");
            return null;
        }

        cash -= (size + fee);

        position = {
            entryPrice: price,
            size,
            feePaid: fee,
            entryTime: Date.now(),

            regime: metadata.regime || "UNKNOWN",
            atr: metadata.atr || 0,
            score: metadata.score || 0
        };

        const trade = {
            id: Date.now(),
            type: "BUY",
            price,
            size,
            fee,

            regime: position.regime,
            atr: position.atr,
            score: position.score,

            timestamp: Date.now()
        };

        tradeHistory.push(trade);

        console.log("🟢 BUY TRADE:", trade);

        console.log(
            `🟢 BUY | ${price} | $${size} | Fee: ${fee.toFixed(2)} | Score: ${position.score}`
        );

        return trade;
    }

    // =========================
    // SELL
    // =========================
    if (action === "SELL" && position) {

        const entry = position.entryPrice;
        const size = position.size;

        const priceChange = (price - entry) / entry;
        let pnl = size * priceChange;

        const fee = size * FEE_RATE;
        pnl -= fee;

        cash += size + pnl;

        const duration =
            (Date.now() - position.entryTime) / 60000;

        // =========================
        // CLEAN TRADE OBJECT (CRITICAL FIX)
        // =========================
        const trade = {
            id: Date.now(),
            type: "SELL",
            price,

            pnlUsd: pnl,
            pnlPercent: priceChange * 100,

            fee,
            durationMinutes: duration,

            regime: position.regime,
            atr: position.atr,
            score: position.score,

            entryPrice: entry,
            timestamp: Date.now()
        };

        tradeHistory.push(trade);

        // =========================
        // FEED LEARNING SYSTEM
        // =========================

        recordTrade({
            pnlUsd: pnl,
            regime: position.regime
        });

        console.log("🔴 SELL TRADE:", trade);

        console.log(
            `🔴 SELL | ${price} | PnL: $${pnl.toFixed(2)} (${(priceChange * 100).toFixed(2)}%)`
        );

        console.log(
            `⏱ Duration: ${duration.toFixed(2)} min`
        );

        position = null;

        return trade;
    }

    return null;
}

// =========================
// EXPORTS
// =========================

module.exports = {
    executeTrade,
    getBalance,
    getPosition,
    getTradeHistory
};