# predict_power.py
import sys, json, joblib
import pandas as pd
from datetime import datetime

model = joblib.load("power_model_new.joblib")
input_data = json.load(sys.stdin)

features = {
    "smoke": input_data.get("smoke", 0),
    "flame": input_data.get("flame", 0),
    "temperature": input_data.get("temperature", 0),
    "humidity": input_data.get("humidity", 0),
    "buzzer": input_data.get("buzzer", 0),
    "fire_power_mW": input_data.get("fire_power_mW", 0),
    "garage_motion": input_data.get("garage_motion", 0),
    "garage_current_mA": input_data.get("garage_current_mA", 0),
    "garage_power_mW": input_data.get("garage_power_mW", 0),
    "r1_motion": input_data.get("r1_motion", 0),
    "r2_motion": input_data.get("r2_motion", 0),
    "r3_motion": input_data.get("r3_motion", 0),
    "r1_light": input_data.get("r1_light", 0),
    "r2_light": input_data.get("r2_light", 0),
    "r3_light": input_data.get("r3_light", 0),
    "lighting_current_mA": input_data.get("lighting_current_mA", 0),
    "lighting_power_mW": input_data.get("lighting_power_mW", 0),
}

X = pd.DataFrame([features])
predicted_power = model.predict(X)[0]

print(f"{predicted_power:.2f}")
