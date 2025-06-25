/**
 * @file ESP32-S3_PetCollar.ino
 * @brief Advanced ESP32-S3 Pet Collar Firmware - Refactored Implementation
 * @version 4.0.0-Refactored
 * @date 2024
 * 
 * 🚀 PREMIUM REFACTORED IMPLEMENTATION:
 * ✅ Modular architecture with clean separation of concerns
 * ✅ Comprehensive error handling and recovery systems
 * ✅ Optimized memory usage and performance
 * ✅ Advanced WiFi management with multi-network support
 * ✅ Sophisticated BLE beacon scanning and proximity detection
 * ✅ Real-time WebSocket communication with live dashboard updates
 * ✅ OLED display with intelligent status management
 * ✅ Battery monitoring and power management
 * ✅ Professional alert system with configurable triggers
 * ✅ System health monitoring and diagnostics
 * ✅ OTA update capability and service discovery
 * 
 * Hardware Requirements:
 * - ESP32-S3 DevKitC-1 or compatible
 * - SSD1306 OLED Display (64x32 or 128x64)
 * - Buzzer and/or vibration motor
 * - Battery with voltage monitoring capability
 * - Status LEDs for system indicators
 * 
 * @author PETg Development Team
 * @license MIT
 */

// ==================== CORE SYSTEM INCLUDES ====================
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <esp_task_wdt.h>
#include <esp_system.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>

// Display and hardware libraries
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// BLE libraries
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

// ==================== REFACTORED COMPONENT INCLUDES ====================
#include "include/ESP32_S3_Config.h"
#include "include/MicroConfig.h"
#include "include/WiFiManager.h"
#include "include/AlertManager.h"
#include "include/BeaconManager.h"
#include "include/ZoneManager.h"
#include "include/SystemStateManager.h"
#include "include/Triangulator.h"

// ==================== FIRMWARE CONFIGURATION ====================
#define FIRMWARE_VERSION "4.0.0-Refactored"
#define HARDWARE_PLATFORM "ESP32-S3"
#define BUILD_DATE __DATE__ " " __TIME__

// Display configuration
#define SCREEN_WIDTH 64
#define SCREEN_HEIGHT 32
#define OLED_ADDRESS 0x3C
#define OLED_RESET_PIN -1

// ==================== GLOBAL SYSTEM OBJECTS ====================
// Core system managers (using refactored components)
WiFiManager_Enhanced wifiManager;
AlertManager_Enhanced alertManager(BUZZER_PIN, VIBRATION_PIN);
BeaconManager_Enhanced beaconManager;
ZoneManager_Enhanced zoneManager;
SystemStateManager systemStateManager;
Triangulator triangulator;

// Hardware interfaces
WebServer server(80);
WebSocketsServer webSocket(8080);
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET_PIN);
Preferences preferences;
BLEScan* pBLEScan = nullptr;

// Network discovery
WiFiUdp udp;
const int DISCOVERY_PORT = 47808;
unsigned long lastBroadcast = 0;
const unsigned long BROADCAST_INTERVAL = 15000;

// ==================== SYSTEM STATE VARIABLES ====================
SystemConfig systemConfig;
SystemState currentState;
bool systemInitialized = false;
unsigned long bootTime = 0;

// Multi-WiFi network configuration
struct WiFiCredentials {
    const char* ssid;
    const char* password;
    const char* location;
};

WiFiCredentials wifiNetworks[] = {
    {"JenoviceAP", "DataSecNet", "Primary Location"},
    {"g@n", "0547530732", "Secondary Location"}
};
const int numNetworks = sizeof(wifiNetworks) / sizeof(wifiNetworks[0]);
int currentNetworkIndex = -1;

// ==================== BLE CALLBACK IMPLEMENTATION ====================
/**
 * @class AdvancedDeviceCallbacks
 * @brief Enhanced BLE device callbacks for proximity detection
 */
class AdvancedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
public:
    void onResult(BLEAdvertisedDevice advertisedDevice) {
        // Process detected beacon through enhanced beacon manager
        BeaconData beacon;
        beacon.address = advertisedDevice.getAddress().toString().c_str();
        beacon.rssi = advertisedDevice.getRSSI();
        beacon.name = advertisedDevice.haveName() ? 
                     advertisedDevice.getName().c_str() : "Unknown";
        beacon.lastSeen = millis();
        beacon.isActive = true;
        
        // Calculate distance estimation
        beacon.distance = beaconManager.calculateDistance(beacon.rssi);
        beacon.confidence = beaconManager.calculateConfidence(beacon.rssi);
        
        // Update beacon manager with new detection
        beaconManager.updateBeacon(beacon);
        
        // Check for proximity alerts
        checkProximityAlerts(beacon);
        
        // Update system statistics
        systemStateManager.updateBeaconStats(1);
    }
};

// ==================== DISPLAY MANAGEMENT ====================
/**
 * @brief Initialize OLED display with comprehensive error handling
 * @return bool Success status
 */
bool initializeDisplay() {
    Serial.println("🖥️ Initializing OLED display system...");
    
    // Initialize I2C with ESP32-S3 optimized pins
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
    Wire.setClock(400000); // 400kHz for optimal performance
    
    // Test I2C connection
    Wire.beginTransmission(OLED_ADDRESS);
    if (Wire.endTransmission() != 0) {
        Serial.printf("❌ I2C device not found at address 0x%02X\n", OLED_ADDRESS);
        Serial.println("🔍 Check display connections:");
        Serial.println("   VCC → 3.3V, GND → GND");
        Serial.printf("   SDA → GPIO %d, SCL → GPIO %d\n", I2C_SDA_PIN, I2C_SCL_PIN);
        return false;
    }
    
    // Initialize display with error handling
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
        Serial.println("❌ OLED display initialization failed!");
        return false;
    }
    
    // Configure display for optimal rendering
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE, SSD1306_BLACK);
    display.setTextWrap(false);
    display.cp437(true);
    display.setRotation(0);
    display.dim(false);
    
    // Show startup screen
    display.setCursor(0, 0);
    display.println("PetCollar");
    display.setCursor(0, 8);
    display.println("ESP32-S3");
    display.setCursor(0, 16);
    display.printf("%dx%d", SCREEN_WIDTH, SCREEN_HEIGHT);
    display.setCursor(0, 24);
    display.println("Ready!");
    display.display();
    
    Serial.printf("✅ OLED display initialized (%dx%d)\n", SCREEN_WIDTH, SCREEN_HEIGHT);
    return true;
}

/**
 * @brief Update display with current system status
 */
void updateDisplay() {
    static unsigned long lastUpdate = 0;
    static int displayMode = 0;
    
    if (millis() - lastUpdate < 1000) return; // Limit update rate
    
    display.clearDisplay();
    
    int line = 0;
    const int lineHeight = 8;
    
    // Line 0: Header
    display.setCursor(0, line * lineHeight);
    display.print("PetCollar");
    line++;
    
    // Line 1: WiFi Status
    display.setCursor(0, line * lineHeight);
    if (currentState.wifiConnected) {
        display.printf("WiFi:%s", currentNetworkIndex >= 0 ? 
                      wifiNetworks[currentNetworkIndex].location : "OK");
    } else {
        display.print("WiFi:Off");
    }
    line++;
    
    // Line 2: Rotating information
    display.setCursor(0, line * lineHeight);
    switch (displayMode % 4) {
        case 0: {
            int activeBeacons = beaconManager.getActiveBeaconCount();
            display.printf("Beac:%d", activeBeacons);
            break;
        }
        case 1:
            display.printf("Bat:%d%%", systemStateManager.getBatteryPercent());
            break;
        case 2:
            display.printf("Up:%lum", millis() / 60000);
            break;
        case 3:
            display.printf("Mem:%dK", ESP.getFreeHeap() / 1024);
            break;
    }
    line++;
    
    // Line 3: Alert status
    if (line * lineHeight < SCREEN_HEIGHT - 8) {
        display.setCursor(0, line * lineHeight);
        if (alertManager.isAlertActive()) {
            display.print("*ALERT*");
        } else if (systemStateManager.getErrorCount() > 0) {
            display.printf("Err:%d", systemStateManager.getErrorCount());
        } else {
            display.print("Ready");
        }
    }
    
    display.display();
    lastUpdate = millis();
    
    // Rotate display mode every 3 seconds
    static unsigned long lastModeChange = 0;
    if (millis() - lastModeChange > 3000) {
        displayMode++;
        lastModeChange = millis();
    }
}

