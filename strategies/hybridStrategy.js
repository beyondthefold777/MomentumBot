const CONFIG = require("../config");

const {
    movingAverage,
    getDeviation,
    getTrendDirection
} = require("../utils/indicators");

// =========================
// STRATEGY ENGINE v4
// NO SCORING - PURE STRUCTURE
// =========================

function evaluateStrategy({
    price,
    history,
    position,
    regime,
    atr
}) {

    const movingAvg = movingAverage(history);

    const deviation = getDeviation(price, movingAvg);

    const trend = getTrendDirection(
        history,
        CONFIG.TREND_WINDOW
    );

    const atrPercent = (atr / price) * 100;

    // =========================
    // BASIC SAFETY FILTERS ONLY
    // =========================

    const isLowVol =
        atr < CONFIG.ATR_MIN;

    const isDeadMarket =
        Math.abs(deviation) < CONFIG.CHOP_ZONE;

    if (!position && isLowVol && isDeadMarket) {
        return {
            action: "HOLD",
            reason: "Low volatility chop",
            trend,
            deviation,
            regime
        };
    }

    // =========================
    // SCALP MODE
    // =========================

    if (regime === "SCALP") {

        // =========================
        // ENTRY RULE (simple)
        // =========================

        if (!position) {

            if (
                deviation <= CONFIG.SCALP_ENTRY
                || deviation <= -0.03
            ) {
                return {
                    action: "BUY",
                    reason: "Scalp dip entry",
                    trend,
                    deviation,
                    regime,
                    atr
                };
            }

            return {
                action: "HOLD",
                reason: "No scalp setup",
                trend,
                deviation,
                regime
            };
        }

        // =========================
        // POSITION MANAGEMENT
        // =========================

        const pnl =
            ((price - position.entryPrice) / position.entryPrice) * 100;

        // =========================
        // FIXED EXIT SYSTEM
        // =========================

        const stopLoss = -(atrPercent * CONFIG.ATR_SCALP_SL);
        const takeProfit = atrPercent * CONFIG.ATR_SCALP_TP;

        // 🚨 BREAKEVEN LOGIC
        if (pnl > 0.5) {
            position.stopLossMovedToBE = true;
        }

        if (position.stopLossMovedToBE && pnl <= 0) {
            return {
                action: "SELL",
                reason: "Breakeven stop hit",
                pnl,
                regime
            };
        }

        // STOP LOSS
        if (pnl <= stopLoss) {
            return {
                action: "SELL",
                reason: "ATR stop loss",
                pnl,
                regime
            };
        }

        // TAKE PROFIT
        if (pnl >= takeProfit) {
            return {
                action: "SELL",
                reason: "ATR take profit",
                pnl,
                regime
            };
        }

        return {
            action: "HOLD",
            reason: "Managing scalp position",
            pnl,
            regime
        };
    }

    // =========================
    // TREND MODE
    // =========================

    if (regime === "TREND") {

        const trendStrong =
            Math.abs(deviation) > CONFIG.TREND_STRENGTH_MIN;

        // =========================
        // ENTRY RULE
        // =========================

        if (!position) {

            if (
                trend === "UPTREND" &&
                trendStrong
            ) {
                return {
                    action: "BUY",
                    reason: "Trend entry",
                    trend,
                    deviation,
                    regime,
                    atr
                };
            }

            return {
                action: "HOLD",
                reason: "No trend setup",
                trend,
                deviation,
                regime
            };
        }

        // =========================
        // POSITION MANAGEMENT
        // =========================

        const pnl =
            ((price - position.entryPrice) / position.entryPrice) * 100;

        const stopLoss = -(atrPercent * CONFIG.ATR_TREND_SL);
        const takeProfit = atrPercent * CONFIG.ATR_TREND_TP;

        // 🚨 BREAKEVEN LOGIC
        if (pnl > 1) {
            position.stopLossMovedToBE = true;
        }

        if (position.stopLossMovedToBE && pnl <= 0) {
            return {
                action: "SELL",
                reason: "Trend breakeven stop",
                pnl,
                regime
            };
        }

        if (pnl <= stopLoss) {
            return {
                action: "SELL",
                reason: "Trend stop loss",
                pnl,
                regime
            };
        }

        if (pnl >= takeProfit) {
            return {
                action: "SELL",
                reason: "Trend take profit",
                pnl,
                regime
            };
        }

        return {
            action: "HOLD",
            reason: "Holding trend position",
            pnl,
            regime
        };
    }

    // =========================
    // DEFAULT
    // =========================

    return {
        action: "HOLD",
        reason: "No setup",
        trend,
        deviation,
        regime
    };
}

module.exports = {
    evaluateStrategy
};