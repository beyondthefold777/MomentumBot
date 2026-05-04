require("dotenv").config();

const { getPrice } = require("./services/priceService");
const { evaluateStrategy } = require("./strategies/hybridStrategy");
const { executeTrade } = require("./services/tradeService");
const { getPosition, updatePosition } = require("./state/positionManager");
const { log } = require("./utils/logger");

const CONFIG = require("./config");

// In-memory price history (we'll upgrade later if needed)
let priceHistory = [];

// Main bot loop
async function runBot() {
    try {
        const price = await getPrice();
        if (!price) return;

        priceHistory.push(price);
        if (priceHistory.length > CONFIG.WINDOW) {
            priceHistory.shift();
        }

        // Wait until we have enough data
        if (priceHistory.length < CONFIG.WINDOW) {
            log("info", "Collecting data...");
            return;
        }

        const position = getPosition();

        const signal = evaluateStrategy({
            price,
            history: priceHistory,
            position
        });

        log("info", `Price: ${price} | Signal: ${signal.action}`);

        if (signal.action === "BUY" && !position) {
            const trade = await executeTrade("BUY", price);
            updatePosition(trade);
        }

        if (signal.action === "SELL" && position) {
            const trade = await executeTrade("SELL", price, position);
            updatePosition(null);
        }

    } catch (err) {
        log("error", err.message);
    }
}

// Loop
function startBot() {
    log("info", "🚀 Hybrid BTC Bot Started...");

    setInterval(runBot, CONFIG.INTERVAL);
}

startBot();