const axios = require("axios");

// =========================
// KRAKEN LIMITS
// 720 candles max per request
// Kraken `since` = unix timestamp
// meaning "give me candles FROM
// this point forward" — so to get
// older data we calculate the start
// timestamp of each page window
// and work backwards from now.
// =========================

const KRAKEN_MAX_CANDLES = 720;

async function fetchOHLCV(pair = "XBTUSD", interval = 5, since = null) {
    try {
        const url =
            `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}` +
            (since ? `&since=${since}` : "");

        const res = await axios.get(url);

        if (res.data.error && res.data.error.length) {
            console.error("Kraken API error:", res.data.error);
            return { candles: [], last: null };
        }

        const data = res.data.result;
        const key  = Object.keys(data).find(k => k !== "last");
        const last = data.last;

        const candles = data[key].map(c => ({
            time:   Number(c[0]),
            open:   parseFloat(c[1]),
            high:   parseFloat(c[2]),
            low:    parseFloat(c[3]),
            close:  parseFloat(c[4]),
            volume: parseFloat(c[6])
        }));

        return { candles, last };

    } catch (err) {
        console.error("OHLCV fetch error:", err.message);
        return { candles: [], last: null };
    }
}

// =========================
// PAGINATED FETCHER
//
// Strategy:
//   - Calculate how far back we
//     need to go in unix seconds
//   - Fetch each page by passing
//     the start timestamp of that
//     page's window as `since`
//   - Kraken returns up to 720
//     candles FROM that timestamp
//   - Work backwards page by page
//     and assemble in order
// =========================

async function fetchHistoricalOHLCV({
    pair          = "XBTUSD",
    interval      = 5,
    targetCandles = 5000,
    delayMs       = 1200
} = {}) {

    const intervalSeconds = interval * 60;
    const totalSeconds    = targetCandles * intervalSeconds;
    const nowSeconds      = Math.floor(Date.now() / 1000);
    const pages           = Math.ceil(targetCandles / KRAKEN_MAX_CANDLES);

    console.log(`📡 Fetching ~${targetCandles} candles (${interval}m) for ${pair}`);
    console.log(`   Pages needed: ${pages} @ ${KRAKEN_MAX_CANDLES} candles/page`);
    console.log(`   Date range:   ~${new Date((nowSeconds - totalSeconds) * 1000).toISOString().slice(0,10)} → now\n`);

    let allCandles = [];

    for (let page = 0; page < pages; page++) {

        if (page > 0) await sleep(delayMs);

        // Start of this page's window, working backwards from now
        // Page 0 = most recent 720, page 1 = next 720 back, etc.
        const sinceTs = nowSeconds - totalSeconds + (page * KRAKEN_MAX_CANDLES * intervalSeconds);

        const result = await fetchOHLCV(pair, interval, sinceTs);

        if (!result.candles.length) {
            console.log(`   Page ${page + 1}: no data returned, stopping early.`);
            break;
        }

        allCandles = [...allCandles, ...result.candles];

        console.log(
            `   Page ${page + 1}: +${result.candles.length} candles` +
            ` | ${new Date(result.candles[0].time * 1000).toISOString().slice(0,16)}` +
            ` → ${new Date(result.candles.at(-1).time * 1000).toISOString().slice(0,16)}`
        );
    }

    // Deduplicate and sort chronologically
    const seen = new Set();
    allCandles = allCandles
        .filter(c => {
            if (seen.has(c.time)) return false;
            seen.add(c.time);
            return true;
        })
        .sort((a, b) => a.time - b.time);

    // Trim to exact target keeping most recent
    if (allCandles.length > targetCandles) {
        allCandles = allCandles.slice(-targetCandles);
    }

    console.log(`\n✅ Fetched ${allCandles.length} candles total`);
    console.log(`   From: ${new Date(allCandles[0].time * 1000).toISOString()}`);
    console.log(`   To:   ${new Date(allCandles.at(-1).time * 1000).toISOString()}\n`);

    return allCandles;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    fetchOHLCV,
    fetchHistoricalOHLCV
};