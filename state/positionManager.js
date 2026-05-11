let currentPosition = null;

// =========================
// GET CURRENT POSITION
// =========================

function getPosition() {
    return currentPosition;
}

// =========================
// UPDATE POSITION
// =========================

function updatePosition(positionData) {
    currentPosition = positionData;
}

// =========================
// CLEAR POSITION
// =========================

function clearPosition() {
    currentPosition = null;
}

module.exports = {
    getPosition,
    updatePosition,
    clearPosition
};