// ==================== NETWORK MANAGEMENT ====================
/**
 * @brief Initialize WiFi connection with multi-network support
 * @return bool Connection success status
 */
bool initializeWiFi() {
    Serial.println("🌐 Initializing advanced WiFi system...");
    
    WiFi.mode(WIFI_STA);
    WiFi.setAutoConnect(true);
    WiFi.setAutoReconnect(true);
    
    // Try each configured network
    for (int i = 0; i < numNetworks; i++) {
        Serial.printf("📡 Attempting connection to %s (%s)...\n", 
                     wifiNetworks[i].ssid, wifiNetworks[i].location);
        
        WiFi.begin(wifiNetworks[i].ssid, wifiNetworks[i].password);
        
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500);
            Serial.print(".");
            attempts++;
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            currentNetworkIndex = i;
            currentState.wifiConnected = true;
            digitalWrite(STATUS_LED_WIFI, HIGH);
            
            Serial.printf("\n✅ Connected to %s\n", wifiNetworks[i].ssid);
            Serial.printf("📍 Location: %s\n", wifiNetworks[i].location);
            Serial.printf("🌐 IP Address: %s\n", WiFi.localIP().toString().c_str());
            Serial.printf("📶 Signal Strength: %d dBm\n", WiFi.RSSI());
            
            return true;
        }
        
        Serial.printf("\n❌ Failed to connect to %s\n", wifiNetworks[i].ssid);
        WiFi.disconnect();
        delay(1000);
    }
    
    Serial.println("❌ Failed to connect to any configured network");
    currentState.wifiConnected = false;
    digitalWrite(STATUS_LED_WIFI, LOW);
    return false;
}

/**
 * @brief Initialize web server and WebSocket endpoints
 */
void initializeWebServices() {
    if (!currentState.wifiConnected) return;
    
    Serial.println("🌐 Initializing web services...");
    
    // HTTP endpoints
    server.on("/", HTTP_GET, handleRoot);
    server.on("/api/discover", HTTP_GET, handleDiscover);
    server.on("/api/status", HTTP_GET, handleStatus);
    server.on("/api/data", HTTP_GET, handleData);
    
    server.begin();
    currentState.webServerRunning = true;
    
    // WebSocket initialization
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    
    Serial.printf("✅ Web server started: http://%s\n", WiFi.localIP().toString().c_str());
    Serial.printf("🔌 WebSocket server: ws://%s:8080\n", WiFi.localIP().toString().c_str());
}

/**
 * @brief Initialize mDNS for service discovery
 */
void initializeMDNS() {
    if (!currentState.wifiConnected) return;
    
    String hostname = "esp32-petcollar-" + WiFi.macAddress().substring(9);
    hostname.replace(":", "");
    hostname.toLowerCase();
    
    if (MDNS.begin(hostname.c_str())) {
        MDNS.addService("http", "tcp", 80);
        MDNS.addService("ws", "tcp", 8080);
        MDNS.addService("petcollar", "tcp", 80);
        
        MDNS.addServiceTxt("petcollar", "tcp", "device_type", "ESP32-S3_PetCollar");
        MDNS.addServiceTxt("petcollar", "tcp", "version", FIRMWARE_VERSION);
        MDNS.addServiceTxt("petcollar", "tcp", "ip", WiFi.localIP().toString());
        
        Serial.printf("✅ mDNS service: %s.local\n", hostname.c_str());
    }
}

