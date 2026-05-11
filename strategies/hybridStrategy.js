const CONFIG = require("../config");

const {
    movingAverage,
    getDeviation,
    getTrendDirection
} = require("../utils/indicators");

// =========================
// STRATEGY ENGINE (SCALP + TREND)
// =========================

function evaluateStrategy({
    price,
    history,
    position,
    regime
}) {

    const movingAvg = movingAverage(history);

    const deviation = getDeviation(price, movingAvg);

    const trend = getTrendDirection(
        history,
        CONFIG.TREND_WINDOW
    );

    // =========================
    // SCALP MODE
    // =========================

    if (regime === "SCALP") {

        // 🚀 QUICK ENTRY ON MICRO DIPS
        if (!position) {

            if (deviation <= CONFIG.SCALP_BUY_THRESHOLD) {

                return {
                    action: "BUY",
                    reason: "Scalp dip entry",
                    trend,
                    deviation,
                    regime
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

        // 💰 QUICK EXIT (small targets)
        const entryPrice = position.entryPrice;

        const pnlPercent =
            ((price - entryPrice) / entryPrice) * 100;

        // Take quick profit
        if (pnlPercent >= CONFIG.SCALP_TAKE_PROFIT) {

            return {
                action: "SELL",
                reason: "Scalp take profit",
                trend,
                deviation,
                pnlPercent,
                regime
            };
        }

        // Tight stop loss
        if (pnlPercent <= -CONFIG.SCALP_STOP_LOSS) {

            return {
                action: "SELL",
                reason: "Scalp stop loss",
                trend,
                deviation,
                pnlPercent,
                regime
            };
        }

        return {
            action: "HOLD",
            reason: "Managing scalp position",
            trend,
            deviation,
            pnlPercent,
            regime
        };
    }

    // =========================
    // TREND MODE
    // =========================

    if (regime === "TREND") {

        // 📈 ONLY TRADE STRONG TRENDS
        if (!position) {

            if (
                trend === "UPTREND" &&
                deviation <= CONFIG.TREND_BUY_THRESHOLD
            ) {

                return {
                    action: "BUY",
                    reason: "Trend pullback entry",
                    trend,
                    deviation,
                    regime
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

        // 📊 LONGER HOLD LOGIC
        const entryPrice = position.entryPrice;

        const pnlPercent =
            ((price - entryPrice) / entryPrice) * 100;

        // Bigger profit target
        if (pnlPercent >= CONFIG.TREND_TAKE_PROFIT) {

            return {
                action: "SELL",
                reason: "Trend take profit",
                trend,
                deviation,
                pnlPercent,
                regime
            };
        }

        // Wider stop loss
        if (pnlPercent <= -CONFIG.TREND_STOP_LOSS) {

            return {
                action: "SELL",
                reason: "Trend stop loss",
                trend,
                deviation,
                pnlPercent,
                regime
            };
        }

        return {
            action: "HOLD",
            reason: "Holding trend position",
            trend,
            deviation,
            pnlPercent,
            regime
        };
    }

    // =========================
    // SAFETY DEFAULT
    // =========================

    return {
        action: "HOLD",
        reason: "No regime detected",
        trend,
        deviation,
        regime
    };
}

module.exports = {
    evaluateStrategy
};