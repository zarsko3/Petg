/**
 * 🐕 ESP32-S3 Pet Collar - MQTT Cloud Integration
 * 
 * This firmware connects to HiveMQ cloud via MQTT over TLS to:
 * - Publish telemetry data (battery, status, beacons)
 * - Receive commands (buzzer, LED)
 * - Maintain online/offline status with Last Will Testament
 * 
 * @version 4.1.0
 * @author Collar System
 * @date 2024
 */

// ==================== FIRMWARE VERSION ====================
#define FIRMWARE_VERSION "4.1.0"
#define HARDWARE_PLATFORM "ESP32-S3"
#define BUILD_DATE __DATE__ " " __TIME__

// ==================== LIBRARY INCLUDES ====================
#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>

// Verify library versions
#if ARDUINOJSON_VERSION_MAJOR < 7
  #warning "⚠️ ArduinoJson v7.0.0+ recommended for best compatibility"
#endif

#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

// =========================
// 🔧 CONFIGURATION
// =========================

// Wi-Fi Configuration
const char* WIFI_SSID = "JenoviceAP";
const char* WIFI_PASSWORD = "********"; // Replace with actual password

// MQTT Configuration - HiveMQ Cloud
const char* MQTT_HOST = "ab1d45df84884fd68d24d7d25cc78f2f.s1.eu.hivemq.cloud";
const uint16_t MQTT_PORT = 8883;  // TLS port
const char* MQTT_USER = "zarsko";
const char* MQTT_PASSWORD = "089430732zG";

// Device Configuration
const char* DEVICE_ID = "001";  // Change this for each collar
const char* DEVICE_NAME = "COLLAR-001";

// Hardware Pins
const int BUZZER_PIN = 4;
const int LED_PIN = 2;
const int BATTERY_PIN = A0;  // ADC pin for battery monitoring

// Timing Configuration
const unsigned long TELEMETRY_INTERVAL = 30000;  // 30 seconds
const unsigned long HEARTBEAT_INTERVAL = 60000;  // 1 minute
const unsigned long BLE_SCAN_DURATION = 5;       // 5 seconds
const unsigned long WIFI_TIMEOUT = 10000;        // 10 seconds
const unsigned long MQTT_TIMEOUT = 5000;         // 5 seconds

// =========================
// 🌐 GLOBAL OBJECTS
// =========================

WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);
BLEScan* pBLEScan;

// =========================
// 📊 STATE VARIABLES
// =========================

struct SystemState {
  bool wifiConnected = false;
  bool mqttConnected = false;
  bool bleInitialized = false;
  unsigned long uptime = 0;
  unsigned long lastTelemetry = 0;
  unsigned long lastHeartbeat = 0;
  int batteryLevel = 100;
  float batteryVoltage = 4.2;
  String systemState = "normal";
  bool alertActive = false;
  
  // Statistics
  int successfulScans = 0;
  int totalScans = 0;
  int mqttReconnects = 0;
  
  // BLE Beacons
  int beaconsDetected = 0;
  unsigned long lastScan = 0;
} state;

// =========================
// 🏷️ MQTT TOPICS
// =========================

String getStatusTopic() {
  return "collar/" + String(DEVICE_ID) + "/status";
}

String getTelemetryTopic() {
  return "collar/" + String(DEVICE_ID) + "/telemetry";
}

String getBuzzCommandTopic() {
  return "collar/" + String(DEVICE_ID) + "/command/buzz";
}

String getLEDCommandTopic() {
  return "collar/" + String(DEVICE_ID) + "/command/led";
}

String getSettingsCommandTopic() {
  return "collar/" + String(DEVICE_ID) + "/command/settings";
}

// =========================
// 🔊 BLE BEACON SCANNING
// =========================

class BeaconScanCallbacks: public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice advertisedDevice) {
    state.beaconsDetected++;
    
    String deviceName = advertisedDevice.getName().c_str();
    int rssi = advertisedDevice.getRSSI();
    String address = advertisedDevice.getAddress().toString().c_str();
    
    Serial.printf("📡 BLE Beacon: %s, RSSI: %d, Address: %s\n", 
                  deviceName.c_str(), rssi, address.c_str());
  }
};

// =========================
// ⚡ HARDWARE FUNCTIONS
// =========================

