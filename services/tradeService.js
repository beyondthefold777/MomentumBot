const CONFIG = require("../config");

let balance = 1000;

let currentPosition = null;

let tradeHistory = [];

// =========================
// GETTERS
// =========================

function getBalance() {
    return balance;
}

function getPosition() {
    return currentPosition;
}

function getTradeHistory() {
    return tradeHistory;
}

// =========================
// BUY / SELL EXECUTION
// =========================

async function executeTrade(action, price) {

    // =========================
    // BUY
    // =========================

    if (
        action === "BUY" &&
        !currentPosition
    ) {

        const tradeSize = CONFIG.TRADE_SIZE_USD;

        currentPosition = {
            entryPrice: price,
            size: tradeSize,
            entryTime: Date.now()
        };

        balance -= tradeSize;

        const trade = {
            type: "BUY",
            price,
            size: tradeSize,
            timestamp: Date.now()
        };

        tradeHistory.push(trade);

        console.log(
            `🟢 PAPER BUY | BTC: ${price} | Size: $${tradeSize}`
        );

        return trade;
    }

    // =========================
    // SELL
    // =========================

    if (
        action === "SELL" &&
        currentPosition
    ) {

        const entryPrice = currentPosition.entryPrice;

        const pnlPercent =
            ((price - entryPrice) / entryPrice);

        const pnlUsd =
            currentPosition.size * pnlPercent;

        balance += currentPosition.size + pnlUsd;

        const trade = {
            type: "SELL",
            price,
            pnlUsd: pnlUsd.toFixed(2),
            pnlPercent: (pnlPercent * 100).toFixed(2),
            timestamp: Date.now()
        };

        tradeHistory.push(trade);

        console.log(
            `🔴 PAPER SELL | BTC: ${price} | PnL: $${pnlUsd.toFixed(2)} (${(pnlPercent * 100).toFixed(2)}%)`
        );

        currentPosition = null;

        return trade;
    }

    return null;
}

module.exports = {
    executeTrade,
    getBalance,
    getPosition,
    getTradeHistory
};