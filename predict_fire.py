import sys
import json
import joblib
import pandas as pd
from datetime import datetime

# Load the balanced model
model = joblib.load("fire_model_balanced.pkl")

# Read input from stdin
input_data = json.load(sys.stdin)

# Prepare input with proper feature names
features = {
    "Temperature[C]": input_data.get("Heat", 0),
    "Humidity[%]": input_data.get("Humidity", 50),
    "TVOC[ppb]": input_data.get("Smoke", 0),
    "eCO2[ppm]": input_data.get("eCO2", 400)
}

X = pd.DataFrame([features])

# Predict
prob = model.predict_proba(X)[0][1]

# Lowered threshold
threshold = 0.4
status = "🔥 Fire risk detected!" if prob > threshold else "✅ Normal conditions"

# Output
print(f"{prob:.3f} - {status}")

# Log to file
log_entry = {
    "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    "input": input_data,
    "probability": round(prob, 3),
    "status": status
}

with open("fire_predictions.log", "a") as f:
    f.write(json.dumps(log_entry) + "\n")
