let steps = 0;
let distance = 0;
const goal = 5000;
let tracking = false;
let lastPosition = null;
let watchId = null;

const STEP_LENGTH = 0.8; // meters per step
let lastStepTime = 0;

// UI Elements
const stepCountEl = document.getElementById("stepCount");
const distanceEl = document.getElementById("distance");
const progressBar = document.getElementById("progressBar");
const startBtn = document.getElementById("startBtn");
const statusText = document.getElementById("statusText");

// -------------------------
// UI UPDATE FUNCTION
// -------------------------
function updateUI() {
    stepCountEl.textContent = steps;
    const km = (distance / 1000).toFixed(2);
    distanceEl.textContent = `${km} km`;
    const progress = Math.min((steps / goal) * 100, 100);
    progressBar.style.width = progress + "%";
}

// -------------------------
// HAVERSINE DISTANCE
// -------------------------
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
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// -------------------------
// GPS POSITION HANDLING
// -------------------------
function handlePosition(position) {
    const { latitude, longitude } = position.coords;

    if (lastPosition) {
        const d = getDistance(
            lastPosition.lat,
            lastPosition.lon,
            latitude,
            longitude
        );

        // Ignore jitter < 2m
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

// -------------------------
// STEP SENSOR (FALLBACK + PERMISSIONS)
// -------------------------
async function startStepSensor() {
    // -------------------------
    // 1. Generic Sensor API (rarely supported)
    // -------------------------
    if ("LinearAccelerationSensor" in window) {
        try {
            const sensor = new LinearAccelerationSensor({ frequency: 60 });
            let lastAccel = 0;

            sensor.addEventListener("reading", () => {
                const totalAccel = Math.sqrt(
                    sensor.x ** 2 + sensor.y ** 2 + sensor.z ** 2
                );

                if (
                    totalAccel > 3 &&
                    lastAccel <= 3 &&
                    Date.now() - lastStepTime > 250
                ) {
                    steps++;
                    lastStepTime = Date.now();
                    distance += STEP_LENGTH;
                    updateUI();
                }

                lastAccel = totalAccel;
            });

            sensor.addEventListener("error", e => {
                statusText.textContent = "Accelerometer error: " + e.error;
            });

            sensor.start();
            statusText.textContent = "Accelerometer active";
            return;
        } catch (e) {
            statusText.textContent = "Accelerometer not supported.";
        }
    }

    // -------------------------
    // 2. DeviceMotion API with iOS permission
    // -------------------------
    if ("DeviceMotionEvent" in window) {
        // iOS Motion Permission
        if (typeof DeviceMotionEvent.requestPermission === "function") {
            try {
                const permission = await DeviceMotionEvent.requestPermission();
                if (permission !== "granted") {
                    statusText.textContent = "Motion permission denied";
                    return;
                }
            } catch (err) {
                statusText.textContent = "Motion permission error";
                return;
            }
        }

        // Now we can listen for motion events
        let lastAccel = 0;

        window.addEventListener("devicemotion", event => {
            const a = event.accelerationIncludingGravity;
            if (!a) return;

            const totalAccel = Math.sqrt(a.x*a.x + a.y*a.y + a.z*a.z);

            // Peak detection
            if (
                totalAccel > 3 &&
                lastAccel <= 3 &&
                Date.now() - lastStepTime > 250
            ) {
                steps++;
                lastStepTime = Date.now();
                distance += STEP_LENGTH;
                updateUI();
            }

            lastAccel = totalAccel;
        });

        statusText.textContent = "DeviceMotion active";
        return;
    }

    alert("This device does not support motion sensors.");
}

// -------------------------
// START/STOP BUTTON
// -------------------------
startBtn.addEventListener("click", () => {
    if (tracking) {
        tracking = false;
        startBtn.textContent = "Start Tracking";
        statusText.textContent = "Stopped";

        if (watchId) {
            navigator.geolocation.clearWatch(watchId);
        }

    } else {
        tracking = true;
        startBtn.textContent = "Stop Tracking";
        statusText.textContent = "Requesting permissions...";

        // Enable step detection
        startStepSensor();

        // GPS Tracking
        if (navigator.geolocation) {
            watchId = navigator.geolocation.watchPosition(handlePosition, handleError, {
                enableHighAccuracy: true,
                maximumAge: 1000,
                timeout: 10000
            });
        } else {
            alert("Geolocation not supported on this device.");
        }
    }
});

updateUI();
