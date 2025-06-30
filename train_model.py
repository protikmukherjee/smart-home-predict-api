import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
import joblib

# Load your dataset
df = pd.read_csv("smoke_detection_iot.csv")

# Select features and target
features = ["Temperature[C]", "Humidity[%]", "TVOC[ppb]", "eCO2[ppm]"]
target = "Fire Alarm"
X = df[features]
y = df[target]

# Train-test split
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model with class_weight to handle imbalance
model = RandomForestClassifier(n_estimators=100, class_weight="balanced", random_state=42)
model.fit(X_train, y_train)

# Save model
joblib.dump(model, "fire_model_balanced.pkl")
