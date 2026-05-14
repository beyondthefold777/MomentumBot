// =========================
// MOVING AVERAGE (EMA)
//
// Switched from SMA to EMA —
// weights recent candles heavier
// so deviation signals reflect
// current price action, not
// 50-bar-old history equally.
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
//
// Raised threshold from 0.4%
// to 1.0% — on BTC a 0.4% move
// over 24h is noise, not a trend.
// This stops UPTREND firing
// constantly and inflating
// trend score on every candle.
// =========================

function getTrendDirection(data, trendWindow) {
    if (data.length < trendWindow) {
        return "SIDEWAYS";
    }

    const recent = data.slice(-trendWindow);
    const start  = recent[0];
    const end    = recent[recent.length - 1];

    const percentChange = ((end - start) / start) * 100;

    if (percentChange >  1.0) return "UPTREND";
    if (percentChange < -1.0) return "DOWNTREND";

    return "SIDEWAYS";
}

// =========================
// ATR (AVERAGE TRUE RANGE)
//
// Uses only close prices since
// that's all the backtest passes
// in. High/low would be more
// accurate but requires candle
// objects — flagged for future
// improvement.
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
//
// Wilder's smoothed method —
// matches TradingView output.
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