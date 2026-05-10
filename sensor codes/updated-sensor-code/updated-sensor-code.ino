#include <Wire.h>
#include "Adafruit_SHT31.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ============================================================
//  WiFi Configuration
// ============================================================
const char* ssid     = "Vivo";
const char* password = "11223344";

// ============================================================
//  API Configuration
// ============================================================
const char* apiUrl  = "http://ab3ce8cebdd024a89adaf16ffe86a647-246539694.ap-south-1.elb.amazonaws.com/ingest";
const char* deviceId = "farm_010";

// ============================================================
//  Timing (milliseconds)
// ============================================================
const unsigned long UPLOAD_INTERVAL = 30000UL;   // 30 seconds (change to 900000UL for 15 min)
const unsigned long GPS_TIMEOUT     = 120000UL;  // 2 minutes to wait for GPS fix per cycle
const unsigned long HTTP_TIMEOUT_MS = 10000UL;   // 10 second HTTP timeout
const unsigned long WIFI_RETRY_MS   = 30000UL;   // retry WiFi every 30 s if disconnected

// ============================================================
//  Pin Definitions
// ============================================================
#define SOIL_PIN      34
#define ONE_WIRE_BUS   4
#define GPS_RX_PIN    16
#define GPS_TX_PIN    17

// ============================================================
//  Sensor Objects
// ============================================================
Adafruit_SHT31    sht31;
OneWire           oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);
TinyGPSPlus       gps;
HardwareSerial    gpsSerial(1);   // UART1

// ============================================================
//  State
// ============================================================
unsigned long lastUploadTime  = 0;
unsigned long lastWiFiRetry   = 0;
bool          sht31Ok         = false;

// ============================================================
//  Forward Declarations
// ============================================================
void  initSensors();
bool  connectToWiFi();
void  feedGPS(unsigned long ms);
void  readSensors(float &airTemp, float &humidity,
                  int   &soilRaw, float &soilTemp,
                  float &lat,     float &lng);
void  printSensorData(float airTemp, float humidity,
                      int   soilRaw, float soilTemp,
                      float lat,     float lng);
bool  sendToAPI(float airTemp, float humidity,
                int   soilRaw, float soilTemp,
                float lat,     float lng);

// ============================================================
//  Setup
// ============================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println(F("\n================================="));
  Serial.println(F("   ESP32 SENSOR DATA LOGGER"));
  Serial.println(F("=================================\n"));

  initSensors();
  connectToWiFi();

  // Seed the timer so the first upload happens right away
  lastUploadTime = millis() - UPLOAD_INTERVAL;

  Serial.println(F("\n🚀 System Ready!"));
}

// ============================================================
//  Sensor Initialisation
// ============================================================
void initSensors() {
  // SHT30/31
  sht31Ok = sht31.begin(0x44);
  Serial.println(sht31Ok ? F("✅ SHT30 initialised") : F("❌ SHT30 not found – check wiring"));

  // DS18B20
  ds18b20.begin();
  Serial.print(F("✅ DS18B20 – found "));
  Serial.print(ds18b20.getDeviceCount());
  Serial.println(F(" device(s)"));

  // GPS on UART1
  gpsSerial.begin(9600, SERIAL_8N1, GPS_RX_PIN, GPS_TX_PIN);
  Serial.println(F("✅ GPS (UART1) initialised"));

  // Soil moisture pin (capacitive – no pull-up needed)
  pinMode(SOIL_PIN, INPUT);
  Serial.println(F("✅ Soil moisture pin ready"));
}

