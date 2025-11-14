let steps = 0;
let distance = 0;
const goal = 5000;
let tracking = false;
let lastPosition = null;
let watchId = null;

const STEP_LENGTH = 0.78;
let lastStepTime = 0;

// Warm-up control
let motionStartTime = 0;
const WARMUP_TIME = 1000; // 1 second ignore period

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

// GPS functions
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
        const d = getDistance(lastPosition.lat, lastPosition.lon, latitude, longitude);
        if (d > 2) {
            distance += d;
            updateUI();
        }
    }

    lastPosition = { lat: latitude, lon: longitude };
    statusText.textContent = `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

// ------------------------------------------------------
// STEP DETECTION (Fitbit-like)
// ------------------------------------------------------
async function startStepSensor() {

    // Reset filters on each start
    let hpX = 0, hpY = 0, hpZ = 0;
    let smooth = 0;
    let avgPeak = 1.0;
    let lastAccel = 0;

    motionStartTime = Date.now(); // begin warm-up

    if (typeof DeviceMotionEvent.requestPermission === "function") {
        const result = await DeviceMotionEvent.requestPermission();
        if (result !== "granted") {
            alert("Motion permission denied.");
            return;
        }
    }

    const HP_ALPHA = 0.90;
    const LP_ALPHA = 0.25;

    window.addEventListener("devicemotion", (event) => {
        const a = event.accelerationIncludingGravity;
        if (!a) return;

        // Ignore first 1 second of readings — prevent fake steps
        if (Date.now() - motionStartTime < WARMUP_TIME) {
            lastAccel = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);
            return;
        }

        // High-pass filter
        hpX = HP_ALPHA * (hpX + a.x - lastAccel);
        hpY = HP_ALPHA * (hpY + a.y - lastAccel);
        hpZ = HP_ALPHA * (hpZ + a.z - lastAccel);

        const mag = Math.sqrt(hpX * hpX + hpY * hpY + hpZ * hpZ);

        // Low-pass smoothing
        smooth = LP_ALPHA * mag + (1 - LP_ALPHA) * smooth;

        // Dynamic threshold
        avgPeak = avgPeak * 0.98 + smooth * 0.02;
        const threshold = avgPeak * 1.25;

        // Step detection (no false early triggers)
        if (
            smooth > threshold &&
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
// Start/Stop button
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
    statusText.textContent = "Initializing sensors…";

    steps = steps; // keep step count but prevent jump

    await startStepSensor();

    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
            enableHighAccuracy: true,
            maximumAge: 1000,
            timeout: 10000
        });
    }
});

updateUI();
