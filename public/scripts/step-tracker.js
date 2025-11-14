let steps = 0;
let distance = 0;
const goal = 5000;
let tracking = false;
let lastPosition = null;
let watchId = null;

const STEP_LENGTH = 0.78; // average walking stride (~Fitbit)
let lastStepTime = 0;

// UI select
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

// ------------------------
// GPS
// ------------------------
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

    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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
    statusText.textContent = `GPS: ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

function handleError(err) {
    statusText.textContent = "GPS error: " + err.message;
}

// ------------------------
// STEP SENSOR (Final Stable Version)
// ------------------------
async function startStepSensor() {

    // iOS permission requirement
    if (typeof DeviceMotionEvent.requestPermission === "function") {
        try {
            const res = await DeviceMotionEvent.requestPermission();
            if (res !== "granted") {
                alert("Motion permission denied.");
                return;
            }
        } catch (e) {
            alert("Error enabling motion sensors.");
            return;
        }
    }

    // Warm-up to prevent false spikes
    let warmupStart = Date.now();
    const WARMUP = 1200; // 1.2 sec

    // Step detection engine variables
    let lastZ = 0;
    let smoothZ = 0;
    const SMOOTHING = 0.18; // light smoothing

    const STEP_THRESHOLD = 1.2; // real-world walking peak on Z-axis

    window.addEventListener("devicemotion", (event) => {
        const a = event.accelerationIncludingGravity;
        if (!a) return;

        const z = Math.abs(a.z);

        // Ignore first ~1 second of sensor noise
        if (Date.now() - warmupStart < WARMUP) {
            lastZ = z;
            return;
        }

        // Light smoothing filter
        smoothZ = SMOOTHING * z + (1 - SMOOTHING) * smoothZ;

        // Step detection
        if (
            smoothZ > STEP_THRESHOLD &&
            lastZ <= STEP_THRESHOLD &&
            Date.now() - lastStepTime > 350
        ) {
            steps++;
            lastStepTime = Date.now();
            distance += STEP_LENGTH;
            updateUI();
        }

        lastZ = smoothZ;
    });

    statusText.textContent = "Step sensor active";
}

// ------------------------
// Start / Stop Button
// ------------------------
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

    // Start step detection
    await startStepSensor();

    // Start GPS
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(
            handlePosition,
            handleError,
            {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 10000
            }
        );
    } else {
        alert("Geolocation not supported.");
    }
});

updateUI();
