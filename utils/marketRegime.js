const { movingAverage } = require("./indicators");

// =========================
// EMA HELPER
// Calculates EMA for a given
// period using correct alpha.
// Always pass full history —
// the alpha controls responsiveness,
// not the slice length.
// =========================

function ema(history, period) {
    const alpha = 2 / (period + 1);
    return movingAverage(history, alpha);
}

// =========================
// DETECT MARKET REGIME
//
// Uses proper EMA crossover logic:
// - EMA9 > EMA21 > EMA50 = uptrend
// - EMA9 < EMA21 < EMA50 = downtrend
// - Trend strength threshold raised
//   from 0.6% to 1.2% — on BTC
//   anything under 1% over 50 bars
//   is noise not a trend
// =========================

function getMarketRegime(history) {

    if (history.length < 50) {
        return "SCALP";
    }

    const ema9  = ema(history, 9);
    const ema21 = ema(history, 21);
    const ema50 = ema(history, 50);

    // How far EMA9 has moved from EMA50
    // as a percentage — strength of trend
    const trendStrength =
        ((ema9 - ema50) / ema50) * 100;

    const isStrongTrend =
        Math.abs(trendStrength) > 1.2;  // RAISED from 0.6

    const isTrendingUp =
        ema9 > ema21 && ema21 > ema50;

    const isTrendingDown =
        ema9 < ema21 && ema21 < ema50;

    if (isStrongTrend && (isTrendingUp || isTrendingDown)) {
        return "TREND";
    }

    return "SCALP";
}

module.exports = {
    getMarketRegime
};