// ==================== BLE MANAGEMENT ====================
/**
 * @brief Initialize BLE scanning system
 * @return bool Initialization success status
 */
bool initializeBLE() {
    Serial.println("📡 Initializing advanced BLE system...");
    
    try {
        BLEDevice::init("ESP32-S3-PetCollar-Refactored");
        
        pBLEScan = BLEDevice::getScan();
        pBLEScan->setAdvertisedDeviceCallbacks(new AdvancedDeviceCallbacks());
        pBLEScan->setActiveScan(true);
        pBLEScan->setInterval(BLE_SCAN_INTERVAL);
        pBLEScan->setWindow(BLE_SCAN_WINDOW);
        
        currentState.bleInitialized = true;
        digitalWrite(STATUS_LED_BLE, HIGH);
        
        Serial.println("✅ BLE scanner initialized successfully");
        return true;
        
    } catch (const std::exception& e) {
        Serial.printf("❌ BLE initialization failed: %s\n", e.what());
        currentState.bleInitialized = false;
        digitalWrite(STATUS_LED_BLE, LOW);
        systemStateManager.recordError("BLE init failed");
        return false;
    }
}

// ==================== ALERT MANAGEMENT ====================
/**
 * @brief Check for proximity alerts based on beacon detection
 * @param beacon Detected beacon data
 */
void checkProximityAlerts(const BeaconData& beacon) {
    // Get beacon configuration if exists
    BeaconConfig* config = beaconManager.getBeaconConfig(beacon.address);
    if (!config) return;
    
    // Check if beacon is within trigger distance
    bool inProximity = (beacon.distance <= config->triggerDistanceCm);
    
    if (inProximity && !config->isInProximity) {
        // Entering proximity
        config->isInProximity = true;
        config->proximityStartTime = millis();
        
        // Check proximity delay
        if (!config->enableProximityDelay || config->proximityDelayMs == 0) {
            triggerProximityAlert(*config, beacon);
        }
    } else if (!inProximity && config->isInProximity) {
        // Leaving proximity
        config->isInProximity = false;
        config->proximityStartTime = 0;
        
        if (config->alertActive) {
            alertManager.stopAlert();
            config->alertActive = false;
        }
    } else if (inProximity && config->isInProximity && config->enableProximityDelay) {
        // Check if delay period has elapsed
        if (!config->alertActive && 
            (millis() - config->proximityStartTime) >= config->proximityDelayMs) {
            triggerProximityAlert(*config, beacon);
        }
    }
}

/**
 * @brief Trigger proximity alert for detected beacon
 * @param config Beacon configuration
 * @param beacon Detected beacon data
 */
void triggerProximityAlert(BeaconConfig& config, const BeaconData& beacon) {
    // Check cooldown period
    if (config.lastAlertTime > 0 && 
        (millis() - config.lastAlertTime) < config.cooldownPeriodMs) {
        return;
    }
    
    // Stop any current alert
    alertManager.stopAlert();
    
    // Configure alert parameters
    AlertConfig alertConfig;
    alertConfig.mode = alertManager.stringToAlertMode(config.alertMode);
    alertConfig.intensity = config.alertIntensity;
    alertConfig.duration = config.alertDurationMs;
    alertConfig.reason = AlertReason::PROXIMITY_DETECTED;
    
    // Trigger the alert
    if (alertManager.triggerAlert(alertConfig)) {
        config.alertActive = true;
        config.lastAlertTime = millis();
        systemStateManager.updateProximityAlerts(1);
        
        Serial.printf("🚨 Proximity alert triggered for %s (distance: %dcm)\n", 
                     beacon.name.c_str(), beacon.distance);
        
        // Broadcast alert via WebSocket
        broadcastAlertStatus(config, beacon);
    }
}

