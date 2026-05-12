const FEE_RATE = 0.001; // 0.1%
const SLIPPAGE = 0.0005;

let balance = 1000;
let position = null;
let trades = [];

// =========================
// GETTERS
// =========================

function getBalance() {
    return balance;
}

function getPosition() {
    return position;
}

function getTrades() {
    return trades;
}

// =========================
// BUY
// =========================

function buy(price, size, meta = {}) {

    const fillPrice = price * (1 + SLIPPAGE);
    const fee = size * FEE_RATE;

    balance -= (size + fee);

    position = {
        entryPrice: fillPrice,
        size,
        entryTime: meta.time || Date.now(),

        regime: meta.regime || "UNKNOWN",
        atr: meta.atr || 0,
        score: meta.score || 0
    };

    trades.push({
        type: "BUY",
        price: fillPrice,
        size,
        fee,
        regime: position.regime,
        atr: position.atr,
        score: position.score,
        entryTime: position.entryTime
    });
}

// =========================
// SELL
// =========================

function sell(price, meta = {}) {

    if (!position) return;

    const fillPrice = price * (1 - SLIPPAGE);

    const priceChange =
        (fillPrice - position.entryPrice) / position.entryPrice;

    let pnl = position.size * priceChange;

    const fee = position.size * FEE_RATE;
    pnl -= fee;

    balance += position.size + pnl;

    const duration =
        (Date.now() - position.entryTime) / 60000;

    const trade = {
        type: "SELL",
        price: fillPrice,

        // 🔥 CRITICAL FIX: unified field
        pnlUsd: pnl,
        pnlPct: priceChange * 100,

        fee,
        durationMinutes: duration,

        regime: position.regime,
        atr: position.atr,
        score: position.score,

        entryPrice: position.entryPrice,
        entryTime: position.entryTime,

        timestamp: Date.now()
    };

    trades.push(trade);

    position = null;
}

// =========================
// EXPORTS
// =========================

module.exports = {
    buy,
    sell,
    getBalance,
    getPosition,
    getTrades
};