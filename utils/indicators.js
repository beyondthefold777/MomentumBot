// =========================
// MOVING AVERAGE (EMA)
// =========================
function movingAverage(data, alpha = 0.1) {
    if (!data.length) return 0;
    let ema = data[0];
    for (let i = 1; i < data.length; i++) {
        ema = alpha * data[i] + (1 - alpha) * ema;
    }
    return ema;
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
    if (data.length < trendWindow) return "SIDEWAYS";
    const recent = data.slice(-trendWindow);
    const start  = recent[0];
    const end    = recent[recent.length - 1];
    const percentChange = ((end - start) / start) * 100;
    if (percentChange >  0.6) return "UPTREND";
    if (percentChange < -0.6) return "DOWNTREND";
    return "SIDEWAYS";
}

// =========================
// ATR (AVERAGE TRUE RANGE)
// =========================
function getATR(data, period = 14) {
    if (data.length < period + 1) return 0;
    const slice = data.slice(-(period + 1));
    let sum = 0;
    for (let i = 1; i < slice.length; i++) {
        sum += Math.abs(slice[i] - slice[i - 1]);
    }
    return sum / period;
}

// =========================
// RSI (RELATIVE STRENGTH INDEX)
// Wilder's smoothed method.
// =========================
function getRSI(data, period = 14) {
    if (data.length < period + 1) return 50;
    const prices = data.slice(-(period * 3 + 1));
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const change = prices[i] - prices[i - 1];
        if (change > 0) avgGain += change;
        else            avgLoss += Math.abs(change);
    }
    avgGain /= period;
    avgLoss /= period;
    for (let i = period + 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        const gain   = change > 0 ? change : 0;
        const loss   = change < 0 ? Math.abs(change) : 0;
        avgGain = (avgGain * (period - 1) + gain) / period;
        avgLoss = (avgLoss * (period - 1) + loss) / period;
    }
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

// =========================
// MACD
//
// Standard 12/26/9 settings.
// Returns:
//   macdLine  — EMA12 minus EMA26
//   signal    — 9-period EMA of macdLine
//   histogram — macdLine minus signal
//   prevHistogram — histogram one candle ago
//
// The key value for entry filtering is
// histogram direction:
//   histogram > prevHistogram = momentum
//   is turning bullish (even if both
//   are still negative — the turn is
//   what matters, not the absolute level).
//
// This distinguishes "RSI oversold in
// a falling market" from "RSI oversold
// with momentum actually reversing."
// =========================
function getMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    // Need enough data for slow EMA + signal smoothing
    const minBars = slowPeriod + signalPeriod + 10;
    if (data.length < minBars) {
        return { macdLine: 0, signal: 0, histogram: 0, prevHistogram: 0 };
    }

    function calcEMA(prices, period) {
        const alpha = 2 / (period + 1);
        let ema = prices[0];
        for (let i = 1; i < prices.length; i++) {
            ema = alpha * prices[i] + (1 - alpha) * ema;
        }
        return ema;
    }

    // Build MACD line history over last (signalPeriod + 10) bars
    // so we can compute a proper signal EMA
    const historyNeeded = signalPeriod + 10;
    const macdHistory = [];

    for (let i = historyNeeded; i >= 0; i--) {
        const slice = data.slice(0, data.length - i);
        if (slice.length < slowPeriod) continue;
        const fast = calcEMA(slice.slice(-fastPeriod * 3), fastPeriod);
        const slow = calcEMA(slice.slice(-slowPeriod * 3), slowPeriod);
        macdHistory.push(fast - slow);
    }

    if (macdHistory.length < signalPeriod) {
        return { macdLine: 0, signal: 0, histogram: 0, prevHistogram: 0 };
    }

    const macdLine = macdHistory[macdHistory.length - 1];
    const signal   = calcEMA(macdHistory, signalPeriod);
    const histogram = macdLine - signal;

    // Previous histogram (one candle ago) for direction check
    const prevMacdLine    = macdHistory[macdHistory.length - 2] ?? macdLine;
    const prevSignal      = calcEMA(macdHistory.slice(0, -1), signalPeriod);
    const prevHistogram   = prevMacdLine - prevSignal;

    return { macdLine, signal, histogram, prevHistogram };
}

// =========================
// EXPORTS
// =========================
module.exports = {
    movingAverage,
    getDeviation,
    getTrendDirection,
    getATR,
    getRSI,
    getMACD
};