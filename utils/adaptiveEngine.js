let stats = {
    scalpWins: 0,
    scalpLosses: 0,
    trendWins: 0,
    trendLosses: 0,
    totalTrades: 0
};

// =========================
// FEED RESULT INTO LEARNER
// =========================

function recordTrade(trade) {

    stats.totalTrades++;

    const isWin =
        parseFloat(trade.pnlUsd || 0) > 0;

    if (trade.regime === "SCALP") {
        isWin ? stats.scalpWins++ : stats.scalpLosses++;
    }

    if (trade.regime === "TREND") {
        isWin ? stats.trendWins++ : stats.trendLosses++;
    }
}

// =========================
// GET REGIME PERFORMANCE
// =========================

function getPerformance() {

    const scalpTotal =
        stats.scalpWins + stats.scalpLosses;

    const trendTotal =
        stats.trendWins + stats.trendLosses;

    return {
        scalpWinRate:
            scalpTotal ? stats.scalpWins / scalpTotal : 0,

        trendWinRate:
            trendTotal ? stats.trendWins / trendTotal : 0,

        totalTrades: stats.totalTrades
    };
}

// =========================
// ADAPTIVE SETTINGS
// =========================

function getAdaptiveConfig() {

    const perf = getPerformance();

    let scalpBias = 1;
    let trendBias = 1;

    // If scalping is bad → reduce scalp aggressiveness
    if (perf.scalpWinRate < 0.45) {
        scalpBias = 0.7;
    }

    // If trend is strong → favor trend trades
    if (perf.trendWinRate > 0.55) {
        trendBias = 1.3;
    }

    return {
        scalpBias,
        trendBias,
        perf
    };
}

module.exports = {
    recordTrade,
    getPerformance,
    getAdaptiveConfig
};