void initializeHardware() {
  Serial.begin(115200);
  Serial.println("🚀 ESP32-S3 Pet Collar Starting...");
  
  // Initialize pins
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BATTERY_PIN, INPUT);
  
  // LED startup sequence
  for (int i = 0; i < 3; i++) {
    digitalWrite(LED_PIN, HIGH);
    delay(200);
    digitalWrite(LED_PIN, LOW);
    delay(200);
  }
  
  Serial.println("✅ Hardware initialized");
}

void updateBatteryStatus() {
  int adcValue = analogRead(BATTERY_PIN);
  state.batteryVoltage = (adcValue * 3.3) / 4095.0 * 2; // Voltage divider
  state.batteryLevel = map(constrain(state.batteryVoltage * 100, 320, 420), 320, 420, 0, 100);
  
  // Update system state based on battery
  if (state.batteryLevel < 15) {
    state.systemState = "lowBattery";
  } else if (state.alertActive) {
    state.systemState = "alert";
  } else {
    state.systemState = "normal";
  }
}

void activateBuzzer(int durationMs, String pattern = "single") {
  Serial.printf("🔊 Activating buzzer: %dms, pattern: %s\n", durationMs, pattern.c_str());
  
  if (pattern == "single") {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(durationMs);
    digitalWrite(BUZZER_PIN, LOW);
  } else if (pattern == "double") {
    for (int i = 0; i < 2; i++) {
      digitalWrite(BUZZER_PIN, HIGH);
      delay(durationMs / 3);
      digitalWrite(BUZZER_PIN, LOW);
      delay(durationMs / 6);
    }
  } else if (pattern == "triple") {
    for (int i = 0; i < 3; i++) {
      digitalWrite(BUZZER_PIN, HIGH);
      delay(durationMs / 5);
      digitalWrite(BUZZER_PIN, LOW);
      delay(durationMs / 10);
    }
  }
}

void controlLED(String mode, String color = "white", int durationMs = 1000) {
  Serial.printf("💡 LED Control: %s %s for %dms\n", mode.c_str(), color.c_str(), durationMs);
  
  if (mode == "on") {
    digitalWrite(LED_PIN, HIGH);
  } else if (mode == "off") {
    digitalWrite(LED_PIN, LOW);
  } else if (mode == "blink") {
    unsigned long endTime = millis() + durationMs;
    while (millis() < endTime) {
      digitalWrite(LED_PIN, HIGH);
      delay(250);
      digitalWrite(LED_PIN, LOW);
      delay(250);
    }
  } else if (mode == "pulse") {
    unsigned long endTime = millis() + durationMs;
    while (millis() < endTime) {
      for (int i = 0; i < 255; i += 5) {
        analogWrite(LED_PIN, i);
        delay(10);
      }
      for (int i = 255; i >= 0; i -= 5) {
        analogWrite(LED_PIN, i);
        delay(10);
      }
    }
    digitalWrite(LED_PIN, LOW);
  }
}

// =========================
// 📡 WIFI FUNCTIONS
// =========================

void connectToWiFi() {
  if (state.wifiConnected) return;
  
  Serial.printf("🌐 Connecting to WiFi: %s\n", WIFI_SSID);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  
  unsigned long startTime = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_TIMEOUT) {
    delay(500);
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    state.wifiConnected = true;
    Serial.printf("\n✅ WiFi connected! IP: %s\n", WiFi.localIP().toString().c_str());
    Serial.printf("📶 Signal strength: %d dBm\n", WiFi.RSSI());
  } else {
    Serial.println("\n❌ WiFi connection failed");
    state.wifiConnected = false;
  }
}

void checkWiFiConnection() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠️ WiFi disconnected, attempting reconnection...");
    state.wifiConnected = false;
    connectToWiFi();
  }
}

// =========================
// 📨 MQTT FUNCTIONS
// =========================