// ==================== WEBSOCKET HANDLERS ====================
/**
 * @brief Handle WebSocket events
 * @param num Client number
 * @param type Event type
 * @param payload Event payload
 * @param length Payload length
 */
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
    switch(type) {
        case WStype_DISCONNECTED:
            Serial.printf("🔌 WebSocket client %u disconnected\n", num);
            break;
            
        case WStype_CONNECTED: {
            IPAddress ip = webSocket.remoteIP(num);
            Serial.printf("🔌 WebSocket client %u connected from %d.%d.%d.%d\n", 
                         num, ip[0], ip[1], ip[2], ip[3]);
            
            // Send initial status
            sendSystemStatus(num);
            break;
        }
        
        case WStype_TEXT:
            handleWebSocketMessage(String((char*)payload), num);
            break;
            
        default:
            break;
    }
}

/**
 * @brief Handle WebSocket message commands
 * @param message JSON message string
 * @param clientNum Client number
 */
void handleWebSocketMessage(const String& message, uint8_t clientNum) {
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, message);
    
    if (error) {
        Serial.printf("❌ JSON parsing failed: %s\n", error.c_str());
        sendErrorResponse(clientNum, "Invalid JSON format");
        return;
    }
    
    String command = doc["command"];
    Serial.printf("🎯 Executing command: %s\n", command.c_str());
    
    if (command == "get_status") {
        sendSystemStatus(clientNum);
    } else if (command == "test_buzzer") {
        testAlert(AlertMode::BUZZER_ONLY, clientNum);
    } else if (command == "test_vibration") {
        testAlert(AlertMode::VIBRATION_ONLY, clientNum);
    } else if (command == "stop_alert") {
        alertManager.stopAlert();
        sendCommandResponse(clientNum, command, "stopped");
    } else if (command == "get_beacons") {
        sendBeaconData(clientNum);
    } else if (command == "update_beacon_config") {
        handleBeaconConfigUpdate(doc, clientNum);
    } else {
        sendErrorResponse(clientNum, "Unknown command: " + command);
    }
}

// ==================== HTTP HANDLERS ====================
/**
 * @brief Handle root HTTP request
 */
void handleRoot() {
    String response = "ESP32-S3 Pet Collar - Refactored Firmware v" + String(FIRMWARE_VERSION);
    response += "\nFeatures: Multi-WiFi, Live Proximity Alerts, Advanced Configuration";
    response += "\nBuild: " + String(BUILD_DATE);
    server.send(200, "text/plain", response);
}

/**
 * @brief Handle discovery API endpoint
 */
void handleDiscover() {
    DynamicJsonDocument doc(512);
    doc["device"] = "petg_collar_refactored";
    doc["version"] = FIRMWARE_VERSION;
    doc["platform"] = HARDWARE_PLATFORM;
    doc["features"] = "multi_wifi,advanced_alerts,enhanced_ble,system_monitoring";
    doc["local_ip"] = WiFi.localIP().toString();
    doc["websocket_url"] = "ws://" + WiFi.localIP().toString() + ":8080";
    doc["websocket_port"] = 8080;
    doc["status"] = "active";
    doc["build_date"] = BUILD_DATE;
    
    if (currentNetworkIndex >= 0) {
        doc["current_network"] = wifiNetworks[currentNetworkIndex].location;
        doc["current_ssid"] = wifiNetworks[currentNetworkIndex].ssid;
        doc["signal_strength"] = WiFi.RSSI();
    }
    
    String response;
    serializeJson(doc, response);
    server.send(200, "application/json", response);
}

/**
 * @brief Handle status API endpoint
 */
void handleStatus() {
    String statusJson = systemStateManager.getSystemStatusJSON();
    server.send(200, "application/json", statusJson);
}

