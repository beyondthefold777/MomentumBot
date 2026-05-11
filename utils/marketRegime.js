const {
    movingAverage
} = require("./indicators");

// =========================
// DETECT MARKET REGIME
// =========================

function getMarketRegime(history) {

    if (history.length < 50) {
        return "SCALP";
    }

    const ema9 = movingAverage(history.slice(-9));
    const ema21 = movingAverage(history.slice(-21));
    const ema50 = movingAverage(history.slice(-50));

    const trendStrength =
        ((ema9 - ema50) / ema50) * 100;

    const isStrongTrend =
        Math.abs(trendStrength) > 0.6;

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