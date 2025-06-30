app.post("/recommend", async (req, res) => {
    try {
        const snapshot = await db.ref("/SmartHomeSystem").once("value");
        const firebaseData = snapshot.val() || {};
        const input = { ...firebaseData.SmartFireSystem, ...firebaseData.SmartGarageDoorSystem, ...firebaseData.SmartLightSystem };

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
        console.error("🚨 Recommendation error:", err);
        res.status(500).send("Error generating recommendation");
    }
});
