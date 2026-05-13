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
    //
    // Kraken public API returns
    // max 720 candles per request.
    // Interval controls history depth:
    //   60m  → ~30 days
    //   240m → ~120 days
    // =========================

    BACKTEST_INTERVAL: 60,      // 1h candles — best balance of detail vs history
    BACKTEST_CANDLES:  720,     // max Kraken returns (~30 days of 1h data)
    VERBOSE:           true,    // log every trade (set false for clean summary only)

    // =========================
    // TRADE SIZE
    // =========================

    TRADE_SIZE_USD: 250,

    // =========================
    // INDICATORS
    // =========================

    RSI_PERIOD:     14,
    RSI_OVERSOLD:   35,
    RSI_OVERBOUGHT: 65,

    // ATR in PRICE UNITS (not percent)
    // On 1h BTC candles expect $150-600 ATR
    // Raising min to 150 filters dead hours
    ATR_MIN:   150,

    CHOP_ZONE: 0.03,            // % deviation below which market is dead

    // =========================
    // SCALP MODE
    // =========================

    SCALP_ENTRY:           -0.35, // price must be 0.35% below MA to consider entry
    SCALP_SCORE_THRESHOLD:  4,    // raised from 3 — score 3 was too easy in choppy market
    SCALP_TIME_STOP:        8,    // max CANDLES to hold scalp (8h on 1h candles)
    SCALP_COOLDOWN:         15000,

    // ATR-based exits
    // At $300 ATR on $100k BTC: atrPct = 0.3%
    // TP = 0.3 * 8 = 2.4% gross, ~2.1% net after fees — viable
    // SL = 0.3 * 2.5 = 0.75% gross — R:R = 3.2:1
    ATR_SCALP_TP: 8.0,
    ATR_SCALP_SL: 2.5,

    // =========================
    // TREND MODE
    // =========================

    TREND_STRENGTH_MIN:    0.5,
    TREND_SCORE_THRESHOLD: 3,
    TREND_COOLDOWN:        60000,

    SCALP_SCORE_WEIGHT: 1,
    TREND_SCORE_WEIGHT: 1,

    // At $300 ATR: TP = 0.3 * 6 = 1.8% net, SL = 0.3 * 2 = 0.6% — R:R = 3:1
    ATR_TREND_TP: 6.0,
    ATR_TREND_SL: 2.0,

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
    // Not used by hybridStrategy
    // =========================

    BUY_THRESHOLD:    -1.5,
    SELL_THRESHOLD:    1.5,
    STOP_LOSS_PERCENT: 2
};