// ============================================================
//  WiFi
// ============================================================
bool connectToWiFi() {
  if (WiFi.status() == WL_CONNECTED) return true;

  Serial.print(F("\n📱 Connecting to WiFi: "));
  Serial.println(ssid);

  WiFi.disconnect(true);
  delay(100);
  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  for (int i = 0; i < 30; i++) {          // 30 × 1 s = 30 s max
    if (WiFi.status() == WL_CONNECTED) break;
    delay(1000);
    Serial.print('.');
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n✅ WiFi connected"));
    Serial.print(F("   IP: "));
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.println(F("\n❌ WiFi connection failed – will retry later"));
  return false;
}

// ============================================================
//  Feed GPS serial data for `ms` milliseconds
// ============================================================
void feedGPS(unsigned long ms) {
  unsigned long start = millis();
  while (millis() - start < ms) {
    while (gpsSerial.available()) {
      gps.encode(gpsSerial.read());
    }
    delay(10);
  }
}

// ============================================================
//  Read All Sensors
// ============================================================
void readSensors(float &airTemp, float &humidity,
                 int   &soilRaw, float &soilTemp,
                 float &lat,     float &lng) {

  // --- SHT30 (air temperature + humidity) ---
  if (sht31Ok) {
    airTemp  = sht31.readTemperature();
    humidity = sht31.readHumidity();
    if (isnan(airTemp))  airTemp  = -999.0f;
    if (isnan(humidity)) humidity = -999.0f;
  } else {
    airTemp  = -999.0f;
    humidity = -999.0f;
  }

  // --- Capacitive soil moisture (0–4095 on ESP32 12-bit ADC) ---
  // Average 10 samples to reduce noise
  long sum = 0;
  for (int i = 0; i < 10; i++) {
    sum += analogRead(SOIL_PIN);
    delay(5);
  }
  soilRaw = (int)(sum / 10);

  // --- DS18B20 (soil temperature) ---
  ds18b20.requestTemperatures();
  soilTemp = ds18b20.getTempCByIndex(0);
  if (soilTemp == DEVICE_DISCONNECTED_C) soilTemp = -999.0f;

  // --- GPS – try to get a valid fix, but don't block forever ---
  lat = 0.0f;
  lng = 0.0f;

  if (gps.location.isValid() && gps.location.age() < 5000) {
    // Already have a recent fix – use it immediately
    lat = (float)gps.location.lat();
    lng = (float)gps.location.lng();
  } else {
    // Feed GPS data for up to GPS_TIMEOUT ms
    Serial.print(F("🛰️  Waiting for GPS fix"));
    unsigned long gpsStart = millis();
    while (millis() - gpsStart < GPS_TIMEOUT) {
      while (gpsSerial.available()) {
        gps.encode(gpsSerial.read());
      }
      if (gps.location.isValid()) {
        lat = (float)gps.location.lat();
        lng = (float)gps.location.lng();
        Serial.println(F(" ✅"));
        break;
      }
      delay(200);
      Serial.print('.');
    }
    if (lat == 0.0f) Serial.println(F(" ❌ Timeout"));
  }
}

// ============================================================
//  Pretty-print to Serial
// ============================================================
void printSensorData(float airTemp, float humidity,
                     int   soilRaw, float soilTemp,
                     float lat,     float lng) {

  Serial.println(F("\n┌──────────────────────────────────────┐"));
  Serial.println(F("│        📊  SENSOR  READINGS           │"));
  Serial.println(F("├──────────────────────────────────────┤"));

  Serial.print(F("│  🌡️  Air Temp      : "));
  if (airTemp > -998) { Serial.print(airTemp, 1); Serial.println(F(" °C")); }
  else                  Serial.println(F("ERROR"));

  Serial.print(F("│  💧 Humidity       : "));
  if (humidity > -998) { Serial.print(humidity, 1); Serial.println(F(" %")); }
  else                   Serial.println(F("ERROR"));

  Serial.print(F("│  🌱 Soil Moisture  : "));
  Serial.print(soilRaw);
  Serial.println(F(" (raw 0-4095)"));

  Serial.print(F("│  🌡️  Soil Temp     : "));
  if (soilTemp > -998) { Serial.print(soilTemp, 1); Serial.println(F(" °C")); }
  else                   Serial.println(F("ERROR"));

  Serial.print(F("│  📍 GPS            : "));
  if (lat != 0.0f || lng != 0.0f) {
    Serial.print(lat, 6); Serial.print(F(", ")); Serial.println(lng, 6);
  } else {
    Serial.println(F("No fix"));
  }

  Serial.println(F("└──────────────────────────────────────┘"));
}

// ============================================================
//  Send Data to API
// ============================================================
bool sendToAPI(float airTemp, float humidity,
               int   soilRaw, float soilTemp,
               float lat,     float lng) {

  // Ensure WiFi is up
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("⚠️  WiFi down – attempting reconnect..."));
    if (!connectToWiFi()) return false;
  }

  // Build JSON payload
  StaticJsonDocument<512> doc;
  doc["device_id"] = deviceId;

  JsonObject sd = doc.createNestedObject("sensor_data");

  // Only send valid readings; use 0 as safe fallback for API
  sd["temperature"]   = (airTemp  > -998) ? airTemp  : 0.0f;
  sd["moisture"]      = (humidity > -998) ? humidity : 0.0f;
  sd["soil_moisture"] = soilRaw;
  sd["soil_temp_C"]   = (soilTemp > -998) ? soilTemp : 0.0f;

  // NPK / EC – hardware not fitted, send 0
  sd["N"]  = 0;
  sd["P"]  = 0;
  sd["K"]  = 0;
  sd["ec"] = 0;
  sd["ph"] = 7.0;   // No pH sensor – neutral default

  if (lat != 0.0f || lng != 0.0f) {
    sd["latitude"]  = lat;
    sd["longitude"] = lng;
  }

  String payload;
  serializeJson(doc, payload);

  Serial.println(F("\n📤 Sending data..."));
  Serial.print(F("   Payload : ")); Serial.println(payload);

  HTTPClient http;
  http.begin(apiUrl);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(HTTP_TIMEOUT_MS);       // ← prevents infinite hang

  int code = http.POST(payload);
  bool ok  = false;

  if (code > 0) {
    String resp = http.getString();
    Serial.print(F("   ✅ HTTP ")); Serial.println(code);
    Serial.print(F("   Response: ")); Serial.println(resp);
    ok = (code >= 200 && code < 300);
  } else {
    // Translate error code to readable string
    Serial.print(F("   ❌ HTTP error: "));
    Serial.println(http.errorToString(code));
  }

  http.end();
  return ok;
}

