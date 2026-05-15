module.exports = {
    // =========================
    // LIVE MARKET SETTINGS
    // =========================
    SYMBOL:       "BTC-USD",
    INTERVAL:     3000,
    WINDOW:       50,
    TREND_WINDOW: 12,

    // =========================
    // BACKTEST SETTINGS
    // =========================
    BACKTEST_INTERVAL: 60,
    BACKTEST_CANDLES:  720,     // ~30 days of 1h data
    VERBOSE:           true,

    // =========================
    // TRADE SIZE + LEVERAGE
    // =========================
    TRADE_SIZE_USD: 1000,
    LEVERAGE:       5,
    LIQUIDATION_THRESHOLD: 0.80,

    // =========================
    // INDICATORS
    // =========================
    RSI_PERIOD:     14,
    RSI_OVERSOLD:   42,
    RSI_OVERBOUGHT: 65,
    ATR_MIN:        175,        // v7.6: raised from 150 — ATR 98/136/146/147 entries all lost

    CHOP_ZONE: 0.15,

    // =========================
    // MACD SETTINGS
    // v7.6: NEW
    // Standard 12/26/9 — widely used,
    // matches TradingView default.
    // Histogram direction is used as
    // a momentum confirmation gate on
    // all scalp entries.
    // =========================
    MACD_FAST:   12,
    MACD_SLOW:   26,
    MACD_SIGNAL:  9,

    // =========================
    // SCALP MODE
    // =========================
    SCALP_ENTRY:           -0.15,
    SCALP_SCORE_THRESHOLD:  4,
    SCALP_TIME_STOP:        6,
    SCALP_COOLDOWN:         15000,
    ATR_SCALP_TP: 3.5,
    ATR_SCALP_SL: 0.9,

    // =========================
    // TREND MODE
    // v7.6: DISABLED
    // 5 trend trades, 0 wins, -$166 net.
    // Trend logic does not fit 1h BTC
    // in current market conditions.
    // Re-enable by setting to true.
    // =========================
    TREND_ENABLED:         false,
    TREND_STRENGTH_MIN:    0.5,
    TREND_SCORE_THRESHOLD: 5,
    TREND_COOLDOWN:        60000,
    SCALP_SCORE_WEIGHT: 1,
    TREND_SCORE_WEIGHT: 1,
    ATR_TREND_TP: 6.0,
    ATR_TREND_SL: 3.0,

    // =========================
    // RISK CONTROLS
    // =========================
    USE_DYNAMIC_POSITION_SIZING: false,
    RISK_PER_TRADE:     0.01,
    MAX_DAILY_DRAWDOWN: 0.05,
    MAX_OPEN_TRADES:    1,

    // =========================
    // EXECUTION COSTS
    // =========================
    SLIPPAGE: 0.0005,
    FEE_RATE: 0.001,

    // =========================
    // LEGACY THRESHOLDS
    // =========================
    BUY_THRESHOLD:    -1.5,
    SELL_THRESHOLD:    1.5,
    STOP_LOSS_PERCENT: 2
};