void connectToMQTT() {
  if (mqttClient.connected()) return;
  if (!state.wifiConnected) return;
  
  Serial.println("🌐 Connecting to MQTT...");
  
  // Configure TLS - For production, replace with proper certificate
  wifiClient.setInsecure(); // OK for pilot testing
  
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(onMqttMessage);
  mqttClient.setKeepAlive(60);
  mqttClient.setSocketTimeout(15);
  
  // Last Will and Testament
  String statusTopic = getStatusTopic();
  String offlineMessage = "{\"device_id\":\"" + String(DEVICE_ID) + "\",\"status\":\"offline\",\"timestamp\":" + String(millis()) + "}";
  
  String clientId = String(DEVICE_NAME) + "-" + String(random(0xffff), HEX);
  
  if (mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASSWORD, 
                        statusTopic.c_str(), 1, true, offlineMessage.c_str())) {
    Serial.println("✅ MQTT connected!");
    state.mqttConnected = true;
    state.mqttReconnects++;
    
    // Subscribe to command topics
    mqttClient.subscribe(getBuzzCommandTopic().c_str(), 1);
    mqttClient.subscribe(getLEDCommandTopic().c_str(), 1);
    mqttClient.subscribe(getSettingsCommandTopic().c_str(), 1);
    
    // Publish online status
    publishStatus("online");
    
    Serial.printf("📡 Subscribed to command topics for device %s\n", DEVICE_ID);
    
  } else {
    Serial.printf("❌ MQTT connection failed, rc=%d\n", mqttClient.state());
    state.mqttConnected = false;
  }
}

void onMqttMessage(char* topic, byte* payload, unsigned int length) {
  String topicStr = String(topic);
  String message = "";
  
  for (int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.printf("📨 MQTT Message on %s: %s\n", topic, message.c_str());
  
  // Parse JSON command
  DynamicJsonDocument doc(1024);
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.printf("❌ JSON parsing failed: %s\n", error.c_str());
    return;
  }
  
  // Handle buzzer commands
  if (topicStr.indexOf("/command/buzz") > 0) {
    int duration = doc["duration_ms"] | 500;
    String pattern = doc["pattern"] | "single";
    activateBuzzer(duration, pattern);
  }
  
  // Handle LED commands
  else if (topicStr.indexOf("/command/led") > 0) {
    String mode = doc["mode"] | "blink";
    String color = doc["color"] | "white";
    int duration = doc["duration_ms"] | 1000;
    controlLED(mode, color, duration);
  }
  
  // Handle settings commands
  else if (topicStr.indexOf("/command/settings") > 0) {
    // Future: Handle configuration updates
    Serial.println("📋 Settings command received (not implemented yet)");
  }
}

void publishStatus(String status) {
  if (!state.mqttConnected) return;
  
  DynamicJsonDocument doc(512);
  doc["device_id"] = String(DEVICE_ID);
  doc["status"] = status;
  doc["timestamp"] = millis();
  doc["ip_address"] = WiFi.localIP().toString();
  
  String message;
  serializeJson(doc, message);
  
  mqttClient.publish(getStatusTopic().c_str(), message.c_str(), true);
  Serial.printf("📊 Published status: %s\n", status.c_str());
}

void publishTelemetry() {
  if (!state.mqttConnected) return;
  
  DynamicJsonDocument doc(2048);
  
  // Basic device info
  doc["device_id"] = String(DEVICE_ID);
  doc["timestamp"] = millis();
  doc["uptime"] = state.uptime;
  doc["freeHeap"] = ESP.getFreeHeap();
  doc["localIP"] = WiFi.localIP().toString();
  
  // System status
  doc["wifi_connected"] = state.wifiConnected;
  doc["system_state"] = state.systemState;
  doc["alert_active"] = state.alertActive;
  
  // Battery information
  doc["battery_level"] = state.batteryLevel;
  doc["battery_voltage"] = state.batteryVoltage;
  
  // BLE Scanner information
  JsonObject scanner = doc.createNestedObject("scanner");
  scanner["ble_active"] = state.bleInitialized;
  scanner["beacons_detected"] = state.beaconsDetected;
  scanner["last_scan"] = state.lastScan;
  scanner["successful_scans"] = state.successfulScans;
  scanner["total_scans"] = state.totalScans;
  
  // Placeholder for beacons array (would be populated during actual scan)
  JsonArray beacons = doc.createNestedArray("beacons");
  // In a real implementation, you would add detected beacons here
  
  String message;
  serializeJson(doc, message);
  
  mqttClient.publish(getTelemetryTopic().c_str(), message.c_str());
  Serial.println("📈 Published telemetry");
  
  state.lastTelemetry = millis();
}

