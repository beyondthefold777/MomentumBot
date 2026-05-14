const CONFIG = require("../config");

const {
    movingAverage,
    getDeviation,
    getTrendDirection,
    getRSI
} = require("../utils/indicators");

// =========================
// STRATEGY ENGINE v7
// RSI MOMENTUM REVERSAL +
// SMART SCALP SCORING +
// IMPROVED SAFETY FILTERS
// =========================

// Round-trip cost as a % — used to
// offset pnl thresholds so decisions
// are made on NET position, not gross
const ROUND_TRIP_COST =
    (CONFIG.FEE_RATE + CONFIG.SLIPPAGE) * 2 * 100;

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
    //
    // FIXED: was (isLowVol && isDeadMarket)
    // meaning low ATR alone wasn't enough
    // to block entry if deviation was high.
    // Now ATR filter is independent —
    // dead volume kills the entry regardless
    // of where price is relative to MA.
    // =========================

    const isLowVol =
        atr < CONFIG.ATR_MIN;

    const isDeadMarket =
        Math.abs(deviation) 
        CONFIG.CHOP_ZONE;

    // Block on low vol OR dead market
    // but only when flat (not managing position)
    if (!position && isLowVol && isDeadMarket) {
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
            // Worth 1 point — bonus for
            // trading with the trend but
            // not required for scalps
            // =========================

            if (trend === "UPTREND") {
                score += 1;
            }

            // =========================
            // PULLBACK / DEVIATION
            // Price must be below EMA
            // by at least SCALP_ENTRY %
            // =========================

            if (deviation <= CONFIG.SCALP_ENTRY) {
                score += 1;
            }

            // =========================
            // VOLATILITY FILTER
            // ATR must be in healthy range —
            // not dead (< 0.08%) and not
            // wildly chaotic (> 1.8%)
            // =========================

            if (
                atrPercent >= 0.08 &&
                atrPercent <= 1.8
            ) {
                score += 1;
            }

            // =========================
            // RSI OVERSOLD
            // Strong signal — worth 2pts
            // =========================

            if (rsi <= CONFIG.RSI_OVERSOLD) {
                score += 2;
            }

            // =========================
            // RSI MOMENTUM REVERSAL
            // Previous bar was oversold
            // and RSI is now turning up —
            // early reversal signal
            // =========================

            const minRSIBars =
                (CONFIG.RSI_PERIOD || 14) * 3 + 2;

            const previousRSI =
                history.length > minRSIBars
                    ? getRSI(
                        history.slice(0, -1),
                        CONFIG.RSI_PERIOD || 14
                    )
                    : rsi;

            const rsiReversal =
                previousRSI < CONFIG.RSI_OVERSOLD &&
                rsi > previousRSI;

            if (rsiReversal) {
                score += 2;
            }

            // =========================
            // STRONG MEAN REVERSION
            // Price significantly extended
            // below EMA — high snap-back odds
            // =========================

            if (deviation <= -0.20) {
                score += 1;
            }

            // =========================
            // ENTRY THRESHOLD
            // =========================

            if (score >= CONFIG.SCALP_SCORE_THRESHOLD) {
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
        // SCALP POSITION MANAGEMENT
        //
        // Note: pnl here is unlevered %
        // Stop/TP levels are price-based
        // so leverage doesn't affect where
        // we exit — only dollar impact.
        // Dollar impact is handled in run.js
        // via the EXPOSURE multiplier.
        // =========================

        const pnl =
            ((price - position.entryPrice) / position.entryPrice) * 100;

        const stopLoss =
            -(atrPercent * CONFIG.ATR_SCALP_SL);

        const takeProfit =
            atrPercent * CONFIG.ATR_SCALP_TP;

        // =========================
        // TRAILING BREAKEVEN
        // Only activates once trade
        // has covered round-trip fees
        // plus a small buffer
        // =========================

        const beActivationThreshold =
            ROUND_TRIP_COST + 0.10;

        if (pnl >= beActivationThreshold) {
            position.stopLossMovedToBE = true;
        }

        if (
            position.stopLossMovedToBE &&
            pnl <= ROUND_TRIP_COST
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
        // Must be in profit net of fees
        // before RSI exit is allowed —
        // stops premature exits on entry
        // =========================

        if (
            pnl > ROUND_TRIP_COST + 0.15 &&
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
        // TREND ENTRY
        //
        // Max possible score = 4
        // Threshold = 4 means ALL
        // conditions must be met:
        // - confirmed uptrend (2pts)
        // - strong deviation (1pt)
        // - healthy RSI range (1pt)
        // =========================

        if (!position) {

            let trendScore = 0;

            // Strong uptrend — worth 2pts
            // With new 1% threshold in
            // getTrendDirection this only
            // fires on real moves now
            if (trend === "UPTREND") {
                trendScore += 2;
            }

            // Price meaningfully extended
            // above EMA — trend has legs
            if (trendStrong) {
                trendScore += 1;
            }

            // RSI in healthy momentum zone —
            // not overbought, not reversing
            if (rsi >= 50 && rsi <= 70) {
                trendScore += 1;
            }

            if (trendScore >= CONFIG.TREND_SCORE_THRESHOLD) {
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
        // TREND POSITION MANAGEMENT
        // =========================

        const pnl =
            ((price - position.entryPrice) / position.entryPrice) * 100;

        const stopLoss =
            -(atrPercent * CONFIG.ATR_TREND_SL);

        const takeProfit =
            atrPercent * CONFIG.ATR_TREND_TP;

        // =========================
        // TREND TRAILING STOP
        // Needs more room than scalp
        // before locking in breakeven —
        // trends need space to breathe
        // =========================

        const trendBEThreshold =
            ROUND_TRIP_COST + 0.75;

        if (pnl >= trendBEThreshold) {
            position.stopLossMovedToBE = true;
        }

        if (
            position.stopLossMovedToBE &&
            pnl <= ROUND_TRIP_COST
        ) {
            return {
                action: "SELL",
                reason: "Trend trailing stop",
                pnl,
                regime
            };
        }

        // =========================
        // TREND STOP LOSS
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
        // TREND RSI EXHAUSTION EXIT
        // Only exit on RSI exhaustion
        // if we're actually in profit
        // net of fees — no premature
        // exits on losing trades
        // =========================

        if (
            pnl > ROUND_TRIP_COST + 0.50 &&
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
        // TREND TAKE PROFIT
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