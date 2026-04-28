import joblib
model = joblib.load("artifacts/model.pkl")
print(type(model))  # This will show if it's xgboost or something else