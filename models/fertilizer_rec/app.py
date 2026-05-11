from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
import numpy as np

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")

model = joblib.load(os.path.join(ARTIFACTS_DIR, "model.pkl"))
scaler = joblib.load(os.path.join(ARTIFACTS_DIR, "scaler.pkl"))
encoder = joblib.load(os.path.join(ARTIFACTS_DIR, "encoder.pkl"))

growth_stage_map = {
    "vegetative": 0,
    "flowering": 1,
    "maturity": 2
}

crop_map = {
    'soybean': 1,
    'sugarcane': 2,
    'groundnut': 3,
    'wheat': 4,
    'rice': 5,
    'maize': 6
}

class Sensors(BaseModel):
    N: float
    P: float
    K: float
    pH: float
    EC: float
    soil_temp_C: float
    soil_moisture: float
    crop: str
    growth_stage: str


class RequestBody(BaseModel):
    sensors: Sensors


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/predict")
async def predict(body: RequestBody):
    try:
        sensors = body.sensors

        if sensors.crop not in crop_map:
            raise HTTPException(status_code=400, detail="Invalid crop")

        if sensors.growth_stage not in growth_stage_map:
            raise HTTPException(status_code=400, detail="Invalid growth_stage")

        crop_val = crop_map[sensors.crop]
        stage_val = growth_stage_map[sensors.growth_stage]

        features = [
            sensors.N,
            sensors.P,
            sensors.K,
            sensors.pH,
            sensors.EC,
            sensors.soil_temp_C,
            sensors.soil_moisture,
            crop_val,
            stage_val
        ]

        features_array = np.array([features])

        scaled = scaler.transform(features_array)

        raw_pred = model.predict(scaled)

        final_pred = encoder.inverse_transform(raw_pred)

        return {"prediction": final_pred.tolist()}

    except HTTPException as e:
        raise e

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))