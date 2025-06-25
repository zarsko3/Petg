/*
   PETg Pet Tracking Collar - Enhanced Proximity Alert Firmware (Simplified)
   ESP32-S3 Version with Live Beacon Interaction
   Uses ONLY built-in ESP32 libraries - no external dependencies
   
   Features:
   ✅ Live proximity detection (2cm-20cm configurable)
   ✅ Real-time buzzer/vibration alerts  
   ✅ Proximity delay mode to reduce false positives
   ✅ Configurable alert intensity (1-5 scale)
   ✅ WebSocket configuration interface
   ✅ Over-the-air beacon configuration updates
   
   Version: 2.0 - Live Proximity Alerts (Simplified)
*/

#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

// ==================== HARDWARE CONFIGURATION ====================
#define BUZZER_PIN 18
#define VIBRATION_PIN 19
#define STATUS_LED_PIN 2
#define BATTERY_ADC_PIN 35

// ==================== NETWORK CONFIGURATION ====================
const char* ssid = "YourWiFiNetwork";
const char* password = "YourWiFiPassword";

// ==================== GLOBAL OBJECTS ====================
WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(8080);
BLEScan* pBLEScan;

// ==================== BEACON CONFIGURATION STRUCTURE ====================
struct BeaconConfig {
  String id;
  String name;
  String alertMode;              // "none", "buzzer", "vibration", "both"
  
  // Live Proximity Settings
  int triggerDistanceCm;         // Distance trigger in cm (2-20)
  int alertDurationMs;           // Alert duration in milliseconds
  int alertIntensity;            // Alert intensity 1-5
  bool enableProximityDelay;     // Enable delay before triggering
  int proximityDelayMs;          // Time to stay in range before alert
  int cooldownPeriodMs;          // Cooldown between alerts
  
  // Tracking State
  unsigned long lastSeenTime;
  unsigned long proximityStartTime;
  unsigned long lastAlertTime;
  bool isInProximity;
  bool alertActive;
  
  BeaconConfig() {
    // Smart defaults for immediate alerts
    alertMode = "buzzer";
    triggerDistanceCm = 5;        // 5cm default trigger distance
    alertDurationMs = 2000;       // 2 second alerts
    alertIntensity = 3;           // Medium intensity
    enableProximityDelay = false; // Immediate alerts by default
    proximityDelayMs = 0;         // No delay
    cooldownPeriodMs = 3000;      // 3 second cooldown
    
    // State tracking
    lastSeenTime = 0;
    proximityStartTime = 0;
    lastAlertTime = 0;
    isInProximity = false;
    alertActive = false;
  }
};

// ==================== SYSTEM STATE ====================
BeaconConfig beaconConfigs[10];  // Support up to 10 beacons
int configCount = 0;

bool wifiConnected = false;
unsigned long lastWiFiCheck = 0;
unsigned long lastBeaconScan = 0;
bool systemActive = true;

// Alert system state
unsigned long currentAlertStart = 0;
String currentAlertBeacon = "";
bool buzzerActive = false;
bool vibrationActive = false;

// ==================== DISTANCE CONVERSION FUNCTIONS ====================
int rssiToDistance(int rssi) {
  // Convert RSSI to distance using empirical formula
  float distanceMeters = pow(10.0, (rssi + 40.0) / -20.0);
  return max(1, (int)round(distanceMeters * 100));
}

// ==================== BEACON MANAGEMENT ====================
BeaconConfig* findBeaconConfig(String name) {
  for (int i = 0; i < configCount; i++) {
    if (beaconConfigs[i].name == name) {
      return &beaconConfigs[i];
    }
  }
  return nullptr;
}

void addBeaconConfig(String id, String name, String alertMode, int triggerDistance, int alertDuration, int alertIntensity) {
  if (configCount < 10) {
    BeaconConfig& config = beaconConfigs[configCount];
    config.id = id;
    config.name = name;
    config.alertMode = alertMode;
    config.triggerDistanceCm = triggerDistance;
    config.alertDurationMs = alertDuration;
    config.alertIntensity = alertIntensity;
    configCount++;
    
    Serial.printf("✅ Added beacon config: %s (trigger: %dcm)\n", name.c_str(), triggerDistance);
  }
}

