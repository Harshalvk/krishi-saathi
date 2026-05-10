#include <Wire.h>
#include "Adafruit_SHT31.h"
#include <OneWire.h>
#include <DallasTemperature.h>
#include <TinyGPS++.h>
#include <HardwareSerial.h>

// ---------- SHT30 ----------
Adafruit_SHT31 sht31 = Adafruit_SHT31();

// ---------- Soil Moisture ----------
#define SOIL_PIN 34

// ---------- DS18B20 ----------
#define ONE_WIRE_BUS 4
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature ds18b20(&oneWire);

// ---------- pH ----------
#define PH_PIN 35

// ---------- GPS ----------
TinyGPSPlus gps;
HardwareSerial gpsSerial(1);

// ---------- Setup ----------
void setup() {
  Serial.begin(115200);
  delay(1000);

  // SHT30 init
  if (!sht31.begin(0x44)) {
    Serial.println("❌ SHT30 not found");
  } else {
    Serial.println("✅ SHT30 initialized");
  }

  // DS18B20 init
  ds18b20.begin();
  Serial.println("✅ DS18B20 initialized");

  // GPS init
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);
  Serial.println("✅ GPS initialized");

  Serial.println("🚀 System Ready\n");
}

// ---------- Loop ----------
void loop() {

  // ---- SHT30 ----
  float airTemp = sht31.readTemperature();
  float humidity = sht31.readHumidity();

  // ---- Soil Moisture ----
  int soilValue = analogRead(SOIL_PIN);

  // ---- DS18B20 ----
  ds18b20.requestTemperatures();
  float soilTemp = ds18b20.getTempCByIndex(0);

  // ---- pH ----
  // int phRaw = analogRead(PH_PIN);

  // ---- GPS ----
  while (gpsSerial.available()) {
    gps.encode(gpsSerial.read());
  }

  // ---------- PRINT ----------
  Serial.println("------ SENSOR DATA ------");

  Serial.print("🌡 Air Temp: ");
  Serial.print(airTemp);
  Serial.println(" °C");

  Serial.print("💧 Humidity: ");
  Serial.print(humidity);
  Serial.println(" %");

  Serial.print("🌱 Soil Moisture (raw): ");
  Serial.println(soilValue);

  Serial.print("🌡 Soil Temp: ");
  Serial.print(soilTemp);
  Serial.println(" °C");

  Serial.print("🧪 pH Raw: ");
  // Serial.println(phRaw);

  if (gps.location.isUpdated()) {
    Serial.print("📍 Latitude: ");
    Serial.println(gps.location.lat(), 6);
    Serial.print("📍 Longitude: ");
    Serial.println(gps.location.lng(), 6);
  } else {
    Serial.println("📍 GPS: Waiting for signal...");
  }

  Serial.println("-------------------------\n");

  delay(5000); // update every 5 sec
}