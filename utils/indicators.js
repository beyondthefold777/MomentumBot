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

function getTrendDirection(
    data,
    trendWindow
) {

    if (data.length < trendWindow) {
        return "SIDEWAYS";
    }

    const recentPrices =
        data.slice(-trendWindow);

    const start =
        recentPrices[0];

    const end =
        recentPrices[recentPrices.length - 1];

    const percentChange =
        ((end - start) / start) * 100;

    if (percentChange > 0.5) {
        return "UPTREND";
    }

    if (percentChange < -0.5) {
        return "DOWNTREND";
    }

    return "SIDEWAYS";
}

module.exports = {
    movingAverage,
    getDeviation,
    getTrendDirection
};