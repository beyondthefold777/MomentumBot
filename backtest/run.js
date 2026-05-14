const CONFIG = require("../config");

const { fetchHistoricalOHLCV } = require("./data");
const { evaluateStrategy }     = require("../strategies/hybridStrategy");
const { getMarketRegime }      = require("../utils/marketRegime");
const { getATR }               = require("../utils/indicators");

// =========================
// CONSTANTS
// =========================

const FEE_RATE    = CONFIG.FEE_RATE          || 0.001;
const SLIPPAGE    = CONFIG.SLIPPAGE          || 0.0005;
const TRADE_SIZE  = CONFIG.TRADE_SIZE_USD    || 1000;
const LEVERAGE    = CONFIG.LEVERAGE          || 1;
const LIQ_THRESH  = CONFIG.LIQUIDATION_THRESHOLD || 0.80;

// Effective exposure per trade
const EXPOSURE = TRADE_SIZE * LEVERAGE;

const TIME_STOP_CANDLES = CONFIG.SCALP_TIME_STOP || 4;

const STARTING_BALANCE = 10000;

// =========================
// BACKTEST RUNNER
// =========================

async function runBacktest() {

    // -------------------------------------------------------
    // 1. FETCH DATA
    // -------------------------------------------------------

    const candles = await fetchHistoricalOHLCV({
        pair:          "XBTUSD",
        interval:      CONFIG.BACKTEST_INTERVAL || 60,
        targetCandles: CONFIG.BACKTEST_CANDLES  || 720
    });

    if (candles.length < CONFIG.WINDOW + 50) {
        console.error(`Not enough candles (${candles.length}). Need at least ${CONFIG.WINDOW + 50}.`);
        return;
    }

    const priceHistory = candles.map(c => c.close);

    console.log(`📈 Running backtest on ${priceHistory.length} candles...`);
    console.log(`   Margin/trade: $${TRADE_SIZE} | Leverage: ${LEVERAGE}x | Exposure: $${EXPOSURE}\n`);

    // -------------------------------------------------------
    // 2. STATE
    // -------------------------------------------------------

    let balance        = STARTING_BALANCE;
    let position       = null;
    let trades         = [];
    let peakBalance    = balance;
    let maxDrawdown    = 0;
    let scalpTrades    = 0;
    let trendTrades    = 0;
    let liquidations   = 0;

    // cooldown tracking
    let trendCooldownUntil = 0;

    // =========================
    // CONSECUTIVE LOSS BRAKE
    //
    // Tracks how many losses have
    // fired back-to-back. When 2+
    // in a row, the strategy engine
    // is told to require UPTREND
    // even for high-conviction
    // score 5+ fast-track entries.
    //
    // Resets to 0 on any winning
    // trade. This stops the bot
    // from catching falling knives
    // in sustained downtrends while
    // still allowing fast-track
    // entries once conditions
    // recover.
    // =========================

    let consecutiveLosses = 0;

    // -------------------------------------------------------
    // 3. LOOP
    // -------------------------------------------------------

    for (let i = CONFIG.WINDOW; i < priceHistory.length; i++) {

        const window = priceHistory.slice(i - CONFIG.WINDOW, i);
        const price  = priceHistory[i];
        const time   = candles[i].time;

        const regime = getMarketRegime(window);
        const atr    = getATR(window);

        // -------------------------------------------------------
        // LIQUIDATION CHECK
        // Fires before anything else —
        // if unrealized loss >= 80% of margin, force liquidate
        // -------------------------------------------------------

        if (position) {
            const unrealizedPct = ((price - position.entryPrice) / position.entryPrice) * 100 * LEVERAGE;
            const unrealizedUsd = (unrealizedPct / 100) * TRADE_SIZE;

            if (unrealizedUsd <= -(TRADE_SIZE * LIQ_THRESH)) {
                const result = closeTrade(position, price, time, "LIQUIDATED");
                balance += Math.max(0, result.pnlUsd);
                trades.push(result);
                liquidations++;
                consecutiveLosses++;

                if (CONFIG.VERBOSE) {
                    console.log(
                        `💀 LIQUIDATED [${position.regime}] @ $${price.toFixed(0)}` +
                        ` | Loss: -$${Math.abs(result.pnlUsd).toFixed(2)}` +
                        ` | ${new Date(time * 1000).toISOString().slice(0, 16)}`
                    );
                }

                position = null;
                trendCooldownUntil = i + 12;
                continue;
            }
        }

        // -------------------------------------------------------
        // TIME STOP — scalp positions only
        // -------------------------------------------------------

        if (position && position.regime === "SCALP") {
            const ageCandles = i - position.entryIndex;
            if (ageCandles >= TIME_STOP_CANDLES) {
                const result = closeTrade(position, price, time, "Time stop");
                balance += result.pnlUsd;
                trades.push(result);

                // time stops count as a loss for brake purposes
                // if they closed negative, otherwise reset
                if (result.pnlUsd > 0) {
                    consecutiveLosses = 0;
                } else {
                    consecutiveLosses++;
                }

                if (CONFIG.VERBOSE) logSell(position, result);

                position = null;
                continue;
            }
        }

        // -------------------------------------------------------
        // EVALUATE SIGNAL
        // -------------------------------------------------------

        const signal = evaluateStrategy({
            price,
            history:          window,
            position:         position ? { ...position } : null,
            regime,
            atr,
            consecutiveLosses  // <-- passed in so strategy can gate on it
        });

        // -------------------------------------------------------
        // BUY — only if flat and cooldown has passed
        // -------------------------------------------------------

        if (signal.action === "BUY" && !position) {

            if (regime === "TREND" && i < trendCooldownUntil) {
                continue;
            }

            if (balance < TRADE_SIZE) {
                console.log(`⚠️  Insufficient balance ($${balance.toFixed(2)}) for margin ($${TRADE_SIZE}). Skipping.`);
                continue;
            }

            const fillPrice = price * (1 + SLIPPAGE);
            const fee       = EXPOSURE * FEE_RATE;

            balance -= fee;

            position = {
                entryPrice:  fillPrice,
                size:        EXPOSURE,
                margin:      TRADE_SIZE,
                entryTime:   time,
                entryIndex:  i,
                regime,
                fee
            };

            if (regime === "SCALP") scalpTrades++;
            if (regime === "TREND") trendTrades++;

            if (CONFIG.VERBOSE) {
                console.log(
                    `🟢 BUY  [${regime}] @ $${price.toFixed(0)}` +
                    ` | ATR: ${atr.toFixed(0)}` +
                    ` | Score: ${signal.score || signal.trendScore || '-'}` +
                    ` | Exposure: $${EXPOSURE}` +
                    ` | ${new Date(time * 1000).toISOString().slice(0, 16)}`
                );
            }
        }

        // -------------------------------------------------------
        // SELL — only if in position
        // -------------------------------------------------------

        if (signal.action === "SELL" && position) {

            if (
                position.regime === "TREND" &&
                (signal.reason === "Trend stop loss" || signal.reason === "ATR stop loss")
            ) {
                trendCooldownUntil = i + 6;
            }

            const result = closeTrade(position, price, time, signal.reason);
            balance += result.pnlUsd;
            trades.push(result);

            // =========================
            // UPDATE CONSECUTIVE LOSSES
            // Win resets the counter.
            // Any loss increments it.
            // =========================

            if (result.pnlUsd > 0) {
                consecutiveLosses = 0;
            } else {
                consecutiveLosses++;
            }

            if (CONFIG.VERBOSE) logSell(position, result);

            position = null;
        }

        // -------------------------------------------------------
        // DRAWDOWN TRACKING
        // -------------------------------------------------------

        if (balance > peakBalance) peakBalance = balance;
        const dd = ((peakBalance - balance) / peakBalance) * 100;
        if (dd > maxDrawdown) maxDrawdown = dd;
    }

    // -------------------------------------------------------
    // 4. FORCE-CLOSE OPEN POSITION AT END OF DATA
    // -------------------------------------------------------

    if (position) {
        const lastPrice = priceHistory.at(-1);
        const lastTime  = candles.at(-1).time;
        const result    = closeTrade(position, lastPrice, lastTime, "End of data");
        balance += result.pnlUsd;
        trades.push(result);
        if (CONFIG.VERBOSE) logSell(position, result);
        console.log(`⚠️  Force-closed open position at end of data.`);
    }

    // -------------------------------------------------------
    // 5. RESULTS
    // -------------------------------------------------------

    printResults({
        trades,
        balance,
        maxDrawdown,
        scalpTrades,
        trendTrades,
        liquidations,
        candles,
        priceHistory
    });
}

