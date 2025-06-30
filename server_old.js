const express = require("express");
const bodyParser = require("body-parser");
const { spawn } = require("child_process");
const admin = require("firebase-admin");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(bodyParser.json());

// === Firebase Setup ===
const serviceAccount = require("./serviceAccountKey.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://smart-fire-system-684fb-default-rtdb.firebaseio.com"
});
const db = admin.database();

// === Create logs directory if not present ===
const logsDir = path.join(__dirname, "logs");
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir);

// === Utility: Run Python script with JSON input ===
function runPython(script, inputData) {
    return new Promise((resolve, reject) => {
        const py = spawn("python3", [script]);
        let result = "";

        py.stdin.write(JSON.stringify(inputData));
        py.stdin.end();

        py.stdout.on("data", data => result += data.toString());
        py.stderr.on("data", data => console.error(`❌ ${script} error:`, data.toString()));

        py.on("close", code => {
            if (code !== 0) reject(`❌ Python process ${script} failed`);
            else resolve(result.trim());
        });
    });
}

// === Fire Prediction ===
app.post("/predict/fire", async (req, res) => {
    try {
        const result = await runPython("predict_fire.py", req.body);
        const [probStr, status] = result.split(" - ");
        res.json({ fire_probability: parseFloat(probStr), fire_status: status });
    } catch (err) {
        res.status(500).send(err);
    }
});

// === Power Prediction ===
app.post("/predict/power", async (req, res) => {
    try {
        const result = await runPython("predict_power.py", req.body);
        res.json({ predicted_power_mW: parseFloat(result) });
    } catch (err) {
        res.status(500).send(err);
    }
});

// === Occupancy Prediction ===
app.post("/predict/occupancy", async (req, res) => {
    try {
        const result = await runPython("predict_occupancy.py", req.body);
        res.json({ predicted_occupancy_count: parseFloat(result) });
    } catch (err) {
        res.status(500).send(err);
    }
});

// === Reasoning + Alert Generation from Firebase ===
app.post("/recommend", async (req, res) => {
    try {
        const snapshot = await db.ref("/SmartHomeSystem").once("value");
        const firebaseData = snapshot.val() || {};
        const input = {
            ...firebaseData.SmartFireSystem,
            ...firebaseData.SmartGarageDoorSystem,
            ...firebaseData.SmartLightSystem
        };

        const now = new Date();
        const hour = now.getHours();

        const fireResult = await runPython("predict_fire.py", input);
        const [probStr, fireStatus] = fireResult.split(" - ");
        const fireProb = parseFloat(probStr);

        const powerResult = await runPython("predict_power.py", input);
        const totalPower = parseFloat(powerResult);

        const occResult = await runPython("predict_occupancy.py", input);
        const occupancy = parseFloat(occResult);

        // === Alert 1: Fire risk ===
        const alert1 = fireProb > 0.4
            ? "HIGH Monitor Fire System"
            : "LOW No action needed for the fire system";
        await db.ref("/SmartHomeSystem/Alerts/Alert1").set(alert1);

        // === Alert 2: Lights on during daytime ===
        let roomsLit = [];
        if (hour >= 8 && hour <= 18) {
            if (input.r1_light || input.Light1_status) roomsLit.push("Room 1");
            if (input.r2_light || input.Light2_status) roomsLit.push("Room 2");
            if (input.r3_light || input.Light3_status) roomsLit.push("Room 3");
        }
        const alert2 = roomsLit.length
            ? `${roomsLit.join(" and/or ")} lights during daytime may push total power above limit.`
            : "";
        await db.ref("/SmartHomeSystem/Alerts/Alert2").set(alert2);

        // === Alert 3: Garage idle but power draw ===
        const garageIdle = !input.garage_motion && input.power_mW > 400;
        const alert3 = garageIdle
            ? "Garage system has been idle for a while. Consider turning it off."
            : "";
        await db.ref("/SmartHomeSystem/Alerts/Alert3").set(alert3);

        // === Alert 4: Smart usage tip ===
        let alert4 = "";
        const totalMotion = (input.r1_motion || 0) + (input.r2_motion || 0) + (input.r3_motion || 0) + (input.motion_detected ? 1 : 0);

        if (totalPower > 2000 && totalMotion === 0) {
            alert4 = "Power usage is high but no motion detected. Some systems may be unnecessarily active.";
        } else if ((input.r3_motion || 0) === 0 && (input.r3_light || input.Light3_status)) {
            alert4 = "No one is using kitchen (Room 3), consider turning appliances off.";
        }

        await db.ref("/SmartHomeSystem/Alerts/Alert4").set(alert4);

        res.json({
            fire_probability: fireProb,
            fire_status: fireStatus,
            predicted_power_mW: totalPower,
            predicted_occupancy_count: occupancy,
            alerts: { alert1, alert2, alert3, alert4 }
        });

    } catch (err) {
        console.error("\ud83d\udea8 Recommendation error:", err);
        res.status(500).send("Error generating recommendation");
    }
});

// === Start Server ===
app.listen(3000, () => {
    console.log("\ud83d\ude80 Server running on http://localhost:3000");
});
