from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import numpy as np
import os

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")

model = joblib.load(os.path.join(ARTIFACTS_DIR, "model.pkl"))
scaler = joblib.load(os.path.join(ARTIFACTS_DIR, "scaler.pkl"))

class Items(BaseModel):
    N: int
    P: int
    K: int
    ph: float
    moisture: float
    temperature: float
    ec: float


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/predict")
async def scoring_endpoint(item: Items):
    try:
        features = [
            item.N,
            item.P,
            item.K,
            item.ph,
            item.moisture,
            item.temperature,
            item.ec
        ]

        features_array = np.array([features])

        features_scaled = scaler.transform(features_array)

        prediction = model.predict(features_scaled)[0]

        label_map = {
            0: "Healthy",
            1: "Moderate",
            2: "Poor"
        }

        return {"soil_health": label_map[int(prediction)]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))