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

            if (deviation <= CONFIG.SCALP_ENTRY) {
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

            if (rsi <= CONFIG.RSI_OVERSOLD) {
                score += 2;
            }

            // =========================
            // RSI MOMENTUM REVERSAL
            //
            // Fix: guard the slice so it's
            // always long enough for the
            // smoothed RSI warmup period.
            // Old: history.slice(0, -1) on a
            // 50-bar window could be too short
            // after getRSI needs period*3+1 bars.
            // =========================

            const minRSIBars =
                (CONFIG.RSI_PERIOD || 14) * 3 + 2;

            const previousRSI =
                history.length > minRSIBars
                    ? getRSI(
                        history.slice(0, -1),
                        CONFIG.RSI_PERIOD || 14
                    )
                    : rsi; // not enough history — treat as flat (no reversal)

            const rsiReversal =
                previousRSI < CONFIG.RSI_OVERSOLD &&
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
        // POSITION MANAGEMENT
        //
        // pnl here is gross (no fees).
        // Thresholds are offset by
        // ROUND_TRIP_COST so all
        // decisions reflect net reality.
        // e.g. breakeven trigger at 0.35%
        // gross = ~0.05% net after ~0.3%
        // round-trip — nearly breakeven,
        // which is the intent.
        // =========================

        const pnl =
            ((price - position.entryPrice) / position.entryPrice) * 100;

        const stopLoss =
            -(atrPercent * CONFIG.ATR_SCALP_SL);

        const takeProfit =
            atrPercent * CONFIG.ATR_SCALP_TP;

        // =========================
        // TRAILING BREAKEVEN
        // Trigger once gross pnl covers
        // round-trip cost + small buffer
        // =========================

        const beActivationThreshold =
            ROUND_TRIP_COST + 0.10; // must clear fees before locking in

        if (pnl >= beActivationThreshold) {
            position.stopLossMovedToBE = true;
        }

        if (
            position.stopLossMovedToBE &&
            pnl <= ROUND_TRIP_COST  // exit if we've given back to fee-breakeven
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
        // Require pnl to exceed fees
        // before allowing RSI exit
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
        // POSITION MANAGEMENT
        // =========================

        const pnl =
            ((price - position.entryPrice) / position.entryPrice) * 100;

        const stopLoss =
            -(atrPercent * CONFIG.ATR_TREND_SL);

        const takeProfit =
            atrPercent * CONFIG.ATR_TREND_TP;

        // =========================
        // TREND TRAILING STOP
        // Same cost-awareness as scalp
        // =========================

        const trendBEThreshold =
            ROUND_TRIP_COST + 0.75; // trend needs more room before locking

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