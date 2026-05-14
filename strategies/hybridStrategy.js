const CONFIG = require("../config");

const {
    movingAverage,
    getDeviation,
    getTrendDirection,
    getRSI
} = require("../utils/indicators");

// =========================
// STRATEGY ENGINE v7.4
//
// CHANGES FROM v7.3:
//
// 1. SCORE 5 FAST-TRACK (SCALP)
//    If RSI is oversold AND showing
//    reversal AND deviation is deep
//    (<= -0.20), score can hit 5+.
//    These high-conviction entries
//    now bypass the UPTREND gate.
//    Rationale: a deep RSI reversal
//    with strong pullback is a valid
//    mean-reversion signal even in
//    sideways conditions.
//
// 2. TIGHTER SCALP STOP (config)
//    ATR_SCALP_SL: 1.2 → 0.9
//    Cuts losers faster. The avg
//    loser was $34 — this targets
//    sub-$25.
//
// 3. WIDER SCALP TP (config)
//    ATR_SCALP_TP: 3.0 → 3.5
//    Avg winner was $46 — this
//    targets $55+. Improves the
//    win/loss dollar ratio.
//
// 4. TREND SCORE THRESHOLD RAISED
//    4 → 5 (config)
//    TREND mode was 0W/5L in the
//    last 30 days. Raising the bar
//    stops low-conviction trend
//    entries from dragging the P&L.
//
// 5. RSI_OVERSOLD RAISED (config)
//    38 → 42
//    More candles qualify as
//    oversold, so reversal signals
//    fire more frequently on genuine
//    pullbacks.
//
// 6. ATR_MIN LOWERED (config)
//    200 → 150
//    Was filtering valid setups.
//    150 still blocks truly dead
//    low-vol sessions.
//
// Everything else is untouched
// from v7.3.
// =========================

const ROUND_TRIP_COST =
    (CONFIG.FEE_RATE + CONFIG.SLIPPAGE) * 2 * 100;

function evaluateStrategy({
    price,
    history,
    position,
    regime,
    atr,
    candlesSinceEntry = 0
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
            // SCORE 5 FAST-TRACK
            //
            // High-conviction entries:
            // deep RSI reversal + strong
            // pullback can fire even in
            // sideways conditions.
            // Score 4 in uptrend still
            // requires the trend gate.
            // =========================

            const highConviction =
                score >= 5 &&
                rsiReversal &&
                deviation <= -0.20;

            if (highConviction) {
                return {
                    action: "BUY",
                    reason: "High-conviction RSI reversal (score 5+ fast-track)",
                    score, rsi, previousRSI, rsiReversal,
                    trend, deviation, regime, atr
                };
            }

            // =========================
            // HARD TREND GATE
            //
            // Score 4 entries still require
            // uptrend confirmation. Only
            // score 5+ fast-tracks bypass.
            // =========================

            if (trend !== "UPTREND") {
                return {
                    action: "HOLD",
                    reason: "Scalp blocked — not in uptrend",
                    score, trend, deviation, rsi, regime
                };
            }

            if (score >= CONFIG.SCALP_SCORE_THRESHOLD) {
                return {
                    action: "BUY",
                    reason: "RSI scalp reversal entry",
                    score, rsi, previousRSI, rsiReversal,
                    trend, deviation, regime, atr
                };
            }

            return {
                action: "HOLD",
                reason: "Scalp score too low",
                score, rsi, previousRSI, rsiReversal,
                trend, deviation, regime
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
        // Hard cap — safety net only.
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

            // =========================
            // TREND EXTRA: RSI MOMENTUM
            //
            // Added a 5th point available
            // for trend entries. RSI must
            // be rising and above 55 —
            // confirms momentum is actually
            // building, not just sideways
            // with a high RSI reading.
            // Required to reach new
            // threshold of 5.
            // =========================

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