/*
   PETg Pet Tracking Collar - Enhanced Proximity Alert Firmware
   ESP32-S3 Version with Live Beacon Interaction
   
   Features:
   ✅ Live proximity detection (2cm-20cm configurable)
   ✅ Real-time buzzer/vibration alerts  
   ✅ Proximity delay mode to reduce false positives
   ✅ Configurable alert intensity (1-5 scale)
   ✅ Alert duration control
   ✅ Cooldown periods between alerts
   ✅ WebSocket configuration interface
   ✅ Over-the-air beacon configuration updates
   
   Author: PETg Development Team
   Version: 2.0 - Live Proximity Alerts
*/

#include <WiFi.h>
#include <AsyncTCP.h>
#include <ESPAsyncWebServer.h>
#include <ArduinoJson.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <map>
#include <vector>

// ==================== HARDWARE CONFIGURATION ====================
#define BUZZER_PIN 18
#define VIBRATION_PIN 19
#define STATUS_LED_PIN 2
#define BATTERY_ADC_PIN 35

// ==================== NETWORK CONFIGURATION ====================
const char* ssid = "YourWiFiNetwork";
const char* password = "YourWiFiPassword";

// ==================== GLOBAL OBJECTS ====================
AsyncWebServer server(80);
AsyncWebSocket ws("/");
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
std::map<String, BeaconConfig> beaconConfigs;
std::vector<String> detectedBeacons;

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
  if (!currentAlertBeacon.isEmpty() && 
      beaconConfigs.find(currentAlertBeacon) != beaconConfigs.end()) {
    beaconConfigs[currentAlertBeacon].alertActive = false;
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
  ws.textAll(alertMessage);
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
      
      // Check if we have configuration for this beacon
      if (beaconConfigs.find(deviceName) == beaconConfigs.end()) {
        return;
      }
      
      BeaconConfig& config = beaconConfigs[deviceName];
      config.lastSeenTime = currentTime;
      
      // Calculate distance and check proximity
      int estimatedDistance = rssiToDistance(rssi);
      bool inTriggerRange = (estimatedDistance <= config.triggerDistanceCm);
      
      // Proximity state machine
      if (inTriggerRange && !config.isInProximity) {
        // Entering proximity
        config.isInProximity = true;
        config.proximityStartTime = currentTime;
        
        Serial.printf("🎯 PROXIMITY: %s at %dcm (trigger: %dcm)\n", 
                     deviceName.c_str(), estimatedDistance, config.triggerDistanceCm);
        
        // Immediate alert or delay mode
        if (!config.enableProximityDelay || config.proximityDelayMs == 0) {
          triggerProximityAlert(deviceName, config);
        }
        
      } else if (inTriggerRange && config.isInProximity && config.enableProximityDelay) {
        // Check delay
        if (currentTime - config.proximityStartTime >= config.proximityDelayMs && !config.alertActive) {
          triggerProximityAlert(deviceName, config);
        }
        
      } else if (!inTriggerRange && config.isInProximity) {
        // Leaving proximity
        config.isInProximity = false;
        config.proximityStartTime = 0;
        
        // Stop alert if active
        if (config.alertActive && currentAlertBeacon == deviceName) {
          stopAlert();
        }
      }
    }
};

// ==================== WEBSOCKET HANDLING ====================
void handleWebSocketMessage(void *arg, uint8_t *data, size_t len) {
  AwsFrameInfo *info = (AwsFrameInfo*)arg;
  if (info->final && info->index == 0 && info->len == len && info->opcode == WS_TEXT) {
    
    data[len] = 0;
    String message = (char*)data;
    
    DynamicJsonDocument doc(1024);
    deserializeJson(doc, message);
    
    String command = doc["command"];
    
    if (command == "update_beacon_config") {
      handleBeaconConfigUpdate(doc);
      
    } else if (command == "test_buzzer") {
      activateBuzzer(3, 2000);
      ws.text(info->client->id(), "{\"type\":\"response\",\"command\":\"test_buzzer\",\"status\":\"success\"}");
      
    } else if (command == "test_vibration") {
      activateVibration(3, 2000);
      ws.text(info->client->id(), "{\"type\":\"response\",\"command\":\"test_vibration\",\"status\":\"success\"}");
      
    } else if (command == "get_data") {
      sendCollarData();
    }
  }
}

