from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import httpx, os, asyncio
import certifi
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MODELS = {
    "fertilizer": os.getenv("FERTILIZER_URL", "http://fertilizer-svc:8000"),
    "crop":        os.getenv("CROP_URL",       "http://crop-svc:8000"),
    "plant":       os.getenv("PLANT_URL",      "http://plant-disease-svc:8000"),
    "soil":        os.getenv("SOIL_URL",       "http://soil-health-svc:8000"),
}

MONGO_URL = os.getenv("MONGO_URL", "mongodb+srv://devwork2004_db_user:RjerPWCcvsthiuQq@krishi-saathi-prod-db.j35lynx.mongodb.net/")
client = AsyncIOMotorClient(MONGO_URL, tls=True, tlsCAFile=certifi.where(), serverSelectionTimeoutMS=30000)
db = client["krishi-saathi-prod-db"] 

@app.on_event("startup")
async def check_mongo():
    try:
        await client.admin.command("ping")
        print("✅ MongoDB connected")
    except Exception as e:
        print("❌ MongoDB connection failed:", e)

class SensorReading(BaseModel):
    device_id: str
    sensor_data: dict

@app.post("/ingest")
async def ingest(reading: SensorReading):
    try:
        await db.readings.insert_one({
            "device_id": reading.device_id,
            "timestamp": datetime.utcnow(),
            "sensor_data": reading.sensor_data
        })
        return {"status": "ok"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def get_latest(device_id: str):
    doc = await db.readings.find_one(
        {"device_id": device_id},
        sort=[("timestamp", -1)]
    )
    if not doc:
        raise HTTPException(404, f"No data found for device {device_id}")
    return doc["sensor_data"]

class FertilizerExtras(BaseModel):
    device_id: str
    crop: str
    growth_stage: str

@app.post("/predict/fertilizer")
async def predict_fertilizer(body: FertilizerExtras):
    sensors = await get_latest(body.device_id)
    payload = {
        "sensors": {
            "N":            sensors["N"],
            "P":            sensors["P"],
            "K":            sensors["K"],
            "pH":           sensors["ph"],
            "EC":           sensors["ec"],
            "soil_temp_C":  sensors["soil_temp_C"],
            "soil_moisture":sensors["soil_moisture"],
            "crop":         body.crop,
            "growth_stage": body.growth_stage
        }
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{MODELS['fertilizer']}/predict", json=payload)
    return resp.json()

class CropExtras(BaseModel):
    device_id: str
    latitude: float
    longitude: float

@app.post("/predict/crop")
async def predict_crop(body: CropExtras):
    sensors = await get_latest(body.device_id)
    payload = {
        "N":          sensors["N"],
        "P":          sensors["P"],
        "K":          sensors["K"],
        "temperature":sensors["temperature"],
        "humidity":   sensors["moisture"],
        "ph":         sensors["ph"],
        "latitude":   body.latitude,
        "longitude":  body.longitude
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{MODELS['crop']}/predict", json=payload)
    return resp.json()


@app.post("/predict/plant-disease")
async def predict_plant(file: UploadFile = File(...)):
    try:
        image_bytes = await file.read()
        
        plant_url = MODELS['plant']
        
        async with httpx.AsyncClient(timeout=120.0) as client:
            files = {
                'file': (file.filename, image_bytes, file.content_type)
            }
            
            response = await client.post(
                f"{plant_url}/predict",
                files=files
            )
            
            if response.status_code != 200:
                print(f"Plant service error: {response.status_code} - {response.text}")
                raise HTTPException(response.status_code, response.text)
            
            return response.json()
            
    except httpx.TimeoutException:
        raise HTTPException(504, "Plant service timeout")
    except Exception as e:
        print(f"Error forwarding to plant service: {e}")
        raise HTTPException(500, str(e))

class SoilRequest(BaseModel):
    device_id: str

@app.post("/predict/soil-health")
async def predict_soil(body: SoilRequest):
    sensors = await get_latest(body.device_id)
    payload = {
        "N":          sensors["N"],
        "P":          sensors["P"],
        "K":          sensors["K"],
        "ph":         sensors["ph"],
        "moisture":   sensors["moisture"],
        "temperature":sensors["temperature"],
        "ec":         sensors["ec"]
    }
    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{MODELS['soil']}/predict", json=payload)
    return resp.json()

@app.post("/debug/gateway-image")
async def debug_gateway_image(file: UploadFile = File(...)):
    image_bytes = await file.read()
    
    # Check the bytes
    return {
        "filename": file.filename,
        "content_type": file.content_type,
        "size": len(image_bytes),
        "first_20_bytes": list(image_bytes[:20])
    }

@app.get("/history/{device_id}")
async def get_history(device_id: str, limit: int = 20):
    cursor = db.readings.find(
        {"device_id": device_id},
        {"_id": 0}
    ).sort("timestamp", -1).limit(limit)
    return {"readings": await cursor.to_list(limit)}

@app.get("/health")
async def health():
    return {"status": "ok"}

@app.post("/history/batch")
async def get_batch_history(device_ids: list[str], limit: int = 20):
    result = {}
    for device_id in device_ids:
        cursor = db.readings.find(
            {"device_id": device_id},
            {"_id": 0}
        ).sort("timestamp", -1).limit(limit)
        result[device_id] = await cursor.to_list(limit)
    return result    

@app.post("/alerts/configure")
async def configure_alert(alert_config: dict):
    await db.alerts.insert_one({
        "config": alert_config,
        "created_at": datetime.utcnow()
    })
    return {"status": "alert configured"}    

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/{device_id}")
async def websocket_endpoint(websocket: WebSocket, device_id: str):
    await manager.connect(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            await manager.broadcast(f"Device {device_id}: {data}")
    except WebSocketDisconnect:
        manager.disconnect(websocket)    