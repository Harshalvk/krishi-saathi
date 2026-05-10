#include <WiFi.h>

const char* ssid     = "Vivo";
const char* password = "11223344";   // ← type this manually, don't paste

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Print password character by character to catch hidden characters
  Serial.print("Password length: ");
  Serial.println(strlen(password));
  Serial.print("Password chars : ");
  for (int i = 0; i < strlen(password); i++) {
    Serial.print((int)password[i]);   // prints ASCII code of each character
    Serial.print(" ");
  }
  Serial.println();
  // Expected for "Ganpati@1":
  // 71 97 110 112 97 116 105 64 49
  // If you see anything different → wrong character in password

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(500);

  WiFi.begin(ssid, password);
  Serial.print("Connecting");

  for (int i = 0; i < 40; i++) {
    delay(500);
    Serial.print(".");
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✅ Connected! IP: ");
      Serial.println(WiFi.localIP());
      return;
    }
    if (WiFi.status() == WL_CONNECT_FAILED) {
      Serial.println("\n❌ WRONG PASSWORD confirmed");
      return;
    }
  }
  Serial.println("\n❌ Timed out");
}

void loop() {}