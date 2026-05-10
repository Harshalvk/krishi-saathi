#include <HardwareSerial.h>

// GPS connected to UART1 (pins 16=RX, 17=TX)
HardwareSerial gpsSerial(1);

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n=================================");
  Serial.println("   GPS SENSOR DIAGNOSTIC TOOL");
  Serial.println("=================================\n");
  
  // Initialize GPS serial port
  gpsSerial.begin(9600, SERIAL_8N1, 16, 17);
  
  Serial.println("📡 GPS configured on pins:");
  Serial.println("   RX (ESP32 ← GPS) = Pin 16");
  Serial.println("   TX (ESP32 → GPS) = Pin 17");
  Serial.println("   Baud rate: 9600");
  Serial.println("\n🔍 Waiting for GPS data...");
  Serial.println("   (This test runs for 30 seconds)\n");
  Serial.println("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
}

void loop() {
  int dataCount = 0;
  unsigned long startTime = millis();
  
  // Read GPS for 30 seconds
  while (millis() - startTime < 30000) {
    if (gpsSerial.available()) {
      char c = gpsSerial.read();
      Serial.print(c);  // Print raw NMEA data
      dataCount++;
    }
  }
  
  // Show test results
  Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("\n📊 TEST RESULTS:\n");
  
  if (dataCount > 0) {
    Serial.println("✅ GPS IS WORKING!");
    Serial.print("   Received ");
    Serial.print(dataCount);
    Serial.println(" bytes of data");
    Serial.println("\n📡 What you see above are NMEA sentences");
    Serial.println("   ($GPGGA, $GPRMC, $GPGSA, etc.)");
    Serial.println("\n⚠️  If you see data but no location fix:");
    Serial.println("   - Take the module OUTSIDE");
    Serial.println("   - Wait 5-10 minutes for first fix");
    Serial.println("   - Ensure clear view of sky");
  } else {
    Serial.println("❌ GPS NOT RESPONDING");
    Serial.println("\n🔧 CHECK THESE THINGS:");
    Serial.println("\n   1. WIRING:");
    Serial.println("      • GPS VCC → ESP32 3.3V or 5V (check module spec)");
    Serial.println("      • GPS GND → ESP32 GND");
    Serial.println("      • GPS TX  → ESP32 Pin 16");
    Serial.println("      • GPS RX  → ESP32 Pin 17 (optional)");
    Serial.println("\n   2. BAUD RATE:");
    Serial.println("      • Try changing 9600 to 4800 or 115200");
    Serial.println("      • Line 15: gpsSerial.begin(9600,...)");
    Serial.println("\n   3. POWER:");
    Serial.println("      • Some GPS modules need 5V (use VIN pin)");
    Serial.println("      • Check if LED on GPS module is blinking");
    Serial.println("\n   4. CONNECTION:");
    Serial.println("      • Swap TX and RX (pin 16 ↔ 17)");
    Serial.println("      • Check for loose wires");
  }
  
  Serial.println("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  Serial.println("\n🔄 Restarting test in 5 seconds...\n");
  delay(5000);
}