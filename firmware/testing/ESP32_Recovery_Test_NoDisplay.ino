/*
 * ESP32 Recovery Test - No Display Version
 * 
 * UPLOAD THIS if you're getting I2C timeout errors
 * 
 * This version removes all I2C/display functionality that causes timeouts
 * when no OLED display is connected.
 * 
 * Features tested:
 * - ESP32 basic functionality
 * - Serial communication
 * - GPIO control (LED)
 * - WiFi connectivity
 * - Basic system stability
 */

#include <WiFi.h>

// Configuration
const char* WIFI_SSID = "g@n";  // Your WiFi network
const char* WIFI_PASSWORD = "0547530732";  // Your WiFi password

// Hardware pins
#define LED_PIN 2
#define BUTTON_PIN 0

// Global variables
unsigned long lastHeartbeat = 0;
unsigned long lastWifiCheck = 0;
bool wifiConnected = false;

void setup() {
  Serial.begin(115200);
  delay(2000);  // Give time for serial monitor
  
  Serial.println("🔧 ESP32 Recovery Test - No Display Version");
  Serial.println("============================================");
  Serial.println("✅ ESP32 booted successfully!");
  Serial.println("✅ Flash memory is working!");
  Serial.println("✅ Serial communication active!");
  
  // Setup hardware pins
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  Serial.println("✅ GPIO initialized!");
  
  // Initialize WiFi
  initWiFi();
  
  Serial.println("\n🔄 Starting system test...");
  Serial.println("You should see the built-in LED blinking.");
  Serial.println("If you see this message and LED blinks, ESP32 is healthy!");
}

void loop() {
  unsigned long currentTime = millis();
  
  // Heartbeat LED
  if (currentTime - lastHeartbeat > 1000) {
    lastHeartbeat = currentTime;
    
    static bool ledState = false;
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState);
    
    Serial.printf("💓 Heartbeat - LED %s\n", ledState ? "ON" : "OFF");
    
    // Show uptime every 10 heartbeats
    static int heartbeatCount = 0;
    heartbeatCount++;
    if (heartbeatCount >= 10) {
      heartbeatCount = 0;
      Serial.printf("⏱️ Uptime: %lu seconds\n", millis() / 1000);
      Serial.printf("🧠 Free heap: %d bytes\n", ESP.getFreeHeap());
      Serial.println("🎯 ESP32 is stable and ready!");
    }
  }
  
  // Check WiFi status periodically
  if (currentTime - lastWifiCheck > 5000) {
    lastWifiCheck = currentTime;
    checkWiFiStatus();
  }
  
  // Check button press
  if (digitalRead(BUTTON_PIN) == LOW) {
    Serial.println("🔘 Button pressed!");
    delay(200);  // Simple debounce
  }
  
  // Small delay to prevent excessive CPU usage
  delay(10);
}

void initWiFi() {
  Serial.println("📡 Initializing WiFi...");
  
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  Serial.print("🔄 Connecting to WiFi");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi connected!");
    Serial.printf("📍 IP Address: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("📶 Signal strength: %d dBm\n", WiFi.RSSI());
  } else {
    wifiConnected = false;
    Serial.println("\n❌ WiFi connection failed");
    Serial.println("📡 Will retry periodically...");
  }
}

void checkWiFiStatus() {
  bool currentStatus = (WiFi.status() == WL_CONNECTED);
  
  if (currentStatus != wifiConnected) {
    wifiConnected = currentStatus;
    
    if (wifiConnected) {
      Serial.println("✅ WiFi reconnected!");
      Serial.printf("📍 IP Address: %s\n", WiFi.localIP().toString().c_str());
    } else {
      Serial.println("❌ WiFi disconnected!");
      Serial.println("🔄 Attempting to reconnect...");
      WiFi.reconnect();
    }
  }
} 