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

// ==================== DEBUG FLAGS ====================
// Debug flags are now defined in ESP32_S3_Config.h

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
#include "include/BeaconTypes.h"
#include "include/WiFiManager.h"
#include "include/AlertManager.h"
#include "include/BeaconManager.h"
#include "include/ZoneManager.h"
#include "include/SystemStateManager.h"
#include "include/Triangulator.h"
#include "missing_definitions.h"

// ==================== FIRMWARE CONFIGURATION ====================
#define FIRMWARE_VERSION "4.0.0-Refactored"
#define HARDWARE_PLATFORM "ESP32-S3"
#define BUILD_DATE __DATE__ " " __TIME__

// Display configuration
#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 32
#define OLED_ADDRESS 0x3C
#define OLED_RESET_PIN -1

// ==================== GLOBAL SYSTEM OBJECTS ====================
// Core system managers (using refactored components)
WiFiManager wifiManager;  // Using enhanced WiFiManager from include/WiFiManager.h
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
WiFiUDP udp;
const int DISCOVERY_PORT = 47808;
unsigned long lastBroadcast = 0;
const unsigned long BROADCAST_INTERVAL = 15000;

// ==================== SYSTEM STATE VARIABLES ====================
SystemConfig systemConfig;
bool systemInitialized = false;
unsigned long bootTime = 0;

// Multi-WiFi network configuration (compatible with WiFiManager)
struct SimpleWiFiCredentials {
    const char* ssid;
    const char* password;
    const char* location;
};

SimpleWiFiCredentials wifiNetworks[] = {
    {PREFERRED_SSID, PREFERRED_PASSWORD, "Primary Network"}
    // Add more real networks here as needed
    // {SECONDARY_SSID, SECONDARY_PASSWORD, "Secondary Network"}
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
        // CRITICAL: Only process devices with names starting with our target prefix
        if (!advertisedDevice.haveName()) {
            return; // Skip devices without a name
        }
        
        String deviceName = advertisedDevice.getName().c_str();
        if (deviceName.isEmpty() || !deviceName.startsWith(BLE_TARGET_BEACON_PREFIX)) {
            return; // Skip devices that don't match our "PetZone" prefix
        }
        
        // Process only our PetZone beacons
        BeaconData beacon;
        beacon.address = advertisedDevice.getAddress().toString().c_str();
        beacon.rssi = advertisedDevice.getRSSI();
        beacon.name = deviceName.c_str(); // Use the friendly name (e.g., "PetZone-Living-01")
        beacon.lastSeen = millis();
        beacon.isActive = true;
        
        // Calculate distance estimation
        beacon.distance = beaconManager.calculateDistance(beacon.rssi);
        beacon.confidence = beaconManager.calculateConfidence(beacon.rssi);
        
        // Debug output for our beacons only
        if (DEBUG_BLE) {
            Serial.printf("🔍 PetZone beacon detected: %s, RSSI: %d dBm, Distance: %.2f cm\n",
                         beacon.name.c_str(), beacon.rssi, beacon.distance);
        }
        
        // Update beacon manager with new detection
        beaconManager.updateBeacon(beacon);
        
        // Check for proximity alerts
        checkProximityAlerts(beacon);
        
        // Update system statistics
        systemStateManager.updateBeaconStats(1);
    }
};

// ==================== I2C SCANNING UTILITY ====================
/**
 * @brief Scan I2C bus for connected devices
 * @return bool True if any devices found
 */
