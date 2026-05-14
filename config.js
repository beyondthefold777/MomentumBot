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
    // TRADE SIZE
    // =========================

    TRADE_SIZE_USD: 5000,       // RAISED from 250 — full position sizing

    // =========================
    // INDICATORS
    // =========================

    RSI_PERIOD:     14,
    RSI_OVERSOLD:   35,
    RSI_OVERBOUGHT: 65,

    ATR_MIN:   150,             // filters dead low-vol hours
    CHOP_ZONE: 0.03,            // % deviation below which market is dead

    // =========================
    // SCALP MODE
    // =========================

    SCALP_ENTRY:           -0.20, // LOOSENED from -0.35 — more entry opportunities
    SCALP_SCORE_THRESHOLD:  3,    // LOWERED from 4 — more scalp signals
    SCALP_TIME_STOP:        4,    // LOWERED from 8 — max 4h, avoids rollover fees
    SCALP_COOLDOWN:         15000,

    // At $300 ATR on $100k BTC: atrPct = 0.3%
    // TP = 0.3 * 5 = 1.5% gross = $75 on $5k trade
    // SL = 0.3 * 2 = 0.6% gross = $30 on $5k trade — R:R = 2.5:1
    ATR_SCALP_TP: 5.0,
    ATR_SCALP_SL: 2.0,

    // =========================
    // TREND MODE
    // =========================

    TREND_STRENGTH_MIN:    0.5,
    TREND_SCORE_THRESHOLD: 4,    // RAISED from 3 — only high conviction trends
    TREND_COOLDOWN:        60000,

    SCALP_SCORE_WEIGHT: 1,
    TREND_SCORE_WEIGHT: 1,

    // TP = 0.3 * 6 = 1.8% = $90 on $5k — only take strong trend setups
    // SL = 0.3 * 3 = 0.9% = $45 on $5k — R:R = 2:1
    ATR_TREND_TP: 6.0,
    ATR_TREND_SL: 3.0,          // RAISED from 2.0 — stops noise wicking you out

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

    SLIPPAGE: 0.0005,           // 0.05% per side
    FEE_RATE: 0.001,            // 0.1% per side (Kraken taker fee)

    // =========================
    // LEGACY THRESHOLDS
    // =========================

    BUY_THRESHOLD:    -1.5,
    SELL_THRESHOLD:    1.5,
    STOP_LOSS_PERCENT: 2
};