module.exports = {

    // =========================
    // MARKET SETTINGS
    // =========================

    SYMBOL: "BTC-USD",

    INTERVAL: 3000, // faster reaction for scalping

    WINDOW: 50, // more data for regime + ATR stability

    TREND_WINDOW: 25,

    // =========================
    // TRADE SIZE
    // =========================

    TRADE_SIZE_USD: 250,

    // =========================
    // LEGACY (fallback logic only)
    // =========================

    BUY_THRESHOLD: -1.5,
    SELL_THRESHOLD: 1.5,
    STOP_LOSS_PERCENT: 2,

    // =========================
    // SCALP MODE (ATR-based logic)
    // =========================

    SCALP_BUY_THRESHOLD: -0.05,

    ATR_MULTIPLIER_SCALP: 0.8,   // take profit scaling
    SCALP_SL_MULTIPLIER: 0.5,    // tighter stop loss

    // =========================
    // TREND MODE (ATR-based logic)
    // =========================

    ATR_MULTIPLIER_TREND: 2.5,   // larger moves
    TREND_SL_MULTIPLIER: 1.2,    // wider stop loss

    // =========================
    // RISK CONTROL
    // =========================

    COOLDOWN_MS: 30000 // prevent overtrading
};