const CONFIG = require("../config");

const {
    movingAverage,
    getDeviation,
    getTrendDirection,
    getRSI
} = require("../utils/indicators");

// =========================
// STRATEGY ENGINE v7.5
//
// CHANGES FROM v7.4:
//
// 1. CONSECUTIVE LOSS BRAKE
//    run.js now tracks consecutive
//    losses and passes the count in.
//    If 2+ losses in a row, the
//    score 5+ fast-track is suspended
//    and UPTREND is required even
//    for high-conviction entries.
//    This stops the bot re-entering
//    on RSI oversold signals during
//    sustained downtrends (the
//    April 18-19 and May 7-8
//    loss clusters).
//
//    Resets automatically on any
//    winning trade — so once the
//    market recovers, fast-track
//    entries resume normally.
//
// 2. SCORE 7 DEEP DEVIATION GATE
//    Score 7 fast-track now requires
//    deviation <= -0.30 (previously
//    -0.20). Filters shallow entries
//    that look oversold but haven't
//    pulled back far enough to be
//    genuine mean-reversion setups.
//
// Everything else is untouched
// from v7.4.
// =========================

const ROUND_TRIP_COST =
    (CONFIG.FEE_RATE + CONFIG.SLIPPAGE) * 2 * 100;

function evaluateStrategy({
    price,
    history,
    position,
    regime,
    atr,
    candlesSinceEntry = 0,
    consecutiveLosses = 0     // passed from run.js
}) {

    const movingAvg =
        movingAverage(history);

    const deviation =
        getDeviation(price, movingAvg);

    const trend =
        getTrendDirection(history, CONFIG.TREND_WINDOW);

    const atrPercent =
        (atr / price) * 100;

    const rsi =
        getRSI(history, CONFIG.RSI_PERIOD || 14);

    // =========================
    // SAFETY FILTERS
    // =========================

    const isLowVol =
        atr < CONFIG.ATR_MIN;

    const isDeadMarket =
        Math.abs(deviation) < CONFIG.CHOP_ZONE;

    if (!position && isLowVol && isDeadMarket) {
        return {
            action: "HOLD",
            reason: "Low volatility chop",
            trend, deviation, rsi, regime
        };
    }

    // ==================================================
    // SCALP MODE
    // ==================================================

    if (regime === "SCALP") {

        if (!position) {

            let score = 0;

            if (trend === "UPTREND")              score += 1;
            if (deviation <= CONFIG.SCALP_ENTRY)  score += 1;

            if (atrPercent >= 0.08 && atrPercent <= 1.8)
                score += 1;

            if (rsi <= CONFIG.RSI_OVERSOLD)        score += 2;

            const minRSIBars =
                (CONFIG.RSI_PERIOD || 14) * 3 + 2;

            const previousRSI =
                history.length > minRSIBars
                    ? getRSI(history.slice(0, -1), CONFIG.RSI_PERIOD || 14)
                    : rsi;

            const rsiReversal =
                previousRSI < CONFIG.RSI_OVERSOLD &&
                rsi > previousRSI;

            if (rsiReversal)          score += 2;
            if (deviation <= -0.20)   score += 1;

            // =========================
            // SCORE 5+ FAST-TRACK
            //
            // High-conviction mean-reversion
            // entries bypass the UPTREND gate
            // UNLESS we're on a losing streak.
            //
            // After 2+ consecutive losses,
            // assume we're in a downtrend and
            // require UPTREND confirmation even
            // for high-score entries.
            //
            // Score 7 additionally requires
            // deviation <= -0.30 to prevent
            // shallow entries in falling markets.
            // =========================

            const onLosingStreak = consecutiveLosses >= 2;

            const highConviction =
                score >= 5 &&
                rsiReversal &&
                deviation <= -0.20 &&
                !onLosingStreak;

            // score 7 requires deeper pullback
            // regardless of streak status
            const deepEnough =
                score < 7 || deviation <= -0.30;

            if (highConviction && deepEnough) {
                return {
                    action: "BUY",
                    reason: `High-conviction RSI reversal (score ${score} fast-track)`,
                    score, rsi, previousRSI, rsiReversal,
                    trend, deviation, regime, atr,
                    consecutiveLosses
                };
            }

            // =========================
            // HARD TREND GATE
            //
            // Score 4 entries always require
            // uptrend. Score 5+ only bypasses
            // when NOT on a losing streak.
            // =========================

            if (trend !== "UPTREND") {
                return {
                    action: "HOLD",
                    reason: onLosingStreak
                        ? `Scalp blocked — losing streak (${consecutiveLosses}) requires uptrend`
                        : "Scalp blocked — not in uptrend",
                    score, trend, deviation, rsi, regime,
                    consecutiveLosses
                };
            }

            if (score >= CONFIG.SCALP_SCORE_THRESHOLD) {
                return {
                    action: "BUY",
                    reason: "RSI scalp reversal entry",
                    score, rsi, previousRSI, rsiReversal,
                    trend, deviation, regime, atr,
                    consecutiveLosses
                };
            }

            return {
                action: "HOLD",
                reason: "Scalp score too low",
                score, rsi, previousRSI, rsiReversal,
                trend, deviation, regime,
                consecutiveLosses
            };
        }

        // =========================
        // SCALP POSITION MANAGEMENT
        // =========================

        const pnl =
            ((price - position.entryPrice) / position.entryPrice) * 100;

        const stopLoss   = -(atrPercent * CONFIG.ATR_SCALP_SL);
        const takeProfit =   atrPercent * CONFIG.ATR_SCALP_TP;

        // =========================
        // TRAILING BREAKEVEN
        // =========================

        const beActivationThreshold = ROUND_TRIP_COST + 0.10;

        if (pnl >= beActivationThreshold) {
            position.stopLossMovedToBE = true;
        }

        if (position.stopLossMovedToBE && pnl <= ROUND_TRIP_COST) {
            return {
                action: "SELL",
                reason: "Trailing breakeven stop",
                pnl, regime
            };
        }

        // =========================
        // HARD STOP LOSS
        // =========================

        if (pnl <= stopLoss) {
            return {
                action: "SELL",
                reason: "ATR stop loss",
                pnl, regime
            };
        }

        // =========================
        // RSI OVERBOUGHT EXIT
        // =========================

        if (
            pnl > ROUND_TRIP_COST + 0.15 &&
            rsi >= CONFIG.RSI_OVERBOUGHT
        ) {
            return {
                action: "SELL",
                reason: "RSI overbought take profit",
                pnl, regime
            };
        }

        // =========================
        // ATR TAKE PROFIT
        // =========================

        if (pnl >= takeProfit) {
            return {
                action: "SELL",
                reason: "ATR take profit",
                pnl, regime
            };
        }

        // =========================
        // TIME STOP
        // =========================

        if (candlesSinceEntry >= CONFIG.SCALP_TIME_STOP * 2) {
            return {
                action: "SELL",
                reason: "Hard time cap",
                pnl, candlesSinceEntry, regime
            };
        }

        return {
            action: "HOLD",
            reason: "Managing scalp position",
            pnl, rsi, regime
        };
    }

    // ==================================================
    // TREND MODE
    // ==================================================

    if (regime === "TREND") {

        const trendStrong =
            Math.abs(deviation) > CONFIG.TREND_STRENGTH_MIN;

        if (!position) {

            let trendScore = 0;

            if (trend === "UPTREND")    trendScore += 2;
            if (trendStrong)            trendScore += 1;
            if (rsi >= 50 && rsi <= 70) trendScore += 1;

            const minRSIBars =
                (CONFIG.RSI_PERIOD || 14) * 3 + 2;

            const previousRSI =
                history.length > minRSIBars
                    ? getRSI(history.slice(0, -1), CONFIG.RSI_PERIOD || 14)
                    : rsi;

            const rsiMomentum =
                rsi > previousRSI && rsi > 55;

            if (rsiMomentum) trendScore += 1;

            if (trendScore >= CONFIG.TREND_SCORE_THRESHOLD) {
                return {
                    action: "BUY",
                    reason: "Trend momentum entry",
                    trendScore, rsi, trend, deviation, regime, atr
                };
            }

            return {
                action: "HOLD",
                reason: "Trend score too low",
                trendScore, rsi, trend, deviation, regime
            };
        }

        const pnl =
            ((price - position.entryPrice) / position.entryPrice) * 100;

        const stopLoss   = -(atrPercent * CONFIG.ATR_TREND_SL);
        const takeProfit =   atrPercent * CONFIG.ATR_TREND_TP;

        const trendBEThreshold = ROUND_TRIP_COST + 0.75;

        if (pnl >= trendBEThreshold) {
            position.stopLossMovedToBE = true;
        }

        if (position.stopLossMovedToBE && pnl <= ROUND_TRIP_COST) {
            return {
                action: "SELL",
                reason: "Trend trailing stop",
                pnl, regime
            };
        }

        if (pnl <= stopLoss) {
            return {
                action: "SELL",
                reason: "Trend stop loss",
                pnl, regime
            };
        }

        if (pnl > ROUND_TRIP_COST + 0.50 && rsi >= 75) {
            return {
                action: "SELL",
                reason: "Trend RSI exhaustion",
                pnl, regime
            };
        }

        if (pnl >= takeProfit) {
            return {
                action: "SELL",
                reason: "Trend ATR take profit",
                pnl, regime
            };
        }

        return {
            action: "HOLD",
            reason: "Holding trend position",
            pnl, rsi, regime
        };
    }

    return {
        action: "HOLD",
        reason: "No setup",
        trend, deviation, rsi, regime
    };
}

module.exports = {
    evaluateStrategy
};