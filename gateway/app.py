from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, BackgroundTasks
from pydantic import BaseModel
from motor.motor_asyncio import AsyncIOMotorClient
import httpx, os, asyncio, certifi, json
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional

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
    timestamp: Optional[str] = None
    latitude: float        
    longitude: float      


# Modify your ingest endpoint to broadcast updates
@app.post("/ingest")
async def ingest(reading: SensorReading, background_tasks: BackgroundTasks):
    try:
        result = await db.readings.update_one(
            {"device_id": reading.device_id},
            {
                "$set": {
                    "timestamp": datetime.utcnow(),
                    "sensor_data": reading.sensor_data,
                    "latitude": reading.latitude,   
                    "longitude": reading.longitude
                }
            },
            upsert=True
        )
        
        # Broadcast to WebSocket clients
        background_tasks.add_task(
            manager.broadcast, 
            json.dumps({
                "device_id": reading.device_id,
                "sensor_data": reading.sensor_data,
                "timestamp": datetime.utcnow().isoformat(),
                "latitude": reading.latitude,   
                "longitude": reading.longitude
            })
        )
        
        return {"status": "ok", "device_id": reading.device_id}
        
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
            "N":             sensors["N"],
            "P":             sensors["P"],
            "K":             sensors["K"],
            "pH":            sensors["ph"],          
            "EC":            sensors["ec"],         
            "soil_temp_C":   sensors["soil_temp_C"],
            "soil_moisture": sensors["soil_moisture"],
            "crop":          body.crop,
            "growth_stage":  body.growth_stage,
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

@app.get("/devices")
async def get_devices():
    """Get all unique device IDs from the database"""
    try:
        devices = await db.readings.distinct("device_id")
        
        device_list = []
        for device_id in devices:
            last_reading = await db.readings.find_one(
                {"device_id": device_id},
                sort=[("timestamp", -1)]
            )
            
            device_list.append({
                "device_id": device_id,
                "last_updated": last_reading["timestamp"] if last_reading else None,
                "status": "active" if last_reading and last_reading["timestamp"] else "inactive"
            })
        
        return {"devices": device_list}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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


class BoundaryPoint(BaseModel):
    lat: float
    lng: float

class FarmBoundary(BaseModel):
    id: str
    device_id: str
    name: str
    color: str
    points: list[dict]
    area: float

from pydantic import BaseModel
from typing import List

class BoundaryPoint(BaseModel):
    lat: float
    lng: float

class FarmBoundary(BaseModel):
    id: str
    device_id: str
    name: str
    color: str
    points: List[BoundaryPoint]
    area: float

@app.post("/boundaries")
async def save_boundary(b: FarmBoundary):
    doc = b.dict()
    doc["created_at"] = datetime.utcnow()
    await db.boundaries.update_one(
        {"id": b.id},
        {"$set": doc},
        upsert=True
    )
    return {"status": "saved", "id": b.id}

@app.get("/boundaries/{device_id}")
async def get_boundaries(device_id: str):
    cursor = db.boundaries.find(
        {"device_id": device_id},
        {"_id": 0}           # exclude MongoDB _id from response
    )
    docs = await cursor.to_list(100)
    return {"boundaries": docs}

@app.patch("/boundaries/{boundary_id}")
async def rename_boundary(boundary_id: str, body: dict):
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Name cannot be empty")
    result = await db.boundaries.update_one(
        {"$or": [{"id": boundary_id}, {"name": boundary_id}]},
        {"$set": {"name": name, "id": boundary_id}}
    )
    if result.matched_count == 0:
        raise HTTPException(404, f"Boundary {boundary_id} not found")
    return {"status": "renamed"}

@app.delete("/boundaries/{device_id}/{boundary_id}")
async def delete_boundary(device_id: str, boundary_id: str):
    result = await db.boundaries.delete_one({
        "device_id": device_id,
        "$or": [{"id": boundary_id}, {"name": boundary_id}]
    })
    if result.deleted_count == 0:
        raise HTTPException(404, "Boundary not found")
    return {"status": "deleted"}

@app.get("/boundaries/debug/{device_id}")
async def debug_boundaries(device_id: str):
    cursor = db.boundaries.find({"device_id": device_id})
    docs = await cursor.to_list(100)
    for doc in docs:
        doc["_id"] = str(doc["_id"])
    return {"count": len(docs), "docs": docs}