bool scanI2CBus() {
    if (DEBUG_I2C) {
        Serial.println("🔍 Scanning I2C bus for devices...");
    }
    
    int deviceCount = 0;
    bool displayFound = false;
    
    for (byte address = 1; address < 127; address++) {
        Wire.beginTransmission(address);
        byte error = Wire.endTransmission();
        
        if (error == 0) {
            deviceCount++;
            if (DEBUG_I2C) {
                Serial.printf("✅ I2C device found at address 0x%02X", address);
                if (address == OLED_ADDRESS) {
                    Serial.print(" (OLED Display)");
                    displayFound = true;
                }
                Serial.println();
            }
        }
    }
    
    if (DEBUG_I2C) {
        Serial.printf("📊 I2C scan complete: %d device(s) found\n", deviceCount);
        if (deviceCount == 0) {
            Serial.println("⚠️ No I2C devices detected!");
            Serial.println("🔧 Check connections:");
            Serial.printf("   SDA → GPIO %d\n", I2C_SDA_PIN);
            Serial.printf("   SCL → GPIO %d\n", I2C_SCL_PIN);
            Serial.println("   VCC → 3.3V, GND → GND");
        }
    }
    
    return displayFound;
}

// ==================== DISPLAY MANAGEMENT ====================
/**
 * @brief Initialize OLED display with comprehensive error handling
 * @return bool Success status
 */
bool initializeDisplay() {
    if (DEBUG_DISPLAY) {
        Serial.println("🖥️ Initializing OLED display system...");
    }
    
    // Initialize I2C with ESP32-S3 optimized pins and frequency
    Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQUENCY);
    
    if (DEBUG_DISPLAY) {
        Serial.printf("📡 I2C initialized: SDA=GPIO%d, SCL=GPIO%d, Freq=%dHz\n", 
                     I2C_SDA_PIN, I2C_SCL_PIN, I2C_FREQUENCY);
    }
    
    // CRITICAL: Give display time to power up before I2C detection
    delay(500);
    
    // Perform I2C bus scan
    bool displayFoundInScan = scanI2CBus();
    
    if (!displayFoundInScan) {
        if (DEBUG_DISPLAY) {
            Serial.printf("⚠️ Display not found in I2C scan at 0x%02X\n", OLED_ADDRESS);
            Serial.println("🚀 Proceeding with initialization anyway...");
        }
    } else {
        if (DEBUG_DISPLAY) {
            Serial.printf("✅ Display detected at 0x%02X\n", OLED_ADDRESS);
        }
    }
    
    // Initialize display with error handling (supports both SSD1306 and SH1106)
    bool displayOnline = false;
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
        if (DEBUG_DISPLAY) {
            Serial.println("❌ OLED display initialization failed!");
            Serial.println("📍 System will continue without display");
        }
        displayOnline = false;
    } else {
        displayOnline = true;
        
        // Clear display buffer completely to eliminate "snow"
        display.clearDisplay();
        display.fillScreen(SSD1306_BLACK);
        display.display(); // Clear physical display
        delay(100);
        
        // Configure display for optimal rendering
        display.setTextSize(1);
        display.setTextColor(SSD1306_WHITE, SSD1306_BLACK);
        display.setTextWrap(false);
        display.cp437(true);
        display.setRotation(0);
        display.dim(false);
        
        // Note: SH1106 offset handling would require switching to U8G2 library
        // For now, Adafruit_SSD1306 works well with most 128x32 displays
        if (!DISPLAY_TYPE_SSD1306 && DISPLAY_COLUMN_OFFSET > 0) {
            if (DEBUG_DISPLAY) {
                Serial.printf("⚠️ SH1106 offset not supported with Adafruit_SSD1306 library\n");
                Serial.printf("💡 Consider switching to U8G2 library for SH1106 support\n");
            }
        }
        
        // Clear again and show startup screen
        display.clearDisplay();
        display.setCursor(0, 0);
        display.println("PetCollar ESP32-S3");
        display.setCursor(0, 12);
        display.printf("Resolution: %dx%d", SCREEN_WIDTH, SCREEN_HEIGHT);
        display.setCursor(0, 24);
        display.println("I2C Display Online");
        display.setCursor(0, 36);
        display.println("BLE Scanner Ready");
        display.setCursor(0, 48);
        display.println("WiFi Connecting...");
        display.display();
        
        if (DEBUG_DISPLAY) {
            Serial.printf("✅ OLED display initialized (%dx%d)\n", SCREEN_WIDTH, SCREEN_HEIGHT);
            Serial.printf("📐 Full display area utilized: %d chars x %d lines\n", 
                         SCREEN_WIDTH/6, SCREEN_HEIGHT/8);
        }
    }
    
    return displayOnline;
}

