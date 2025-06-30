import os
import joblib
import pandas as pd
import sys, json
import requests
from datetime import datetime

MODEL_PATH = "power_model_new.joblib"
GDRIVE_FILE_ID = "1B9aZ3N5iAz11qAeh7Pf-BKW_iApltN-C"
DOWNLOAD_URL = f"https://drive.google.com/uc?id={GDRIVE_FILE_ID}"

# Download model if missing
if not os.path.exists(MODEL_PATH):
    print("Downloading power model from Google Drive...")
    r = requests.get(DOWNLOAD_URL)
    with open(MODEL_PATH, "wb") as f:
        f.write(r.content)

model = joblib.load(MODEL_PATH)

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
