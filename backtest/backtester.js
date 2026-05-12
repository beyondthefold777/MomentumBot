const CONFIG = require("../config");

const { evaluateStrategy } = require("../strategies/hybridStrategy");
const { getMarketRegime } = require("../utils/marketRegime");
const { getATR } = require("../utils/indicators");

// Simulated portfolio
let balance = 1000;
let position = null;
let trades = [];

function runBacktest(priceHistory) {

    console.log("🚀 Starting Backtest...\n");

    for (let i = CONFIG.WINDOW; i < priceHistory.length; i++) {

        const window = priceHistory.slice(0, i);
        const price = window[window.length - 1];

        const regime = getMarketRegime(window);
        const atr = getATR(window);
        const positionState = position;

        const signal = evaluateStrategy({
            price,
            history: window,
            position: positionState,
            regime,
            atr
        });

        // =========================
        // BUY
        // =========================
        if (signal.action === "BUY" && !position) {

            position = {
                entryPrice: price,
                size: 250,
                entryIndex: i
            };

            console.log(`🟢 BUY @ ${price}`);
        }

        // =========================
        // SELL
        // =========================
        if (signal.action === "SELL" && position) {

            const pnl =
                ((price - position.entryPrice) / position.entryPrice) * position.size;

            balance += position.size + pnl;

            trades.push({
                entry: position.entryPrice,
                exit: price,
                pnl
            });

            console.log(`🔴 SELL @ ${price} | PnL: ${pnl.toFixed(2)}`);

            position = null;
        }
    }

    // =========================
    // RESULTS
    // =========================

    const wins = trades.filter(t => t.pnl > 0).length;
    const losses = trades.filter(t => t.pnl <= 0).length;
    const totalPnL = trades.reduce((a, t) => a + t.pnl, 0);

    console.log("\n=========================");
    console.log("📊 BACKTEST RESULTS");
    console.log(`Trades: ${trades.length}`);
    console.log(`Wins: ${wins}`);
    console.log(`Losses: ${losses}`);
    console.log(`Win Rate: ${((wins / trades.length) * 100).toFixed(2)}%`);
    console.log(`Total PnL: $${totalPnL.toFixed(2)}`);
    console.log(`Final Balance: $${balance.toFixed(2)}`);
    console.log("=========================\n");
}

module.exports = { runBacktest };