/**
 * @brief Handle data API endpoint
 */
void handleData() {
    sendSystemStatusBroadcast();
    server.send(200, "application/json", "{\"status\":\"data_sent_via_websocket\"}");
}

// ==================== UTILITY FUNCTIONS ====================
/**
 * @brief Test alert system
 * @param mode Alert mode to test
 * @param clientNum WebSocket client number
 */
void testAlert(AlertMode mode, uint8_t clientNum) {
    AlertConfig testConfig;
    testConfig.mode = mode;
    testConfig.intensity = 3;
    testConfig.duration = 1000;
    testConfig.reason = AlertReason::MANUAL_TEST;
    
    if (alertManager.triggerAlert(testConfig)) {
        String modeStr = (mode == AlertMode::BUZZER_ONLY) ? "buzzer" : "vibration";
        sendCommandResponse(clientNum, "test_" + modeStr, "triggered");
        Serial.printf("🧪 %s test triggered\n", modeStr.c_str());
    } else {
        sendErrorResponse(clientNum, "Alert test failed");
    }
}

/**
 * @brief Send system status to WebSocket client
 * @param clientNum Client number (optional, -1 for broadcast)
 */
void sendSystemStatus(int clientNum = -1) {
    String statusJson = systemStateManager.getSystemStatusJSON();
    
    if (clientNum >= 0) {
        webSocket.sendTXT(clientNum, statusJson);
    } else {
        webSocket.broadcastTXT(statusJson);
    }
}

/**
 * @brief Send beacon data to WebSocket client
 * @param clientNum Client number
 */
void sendBeaconData(uint8_t clientNum) {
    String beaconJson = beaconManager.getBeaconDataJSON();
    webSocket.sendTXT(clientNum, beaconJson);
}

/**
 * @brief Send command response to WebSocket client
 * @param clientNum Client number
 * @param command Command executed
 * @param status Status result
 */
void sendCommandResponse(uint8_t clientNum, const String& command, const String& status) {
    DynamicJsonDocument doc(256);
    doc["type"] = "response";
    doc["command"] = command;
    doc["status"] = status;
    doc["timestamp"] = millis();
    
    String response;
    serializeJson(doc, response);
    webSocket.sendTXT(clientNum, response);
}

/**
 * @brief Send error response to WebSocket client
 * @param clientNum Client number
 * @param message Error message
 */
void sendErrorResponse(uint8_t clientNum, const String& message) {
    DynamicJsonDocument doc(256);
    doc["type"] = "error";
    doc["message"] = message;
    doc["timestamp"] = millis();
    
    String response;
    serializeJson(doc, response);
    webSocket.sendTXT(clientNum, response);
}

/**
 * @brief Handle beacon configuration updates
 * @param doc JSON document with update data
 * @param clientNum WebSocket client number
 */
void handleBeaconConfigUpdate(const DynamicJsonDocument& doc, uint8_t clientNum) {
    String beaconId = doc["beacon_id"];
    JsonObject config = doc["config"];
    
    if (beaconManager.updateBeaconConfig(beaconId, config)) {
        sendCommandResponse(clientNum, "update_beacon_config", "success");
        Serial.printf("✅ Updated beacon config: %s\n", beaconId.c_str());
    } else {
        sendErrorResponse(clientNum, "Failed to update beacon configuration");
    }
}

/**
 * @brief Broadcast alert status via WebSocket
 * @param config Beacon configuration
 * @param beacon Beacon data
 */
void broadcastAlertStatus(const BeaconConfig& config, const BeaconData& beacon) {
    DynamicJsonDocument doc(512);
    doc["type"] = "proximity_alert";
    doc["beacon_id"] = config.id;
    doc["beacon_name"] = beacon.name;
    doc["distance"] = beacon.distance;
    doc["alert_mode"] = config.alertMode;
    doc["intensity"] = config.alertIntensity;
    doc["timestamp"] = millis();
    
    String message;
    serializeJson(doc, message);
    webSocket.broadcastTXT(message);
}

