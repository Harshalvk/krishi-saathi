# convert_model.py
import joblib
import xgboost as xgb

# Load the pickle model
model = joblib.load("artifacts/model.pkl")

# Save using XGBoost's native format
model.get_booster().save_model("artifacts/model.json")

# Or save as binary
model.get_booster().save_model("artifacts/model.ubj")