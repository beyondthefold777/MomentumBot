module.exports = {

    // =========================
    // MARKET SETTINGS
    // =========================

    SYMBOL: "BTC-USD",

    INTERVAL: 3000,
    WINDOW: 50,
    TREND_WINDOW: 25,

    // =========================
    // TRADE SIZE
    // =========================

    TRADE_SIZE_USD: 250,

    // =========================
    // LEGACY THRESHOLDS (optional fallback system)
    // =========================

    BUY_THRESHOLD: -1.5,
    SELL_THRESHOLD: 1.5,
    STOP_LOSS_PERCENT: 2,

    // =========================
    // INDICATORS
    // =========================

    RSI_PERIOD: 14,

    // ATR is now in PRICE UNITS (NOT percent)
    ATR_MIN: 20,

    CHOP_ZONE: 0.03,

    // =========================
    // SCALP MODE
    // =========================

    SCALP_ENTRY: -0.25,

    SCALP_SCORE_THRESHOLD: 3,

    // ATR-based exits (scaled to BTC properly)
    ATR_SCALP_TP: 1.8,
    ATR_SCALP_SL: 1.2,

    SCALP_COOLDOWN: 15000,

    // =========================
    // TREND MODE
    // =========================

    TREND_STRENGTH_MIN: 0.5,

    SCALP_SCORE_WEIGHT: 1,
    TREND_SCORE_WEIGHT: 1,

    ATR_TREND_TP: 3.0,
    ATR_TREND_SL: 1.5,

    TREND_COOLDOWN: 60000,

    // =========================
    // RISK CONTROLS
    // =========================

    USE_DYNAMIC_POSITION_SIZING: false,

    RISK_PER_TRADE: 0.01,

    MAX_DAILY_DRAWDOWN: 0.05,
    MAX_OPEN_TRADES: 1,

    // =========================
    // EXECUTION
    // =========================

    SLIPPAGE: 0.0005,
    FEE_RATE: 0.001
};