void handleBeaconConfigUpdate(DynamicJsonDocument& doc) {
  String beaconId = doc["beacon_id"];
  JsonObject configObj = doc["config"];
  
  BeaconConfig config;
  config.id = beaconId;
  config.name = configObj["name"] | "";
  config.alertMode = configObj["alert_mode"] | "buzzer";
  config.triggerDistanceCm = configObj["trigger_distance_cm"] | 5;
  config.alertDurationMs = configObj["alert_duration_ms"] | 2000;
  config.alertIntensity = configObj["alert_intensity"] | 3;
  config.enableProximityDelay = configObj["enable_proximity_delay"] | false;
  config.proximityDelayMs = configObj["proximity_delay_ms"] | 0;
  config.cooldownPeriodMs = configObj["cooldown_period_ms"] | 3000;
  
  beaconConfigs[beaconId] = config;
  
  Serial.printf("✅ CONFIG UPDATED: %s (trigger: %dcm, mode: %s)\n", 
               config.name.c_str(), config.triggerDistanceCm, config.alertMode.c_str());
  
  ws.textAll("{\"type\":\"response\",\"command\":\"update_beacon_config\",\"status\":\"success\"}");
}

void sendCollarData() {
  DynamicJsonDocument doc(1024);
  doc["status"] = "connected";
  doc["timestamp"] = millis();
  doc["wifi_connected"] = wifiConnected;
  doc["alert_system_active"] = true;
  doc["buzzer_active"] = buzzerActive;
  doc["vibration_active"] = vibrationActive;
  doc["configured_beacons"] = beaconConfigs.size();
  
  String response;
  serializeJson(doc, response);
  ws.textAll(response);
}

// ==================== SYSTEM MANAGEMENT ====================
void manageAlerts() {
  unsigned long currentTime = millis();
  
  if ((buzzerActive || vibrationActive) && currentAlertStart > 0) {
    if (beaconConfigs.find(currentAlertBeacon) != beaconConfigs.end()) {
      BeaconConfig& config = beaconConfigs[currentAlertBeacon];
      
      if (currentTime - currentAlertStart >= config.alertDurationMs) {
        stopAlert();
      }
    }
  }
}

void connectWiFi() {
  WiFi.begin(ssid, password);
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
  }
  
  wifiConnected = (WiFi.status() == WL_CONNECTED);
  
  if (wifiConnected) {
    Serial.println("✅ WiFi connected: " + WiFi.localIP().toString());
  }
}

// ==================== SETUP ====================
void setup() {
  Serial.begin(115200);
  Serial.println("🚀 PETg Enhanced Proximity Alert System v2.0");
  
  // Initialize hardware
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(VIBRATION_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(VIBRATION_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);
  
  // Connect WiFi
  connectWiFi();
  
  // Setup WebSocket
  ws.onEvent([](AsyncWebSocket * server, AsyncWebSocketClient * client, 
                AwsEventType type, void * arg, uint8_t *data, size_t len) {
    if (type == WS_EVT_DATA) {
      handleWebSocketMessage(arg, data, len);
    }
  });
  
  server.addHandler(&ws);
  
  // HTTP endpoints
  server.on("/api/discover", HTTP_GET, [](AsyncWebServerRequest *request) {
    request->send(200, "application/json", 
      "{\"device\":\"petg_collar\",\"version\":\"2.0\",\"local_ip\":\"" + WiFi.localIP().toString() + "\"}");
  });
  
  server.begin();
  
  // Initialize BLE
  BLEDevice::init("PETg_Collar_v2");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new ProximityAdvertisedDeviceCallbacks(), false);
  pBLEScan->setActiveScan(true);
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(99);
  
  Serial.println("✅ Enhanced Proximity Alert System Ready!");
  digitalWrite(STATUS_LED_PIN, HIGH);
}

// ==================== MAIN LOOP ====================
void loop() {
  unsigned long currentTime = millis();
  
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
  
  // WebSocket maintenance
  ws.cleanupClients();
  
  delay(50);
} 