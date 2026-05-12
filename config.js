module.exports = {

    // =========================
    // MARKET SETTINGS
    // =========================

    SYMBOL: "BTC-USD",

    // Faster loop for scalp reactions
    INTERVAL: 3000,

    // Candle/price memory
    WINDOW: 50,

    // Trend detection lookback
    TREND_WINDOW: 25,

    // =========================
    // TRADE SIZE
    // =========================

    TRADE_SIZE_USD: 250,

    // =========================
    // LEGACY FALLBACK SETTINGS
    // =========================

    BUY_THRESHOLD: -1.5,
    SELL_THRESHOLD: 1.5,
    STOP_LOSS_PERCENT: 2,

    // =========================
    // ATR VOLATILITY ENGINE
    // =========================

    // Lowered so bot trades more often
    ATR_MIN: 0.15,

    // Smaller chop filter
    CHOP_ZONE: 0.02,

    // =========================
    // SCALP MODE
    // =========================

    // Easier entry trigger
    SCALP_ENTRY: -0.02,

    // =========================
    // ATR-BASED EXITS
    // =========================

    // Hold winners longer
    ATR_SCALP_TP: 2.0,

    // Cut losers faster
    ATR_SCALP_SL: 0.35,

    // Cooldown after scalp trades
    SCALP_COOLDOWN: 15000,

    // =========================
    // TREND MODE
    // =========================

    ATR_TREND_TP: 2.5,

    ATR_TREND_SL: 1.2,

    // Ignore weak trends
    TREND_STRENGTH_MIN: 0.4,

    TREND_COOLDOWN: 60000,

    // =========================
    // TRADE QUALITY FILTERS
    // =========================

    // Lowered so system is less hesitant
    MIN_SCALP_SCORE: 40,

    MIN_TREND_SCORE: 50,

    // =========================
    // POSITION SIZING
    // =========================

    // Future ATR position sizing
    USE_DYNAMIC_POSITION_SIZING: false,

    // Future risk engine
    RISK_PER_TRADE: 0.01,

    // =========================
    // BACKTEST SETTINGS
    // =========================

    // Simulated spread/slippage
    SLIPPAGE: 0.0005,

    // Exchange fee simulation
    FEE_RATE: 0.001,

    // =========================
    // GLOBAL RISK CONTROLS
    // =========================

    MAX_DAILY_DRAWDOWN: 0.05,

    MAX_OPEN_TRADES: 1
};