# Sensor Codes

This folder contains example sensor firmware and helper sketches used in the Farm project. The primary example is an ESP32-based sensor data logger that reads air temperature & humidity (SHT30/31), soil moisture (capacitive input), soil temperature (DS18B20) and GPS, then posts JSON data to the project ingestion API.

## Contents

- `esp32_sensor_logger/esp32_sensor_logger.ino` — main ESP32 logger sketch (primary example)
- `gpstest/` — GPS test sketch
- `smt-esp32-code/`, `updated-sensor-code/`, `wificonnection/` — additional sensor/connection examples

## Overview (esp32_sensor_logger)

- Reads SHT30/31 via I2C for air temperature and humidity.
- Reads a capacitive soil moisture sensor on an analog pin (ESP32 ADC raw 0–4095).
- Reads DS18B20 (1-Wire) for soil temperature.
- Reads GPS from UART1 and attempts a fix (configurable timeout).
- Posts data as JSON to a configurable API endpoint.

## Key configuration (edit in the sketch)

Open `esp32_sensor_logger/esp32_sensor_logger.ino` and edit these top-level constants:

```c++
const char* ssid     = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

const char* apiUrl   = "http://your-api.example.com/ingest"; // ingestion endpoint
const char* deviceId = "farm_010";                          // unique device id

const unsigned long UPLOAD_INTERVAL = 30000UL;  // milliseconds between uploads
const unsigned long GPS_TIMEOUT     = 120000UL; // milliseconds to wait for GPS fix

// Pins
#define SOIL_PIN      34
#define ONE_WIRE_BUS   4
#define GPS_RX_PIN    16
#define GPS_TX_PIN    17
```

Adjust `UPLOAD_INTERVAL` for production (e.g. 900000UL for 15 minutes).

## Dependencies / Arduino libraries

The sketch requires the following libraries (install via Arduino Library Manager or PlatformIO):

- `Adafruit_SHT31`
- `OneWire`
- `DallasTemperature`
- `TinyGPSPlus`
- `ArduinoJson`

## Runtime behavior and notes

- The sketch attempts a GPS fix up to `GPS_TIMEOUT` ms; if not available it continues and sends GPS fields only if valid.
- The sketch averages 10 ADC samples for the soil moisture reading to reduce noise.
- When sensors are not present or return invalid values, the code uses sentinel values (e.g. -999) and falls back to safe defaults when posting JSON.
