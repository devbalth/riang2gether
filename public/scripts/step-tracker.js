let steps = 0;
let distance = 0;
const goal = 5000;
let tracking = false;
let lastPosition = null;
let watchId = null;
const STEP_LENGTH = 0.8; // average meters per step
let lastStepTime = 0;

const stepCountEl = document.getElementById("stepCount");
const distanceEl = document.getElementById("distance");
const progressBar = document.getElementById("progressBar");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("statusText");

function updateUI() {
    stepCountEl.textContent = steps;
    const km = (distance / 1000).toFixed(2);
    distanceEl.textContent = `${km} km`;
    const progress = Math.min((steps / goal) * 100, 100);
    progressBar.style.width = progress + "%";
}

// Haversine distance
function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const φ1 = toRad(lat1);
    const φ2 = toRad(lat2);
    const Δφ = toRad(lat2 - lat1);
    const Δλ = toRad(lon2 - lon1);
    const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Handle GPS position
function handlePosition(position) {
    const { latitude, longitude } = position.coords;
    if (lastPosition) {
    const d = getDistance(
        lastPosition.lat,
        lastPosition.lon,
        latitude,
        longitude
    );
    // Ignore GPS jitter < 2 m
    if (d > 2) {
        distance += d;
        updateUI();
    }
    }
    lastPosition = { lat: latitude, lon: longitude };
    statusText.textContent = `Tracking... (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`;
}

function handleError(err) {
    statusText.textContent = "GPS error: " + err.message;
}

// Accelerometer step detection
function startStepSensor() {
    if ("LinearAccelerationSensor" in window) {
    try {
        const sensor = new LinearAccelerationSensor({ frequency: 60 });
        let lastAccel = 0;

        sensor.addEventListener("reading", () => {
        const totalAccel = Math.sqrt(
            sensor.x ** 2 + sensor.y ** 2 + sensor.z ** 2
        );

        // Step threshold: detect peaks above 12 m/s², separated by at least 300ms
        if (
            totalAccel > 12 &&
            lastAccel <= 12 &&
            Date.now() - lastStepTime > 300
        ) {
            steps++;
            lastStepTime = Date.now();
            distance = steps * STEP_LENGTH;
            updateUI();
        }
        lastAccel = totalAccel;
        });

        sensor.addEventListener("error", (e) => {
        statusText.textContent = "Accelerometer error: " + e.error;
        });

        sensor.start();
        statusText.textContent = "Accelerometer active";
    } catch (err) {
        statusText.textContent = "Accelerometer not supported.";
    }
    } else if ("DeviceMotionEvent" in window) {
    // Fallback for browsers without Generic Sensor API
    let lastAccel = 0;
    window.addEventListener("devicemotion", (event) => {
        const a = event.accelerationIncludingGravity;
        if (!a) return;
        const totalAccel = Math.sqrt(a.x ** 2 + a.y ** 2 + a.z ** 2);
        if (
        totalAccel > 12 &&
        lastAccel <= 12 &&
        Date.now() - lastStepTime > 300
        ) {
        steps++;
        lastStepTime = Date.now();
        distance = steps * STEP_LENGTH;
        updateUI();
        }
        lastAccel = totalAccel;
    });
    statusText.textContent = "DeviceMotion active";
    } else {
    alert("This device does not support motion sensors.");
    }
}

startBtn.addEventListener("click", () => {
    if (tracking) {
    tracking = false;
    startBtn.textContent = "Start Tracking";
    statusText.textContent = "Stopped";
    if (watchId) navigator.geolocation.clearWatch(watchId);
    } else {
    tracking = true;
    startBtn.textContent = "Stop Tracking";
    statusText.textContent = "Requesting permissions...";

    // Start accelerometer step detection
    startStepSensor();

    // Start GPS tracking
    if (navigator.geolocation) {
        watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
        enableHighAccuracy: true,
        maximumAge: 1000,
        timeout: 10000,
        });
    } else {
        alert("Geolocation not supported on this device.");
    }
    }
});

updateUI();