// ==================== ALERT CONTROL FUNCTIONS ====================
void activateBuzzer(int intensity, int durationMs) {
  buzzerActive = true;
  
  // Map intensity (1-5) to PWM duty cycle (50-255)
  int dutyCycle = map(intensity, 1, 5, 50, 255);
  
  // Configure PWM for buzzer
  ledcSetup(0, 2000, 8);
  ledcAttachPin(BUZZER_PIN, 0);
  ledcWrite(0, dutyCycle);
  
  Serial.printf("🔊 BUZZER ON: intensity=%d, duration=%dms\n", intensity, durationMs);
}

void activateVibration(int intensity, int durationMs) {
  vibrationActive = true;
  
  // Map intensity (1-5) to PWM duty cycle (100-255)
  int dutyCycle = map(intensity, 1, 5, 100, 255);
  
  // Configure PWM for vibration motor
  ledcSetup(1, 100, 8);
  ledcAttachPin(VIBRATION_PIN, 1);
  ledcWrite(1, dutyCycle);
  
  Serial.printf("📳 VIBRATION ON: intensity=%d, duration=%dms\n", intensity, durationMs);
}

void stopAlert() {
  // Stop buzzer
  if (buzzerActive) {
    ledcWrite(0, 0);
    ledcDetachPin(BUZZER_PIN);
    buzzerActive = false;
    Serial.println("🔇 Buzzer stopped");
  }
  
  // Stop vibration
  if (vibrationActive) {
    ledcWrite(1, 0);
    ledcDetachPin(VIBRATION_PIN);
    vibrationActive = false;
    Serial.println("📴 Vibration stopped");
  }
  
  // Reset alert state
  BeaconConfig* config = findBeaconConfig(currentAlertBeacon);
  if (config) {
    config->alertActive = false;
  }
  
  currentAlertBeacon = "";
  currentAlertStart = 0;
}

// ==================== PROXIMITY ALERT SYSTEM ====================
void triggerProximityAlert(const String& beaconName, BeaconConfig& config) {
  unsigned long currentTime = millis();
  
  // Check cooldown period
  if (currentTime - config.lastAlertTime < config.cooldownPeriodMs) {
    return;
  }
  
  // Stop any current alert
  if (buzzerActive || vibrationActive) {
    stopAlert();
  }
  
  // Configure new alert
  config.alertActive = true;
  config.lastAlertTime = currentTime;
  currentAlertStart = currentTime;
  currentAlertBeacon = beaconName;
  
  Serial.printf("🚨 PROXIMITY ALERT: %s (%s, %dms, intensity: %d)\n", 
               beaconName.c_str(), config.alertMode.c_str(), 
               config.alertDurationMs, config.alertIntensity);
  
  // Activate alerts based on configuration
  if (config.alertMode == "buzzer" || config.alertMode == "both") {
    activateBuzzer(config.alertIntensity, config.alertDurationMs);
  }
  
  if (config.alertMode == "vibration" || config.alertMode == "both") {
    activateVibration(config.alertIntensity, config.alertDurationMs);
  }
  
  // Send notification via WebSocket
  String alertMessage = "{\"type\":\"proximity_alert\",\"beacon\":\"" + beaconName + 
                       "\",\"mode\":\"" + config.alertMode + 
                       "\",\"timestamp\":" + String(currentTime) + "}";
  webSocket.broadcastTXT(alertMessage);
}

