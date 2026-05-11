from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import joblib
import os
import numpy as np
import requests

app = FastAPI()

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ARTIFACTS_DIR = os.path.join(BASE_DIR, "artifacts")

model = joblib.load(os.path.join(ARTIFACTS_DIR, "model.pkl"))
scaler = joblib.load(os.path.join(ARTIFACTS_DIR, "scaler.pkl"))

class Items(BaseModel):
    N: float
    P: float
    K: float
    temperature: float
    humidity: float
    ph: float
    latitude: float
    longitude: float


@app.get("/health")
async def health():
    return {"status": "ok"}


def get_rainfall(lat, lon):
    url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&daily=precipitation_sum&timezone=auto"
    
    response = requests.get(url)
    data = response.json()
    print(f"rainfall:: {data}")
    return data["daily"]["precipitation_sum"][0]  


@app.post("/predict")
async def predict(item: Items):
    print('called')
    try:
        rainfall = get_rainfall(item.latitude, item.longitude)

        features = [
            item.N,
            item.P,
            item.K,
            item.temperature,
            item.humidity,
            item.ph,
            rainfall
        ]

        print(f"Features::: {features}")

        features_array = np.array([features])

        scaled = scaler.transform(features_array)

        prediction = model.predict(scaled)

        return {
            "prediction": prediction[0],
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))