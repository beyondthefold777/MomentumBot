module.exports = {

    // =========================
    // LIVE MARKET SETTINGS
    // =========================

    SYMBOL:       "BTC-USD",
    INTERVAL:     3000,         // live bot poll interval (ms)
    WINDOW:       50,           // rolling indicator window (candles)
    TREND_WINDOW: 24,           // candles used for trend direction (24h on 1h candles)

    // =========================
    // BACKTEST SETTINGS
    // =========================

    BACKTEST_INTERVAL: 60,      // 1h candles
    BACKTEST_CANDLES:  720,     // ~30 days of 1h data
    VERBOSE:           true,

    // =========================
    // TRADE SIZE + LEVERAGE
    // =========================

    TRADE_SIZE_USD: 1000,       // margin per trade
    LEVERAGE:       5,          // 5x — effective exposure $5,000 per trade
    LIQUIDATION_THRESHOLD: 0.80, // Kraken liquidates at ~80% margin loss

    // =========================
    // INDICATORS
    // =========================

    RSI_PERIOD:     14,
    RSI_OVERSOLD:   35,
    RSI_OVERBOUGHT: 65,

    ATR_MIN:   200,             // RAISED from 150 — filters dead low-vol hours
   CHOP_ZONE: 0.15,

    // =========================
    // SCALP MODE
    // =========================

    SCALP_ENTRY:           -0.20, // loosened from -0.35 — more entries
    SCALP_SCORE_THRESHOLD:  3,    // lowered from 4 — more scalp signals
    SCALP_TIME_STOP:        4,    // max 4 candles — stays under rollover window
    SCALP_COOLDOWN:         15000,

    ATR_SCALP_TP: 8.0,
    ATR_SCALP_SL: 1.5,          // TIGHTENED from 2.0 — cut losers faster

    // =========================
    // TREND MODE
    // =========================

    TREND_STRENGTH_MIN:    0.5,
    TREND_SCORE_THRESHOLD: 4,    // raised — only high conviction entries
    TREND_COOLDOWN:        60000,

    SCALP_SCORE_WEIGHT: 1,
    TREND_SCORE_WEIGHT: 1,

    ATR_TREND_TP: 6.0,
    ATR_TREND_SL: 3.0,          // raised from 2.0 — room to breathe

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