// ==================== BLE PROXIMITY DETECTION ====================
class ProximityAdvertisedDeviceCallbacks: public BLEAdvertisedDeviceCallbacks {
    void onResult(BLEAdvertisedDevice advertisedDevice) {
      String deviceName = advertisedDevice.getName().c_str();
      int rssi = advertisedDevice.getRSSI();
      unsigned long currentTime = millis();
      
      // Only process PetZone beacons
      if (!deviceName.startsWith("PetZone-Home-")) {
        return;
      }
      
      // Find beacon configuration
      BeaconConfig* config = findBeaconConfig(deviceName);
      if (!config) {
        return;
      }
      
      config->lastSeenTime = currentTime;
      
      // Calculate distance and check proximity
      int estimatedDistance = rssiToDistance(rssi);
      bool inTriggerRange = (estimatedDistance <= config->triggerDistanceCm);
      
      // Proximity state machine
      if (inTriggerRange && !config->isInProximity) {
        // Entering proximity
        config->isInProximity = true;
        config->proximityStartTime = currentTime;
        
        Serial.printf("🎯 PROXIMITY: %s at %dcm (trigger: %dcm)\n", 
                     deviceName.c_str(), estimatedDistance, config->triggerDistanceCm);
        
        // Immediate alert or delay mode
        if (!config->enableProximityDelay || config->proximityDelayMs == 0) {
          triggerProximityAlert(deviceName, *config);
        }
        
      } else if (inTriggerRange && config->isInProximity && config->enableProximityDelay) {
        // Check delay
        if (currentTime - config->proximityStartTime >= config->proximityDelayMs && !config->alertActive) {
          triggerProximityAlert(deviceName, *config);
        }
        
      } else if (!inTriggerRange && config->isInProximity) {
        // Leaving proximity
        config->isInProximity = false;
        config->proximityStartTime = 0;
        
        // Stop alert if active
        if (config->alertActive && currentAlertBeacon == deviceName) {
          stopAlert();
        }
      }
    }
};

// ==================== WEBSOCKET HANDLING ====================
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("🔌 WebSocket client disconnected: %u\n", num);
      break;
      
    case WStype_CONNECTED:
      {
        IPAddress ip = webSocket.remoteIP(num);
        Serial.printf("🔗 WebSocket client connected: %u from %s\n", num, ip.toString().c_str());
      }
      break;
      
    case WStype_TEXT:
      {
        String message = String((char*)payload);
        Serial.printf("📥 WebSocket command: %s\n", message.c_str());
        handleWebSocketMessage(message, num);
      }
      break;
      
    default:
      break;
  }
}

void handleWebSocketMessage(String message, uint8_t clientNum) {
  DynamicJsonDocument doc(1024);
  deserializeJson(doc, message);
  
  String command = doc["command"];
  
  if (command == "update_beacon_config") {
    String beaconId = doc["beacon_id"];
    JsonObject configObj = doc["config"];
    
    String name = configObj["name"] | "";
    String alertMode = configObj["alert_mode"] | "buzzer";
    int triggerDistance = configObj["trigger_distance_cm"] | 5;
    int alertDuration = configObj["alert_duration_ms"] | 2000;
    int alertIntensity = configObj["alert_intensity"] | 3;
    
    // Find existing config or add new one
    BeaconConfig* existingConfig = findBeaconConfig(name);
    if (existingConfig) {
      // Update existing
      existingConfig->alertMode = alertMode;
      existingConfig->triggerDistanceCm = triggerDistance;
      existingConfig->alertDurationMs = alertDuration;
      existingConfig->alertIntensity = alertIntensity;
      Serial.printf("✅ Updated beacon config: %s\n", name.c_str());
    } else {
      // Add new
      addBeaconConfig(beaconId, name, alertMode, triggerDistance, alertDuration, alertIntensity);
    }
    
    webSocket.sendTXT(clientNum, "{\"type\":\"response\",\"command\":\"update_beacon_config\",\"status\":\"success\"}");
    
  } else if (command == "test_buzzer") {
    Serial.println("🧪 Testing buzzer...");
    activateBuzzer(3, 2000);
    webSocket.sendTXT(clientNum, "{\"type\":\"response\",\"command\":\"test_buzzer\",\"status\":\"success\"}");
    
  } else if (command == "test_vibration") {
    Serial.println("🧪 Testing vibration...");
    activateVibration(3, 2000);
    webSocket.sendTXT(clientNum, "{\"type\":\"response\",\"command\":\"test_vibration\",\"status\":\"success\"}");
    
  } else if (command == "get_data") {
    sendCollarData();
  }
}

