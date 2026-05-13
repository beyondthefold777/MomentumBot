// =========================
// MOVING AVERAGE
// =========================

function movingAverage(data) {
    if (!data.length) return 0;

    const sum = data.reduce(
        (acc, value) => acc + value,
        0
    );

    return sum / data.length;
}

// =========================
// DEVIATION FROM MEAN
// =========================

function getDeviation(price, average) {
    if (!average) return 0;

    return ((price - average) / average) * 100;
}

// =========================
// TREND DIRECTION
// =========================

function getTrendDirection(data, trendWindow) {
    if (data.length < trendWindow) {
        return "SIDEWAYS";
    }

    const recent = data.slice(-trendWindow);

    const start = recent[0];
    const end   = recent[recent.length - 1];

    const percentChange =
        ((end - start) / start) * 100;

    if (percentChange >  0.4) return "UPTREND";
    if (percentChange < -0.4) return "DOWNTREND";

    return "SIDEWAYS";
}

// =========================
// ATR (AVERAGE TRUE RANGE)
//
// Fix: only look at the last
// (period + 1) candles instead
// of iterating the full history.
// On a 5000-bar window the old
// version did ~5000 iterations
// every tick for no reason.
// =========================

function getATR(data, period = 14) {
    if (data.length < period + 1) return 0;

    // Only need the last (period + 1) prices to get (period) TR values
    const slice = data.slice(-(period + 1));

    let sum = 0;

    for (let i = 1; i < slice.length; i++) {
        sum += Math.abs(slice[i] - slice[i - 1]);
    }

    return sum / period;
}

// =========================
// RSI (RELATIVE STRENGTH INDEX)
//
// Uses Wilder's smoothed method:
//   1. Seed with simple average
//      over first `period` bars
//   2. Apply exponential smoothing
//      for remaining bars
//
// This matches how TradingView
// and most exchanges calculate RSI.
// The old version restarted a
// simple average every call, giving
// noisier values that don't align
// with charting platforms.
// =========================

function getRSI(data, period = 14) {
    if (data.length < period + 1) return 50;

    // Need at least period + 1 values to compute period changes
    const prices = data.slice(-(period * 3 + 1));  // grab extra history for smoothing warmup

    let avgGain = 0;
    let avgLoss = 0;

    // Seed: simple average of first `period` changes
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) avgGain += change;
        else            avgLoss += Math.abs(change);
    }

    avgGain /= period;
    avgLoss /= period;

    // Smooth: Wilder's exponential smoothing for remaining bars
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const gain   = change > 0 ? change : 0;
        const loss   = change < 0 ? Math.abs(change) : 0;

        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }

    if (avgLoss === 0) return 100;

    const rs  = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));

    return rsi;
}

// =========================
// EXPORTS
// =========================

module.exports = {
    movingAverage,
    getDeviation,
    getTrendDirection,
    getATR,
    getRSI
};