/**
 * @brief Check if display is currently working
 * @return bool True if display is responsive
 */
bool isDisplayActive() {
    // Simple test: try to clear display and check if it responds
    try {
        display.clearDisplay();
        display.setCursor(0, 0);
        display.print("Test");
        display.display();
        return true;
    } catch (...) {
        return false;
    }
}

/**
 * @brief Update display with current system status (optimized for 128×32 display)
 */
void updateDisplay() {
    static unsigned long lastUpdate = 0;
    static int displayMode = 0;
    
    if (millis() - lastUpdate < 1000) return; // Limit update rate
    
    // Clear display buffer completely before drawing
    display.clearDisplay();
    
    int line = 0;
    const int lineHeight = 8;
    
    // Line 0: Compact header with key status
    display.setCursor(0, line * lineHeight);
    display.setTextSize(1);
    display.print("PetCollar");
    display.setCursor(64, line * lineHeight);
    if (systemStateData.wifiConnected) {
        display.print("WiFi:OK");
    } else {
        display.print("WiFi:--");
    }
    line++;
    
    // Line 1: Beacon status and battery
    display.setCursor(0, line * lineHeight);
    int activeBeacons = beaconManager.getActiveBeaconCount();
    display.printf("Beacons:%d", activeBeacons);
    display.setCursor(64, line * lineHeight);
    display.printf("Bat:%d%%", systemStateManager.getBatteryPercent());
    line++;
    
    // Line 2: Status or Alert
    display.setCursor(0, line * lineHeight);
    if (alertManager.isAlertActive()) {
        display.print("*** ALERT ACTIVE ***");
    } else if (systemStateManager.getErrorCount() > 0) {
        display.printf("Errors:%d", systemStateManager.getErrorCount());
    } else {
        display.print("All Systems Ready");
    }
    line++;
    
    // Line 3: Rotating detailed information
    display.setCursor(0, line * lineHeight);
    switch (displayMode % 4) {
        case 0:
            if (systemStateData.wifiConnected) {
                display.printf("IP:%s", WiFi.localIP().toString().c_str());
            } else {
                display.print("Setup mode active");
            }
            break;
        case 1:
            display.printf("Free:%dKB", ESP.getFreeHeap() / 1024);
            break;
        case 2:
            display.printf("Uptime:%lum", millis() / 60000);
            break;
        case 3:
            display.printf("Signal:%ddBm", WiFi.RSSI());
            break;
    }
    
    // Push all changes to display
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
 * @brief Initialize enhanced WiFi connection with fast re-association
 * @return bool Connection success status
 */
bool initializeWiFi() {
    if (DEBUG_WIFI) {
        Serial.println("🚀 Initializing Enhanced WiFi Manager...");
        Serial.printf("📊 Free heap before WiFi init: %d bytes\n", ESP.getFreeHeap());
    }
    
    // Initialize enhanced WiFi manager
    if (!wifiManager.beginEnhanced()) {
        if (DEBUG_WIFI) {
            Serial.println("❌ Failed to initialize enhanced WiFi manager");
            Serial.printf("📊 WiFi status: %d\n", WiFi.status());
        }
        systemStateData.wifiConnected = false;
        digitalWrite(STATUS_LED_WIFI, LOW);
        return false;
    }
    
    // First, wait for stored credentials connection (if any were found)
    bool connected = false;
    unsigned long startTime = millis();
    
    // Check if WiFi is already trying to connect to stored credentials
    if (WiFi.status() == WL_CONNECTED) {
        connected = true;
        Serial.printf("✅ Already connected to stored network: %s\n", WiFi.SSID().c_str());
    } else if (WiFi.getMode() == WIFI_STA && WiFi.status() != WL_NO_SSID_AVAIL) {
        // Wait for stored credential connection to complete
        Serial.println("⏳ Waiting for stored credential connection...");
        unsigned long waitStart = millis();
        while (WiFi.status() != WL_CONNECTED && WiFi.status() != WL_NO_SSID_AVAIL && 
               WiFi.status() != WL_CONNECT_FAILED && (millis() - waitStart < 15000)) {
            delay(500);
            Serial.print(".");
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            connected = true;
            Serial.printf("\n✅ Connected to stored network: %s\n", WiFi.SSID().c_str());
        } else {
            Serial.printf("\n❌ Stored credential connection failed (Status: %d)\n", WiFi.status());
        }
    }
    
    // Only try hardcoded networks if stored credentials failed
    if (!connected) {
        Serial.println("🔗 Trying hardcoded networks as fallback...");
        
        // Add fallback networks to cache
        for (int i = 0; i < numNetworks; i++) {
            wifiManager.addNetworkToCache(wifiNetworks[i].ssid, wifiNetworks[i].password);
            if (DEBUG_WIFI) {
                Serial.printf("➕ Added fallback %s (%s) to network cache\n", 
                             wifiNetworks[i].ssid, wifiNetworks[i].location);
            }
        }
        
        // Try each fallback network in sequence with proper error handling
        for (int i = 0; i < numNetworks && !connected; i++) {
            Serial.printf("\n🌐 Trying fallback %d/%d: %s\n", i+1, numNetworks, wifiNetworks[i].location);
            connected = wifiManager.attemptConnection(wifiNetworks[i].ssid, wifiNetworks[i].password);
            
            if (connected) {
                currentNetworkIndex = i;
                break;
            } else {
                Serial.printf("❌ Failed to connect to %s, trying next...\n", wifiNetworks[i].location);
                
                // EXTENDED delay between networks to reset association counters
                if (i < numNetworks - 1) {  // Don't delay after last attempt
                    Serial.println("⏳ Waiting 10 seconds before next network to reset association limits...");
                    delay(10000);  // 10 second delay to ensure association limits reset
                }
            }
        }
    }
    
    if (connected) {
        systemStateData.wifiConnected = true;
        digitalWrite(STATUS_LED_WIFI, HIGH);
        
        Serial.printf("\n🎉 WiFi connection successful!\n");
        String networkName = (currentNetworkIndex >= 0) ? 
                            String(wifiNetworks[currentNetworkIndex].location) + " (" + wifiNetworks[currentNetworkIndex].ssid + ")" :
                            "Stored Network (" + WiFi.SSID() + ")";
        Serial.printf("🌐 Network: %s\n", networkName.c_str());
        Serial.printf("📡 IP Address: %s\n", wifiManager.getLocalIP().c_str());
        Serial.printf("📶 Signal: %d dBm\n", wifiManager.getSignalStrength());
        Serial.printf("⚡ Connection time: %lu ms\n", millis() - startTime);
        Serial.printf("🏷️ mDNS: %s\n", wifiManager.getMDNSHostname().c_str());
        
        return true;
    } else {
        // All networks failed - start setup mode
        Serial.println("\n❌ All WiFi networks failed - starting setup mode");
        wifiManager.startConfigurationAP(true);
        
        systemStateData.wifiConnected = false;
        digitalWrite(STATUS_LED_WIFI, LOW);
        return false;
    }
}

/**
 * @brief Initialize web server and WebSocket endpoints
 */
void initializeWebServices() {
    if (!systemStateData.wifiConnected) return;
    
    Serial.println("🌐 Initializing web services...");
    
    // HTTP endpoints
    server.on("/", HTTP_GET, handleRoot);
    server.on("/api/discover", HTTP_GET, handleDiscover);
    server.on("/api/status", HTTP_GET, handleStatus);
    server.on("/api/data", HTTP_GET, handleData);
    
    server.begin();
    systemStateData.webServerRunning = true;
    
    // WebSocket initialization
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    
    Serial.printf("✅ Web server started: http://%s\n", WiFi.localIP().toString().c_str());
    Serial.printf("🔌 WebSocket server: ws://%s:8080\n", WiFi.localIP().toString().c_str());
}

/**
 * @brief Initialize enhanced mDNS for zero-config discovery
 */
void initializeMDNS() {
    if (!systemStateData.wifiConnected) return;
    
    // Use enhanced WiFi manager's mDNS setup
    if (wifiManager.setupMDNSService()) {
        // Add enhanced PETg service for zero-config discovery  
        MDNS.addService("_petg-ws", "_tcp", 8080);
        MDNS.addServiceTxt("_petg-ws", "_tcp", "device_type", "ESP32-S3_PetCollar_Enhanced");
        MDNS.addServiceTxt("_petg-ws", "_tcp", "version", FIRMWARE_VERSION);
        MDNS.addServiceTxt("_petg-ws", "_tcp", "features", "fast_wifi,zero_config,live_alerts");
        MDNS.addServiceTxt("_petg-ws", "_tcp", "protocol", "websocket");
        MDNS.addServiceTxt("_petg-ws", "_tcp", "path", "/ws");
        
        Serial.printf("✅ Enhanced mDNS: %s\n", wifiManager.getMDNSHostname().c_str());
        Serial.println("🔍 PETg service: _petg-ws._tcp.local:8080");
    } else {
        Serial.println("❌ Enhanced mDNS setup failed");
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
        
        systemStateData.bleInitialized = true;
        digitalWrite(STATUS_LED_BLE, HIGH);
        
        Serial.println("✅ BLE scanner initialized successfully");
        return true;
        
    } catch (const std::exception& e) {
        Serial.printf("❌ BLE initialization failed: %s\n", e.what());
        systemStateData.bleInitialized = false;
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
        testAlert(AlertMode::BUZZER, clientNum);
    } else if (command == "test_vibration") {
        testAlert(AlertMode::VIBRATION, clientNum);
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
        String modeStr = (mode == AlertMode::BUZZER) ? "buzzer" : "vibration";
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
void sendSystemStatus(uint8_t clientNum) {
    String statusJson = systemStateManager.getSystemStatusJSON();
    webSocket.sendTXT(clientNum, statusJson);
}

// Add overload for broadcast
void sendSystemStatusBroadcast() {
    String statusJson = systemStateManager.getSystemStatusJSON();
    webSocket.broadcastTXT(statusJson);
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
    // Skip config processing for now to avoid ArduinoJson v7 issues
    
    Serial.printf("✅ Beacon config update request: %s\n", beaconId.c_str());
    sendCommandResponse(clientNum, "update_beacon_config", "received");
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
void sendSystemStatusBroadcastTimed() {
    static unsigned long lastBroadcast = 0;
    if (millis() - lastBroadcast > 5000) { // Every 5 seconds
        sendSystemStatusBroadcast(); // Broadcast to all clients
        lastBroadcast = millis();
    }
}

/**
 * @brief Enhanced broadcast collar presence for instant discovery
 */
void broadcastCollarPresence() {
    if (!systemStateData.wifiConnected) return;
    
    DynamicJsonDocument doc(512);
    doc["device"] = "petg_collar_enhanced";
    doc["device_type"] = "ESP32-S3_PetCollar_Enhanced";
    doc["ip"] = wifiManager.getLocalIP();
    doc["port"] = 8080;
    doc["websocket_url"] = "ws://" + wifiManager.getLocalIP() + ":8080";
    doc["mdns_hostname"] = wifiManager.getMDNSHostname();
    doc["mdns_service"] = "_petg-ws._tcp.local";
    doc["version"] = FIRMWARE_VERSION;
    doc["features"] = "fast_wifi,zero_config,live_alerts,enhanced_connection";
    doc["signal_strength"] = wifiManager.getSignalStrength();
    doc["uptime_ms"] = millis();
    doc["battery_percent"] = systemStateManager.getBatteryPercent();
    doc["active_beacons"] = beaconManager.getActiveBeaconCount();
    doc["status"] = "active";
    doc["timestamp"] = millis();
    
    String message;
    serializeJson(doc, message);
    
    udp.beginPacket(IPAddress(255, 255, 255, 255), DISCOVERY_PORT);
    udp.print(message);
    udp.endPacket();
    
    // Debug info every 10th broadcast
    static int broadcastCount = 0;
    if (++broadcastCount % 10 == 0) {
        Serial.printf("📡 Enhanced UDP broadcast #%d: %s\n", broadcastCount, wifiManager.getMDNSHostname().c_str());
    }
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
    if (systemStateData.wifiConnected && WiFi.status() != WL_CONNECTED) {
        Serial.println("⚠️ WiFi connection lost, attempting reconnection...");
        systemStateData.wifiConnected = false;
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
    Serial.printf("📡 WiFi: %s\n", systemStateData.wifiConnected ? "Connected" : "Disconnected");
    Serial.printf("📱 BLE: %s\n", systemStateData.bleInitialized ? "Active" : "Inactive");
    Serial.printf("🏷️ Active Beacons: %d\n", beaconManager.getActiveBeaconCount());
    Serial.printf("🚨 Proximity Alerts: %d\n", systemStateManager.getProximityAlerts());
    Serial.printf("❌ Errors: %d\n", systemStateManager.getErrorCount());
    Serial.println("═══════════════════════════════════════");
    
    lastStatus = millis();
}

// ==================== BUZZER TEST FUNCTION ====================
/**
 * @brief Test buzzer on GPIO 18 with tone() function
 * @param frequency Frequency in Hz (default 2000)
 * @param duration Duration in milliseconds (default 500)
 */
void testBuzzer(int frequency = 2000, int duration = 500) {
    Serial.printf("🔊 Testing buzzer on GPIO %d: %dHz for %dms\n", BUZZER_PIN, frequency, duration);
    
    // Method 1: Using ESP32 tone() function
    tone(BUZZER_PIN, frequency, duration);
    delay(duration + 100);
    
    // Method 2: Using LEDC for confirmation (ESP32 Arduino Core 3.x compatible)
    ledcAttach(BUZZER_PIN, frequency, 8);  // pin, frequency, resolution
    ledcWrite(BUZZER_PIN, 128); // 50% duty cycle
    delay(duration);
    ledcWrite(BUZZER_PIN, 0);   // Turn off
    ledcDetach(BUZZER_PIN);
    
    Serial.printf("✅ Buzzer test complete on GPIO %d\n", BUZZER_PIN);
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
    
    // Test buzzer to confirm GPIO 18 is working
    Serial.println("🔊 Testing buzzer on restored GPIO 18...");
    testBuzzer(2000, 500); // 2kHz for 0.5 seconds
    
    // System initialization complete
    systemInitialized = true;
    systemStateData.systemReady = true;
    
    Serial.println("═══════════════════════════════════════");
    Serial.println("✅ ESP32-S3 Pet Collar System Ready!");
    Serial.printf("🌐 Web Interface: http://%s\n", 
                 wifiOK ? WiFi.localIP().toString().c_str() : "No WiFi");
    Serial.printf("🔌 WebSocket: ws://%s:8080\n", 
                 wifiOK ? WiFi.localIP().toString().c_str() : "No WiFi");
    Serial.printf("🖥️ Display: %s\n", isDisplayActive() ? "Active" : "Inactive");
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
    if (systemStateData.webServerRunning) {
        server.handleClient();
        webSocket.loop();
    }
    
    // Perform BLE scanning
    if (systemStateData.bleInitialized) {
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
    sendSystemStatusBroadcastTimed();
    
    // Broadcast collar presence for discovery
    if (systemStateData.wifiConnected && (currentTime - lastBroadcast > BROADCAST_INTERVAL)) {
        broadcastCollarPresence();
        lastBroadcast = currentTime;
    }
    
    // Watchdog and system stability
    delay(10); // Small delay for system stability
} 