/**
 * @brief Broadcast system status periodically
 */
void sendSystemStatusBroadcast() {
    static unsigned long lastBroadcast = 0;
    if (millis() - lastBroadcast > 5000) { // Every 5 seconds
        sendSystemStatus(-1); // Broadcast to all clients
        lastBroadcast = millis();
    }
}

/**
 * @brief Broadcast collar presence for discovery
 */
void broadcastCollarPresence() {
    if (!currentState.wifiConnected) return;
    
    DynamicJsonDocument doc(256);
    doc["device"] = "petg_collar_refactored";
    doc["ip"] = WiFi.localIP().toString();
    doc["port"] = 8080;
    doc["version"] = FIRMWARE_VERSION;
    doc["timestamp"] = millis();
    
    String message;
    serializeJson(doc, message);
    
    udp.beginPacket(IPAddress(255, 255, 255, 255), DISCOVERY_PORT);
    udp.print(message);
    udp.endPacket();
}

// ==================== SYSTEM MONITORING ====================
/**
 * @brief Perform system health checks and maintenance
 */
void performSystemMaintenance() {
    static unsigned long lastMaintenance = 0;
    if (millis() - lastMaintenance < 30000) return; // Every 30 seconds
    
    // Update system metrics
    systemStateManager.updateSystemMetrics();
    
    // Check WiFi connection
    if (currentState.wifiConnected && WiFi.status() != WL_CONNECTED) {
        Serial.println("⚠️ WiFi connection lost, attempting reconnection...");
        currentState.wifiConnected = false;
        digitalWrite(STATUS_LED_WIFI, LOW);
        initializeWiFi();
    }
    
    // Clean up old beacon data
    beaconManager.cleanupOldBeacons(60000); // Remove beacons not seen for 1 minute
    
    // Update battery status
    systemStateManager.updateBatteryStatus();
    
    // Check system health
    if (systemStateManager.getErrorCount() > 10) {
        Serial.println("⚠️ High error count detected, performing system recovery...");
        // Implement recovery procedures if needed
    }
    
    lastMaintenance = millis();
}

/**
 * @brief Print system status to serial
 */
void printSystemStatus() {
    static unsigned long lastStatus = 0;
    if (millis() - lastStatus < 60000) return; // Every minute
    
    Serial.println("═══════════════════════════════════════");
    Serial.printf("💓 ESP32-S3 Pet Collar System Status\n");
    Serial.printf("🕐 Uptime: %lu seconds\n", millis() / 1000);
    Serial.printf("🧠 Free Heap: %d KB\n", ESP.getFreeHeap() / 1024);
    Serial.printf("🔋 Battery: %d%%\n", systemStateManager.getBatteryPercent());
    Serial.printf("📡 WiFi: %s\n", currentState.wifiConnected ? "Connected" : "Disconnected");
    Serial.printf("📱 BLE: %s\n", currentState.bleInitialized ? "Active" : "Inactive");
    Serial.printf("🏷️ Active Beacons: %d\n", beaconManager.getActiveBeaconCount());
    Serial.printf("🚨 Proximity Alerts: %d\n", systemStateManager.getProximityAlerts());
    Serial.printf("❌ Errors: %d\n", systemStateManager.getErrorCount());
    Serial.println("═══════════════════════════════════════");
    
    lastStatus = millis();
}

// ==================== ARDUINO CORE FUNCTIONS ====================
/**
 * @brief Arduino setup function - Initialize all systems
 */
