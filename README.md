# Smart Kisan Mitra

Smart Kisan Mitra is an AI Agri-Tech IoT device which helps farmers to monitor their farm, land & crops effectively. This repository contains backend of the application.

## Backend Architecture
<img width="990" height="598" alt="brave_xY1XB5tPZ0" src="https://github.com/user-attachments/assets/74954e8e-a8ba-4186-9c14-15febf26f106" />

## Smart Kisan Mitra Gateway API

The Gateway service is the single entry point for all Krishi Saathi ML predictions and sensor data management. It routes requests to the appropriate microservices and handles MongoDB persistence.

---

## Base URL

```
http://a2f6ac2d332054d31ae532ff200cb4c8-584187728.ap-south-1.elb.amazonaws.com
```

---

## Endpoints

### Health Check

**`GET /health`**

Returns the health status of the gateway service.

**Response**
```json
{ "status": "ok" }
```

---

### Ingest Sensor Data

**`POST /ingest`**

Stores a sensor reading from an IoT device into the database.

**Request Body**
```json
{
  "device_id": "string",
  "sensor_data": {
    "N": 90,
    "P": 42,
    "K": 43,
    "ph": 6.5,
    "ec": 1.2,
    "soil_temp_C": 24.5,
    "soil_moisture": 38.0,
    "temperature": 22.0,
    "moisture": 65.0
  }
}
```

| Field | Type | Description |
|---|---|---|
| `device_id` | string | Unique identifier of the IoT device |
| `sensor_data` | object | Key-value map of sensor readings |

**Response**
```json
{ "status": "ok" }
```

---

### Get Sensor History

**`GET /history/{device_id}`**

Returns the most recent sensor readings for a device.

**Path Parameters**

| Parameter | Type | Description |
|---|---|---|
| `device_id` | string | Unique identifier of the IoT device |

**Query Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `limit` | integer | `20` | Number of recent readings to return |

**Example**
```
GET /history/device-001?limit=10
```

**Response**
```json
{
  "readings": [
    {
      "device_id": "device-001",
      "timestamp": "2024-01-01T10:00:00Z",
      "sensor_data": { ... }
    }
  ]
}
```

---

### Predict Fertilizer

**`POST /predict/fertilizer`**

Recommends fertilizer based on the latest sensor reading for a device.

**Request Body**
```json
{
  "device_id": "string",
  "crop": "string",
  "growth_stage": "string"
}
```

| Field | Type | Description |
|---|---|---|
| `device_id` | string | Device whose latest sensor data will be used |
| `crop` | string | Crop type (e.g. `"wheat"`, `"rice"`) |
| `growth_stage` | string | Growth stage (e.g. `"vegetative"`, `"flowering"`) |

**Sensor fields used:** `N`, `P`, `K`, `ph`, `ec`, `soil_temp_C`, `soil_moisture`

**Response** — proxied from the fertilizer microservice.

---

### Predict Crop

**`POST /predict/crop`**

Recommends the best crop to grow based on the latest sensor reading and location.

**Request Body**
```json
{
  "device_id": "string",
  "latitude": 16.7050,
  "longitude": 74.2433
}
```

| Field | Type | Description |
|---|---|---|
| `device_id` | string | Device whose latest sensor data will be used |
| `latitude` | float | GPS latitude of the farm |
| `longitude` | float | GPS longitude of the farm |

**Sensor fields used:** `N`, `P`, `K`, `temperature`, `moisture`, `ph`

**Response** — proxied from the crop microservice.

---

### Predict Plant Disease

**`POST /predict/plant-disease`**

Detects plant disease from an uploaded leaf image.

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| `file` | file | Image file of the plant leaf (JPEG/PNG) |

**Example (curl)**
```bash
curl -X POST http://<gateway>/predict/plant-disease \
  -F "file=@leaf.jpg"
```

**Notes**
- Timeout is set to 120 seconds due to image inference time.
- Does **not** require a `device_id` or sensor data.

**Response** — proxied from the plant disease microservice.

---

### Predict Soil Health

**`POST /predict/soil-health`**

Predicts soil health score based on the latest sensor reading for a device.

**Request Body**
```json
{
  "device_id": "string"
}
```

| Field | Type | Description |
|---|---|---|
| `device_id` | string | Device whose latest sensor data will be used |

**Sensor fields used:** `N`, `P`, `K`, `ph`, `moisture`, `temperature`, `ec`

**Response** — proxied from the soil health microservice.

## Sensor Data Field Reference

| Field | Unit | Description |
|---|---|---|
| `N` | mg/kg | Nitrogen level |
| `P` | mg/kg | Phosphorus level |
| `K` | mg/kg | Potassium level |
| `ph` | — | Soil pH (0–14) |
| `ec` | dS/m | Electrical conductivity |
| `soil_temp_C` | °C | Soil temperature |
| `soil_moisture` | % | Soil moisture percentage |
| `temperature` | °C | Ambient temperature |
| `moisture` | % | Ambient humidity/moisture |
