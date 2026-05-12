const axios = require("axios");

async function fetchOHLCV(pair = "XBTUSD", interval = 5, since = null) {
    try {
        const url =
            `https://api.kraken.com/0/public/OHLC?pair=${pair}&interval=${interval}` +
            (since ? `&since=${since}` : "");

        const res = await axios.get(url);

        const data = res.data.result;

        const key = Object.keys(data).find(k => k !== "last");

        const candles = data[key].map(c => ({
            time: Number(c[0]),
            open: parseFloat(c[1]),
            high: parseFloat(c[2]),
            low: parseFloat(c[3]),
            close: parseFloat(c[4]),
            volume: parseFloat(c[6])
        }));

        return candles;

    } catch (err) {
        console.error("OHLCV fetch error:", err.message);
        return [];
    }
}

module.exports = {
    fetchOHLCV
};