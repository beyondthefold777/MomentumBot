module.exports = {
    SYMBOL: "BTC-USD",

    INTERVAL: 5000, // 5 seconds

    WINDOW: 40, // moving average window

    BUY_THRESHOLD: -1.5, // % below MA
    SELL_THRESHOLD: 1.5, // % above MA

    STOP_LOSS_PERCENT: 2,

    TRADE_SIZE_USD: 250,

    TREND_WINDOW: 20,

    COOLDOWN_MS: 60000 // 1 minute
};