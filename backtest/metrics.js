function calculateStats(trades, balance) {

    const sells = trades.filter(t => t.type === "SELL");

    // =========================
    // NORMALIZATION LAYER (CRITICAL)
    // =========================
    const normalized = sells.map(t => ({
        pnl: Number(t.pnlUsd ?? t.pnl ?? 0),
        regime: t.regime || "UNKNOWN",
        duration: Number(t.durationMinutes ?? 0)
    }));

    // =========================
    // BASIC METRICS
    // =========================

    const wins = normalized.filter(t => t.pnl > 0).length;
    const losses = normalized.filter(t => t.pnl <= 0).length;

    const totalPnL = normalized.reduce(
        (acc, t) => acc + t.pnl,
        0
    );

    const winRate =
        normalized.length
            ? (wins / normalized.length) * 100
            : 0;

    // =========================
    // REGIME BREAKDOWN
    // =========================

    const scalpTrades =
        normalized.filter(t => t.regime === "SCALP");

    const trendTrades =
        normalized.filter(t => t.regime === "TREND");

    // =========================
    // WIN/LOSS STATS
    // =========================

    const winners = normalized.filter(t => t.pnl > 0);
    const losers = normalized.filter(t => t.pnl <= 0);

    const avgWinner =
        winners.length
            ? winners.reduce((a, b) => a + b.pnl, 0) / winners.length
            : 0;

    const avgLoser =
        losers.length
            ? losers.reduce((a, b) => a + b.pnl, 0) / losers.length
            : 0;

    // =========================
    // EXPECTANCY
    // =========================

    const expectancy =
        normalized.length
            ? totalPnL / normalized.length
            : 0;

    // =========================
    // AVG DURATION
    // =========================

    const avgDuration =
        normalized.length
            ? normalized.reduce((a, b) => a + b.duration, 0) /
              normalized.length
            : 0;

    // =========================
    // FINAL OUTPUT
    // =========================

    return {
        trades: normalized.length,
        wins,
        losses,
        winRate: winRate.toFixed(2),

        totalPnL: totalPnL.toFixed(2),
        finalBalance: balance.toFixed(2),

        expectancyPerTrade: expectancy.toFixed(2),

        averageWinner: avgWinner.toFixed(2),
        averageLoser: avgLoser.toFixed(2),

        averageTradeDuration: avgDuration.toFixed(2),

        scalpTrades: scalpTrades.length,
        trendTrades: trendTrades.length
    };
}

module.exports = {
    calculateStats
};