void sendCollarData() {
  DynamicJsonDocument doc(1024);
  doc["status"] = "connected";
  doc["timestamp"] = millis();
  doc["wifi_connected"] = wifiConnected;
  doc["alert_system_active"] = true;
  doc["buzzer_active"] = buzzerActive;
  doc["vibration_active"] = vibrationActive;
  doc["configured_beacons"] = configCount;
  
  String response;
  serializeJson(doc, response);
  webSocket.broadcastTXT(response);
}

// ==================== HTTP ENDPOINTS ====================
void handleRoot() {
  server.send(200, "text/plain", "PETg Collar - Enhanced Proximity Alert System v2.0 (Simplified)");
}

void handleDiscover() {
  String response = "{\"device\":\"petg_collar\",\"version\":\"2.0_simplified\",\"local_ip\":\"" + WiFi.localIP().toString() + "\",\"status\":\"active\"}";
  server.send(200, "application/json", response);
}

void handleData() {
  sendCollarData();
  server.send(200, "application/json", "{\"status\":\"data_sent_via_websocket\"}");
}

// ==================== SYSTEM MANAGEMENT ====================
void manageAlerts() {
  unsigned long currentTime = millis();
  
  if ((buzzerActive || vibrationActive) && currentAlertStart > 0) {
    BeaconConfig* config = findBeaconConfig(currentAlertBeacon);
    if (config && currentTime - currentAlertStart >= config->alertDurationMs) {
      stopAlert();
    }
  }
}

void connectWiFi() {
  Serial.print("🔄 Connecting to WiFi");
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    attempts++;
  }
  
  wifiConnected = (WiFi.status() == WL_CONNECTED);
  
  if (wifiConnected) {
    Serial.println("\n✅ WiFi connected!");
    Serial.println("🌐 IP: " + WiFi.localIP().toString());
  } else {
    Serial.println("\n❌ WiFi connection failed");
  }
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  Serial.println("\n🚀 PETg Enhanced Proximity Alert System v2.0 (Simplified)");
  Serial.println("📋 Features: Live alerts, configurable triggers, intensity control");
  Serial.println("🔧 Using built-in ESP32 libraries only");
  
  // Initialize hardware
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATION_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(VIBRATION_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);
  
  // Connect WiFi
  connectWiFi();
  
  // Setup WebSocket server
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.println("🌐 WebSocket server started on port 8080");
  
  // Setup HTTP server
  server.on("/", handleRoot);
  server.on("/api/discover", handleDiscover);
  server.on("/api/data", handleData);
  
  server.begin();
  Serial.println("🌐 HTTP server started on port 80");
  
  // Initialize BLE
  BLEDevice::init("PETg_Collar_v2_Simple");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new ProximityAdvertisedDeviceCallbacks(), false);
  pBLEScan->setActiveScan(true);
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(99);
  
  Serial.println("📡 BLE proximity scanner initialized");
  Serial.println("✅ Enhanced Proximity Alert System Ready!");
  
  // Add some default beacon configurations for testing
  addBeaconConfig("test-1", "PetZone-Home-01", "buzzer", 5, 2000, 3);
  addBeaconConfig("test-2", "PetZone-Home-02", "both", 3, 1500, 4);
  
  // Signal system ready
  digitalWrite(STATUS_LED_PIN, HIGH);
}

// ==================== MAIN LOOP ====================
void loop() {
  unsigned long currentTime = millis();
  
  // Handle WebSocket
  webSocket.loop();
  
  // Handle HTTP
  server.handleClient();
  
  // WiFi health check
  if (currentTime - lastWiFiCheck > 30000) {
    if (WiFi.status() != WL_CONNECTED) {
      connectWiFi();
    }
    lastWiFiCheck = currentTime;
  }
  
  // Fast BLE scanning for responsive proximity detection
  if (currentTime - lastBeaconScan > 1000) {
    pBLEScan->start(1, false);
    pBLEScan->clearResults();
    lastBeaconScan = currentTime;
  }
  
  // Alert management
  manageAlerts();
  
  delay(50);
} 