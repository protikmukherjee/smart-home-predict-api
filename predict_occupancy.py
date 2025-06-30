# predict_occupancy.py
import sys, json, joblib
import pandas as pd
from datetime import datetime

model = joblib.load("occupancy_model_new.joblib")
input_data = json.load(sys.stdin)

features = {
    "r1_motion": input_data.get("r1_motion", 0),
    "r2_motion": input_data.get("r2_motion", 0),
    "r3_motion": input_data.get("r3_motion", 0),
    "garage_motion": input_data.get("garage_motion", 0),
    "r1_light": input_data.get("r1_light", 0),
    "r2_light": input_data.get("r2_light", 0),
    "r3_light": input_data.get("r3_light", 0),
    "lighting_power_mW": input_data.get("lighting_power_mW", 0),
}

X = pd.DataFrame([features])
predicted_occ = model.predict(X)[0]

print(f"{predicted_occ:.1f}")