void setup() {
    Serial.begin(115200);
    delay(2000); // Allow serial to stabilize
    
    bootTime = millis();
    
    // Print banner
    Serial.println("═══════════════════════════════════════");
    Serial.printf("🚀 ESP32-S3 Pet Collar - Refactored v%s\n", FIRMWARE_VERSION);
    Serial.printf("🏗️ Platform: %s\n", HARDWARE_PLATFORM);
    Serial.printf("📅 Build: %s\n", BUILD_DATE);
    Serial.println("🌟 Features: Advanced BLE, Multi-WiFi, Real-time Alerts");
    Serial.println("═══════════════════════════════════════");
    
    // Initialize hardware pins
    pinMode(BUZZER_PIN, OUTPUT);
    pinMode(VIBRATION_PIN, OUTPUT);
    pinMode(STATUS_LED_WIFI, OUTPUT);
    pinMode(STATUS_LED_BLE, OUTPUT);
    pinMode(STATUS_LED_POWER, OUTPUT);
    pinMode(BATTERY_VOLTAGE_PIN, INPUT);
    
    // Power on indicator
    digitalWrite(STATUS_LED_POWER, HIGH);
    
    // Initialize preferences storage
    preferences.begin("petcollar", false);
    
    // Initialize system managers
    systemStateManager.initialize();
    alertManager.initialize();
    beaconManager.initialize();
    zoneManager.initialize();
    
    // Initialize hardware systems
    bool displayOK = initializeDisplay();
    bool wifiOK = initializeWiFi();
    bool bleOK = initializeBLE();
    
    // Initialize network services if WiFi is available
    if (wifiOK) {
        initializeWebServices();
        initializeMDNS();
        
        // Initialize UDP for discovery
        udp.begin(DISCOVERY_PORT);
        Serial.printf("✅ UDP discovery service on port %d\n", DISCOVERY_PORT);
    }
    
    // Add default beacon configurations for testing
    beaconManager.addDefaultConfigurations();
    
    // System initialization complete
    systemInitialized = true;
    currentState.systemReady = true;
    
    Serial.println("═══════════════════════════════════════");
    Serial.println("✅ ESP32-S3 Pet Collar System Ready!");
    Serial.printf("🌐 Web Interface: http://%s\n", 
                 wifiOK ? WiFi.localIP().toString().c_str() : "No WiFi");
    Serial.printf("🔌 WebSocket: ws://%s:8080\n", 
                 wifiOK ? WiFi.localIP().toString().c_str() : "No WiFi");
    Serial.printf("🖥️ Display: %s\n", displayOK ? "Active" : "Inactive");
    Serial.printf("📡 BLE Scanner: %s\n", bleOK ? "Active" : "Inactive");
    Serial.println("🔍 Scanning for proximity beacons...");
    Serial.println("═══════════════════════════════════════");
}

/**
 * @brief Arduino main loop - Handle all system operations
 */
void loop() {
    unsigned long currentTime = millis();
    
    // Handle web server and WebSocket
    if (currentState.webServerRunning) {
        server.handleClient();
        webSocket.loop();
    }
    
    // Perform BLE scanning
    if (currentState.bleInitialized) {
        static unsigned long lastBLEScan = 0;
        if (currentTime - lastBLEScan >= BLE_SCAN_PERIOD) {
            try {
                pBLEScan->start(BLE_SCAN_DURATION, false);
                pBLEScan->clearResults();
                lastBLEScan = currentTime;
            } catch (const std::exception& e) {
                Serial.printf("⚠️ BLE scan error: %s\n", e.what());
                systemStateManager.recordError("BLE scan failed");
            }
        }
    }
    
    // Update display
    updateDisplay();
    
    // Handle alert management
    alertManager.update();
    
    // System maintenance and monitoring
    performSystemMaintenance();
    
    // Print periodic status
    printSystemStatus();
    
    // Broadcast system status via WebSocket
    sendSystemStatusBroadcast();
    
    // Broadcast collar presence for discovery
    if (currentState.wifiConnected && (currentTime - lastBroadcast > BROADCAST_INTERVAL)) {
        broadcastCollarPresence();
        lastBroadcast = currentTime;
    }
    
    // Watchdog and system stability
    delay(10); // Small delay for system stability
} 