// =========================
// HELPERS
// =========================

function closeTrade(position, price, time, reason = "") {
    const fillPrice = price * (1 - SLIPPAGE);

    const pnlRaw    = ((fillPrice - position.entryPrice) / position.entryPrice) * position.size;
    const fee       = position.size * FEE_RATE;
    const pnlUsd    = pnlRaw - fee;

    // cap loss at full margin
    const cappedPnl = Math.max(pnlUsd, -position.margin);

    // pnl % shown as % of margin so leverage impact is visible
    const pnlPct    = (cappedPnl / position.margin) * 100;

    const duration  = (time - position.entryTime) / 60;

    return {
        entryPrice:      position.entryPrice,
        exitPrice:       fillPrice,
        pnlUsd:          cappedPnl,
        pnlPct,
        durationMinutes: duration,
        regime:          position.regime,
        reason,
        entryTime:       position.entryTime,
        exitTime:        time
    };
}

function logSell(position, result) {
    const pnlStr = result.pnlUsd >= 0
        ? `+$${result.pnlUsd.toFixed(2)}`
        : `-$${Math.abs(result.pnlUsd).toFixed(2)}`;

    console.log(
        `🔴 SELL [${position.regime}] @ $${result.exitPrice.toFixed(0)}` +
        ` | PnL: ${pnlStr} (${result.pnlPct.toFixed(3)}%)` +
        ` | Reason: ${result.reason}` +
        ` | ${result.durationMinutes.toFixed(0)}min`
    );
}

