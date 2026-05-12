const axios = require("axios");

// =========================
// FETCH BTC PRICE
// =========================

async function getPrice(retries = 2) {

    try {

        const start = Date.now();

        const response = await axios.get(
            "https://api.kraken.com/0/public/Ticker?pair=XBTUSD",
            {
                timeout: 5000
            }
        );

        const duration = Date.now() - start;

        const data = response.data.result;

        if (!data) {
            throw new Error("Invalid Kraken response");
        }

        // Kraken uses dynamic pair names
        const pairKey = Object.keys(data)[0];

        const price =
            parseFloat(data[pairKey].c[0]);

        if (!price || isNaN(price)) {
            throw new Error("Invalid BTC price");
        }

        console.log(
            `⚡ Kraken API latency: ${duration}ms`
        );

        return price;

    } catch (err) {

        console.error(
            `❌ Kraken price fetch error: ${err.message}`
        );

        // Retry logic
        if (retries > 0) {

            console.log(
                `🔄 Retrying price fetch... (${retries} left)`
            );

            return await getPrice(retries - 1);
        }

        return null;
    }
}

module.exports = {
    getPrice
};