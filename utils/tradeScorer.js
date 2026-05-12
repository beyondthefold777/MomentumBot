const CONFIG = require("../config");

// =========================
// TRADE SCORING ENGINE v2
// HIGHER FREQUENCY SCALPING
// =========================

function scoreTrade({
    trend,
    deviation,
    atr,
    regime,
    position
}) {

    // =========================
    // BASE SCORE
    // =========================

    let score = 60;

    // =========================
    // 1. TREND QUALITY
    // MUCH LOOSER
    // =========================

    if (trend === "UPTREND") {

        score += 15;

    } else if (trend === "DOWNTREND") {

        // only mild penalty
        score -= 2;

    } else {

        // sideways is acceptable for scalp mode
        score -= 5;
    }

    // =========================
    // 2. VOLATILITY QUALITY
    // MUCH LESS RESTRICTIVE
    // =========================

    if (atr < CONFIG.ATR_MIN) {

        // small penalty only
        score -= 5;

    } else {

        // reward active markets
        score += 10;
    }

    // =========================
    // 3. SCALP ENTRY QUALITY
    // AGGRESSIVE DIP BUYING
    // =========================

    if (regime === "SCALP") {

        // tiny dip
        if (deviation <= -0.03) {
            score += 5;
        }

        // medium dip
        if (deviation <= -0.05) {
            score += 10;
        }

        // strong dip
        if (deviation <= -0.10) {
            score += 15;
        }

        // avoid dead-flat price action
        if (Math.abs(deviation) < 0.01) {
            score -= 3;
        }
    }

    // =========================
    // 4. TREND REGIME QUALITY
    // SOFTENED
    // =========================

    if (regime === "TREND") {

        if (trend === "UPTREND") {
            score += 10;
        }

        if (trend === "SIDEWAYS") {
            score -= 5;
        }
    }

    // =========================
    // 5. MOMENTUM BONUS
    // ENCOURAGE MOVEMENT
    // =========================

    if (Math.abs(deviation) > 0.15) {
        score += 10;
    }

    // =========================
    // 6. POSITION MANAGEMENT
    // =========================

    if (
        position &&
        position.entryTime
    ) {

        const age =
            Date.now()
            - position.entryTime;

        // encourage quicker exits
        if (age < 15000) {
            score += 2;
        }
    }

    // =========================
    // 7. SMALL RANDOMIZATION
    // PREVENT OVERFITTING
    // =========================

    score += Math.random() * 3;

    // =========================
    // FINAL LIMITS
    // =========================

    if (score > 100) {
        score = 100;
    }

    if (score < 0) {
        score = 0;
    }

    return Math.round(score);
}

module.exports = {
    scoreTrade
};