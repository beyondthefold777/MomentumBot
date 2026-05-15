const CONFIG = require("../config");

const {
    movingAverage,
    getDeviation,
    getTrendDirection,
    getRSI,
    getMACD
} = require("../utils/indicators");

// =========================
// STRATEGY ENGINE v7.6
//
// CHANGES FROM v7.5:
//
// 1. TREND MODE DISABLED
//    5 trend trades in 30 days:
//    0 wins, -$166 total PnL.
//    All traffic now routes through
//    SCALP. Re-enable via config flag.
//
// 2. MACD HISTOGRAM DIRECTION GATE
//    New required condition on every
//    scalp entry: the MACD histogram
//    must be rising (histogram >
//    prevHistogram). This confirms
//    that momentum is actually turning
//    bullish — not just that price is
//    low. Filters the core loss pattern:
//    RSI oversold in a sustained
//    downtrend where RSI keeps hitting
//    40 but price keeps falling.
//
//    The histogram doesn't need to be
//    positive — just rising. A histogram
//    moving from -50 to -30 is bullish
//    momentum turning, and that's enough.
//
// 3. ATR_MIN: 150 → 175
//    ATR 98, 136, 146, 147 entries all
//    lost. Hard floor raised to cut them.
//
// 4. ALL v7.5 IMPROVEMENTS RETAINED
//    Consecutive loss brake, score 7
//    deep deviation gate, RSI reversal
//    requirement on fast-track.
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
    consecutiveLosses = 0
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

    const macd =
        getMACD(history, CONFIG.MACD_FAST, CONFIG.MACD_SLOW, CONFIG.MACD_SIGNAL);

    // =========================
    // SAFETY FILTERS
    // =========================

    const isLowVol     = atr < CONFIG.ATR_MIN;
    const isDeadMarket = Math.abs(deviation) < CONFIG.CHOP_ZONE;

    if (!position && isLowVol && isDeadMarket) {
        return {
            action: "HOLD",
            reason: "Low volatility chop",
            trend, deviation, rsi, regime
        };
    }

    // ==================================================
    // TREND MODE (disabled — TREND_ENABLED: false)
    // Code retained for easy re-enabling.
    // ==================================================

    if (regime === "TREND" && CONFIG.TREND_ENABLED !== false) {

        const trendStrong =
            Math.abs(deviation) > CONFIG.TREND_STRENGTH_MIN;

        if (!position) {

            let trendScore = 0;

            if (trend === "UPTREND")    trendScore += 2;
            if (trendStrong)            trendScore += 1;
            if (rsi >= 50 && rsi <= 70) trendScore += 1;

            const minRSIBars  = (CONFIG.RSI_PERIOD || 14) * 3 + 2;
            const previousRSI =
                history.length > minRSIBars
                    ? getRSI(history.slice(0, -1), CONFIG.RSI_PERIOD || 14)
                    : rsi;

            const rsiMomentum = rsi > previousRSI && rsi > 55;
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

        const pnl        = ((price - position.entryPrice) / position.entryPrice) * 100;
        const stopLoss   = -(atrPercent * CONFIG.ATR_TREND_SL);
        const takeProfit =   atrPercent * CONFIG.ATR_TREND_TP;
        const trendBEThreshold = ROUND_TRIP_COST + 0.75;

        if (pnl >= trendBEThreshold)                         position.stopLossMovedToBE = true;
        if (position.stopLossMovedToBE && pnl <= ROUND_TRIP_COST) return { action: "SELL", reason: "Trend trailing stop",    pnl, regime };
        if (pnl <= stopLoss)                                       return { action: "SELL", reason: "Trend stop loss",         pnl, regime };
        if (pnl > ROUND_TRIP_COST + 0.50 && rsi >= 75)            return { action: "SELL", reason: "Trend RSI exhaustion",   pnl, regime };
        if (pnl >= takeProfit)                                     return { action: "SELL", reason: "Trend ATR take profit",  pnl, regime };

        return { action: "HOLD", reason: "Holding trend position", pnl, rsi, regime };
    }

    // ==================================================
    // SCALP MODE
    // Handles all traffic when TREND_ENABLED: false.
    // ==================================================

    if (regime === "SCALP" || CONFIG.TREND_ENABLED === false) {

        if (!position) {

            // =========================
            // HARD ATR FLOOR
            // Low ATR entries (98, 136, 146)
            // all lost — block them directly.
            // =========================
            if (atr < CONFIG.ATR_MIN) {
                return {
                    action: "HOLD",
                    reason: `ATR too low (${Math.round(atr)} < ${CONFIG.ATR_MIN})`,
                    atr, trend, deviation, rsi, regime
                };
            }

            // =========================
            // MACD HISTOGRAM DIRECTION GATE
            // v7.6: NEW — required on all entries.
            //
            // Histogram must be rising vs previous
            // candle. Doesn't need to be positive —
            // just turning. This filters "RSI oversold
            // in a falling market" which was the source
            // of the majority of losses in v7.5.
            // =========================
            const macdTurning =
                macd.histogram > macd.prevHistogram;

            if (!macdTurning) {
                return {
                    action: "HOLD",
                    reason: `MACD histogram not turning (${macd.histogram.toFixed(2)} vs prev ${macd.prevHistogram.toFixed(2)})`,
                    trend, deviation, rsi, regime,
                    macdHistogram: macd.histogram,
                    macdPrevHistogram: macd.prevHistogram
                };
            }

            let score = 0;

            if (trend === "UPTREND")              score += 1;
            if (deviation <= CONFIG.SCALP_ENTRY)  score += 1;

            if (atrPercent >= 0.08 && atrPercent <= 1.8)
                score += 1;

            if (rsi <= CONFIG.RSI_OVERSOLD)        score += 2;

            const minRSIBars  = (CONFIG.RSI_PERIOD || 14) * 3 + 2;
            const previousRSI =
                history.length > minRSIBars
                    ? getRSI(history.slice(0, -1), CONFIG.RSI_PERIOD || 14)
                    : rsi;

            const rsiReversal =
                previousRSI < CONFIG.RSI_OVERSOLD &&
                rsi > previousRSI;

            if (rsiReversal)        score += 2;
            if (deviation <= -0.20) score += 1;

            const onLosingStreak = consecutiveLosses >= 2;

            // =========================
            // HIGH-CONVICTION FAST-TRACK
            // =========================
            const highConviction =
                score >= 5 &&
                rsiReversal &&
                deviation <= -0.20 &&
                !onLosingStreak;

            // Score 7 requires deeper pullback
            const deepEnough = score < 7 || deviation <= -0.30;

            if (highConviction && deepEnough) {
                return {
                    action: "BUY",
                    reason: `High-conviction RSI reversal (score ${score}, MACD turning)`,
                    score, rsi, previousRSI, rsiReversal,
                    trend, deviation, regime, atr,
                    macdHistogram: macd.histogram,
                    consecutiveLosses
                };
            }

            // =========================
            // HARD TREND GATE
            // =========================
            if (trend !== "UPTREND") {
                return {
                    action: "HOLD",
                    reason: onLosingStreak
                        ? `Scalp blocked — losing streak (${consecutiveLosses}) requires uptrend`
                        : "Scalp blocked — not in uptrend",
                    score, trend, deviation, rsi, regime, consecutiveLosses
                };
            }

            if (score >= CONFIG.SCALP_SCORE_THRESHOLD) {
                return {
                    action: "BUY",
                    reason: `RSI scalp reversal entry (score ${score}, MACD turning)`,
                    score, rsi, previousRSI, rsiReversal,
                    trend, deviation, regime, atr,
                    macdHistogram: macd.histogram,
                    consecutiveLosses
                };
            }

            return {
                action: "HOLD",
                reason: "Scalp score too low",
                score, rsi, previousRSI, rsiReversal,
                trend, deviation, regime, consecutiveLosses
            };
        }

        // =========================
        // SCALP POSITION MANAGEMENT
        // Unchanged from v7.5
        // =========================

        const pnl        = ((price - position.entryPrice) / position.entryPrice) * 100;
        const stopLoss   = -(atrPercent * CONFIG.ATR_SCALP_SL);
        const takeProfit =   atrPercent * CONFIG.ATR_SCALP_TP;

        const beActivationThreshold = ROUND_TRIP_COST + 0.10;

        if (pnl >= beActivationThreshold) {
            position.stopLossMovedToBE = true;
        }

        if (position.stopLossMovedToBE && pnl <= ROUND_TRIP_COST) {
            return { action: "SELL", reason: "Trailing breakeven stop", pnl, regime };
        }

        if (pnl <= stopLoss) {
            return { action: "SELL", reason: "ATR stop loss", pnl, regime };
        }

        if (pnl > ROUND_TRIP_COST + 0.15 && rsi >= CONFIG.RSI_OVERBOUGHT) {
            return { action: "SELL", reason: "RSI overbought take profit", pnl, regime };
        }

        if (pnl >= takeProfit) {
            return { action: "SELL", reason: "ATR take profit", pnl, regime };
        }

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

    return {
        action: "HOLD",
        reason: "No setup",
        trend, deviation, rsi, regime
    };
}

module.exports = { evaluateStrategy };