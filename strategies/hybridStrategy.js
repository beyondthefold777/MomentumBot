const CONFIG = require("../config");

const {
    movingAverage,
    getDeviation,
    getTrendDirection
} = require("../utils/indicators");

function evaluateStrategy({ price, history, position }) {

    const movingAvg = movingAverage(history);

    const deviation = getDeviation(price, movingAvg);

    const trend = getTrendDirection(
        history,
        CONFIG.TREND_WINDOW
    );

    // =========================
    // BUY LOGIC
    // =========================

    if (!position) {

        // Only buy in uptrend
        if (
            trend === "UPTREND" &&
            deviation <= CONFIG.BUY_THRESHOLD
        ) {

            return {
                action: "BUY",
                reason: "Pullback in uptrend",
                trend,
                deviation
            };
        }

        return {
            action: "HOLD",
            reason: "No valid buy setup",
            trend,
            deviation
        };
    }

    // =========================
    // POSITION MANAGEMENT
    // =========================

    const entryPrice = position.entryPrice;

    const pnlPercent =
        ((price - entryPrice) / entryPrice) * 100;

    // Take profit
    if (
        deviation >= CONFIG.SELL_THRESHOLD
    ) {

        return {
            action: "SELL",
            reason: "Take profit hit",
            trend,
            deviation,
            pnlPercent
        };
    }

    // Stop loss
    if (
        pnlPercent <= -CONFIG.STOP_LOSS_PERCENT
    ) {

        return {
            action: "SELL",
            reason: "Stop loss hit",
            trend,
            deviation,
            pnlPercent
        };
    }

    return {
        action: "HOLD",
        reason: "Managing open position",
        trend,
        deviation,
        pnlPercent
    };
}

module.exports = {
    evaluateStrategy
};