// ============================================================
//  Main Loop
// ============================================================
void loop() {
  unsigned long now = millis();

  // Keep GPS fed continuously between uploads
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  // WiFi watchdog – retry if disconnected
  if (WiFi.status() != WL_CONNECTED &&
      now - lastWiFiRetry > WIFI_RETRY_MS) {
    lastWiFiRetry = now;
    connectToWiFi();
  }

  // Upload cycle
  if (now - lastUploadTime >= UPLOAD_INTERVAL) {
    lastUploadTime = now;

    Serial.println(F("\n⏰ Starting sensor read + upload cycle"));

    float airTemp, humidity, soilTemp, lat, lng;
    int   soilRaw;

    readSensors(airTemp, humidity, soilRaw, soilTemp, lat, lng);
    printSensorData(airTemp, humidity, soilRaw, soilTemp, lat, lng);

    bool sent = sendToAPI(airTemp, humidity, soilRaw, soilTemp, lat, lng);

    unsigned long intervalMin = UPLOAD_INTERVAL / 60000UL;
    unsigned long intervalSec = (UPLOAD_INTERVAL % 60000UL) / 1000UL;

    if (sent) {
      Serial.print(F("\n✅ Upload OK – next in "));
    } else {
      Serial.print(F("\n⚠️  Upload FAILED – retrying in "));
    }
    Serial.print(intervalMin); Serial.print(F(" min "));
    Serial.print(intervalSec); Serial.println(F(" sec"));
  }

  delay(50);   // Yield to RTOS / feed watchdog
}
