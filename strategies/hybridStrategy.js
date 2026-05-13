const CONFIG = require("../config");

const {
    movingAverage,
    getDeviation,
    getTrendDirection,
    getRSI
} = require("../utils/indicators");

// =========================
// STRATEGY ENGINE v5
// SCORING + FILTERED SCALPING
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
    const trend = getTrendDirection(history, CONFIG.TREND_WINDOW);

    const atrPercent = (atr / price) * 100;

    // =========================
    // RSI (NEW)
    // =========================
    const rsi = getRSI(history, CONFIG.RSI_PERIOD || 14);

    // =========================
    // BASIC SAFETY FILTERS
    // =========================

    const isLowVol = atr < CONFIG.ATR_MIN;

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
    // SCALP MODE (NOW SCORING BASED)
    // =========================

    if (regime === "SCALP") {

        // =========================
        // ENTRY SCORING SYSTEM (NEW)
        // =========================

        if (!position) {

            let score = 0;

            // 1. Trend alignment
            if (trend === "UPTREND") score += 1;

            // 2. Oversold / pullback
            if (deviation <= CONFIG.SCALP_ENTRY) score += 1;

            // 3. Volatility healthy
            if (atrPercent >= 0.1 && atrPercent <= 1.5) score += 1;

            // 4. RSI confirmation (NEW FILTER)
            const rsiOk = rsi < 35;
            if (rsiOk) score += 1;

            // =========================
            // ENTRY THRESHOLD
            // =========================

            if (score >= (CONFIG.SCALP_SCORE_THRESHOLD || 3)) {

                return {
                    action: "BUY",
                    reason: "Scalp score entry",
                    score,
                    rsi,
                    trend,
                    deviation,
                    regime,
                    atr
                };
            }

            return {
                action: "HOLD",
                reason: "Scalp score too low",
                score,
                rsi,
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

        const stopLoss = -(atrPercent * CONFIG.ATR_SCALP_SL);
        const takeProfit = atrPercent * CONFIG.ATR_SCALP_TP;

        // BREAKEVEN
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

        if (pnl <= stopLoss) {
            return {
                action: "SELL",
                reason: "ATR stop loss",
                pnl,
                regime
            };
        }

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
    // TREND MODE (UNCHANGED)
    // =========================

    if (regime === "TREND") {

        const trendStrong =
            Math.abs(deviation) > CONFIG.TREND_STRENGTH_MIN;

        if (!position) {

            if (trend === "UPTREND" && trendStrong) {
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

        const pnl =
            ((price - position.entryPrice) / position.entryPrice) * 100;

        const stopLoss = -(atrPercent * CONFIG.ATR_TREND_SL);
        const takeProfit = atrPercent * CONFIG.ATR_TREND_TP;

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