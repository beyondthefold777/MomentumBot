const axios = require("axios");

async function getPrice() {
    try {
        // Kraken pair for Bitcoin/USD
        const response = await axios.get(
            "https://api.kraken.com/0/public/Ticker?pair=XBTUSD"
        );

        const data = response.data.result;

        // Kraken returns dynamic pair keys
        const pairKey = Object.keys(data)[0];

        // Current ask price
        const price = parseFloat(data[pairKey].c[0]);

        return price;

    } catch (err) {
        console.error("Kraken price fetch error:", err.message);
        return null;
    }
}

module.exports = {
    getPrice
};