// =========================
// PRINT RESULTS
// =========================

function printResults({
    trades,
    balance,
    maxDrawdown,
    scalpTrades,
    trendTrades,
    liquidations,
    candles,
    priceHistory
}) {
    const wins      = trades.filter(t => t.pnlUsd > 0);
    const losses    = trades.filter(t => t.pnlUsd <= 0);
    const totalPnL  = trades.reduce((a, t) => a + t.pnlUsd, 0);
    const grossWins = wins.reduce((a, t) => a + t.pnlUsd, 0);
    const grossLoss = Math.abs(losses.reduce((a, t) => a + t.pnlUsd, 0));

    const winRate      = trades.length ? (wins.length / trades.length) * 100 : 0;
    const profitFactor = grossLoss > 0 ? grossWins / grossLoss : Infinity;
    const expectancy   = trades.length ? totalPnL / trades.length : 0;
    const avgWin       = wins.length   ? grossWins / wins.length   : 0;
    const avgLoss      = losses.length ? grossLoss / losses.length : 0;
    const avgDuration  = trades.length
        ? trades.reduce((a, t) => a + t.durationMinutes, 0) / trades.length
        : 0;

    const fromDate = new Date(candles[0].time * 1000).toISOString().slice(0, 10);
    const toDate   = new Date(candles.at(-1).time * 1000).toISOString().slice(0, 10);
    const bah      = ((priceHistory.at(-1) - priceHistory[0]) / priceHistory[0]) * 100;

    const reasons = {};
    trades.forEach(t => {
        if (!t.reason) return;
        reasons[t.reason] = (reasons[t.reason] || 0) + 1;
    });

    console.log("\n=========================");
    console.log("📊 BACKTEST RESULTS");
    console.log(`Period:            ${fromDate} → ${toDate}`);
    console.log(`Candles:           ${priceHistory.length}`);
    console.log(`Leverage:          ${LEVERAGE}x`);
    console.log(`Margin/Trade:      $${TRADE_SIZE}`);
    console.log(`Exposure/Trade:    $${EXPOSURE}`);
    console.log("=========================");
    console.log(`Trades:            ${trades.length}`);
    console.log(`Wins:              ${wins.length}`);
    console.log(`Losses:            ${losses.length}`);
    console.log(`Win Rate:          ${winRate.toFixed(2)}%`);
    console.log(`Liquidations:      ${liquidations}`);
    console.log("---------");
    console.log(`Total PnL:         $${totalPnL.toFixed(2)}`);
    console.log(`Starting Balance:  $${STARTING_BALANCE.toFixed(2)}`);
    console.log(`Final Balance:     $${balance.toFixed(2)}`);
    console.log(`Return:            ${(((balance - STARTING_BALANCE) / STARTING_BALANCE) * 100).toFixed(2)}%`);
    console.log(`Max Drawdown:      ${maxDrawdown.toFixed(2)}%`);
    console.log(`Profit Factor:     ${profitFactor.toFixed(2)}`);
    console.log(`Expectancy/Trade:  $${expectancy.toFixed(2)}`);
    console.log("---------");
    console.log(`Avg Winner:        $${avgWin.toFixed(2)}`);
    console.log(`Avg Loser:         -$${avgLoss.toFixed(2)}`);
    console.log(`Avg Duration:      ${(avgDuration / 60).toFixed(1)} hrs`);
    console.log("---------");
    console.log(`SCALP Trades:      ${scalpTrades}`);
    console.log(`TREND Trades:      ${trendTrades}`);
    console.log("---------");
    console.log(`Buy & Hold:        ${bah.toFixed(2)}%`);
    console.log("=========================");

    if (Object.keys(reasons).length) {
        console.log("\n📋 Exit reason breakdown:");
        Object.entries(reasons)
            .sort((a, b) => b[1] - a[1])
            .forEach(([r, n]) => console.log(`   ${n}x  ${r}`));
    }

    console.log(`\n💰 Open Position: null`);
}

module.exports = { runBacktest };
runBacktest().catch(console.error);