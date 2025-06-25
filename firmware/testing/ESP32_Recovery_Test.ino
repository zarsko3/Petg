/*
 * ESP32 Recovery Test
 * 
 * UPLOAD THIS FIRST if you're getting flash read errors
 * 
 * This minimal sketch verifies:
 * - ESP32 can boot properly
 * - Flash memory is working
 * - Serial communication works
 * - Built-in LED functions
 * 
 * If this works, you can proceed with buzzer testing.
 */

#include <Arduino.h>

void setup() {
  Serial.begin(115200);
  delay(2000);  // Give time for serial monitor
  
  Serial.println("🔧 ESP32 Recovery Test");
  Serial.println("=====================");
  Serial.println("✅ ESP32 booted successfully!");
  Serial.println("✅ Flash memory is working!");
  Serial.println("✅ Serial communication active!");
  
  // Setup built-in LED
  pinMode(2, OUTPUT);
  Serial.println("✅ GPIO initialized!");
  
  Serial.println("\n🔄 Starting heartbeat test...");
  Serial.println("You should see the built-in LED blinking.");
  Serial.println("If you see this message and LED blinks, ESP32 is healthy!");
}

void loop() {
  // Blink built-in LED
  digitalWrite(2, HIGH);
  Serial.println("💓 Heartbeat - LED ON");
  delay(1000);
  
  digitalWrite(2, LOW);
  Serial.println("💓 Heartbeat - LED OFF");
  delay(1000);
  
  // Show uptime
  static unsigned long lastReport = 0;
  if (millis() - lastReport > 10000) {  // Every 10 seconds
    lastReport = millis();
    Serial.printf("⏱️ Uptime: %lu seconds\n", millis() / 1000);
    Serial.println("🎯 ESP32 is stable and ready for buzzer testing!");
  }
} 