void checkMqttConnection() {
  if (!mqttClient.connected()) {
    Serial.println("⚠️ MQTT disconnected, attempting reconnection...");
    state.mqttConnected = false;
    connectToMQTT();
  }
}

// =========================
// 🔵 BLE FUNCTIONS
// =========================

void initializeBLE() {
  Serial.println("🔵 Initializing BLE...");
  
  try {
    BLEDevice::init("");
    pBLEScan = BLEDevice::getScan();
    pBLEScan->setAdvertisedDeviceCallbacks(new BeaconScanCallbacks());
    pBLEScan->setActiveScan(true);
    pBLEScan->setInterval(100);
    pBLEScan->setWindow(99);
    
    state.bleInitialized = true;
    Serial.println("✅ BLE initialized");
  } catch (const std::exception& e) {
    Serial.printf("❌ BLE initialization failed: %s\n", e.what());
    state.bleInitialized = false;
  }
}

void performBLEScan() {
  if (!state.bleInitialized) return;
  
  Serial.println("🔍 Starting BLE scan...");
  state.beaconsDetected = 0;
  state.totalScans++;
  state.lastScan = millis();
  
  try {
    BLEScanResults foundDevices = pBLEScan->start(BLE_SCAN_DURATION, false);
    state.successfulScans++;
    
    Serial.printf("📡 BLE scan completed: %d devices found\n", state.beaconsDetected);
    pBLEScan->clearResults();
    
  } catch (const std::exception& e) {
    Serial.printf("❌ BLE scan error: %s\n", e.what());
  }
}

// =========================
// 🚀 MAIN SETUP & LOOP
// =========================

void setup() {
  // Initialize hardware
  initializeHardware();
  
  // Connect to WiFi
  connectToWiFi();
  
  // Initialize BLE
  initializeBLE();
  
  // Connect to MQTT
  if (state.wifiConnected) {
    connectToMQTT();
  }
  
  Serial.println("🎯 Setup complete! Collar is operational.");
  Serial.printf("📱 Device ID: %s\n", DEVICE_ID);
  Serial.printf("🌐 MQTT Host: %s:%d\n", MQTT_HOST, MQTT_PORT);
}

void loop() {
  state.uptime = millis();
  
  // Maintain connections
  checkWiFiConnection();
  if (state.wifiConnected) {
    checkMqttConnection();
    mqttClient.loop();
  }
  
  // Update battery status
  updateBatteryStatus();
  
  // Publish telemetry periodically
  if (millis() - state.lastTelemetry > TELEMETRY_INTERVAL) {
    publishTelemetry();
  }
  
  // Heartbeat status
  if (millis() - state.lastHeartbeat > HEARTBEAT_INTERVAL) {
    if (state.mqttConnected) {
      publishStatus("online");
    }
    state.lastHeartbeat = millis();
  }
  
  // BLE scanning (less frequent to save battery)
  static unsigned long lastBLEScan = 0;
  if (millis() - lastBLEScan > 60000) {  // Every minute
    performBLEScan();
    lastBLEScan = millis();
  }
  
  // Small delay to prevent watchdog issues
  delay(100);
}

// =========================
// 📝 DEBUG HELPERS
// =========================

void printSystemStatus() {
  Serial.println("\n=== SYSTEM STATUS ===");
  Serial.printf("Device ID: %s\n", DEVICE_ID);
  Serial.printf("Uptime: %lu ms\n", state.uptime);
  Serial.printf("WiFi: %s\n", state.wifiConnected ? "Connected" : "Disconnected");
  Serial.printf("MQTT: %s\n", state.mqttConnected ? "Connected" : "Disconnected");
  Serial.printf("BLE: %s\n", state.bleInitialized ? "Active" : "Inactive");
  Serial.printf("Battery: %d%% (%.2fV)\n", state.batteryLevel, state.batteryVoltage);
  Serial.printf("System State: %s\n", state.systemState.c_str());
  Serial.printf("Beacons Detected: %d\n", state.beaconsDetected);
  Serial.printf("MQTT Reconnects: %d\n", state.mqttReconnects);
  Serial.println("====================\n");
} 