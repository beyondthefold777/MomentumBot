const CONFIG = require("../config");

const {
    movingAverage,
    getDeviation,
    getTrendDirection,
    getRSI
} = require("../utils/indicators");

// =========================
// STRATEGY ENGINE v6
// RSI MOMENTUM REVERSAL +
// SMART SCALP SCORING
// =========================

function evaluateStrategy({
    price,
    history,
    position,
    regime,
    atr
}) {

    const movingAvg =
        movingAverage(history);

    const deviation =
        getDeviation(price, movingAvg);

    const trend =
        getTrendDirection(
            history,
            CONFIG.TREND_WINDOW
        );

    const atrPercent =
        (atr / price) * 100;

    // =========================
    // RSI
    // =========================

    const rsi =
        getRSI(
            history,
            CONFIG.RSI_PERIOD || 14
        );

    // =========================
    // SAFETY FILTERS
    // =========================

    const isLowVol =
        atr < CONFIG.ATR_MIN;

    const isDeadMarket =
        Math.abs(deviation) <
        CONFIG.CHOP_ZONE;

    if (
        !position &&
        isLowVol &&
        isDeadMarket
    ) {
        return {
            action: "HOLD",
            reason: "Low volatility chop",
            trend,
            deviation,
            rsi,
            regime
        };
    }

    // ==================================================
    // SCALP MODE
    // ==================================================

    if (regime === "SCALP") {

        // =========================
        // ENTRY LOGIC
        // =========================

        if (!position) {

            let score = 0;

            // =========================
            // TREND ALIGNMENT
            // =========================

            if (trend === "UPTREND") {
                score += 1;
            }

            // =========================
            // PULLBACK / DEVIATION
            // =========================

            if (
                deviation <=
                CONFIG.SCALP_ENTRY
            ) {
                score += 1;
            }

            // =========================
            // VOLATILITY FILTER
            // =========================

            if (
                atrPercent >= 0.08 &&
                atrPercent <= 1.8
            ) {
                score += 1;
            }

            // =========================
            // RSI OVERSOLD
            // =========================

            if (
                rsi <= CONFIG.RSI_OVERSOLD
            ) {
                score += 2;
            }

            // =========================
            // RSI MOMENTUM REVERSAL
            // VERY IMPORTANT
            // =========================

            const previousRSI =
                getRSI(
                    history.slice(0, -1),
                    CONFIG.RSI_PERIOD || 14
                );

            const rsiReversal =
                previousRSI <
                CONFIG.RSI_OVERSOLD &&
                rsi > previousRSI;

            if (rsiReversal) {
                score += 2;
            }

            // =========================
            // STRONG MEAN REVERSION
            // =========================

            if (deviation <= -0.20) {
                score += 1;
            }

            // =========================
            // ENTRY THRESHOLD
            // =========================

            if (
                score >=
                CONFIG.SCALP_SCORE_THRESHOLD
            ) {

                return {
                    action: "BUY",
                    reason: "RSI scalp reversal entry",

                    score,
                    rsi,
                    previousRSI,
                    rsiReversal,

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
                previousRSI,
                rsiReversal,

                trend,
                deviation,
                regime
            };
        }

        // =========================
        // POSITION MANAGEMENT
        // =========================

        const pnl =
            (
                (
                    price -
                    position.entryPrice
                ) /
                position.entryPrice
            ) * 100;

        // =========================
        // IMPROVED RISK MODEL
        // =========================

        const stopLoss =
            -(
                atrPercent *
                CONFIG.ATR_SCALP_SL
            );

        const takeProfit =
            atrPercent *
            CONFIG.ATR_SCALP_TP;

        // =========================
        // TRAILING BREAKEVEN
        // =========================

        if (pnl >= 0.35) {
            position.stopLossMovedToBE = true;
        }

        // lock profit instead of full BE dump
        if (
            position.stopLossMovedToBE &&
            pnl <= 0.10
        ) {
            return {
                action: "SELL",
                reason: "Trailing breakeven stop",
                pnl,
                regime
            };
        }

        // =========================
        // HARD STOP LOSS
        // =========================

        if (pnl <= stopLoss) {
            return {
                action: "SELL",
                reason: "ATR stop loss",
                pnl,
                regime
            };
        }

        // =========================
        // RSI OVERBOUGHT EXIT
        // =========================

        if (
            pnl > 0.25 &&
            rsi >= CONFIG.RSI_OVERBOUGHT
        ) {
            return {
                action: "SELL",
                reason: "RSI overbought take profit",
                pnl,
                regime
            };
        }

        // =========================
        // ATR TAKE PROFIT
        // =========================

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
            rsi,
            regime
        };
    }

    // ==================================================
    // TREND MODE
    // ==================================================

    if (regime === "TREND") {

        const trendStrong =
            Math.abs(deviation) >
            CONFIG.TREND_STRENGTH_MIN;

        // =========================
        // ENTRY
        // =========================

        if (!position) {

            let trendScore = 0;

            if (trend === "UPTREND") {
                trendScore += 2;
            }

            if (trendStrong) {
                trendScore += 1;
            }

            // healthy bullish momentum
            if (rsi >= 50 && rsi <= 70) {
                trendScore += 1;
            }

            if (
                trendScore >=
                CONFIG.TREND_SCORE_THRESHOLD
            ) {
                return {
                    action: "BUY",
                    reason: "Trend momentum entry",

                    trendScore,
                    rsi,

                    trend,
                    deviation,
                    regime,
                    atr
                };
            }

            return {
                action: "HOLD",
                reason: "Trend score too low",

                trendScore,
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
            (
                (
                    price -
                    position.entryPrice
                ) /
                position.entryPrice
            ) * 100;

        const stopLoss =
            -(
                atrPercent *
                CONFIG.ATR_TREND_SL
            );

        const takeProfit =
            atrPercent *
            CONFIG.ATR_TREND_TP;

        // =========================
        // TREND TRAILING STOP
        // =========================

        if (pnl >= 1) {
            position.stopLossMovedToBE = true;
        }

        if (
            position.stopLossMovedToBE &&
            pnl <= 0.25
        ) {
            return {
                action: "SELL",
                reason: "Trend trailing stop",
                pnl,
                regime
            };
        }

        // =========================
        // STOP LOSS
        // =========================

        if (pnl <= stopLoss) {
            return {
                action: "SELL",
                reason: "Trend stop loss",
                pnl,
                regime
            };
        }

        // =========================
        // RSI EXIT
        // =========================

        if (
            pnl > 0.75 &&
            rsi >= 75
        ) {
            return {
                action: "SELL",
                reason: "Trend RSI exhaustion",
                pnl,
                regime
            };
        }

        // =========================
        // TAKE PROFIT
        // =========================

        if (pnl >= takeProfit) {
            return {
                action: "SELL",
                reason: "Trend ATR take profit",
                pnl,
                regime
            };
        }

        return {
            action: "HOLD",
            reason: "Holding trend position",
            pnl,
            rsi,
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
        rsi,
        regime
    };
}

module.exports = {
    evaluateStrategy
};