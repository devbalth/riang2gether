let steps = 0;
let distance = 0;
const goal = 5000;
let tracking = false;
let lastPosition = null;
let watchId = null;

const STEP_LENGTH = 0.78; // average real-world walking stride (Fitbit range)
let lastStepTime = 0;

// UI elements
const stepCountEl = document.getElementById("stepCount");
const distanceEl = document.getElementById("distance");
const progressBar = document.getElementById("progressBar");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("statusText");

function updateUI() {
    stepCountEl.textContent = steps;
    distanceEl.textContent = (distance / 1000).toFixed(2) + " km";
    progressBar.style.width = Math.min((steps / goal) * 100, 100) + "%";
}

// ----------------------------
// GPS / Haversine
// ----------------------------
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const toRad = deg => (deg * Math.PI) / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function handlePosition(position) {
    const { latitude, longitude } = position.coords;

    if (lastPosition) {
        const d = getDistance(
            lastPosition.lat,
            lastPosition.lon,
            latitude,
            longitude
        );

        if (d > 2) {
            distance += d;
            updateUI();
        }
    }

    lastPosition = { lat: latitude, lon: longitude };
    statusText.textContent = `GPS: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
}

function handleError(err) {
    statusText.textContent = "GPS error: " + err.message;
}

// ------------------------------------------------------
// 🚀 FITBIT-LEVEL STEP DETECTION ENGINE
// ------------------------------------------------------
async function startStepSensor() {

    // iOS Permission (must be inside a click)
    if (typeof DeviceMotionEvent.requestPermission === "function") {
        try {
            const result = await DeviceMotionEvent.requestPermission();
            if (result !== "granted") {
                alert("Motion permission denied.");
                return;
            }
        } catch (e) {
            alert("Motion sensor error.");
            return;
        }
    }

    let lastAccel = 0;

    // High-pass filter (remove gravity)
    let hpX = 0, hpY = 0, hpZ = 0;
    const HP_ALPHA = 0.90; // bigger = more gravity removed

    // Low-pass smoothing (EMA)
    let smooth = 0;
    const LP_ALPHA = 0.25;

    // Dynamic thresholding (automatically adjusts like Fitbit)
    let threshold = 1.0;  // starting threshold
    let avgPeak = 1.0;

    window.addEventListener("devicemotion", (event) => {
        const a = event.accelerationIncludingGravity;
        if (!a) return;

        // High-pass filter – remove gravity (Fitbit uses similar method)
        hpX = HP_ALPHA * (hpX + a.x - lastAccel);
        hpY = HP_ALPHA * (hpY + a.y - lastAccel);
        hpZ = HP_ALPHA * (hpZ + a.z - lastAccel);

        // Magnitude after filtering
        const mag = Math.sqrt(hpX * hpX + hpY * hpY + hpZ * hpZ);

        // Smooth (low-pass)
        smooth = LP_ALPHA * mag + (1 - LP_ALPHA) * smooth;

        // Dynamically adjust threshold
        avgPeak = avgPeak * 0.98 + smooth * 0.02;
        const dynamicThreshold = avgPeak * 1.25; // Peak must exceed average noise

        // STEP DETECT
        if (
            smooth > dynamicThreshold &&
            Date.now() - lastStepTime > 350
        ) {
            steps++;
            lastStepTime = Date.now();
            distance += STEP_LENGTH;
            updateUI();
        }

        lastAccel = mag;
    });

    statusText.textContent = "Motion sensor active";
}

// ------------------------------------------------------
// Start/Stop tracking button
// ------------------------------------------------------
startBtn.addEventListener("click", async () => {

    if (tracking) {
        tracking = false;
        startBtn.textContent = "Start Tracking";
        statusText.textContent = "Stopped";

        if (watchId) navigator.geolocation.clearWatch(watchId);
        return;
    }

    tracking = true;
    startBtn.textContent = "Stop Tracking";
    statusText.textContent = "Requesting permissions...";

    await startStepSensor();

    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000
        });
    } else {
        alert("Geolocation not supported.");
    }
});

updateUI();
