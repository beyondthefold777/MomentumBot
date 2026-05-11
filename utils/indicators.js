function movingAverage(data) {

    if (!data.length) {
        return 0;
    }

    const sum = data.reduce(
        (acc, value) => acc + value,
        0
    );

    return sum / data.length;
}

function getDeviation(price, average) {

    return (
        ((price - average) / average) * 100
    );
}

// =========================
// TREND DIRECTION (IMPROVED)
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

    // slightly tighter logic for scalping/trend switching
    if (percentChange > 0.4) {
        return "UPTREND";
    }

    if (percentChange < -0.4) {
        return "DOWNTREND";
    }

    return "SIDEWAYS";
}

// =========================
// ATR (VOLATILITY ENGINE) 🔥
// =========================

function getATR(data, period = 14) {

    if (data.length < period + 1) {
        return 0;
    }

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

module.exports = {
    movingAverage,
    getDeviation,
    getTrendDirection,
    getATR
};