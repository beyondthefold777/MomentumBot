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
    const end = recent[recent.length - 1];

    const percentChange =
        ((end - start) / start) * 100;

    if (percentChange > 0.4) return "UPTREND";
    if (percentChange < -0.4) return "DOWNTREND";

    return "SIDEWAYS";
}

// =========================
// ATR (VOLATILITY)
// =========================

function getATR(data, period = 14) {
    if (data.length < period + 1) return 0;

    let trValues = [];

    for (let i = 1; i < data.length; i++) {
        const current = data[i];
        const previous = data[i - 1];

        const tr = Math.abs(current - previous);
        trValues.push(tr);
    }

    const recentTR = trValues.slice(-period);

    const atr =
        recentTR.reduce((a, b) => a + b, 0) /
        recentTR.length;

    return atr;
}

// =========================
// RSI (RELATIVE STRENGTH INDEX) 🔥 NEW
// =========================

function getRSI(data, period = 14) {
    if (data.length < period + 1) return 50;

    let gains = 0;
    let losses = 0;

    for (let i = data.length - period; i < data.length; i++) {
        const change = data[i] - data[i - 1];

        if (change > 0) gains += change;
        else losses += Math.abs(change);
    }

    const avgGain = gains / period;
    const avgLoss = losses / period;

    if (avgLoss === 0) return 100;

    const rs = avgGain / avgLoss;
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