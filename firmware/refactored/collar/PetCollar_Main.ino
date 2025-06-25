/**
 * @file PetCollar_Main.ino
 * @brief Main Pet Collar Firmware - Refactored and Optimized
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * This is the main firmware for the ESP32-S3 pet collar device.
 * It provides comprehensive pet tracking with BLE beacon detection,
 * proximity alerts, and web-based configuration.
 * 
 * Features:
 * - Advanced BLE beacon scanning and proximity detection
 * - Configurable alert system (buzzer/vibration)
 * - Web interface for configuration and monitoring
 * - Real-time WebSocket communication
 * - OLED display for status information
 * - Battery monitoring and power management
 * - OTA firmware updates
 * 
 * Hardware Requirements:
 * - ESP32-S3 DevKitC-1 or compatible
 * - 0.96" OLED Display (SSD1306, 128x64)
 * - Buzzer module
 * - Vibration motor
 * - Battery monitoring circuit
 * 
 * This firmware uses a modular architecture with separate components
 * for different functionality, making it easier to maintain and extend.
 */

// ==========================================
// INCLUDES
// ==========================================

// Arduino and ESP32 core libraries
#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <WebSocketsServer.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include <ESPmDNS.h>

// BLE libraries
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

// Display libraries
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

// Our modular components
#include "common/include/PetCollarConfig.h"
#include "common/include/Utils.h"
#include "common/include/BeaconManager.h"
#include "common/include/AlertManager.h"

// ==========================================
// GLOBAL OBJECTS
// ==========================================

// Core system objects
WebServer webServer(WEB_SERVER_PORT);
WebSocketsServer webSocket(WEBSOCKET_PORT);
Preferences preferences;
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

// Our modular managers
BeaconManager beaconManager;
AlertManager alertManager;
BLEScan* pBLEScan = nullptr;

// ==========================================
// SYSTEM STATE
// ==========================================

/**
 * @brief System state structure
 */
struct SystemState {
    // Connection status
    bool wifiConnected = false;
    bool bleInitialized = false;
    bool webServerRunning = false;
    bool displayActive = false;
    
    // System metrics
    float batteryVoltage = 0.0;
    int batteryPercent = 0;
    unsigned long uptime = 0;
    size_t freeHeap = 0;
    
    // Activity counters
    int beaconsDetected = 0;
    int proximityAlerts = 0;
    unsigned long lastDisplayUpdate = 0;
    unsigned long lastStatusUpdate = 0;
    unsigned long lastBLEScan = 0;
    
    // Configuration
    String deviceId = "PetCollar-001";
    String currentSSID = "";
    bool alertsEnabled = true;
    AlertMode defaultAlertMode = ALERT_BUZZER;
    
} systemState;

/**
 * @brief WiFi network credentials structure
 */
struct WiFiCredentials {
    const char* ssid;
    const char* password;
    const char* description;
};

// Multiple WiFi networks for automatic connection
WiFiCredentials wifiNetworks[] = {
    {"JenoviceAP", "DataSecNet", "Primary Network"},
    {"g@n", "0547530732", "Secondary Network"}
};
const int numNetworks = sizeof(wifiNetworks) / sizeof(wifiNetworks[0]);
int currentNetworkIndex = -1;

// ==========================================
// BLE SCAN CALLBACK
// ==========================================

/**
 * @brief BLE scan callback class
 * 
 * Handles BLE advertisement callbacks and forwards them
 * to the beacon manager for processing.
 */
class BLEScanCallback : public BLEAdvertisedDeviceCallbacks {
public:
    void onResult(BLEAdvertisedDevice advertisedDevice) override {
        // Filter for pet collar beacons
        String deviceName = advertisedDevice.getName().c_str();
        
        if (deviceName.length() == 0 || !deviceName.startsWith("Pet")) {
            return; // Skip non-pet devices
        }
        
        // Extract information
        String address = advertisedDevice.getAddress().toString().c_str();
        int rssi = advertisedDevice.getRSSI();
        
        // Update beacon manager
        beaconManager.updateBeacon(deviceName, address, rssi);
        
        // Update system statistics
        systemState.beaconsDetected++;
        
        DEBUG_PRINTF("BLE: Found %s (RSSI: %d)\n", deviceName.c_str(), rssi);
        
        // Check for proximity alerts
        checkProximityAlerts(deviceName, rssi);
    }
};

BLEScanCallback* scanCallback = nullptr;

// ==========================================
// PROXIMITY ALERT SYSTEM
// ==========================================

/**
 * @brief Check if proximity alert should be triggered
 * @param beaconName Name of the detected beacon
 * @param rssi Signal strength
 */
void checkProximityAlerts(const String& beaconName, int rssi) {
    if (!systemState.alertsEnabled) return;
    
    // Check if RSSI indicates proximity
    if (rssi > PROXIMITY_RSSI_THRESHOLD) {
        // Check if we're already in an alert cooldown
        if (alertManager.isInCooldown()) {
            DEBUG_PRINTLN("Proximity detected but in cooldown period");
            return;
        }
        
        // Trigger proximity alert
        String reason = "Proximity: " + beaconName;
        bool alertStarted = alertManager.startAlert(
            systemState.defaultAlertMode, 
            PROXIMITY_ALERT_TIMEOUT, 
            128, 
            reason
        );
        
        if (alertStarted) {
            systemState.proximityAlerts++;
            DEBUG_PRINTF("Proximity alert triggered for %s (RSSI: %d)\n", beaconName.c_str(), rssi);
            
            // Send WebSocket notification
            sendWebSocketUpdate("proximity_alert", beaconName, rssi);
        }
    }
}

// ==========================================
// WIFI MANAGEMENT
// ==========================================

/**
 * @brief Initialize WiFi connection
 * @return true if connected successfully
 */
bool initializeWiFi() {
    DEBUG_PRINTLN("WiFi: Initializing...");
    
    WiFi.mode(WIFI_STA);
    
    // Try each network
    for (int i = 0; i < numNetworks; i++) {
        DEBUG_PRINTF("WiFi: Trying %s...\n", wifiNetworks[i].ssid);
        
        WiFi.begin(wifiNetworks[i].ssid, wifiNetworks[i].password);
        
        // Wait for connection
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500);
            DEBUG_PRINT(".");
            attempts++;
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            currentNetworkIndex = i;
            systemState.wifiConnected = true;
            systemState.currentSSID = wifiNetworks[i].ssid;
            
            DEBUG_PRINTF("\nWiFi: Connected to %s\n", wifiNetworks[i].ssid);
            DEBUG_PRINTF("WiFi: IP address: %s\n", WiFi.localIP().toString().c_str());
            DEBUG_PRINTF("WiFi: Signal strength: %d%%\n", getWiFiSignalStrength());
            
            return true;
        }
        
        DEBUG_PRINTLN("\nWiFi: Connection failed, trying next network...");
        WiFi.disconnect();
    }
    
    DEBUG_PRINTLN("WiFi: Failed to connect to any network");
    systemState.wifiConnected = false;
    return false;
}

/**
 * @brief Check WiFi connection and reconnect if needed
 */
void maintainWiFiConnection() {
    static unsigned long lastCheck = 0;
    unsigned long currentTime = millis();
    
    // Check every 30 seconds
    if (currentTime - lastCheck < 30000) return;
    lastCheck = currentTime;
    
    if (WiFi.status() != WL_CONNECTED) {
        DEBUG_PRINTLN("WiFi: Connection lost, attempting reconnect...");
        systemState.wifiConnected = false;
        initializeWiFi();
    }
}

// ==========================================
// WEB SERVER HANDLERS
// ==========================================

/**
 * @brief Handle root web page request
 */
void handleRoot() {
    String html = "<!DOCTYPE html><html><head>";
    html += "<title>Pet Collar Control</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>body{font-family:Arial;margin:40px;background:#f0f0f0;}";
    html += ".card{background:white;padding:20px;margin:10px 0;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);}";
    html += ".status{display:inline-block;width:12px;height:12px;border-radius:50%;margin-right:8px;}";
    html += ".online{background:#4CAF50;} .offline{background:#f44336;}";
    html += "button{background:#2196F3;color:white;border:none;padding:10px 20px;border-radius:4px;cursor:pointer;margin:5px;}";
    html += "button:hover{background:#1976D2;}</style></head><body>";
    
    html += "<h1>🐕 Pet Collar Control Panel</h1>";
    
    // System Status Card
    html += "<div class='card'><h2>System Status</h2>";
    html += "<p><span class='status " + String(systemState.wifiConnected ? "online" : "offline") + "'></span>";
    html += "WiFi: " + String(systemState.wifiConnected ? "Connected" : "Disconnected");
    if (systemState.wifiConnected) {
        html += " (" + systemState.currentSSID + ")";
    }
    html += "</p>";
    
    html += "<p><span class='status " + String(systemState.bleInitialized ? "online" : "offline") + "'></span>";
    html += "BLE: " + String(systemState.bleInitialized ? "Active" : "Inactive") + "</p>";
    
    html += "<p>Uptime: " + formatUptime(millis()) + "</p>";
    html += "<p>Free Heap: " + String(getFreeHeapPercentage()) + "%</p>";
    html += "<p>Battery: " + String(systemState.batteryPercent) + "%</p>";
    html += "</div>";
    
    // Beacon Status Card
    html += "<div class='card'><h2>Beacon Status</h2>";
    html += "<p>Active Beacons: " + String(beaconManager.getActiveBeaconCount()) + "</p>";
    html += "<p>Total Detected: " + String(systemState.beaconsDetected) + "</p>";
    html += "<p>Locations: " + String(beaconManager.getLocationCount()) + "</p>";
    html += "</div>";
    
    // Alert Status Card
    html += "<div class='card'><h2>Alert System</h2>";
    html += "<p>Status: " + String(alertManager.isAlertActive() ? "Active" : "Standby") + "</p>";
    html += "<p>Total Alerts: " + String(systemState.proximityAlerts) + "</p>";
    html += "<p>Alerts Enabled: " + String(systemState.alertsEnabled ? "Yes" : "No") + "</p>";
    html += "<button onclick='toggleAlerts()'>Toggle Alerts</button>";
    html += "<button onclick='testAlert()'>Test Alert</button>";
    html += "</div>";
    
    // WebSocket Connection
    html += "<script>";
    html += "var ws = new WebSocket('ws://' + window.location.hostname + ':8080');";
    html += "ws.onopen = function() { console.log('WebSocket connected'); };";
    html += "ws.onmessage = function(event) { console.log('WebSocket data:', event.data); };";
    html += "function toggleAlerts() { ws.send(JSON.stringify({command:'toggle_alerts'})); }";
    html += "function testAlert() { ws.send(JSON.stringify({command:'test_alert'})); }";
    html += "</script>";
    
    html += "</body></html>";
    
    webServer.send(200, "text/html", html);
}

/**
 * @brief Handle API status request
 */
void handleAPIStatus() {
    DynamicJsonDocument doc(1024);
    
    doc["system"]["uptime"] = millis();
    doc["system"]["freeHeap"] = getFreeHeap();
    doc["system"]["wifiConnected"] = systemState.wifiConnected;
    doc["system"]["bleInitialized"] = systemState.bleInitialized;
    doc["system"]["battery"] = systemState.batteryPercent;
    
    doc["beacons"]["active"] = beaconManager.getActiveBeaconCount();
    doc["beacons"]["total"] = systemState.beaconsDetected;
    doc["beacons"]["locations"] = beaconManager.getLocationCount();
    
    doc["alerts"]["active"] = alertManager.isAlertActive();
    doc["alerts"]["total"] = systemState.proximityAlerts;
    doc["alerts"]["enabled"] = systemState.alertsEnabled;
    
    String response;
    serializeJson(doc, response);
    webServer.send(200, "application/json", response);
}

/**
 * @brief Handle beacon list API request
 */
void handleAPIBeacons() {
    String response = beaconManager.getBeaconsAsJson();
    webServer.send(200, "application/json", response);
}

/**
 * @brief Initialize web server
 */
void initializeWebServer() {
    if (!systemState.wifiConnected) return;
    
    DEBUG_PRINTLN("WebServer: Initializing...");
    
    // Route handlers
    webServer.on("/", handleRoot);
    webServer.on("/api/status", handleAPIStatus);
    webServer.on("/api/beacons", handleAPIBeacons);
    
    // Start server
    webServer.begin();
    systemState.webServerRunning = true;
    
    DEBUG_PRINTLN("WebServer: Started on port 80");
}

// ==========================================
// WEBSOCKET MANAGEMENT
// ==========================================

/**
 * @brief WebSocket event handler
 */
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            DEBUG_PRINTF("WebSocket[%u]: Disconnected\n", num);
            break;
            
        case WStype_CONNECTED: {
            IPAddress ip = webSocket.remoteIP(num);
            DEBUG_PRINTF("WebSocket[%u]: Connected from %s\n", num, ip.toString().c_str());
            
            // Send initial status
            String status = "{\"type\":\"status\",\"message\":\"Connected to Pet Collar\"}";
            webSocket.sendTXT(num, status);
            break;
        }
        
        case WStype_TEXT: {
            DEBUG_PRINTF("WebSocket[%u]: Received: %s\n", num, payload);
            
            // Parse command
            DynamicJsonDocument doc(512);
            DeserializationError error = deserializeJson(doc, payload);
            
            if (!error) {
                String command = doc["command"];
                handleWebSocketCommand(num, command, doc);
            }
            break;
        }
        
        default:
            break;
    }
}

/**
 * @brief Handle WebSocket commands
 */
void handleWebSocketCommand(uint8_t clientNum, const String& command, const DynamicJsonDocument& doc) {
    if (command == "toggle_alerts") {
        systemState.alertsEnabled = !systemState.alertsEnabled;
        String response = "{\"type\":\"alerts_toggled\",\"enabled\":" + String(systemState.alertsEnabled ? "true" : "false") + "}";
        webSocket.sendTXT(clientNum, response);
        
    } else if (command == "test_alert") {
        bool started = alertManager.startAlert(ALERT_BOTH, 2000, 128, "Test Alert");
        String response = "{\"type\":\"test_alert\",\"started\":" + String(started ? "true" : "false") + "}";
        webSocket.sendTXT(clientNum, response);
        
    } else if (command == "get_status") {
        String status = "{\"type\":\"status\",\"data\":" + getSystemStatusJson() + "}";
        webSocket.sendTXT(clientNum, status);
    }
}

/**
 * @brief Send WebSocket update to all clients
 */
void sendWebSocketUpdate(const String& type, const String& data, int value = 0) {
    if (!systemState.webServerRunning) return;
    
    String message = "{\"type\":\"" + type + "\",\"data\":\"" + data + "\",\"value\":" + String(value) + ",\"timestamp\":" + String(millis()) + "}";
    webSocket.broadcastTXT(message);
}

/**
 * @brief Initialize WebSocket server
 */
void initializeWebSocket() {
    if (!systemState.wifiConnected) return;
    
    DEBUG_PRINTLN("WebSocket: Initializing...");
    
    webSocket.begin();
    webSocket.onEvent(webSocketEvent);
    
    DEBUG_PRINTLN("WebSocket: Started on port 8080");
}

// ==========================================
// BLE MANAGEMENT
// ==========================================

/**
 * @brief Initialize BLE scanning
 * @return true if successful
 */
bool initializeBLE() {
    DEBUG_PRINTLN("BLE: Initializing...");
    
    try {
        // Initialize BLE device
        BLEDevice::init("");
        
        // Create scan object
        pBLEScan = BLEDevice::getScan();
        if (!pBLEScan) {
            DEBUG_PRINTLN("BLE: Failed to create scan object");
            return false;
        }
        
        // Configure scan callback
        scanCallback = new BLEScanCallback();
        pBLEScan->setAdvertisedDeviceCallbacks(scanCallback);
        
        // Configure scan parameters
        pBLEScan->setActiveScan(true);
        pBLEScan->setInterval(BLE_SCAN_INTERVAL);
        pBLEScan->setWindow(BLE_SCAN_WINDOW);
        
        systemState.bleInitialized = true;
        DEBUG_PRINTLN("BLE: Initialized successfully");
        return true;
        
    } catch (const std::exception& e) {
        DEBUG_PRINTF("BLE: Initialization failed: %s\n", e.what());
        return false;
    }
}

/**
 * @brief Perform BLE scan
 */
void performBLEScan() {
    if (!systemState.bleInitialized || !pBLEScan) return;
    
    unsigned long currentTime = millis();
    
    // Check if it's time for next scan
    if (currentTime - systemState.lastBLEScan < BLE_SCAN_PERIOD) return;
    
    DEBUG_PRINTLN("BLE: Starting scan...");
    
    try {
        // Start asynchronous scan
        BLEScanResults foundDevices = pBLEScan->start(BLE_SCAN_DURATION, false);
        
        DEBUG_PRINTF("BLE: Scan complete, found %d devices\n", foundDevices.getCount());
        
        // Clear scan results to free memory
        pBLEScan->clearResults();
        
        systemState.lastBLEScan = currentTime;
        
    } catch (const std::exception& e) {
        DEBUG_PRINTF("BLE: Scan failed: %s\n", e.what());
    }
}

// ==========================================
// DISPLAY MANAGEMENT
// ==========================================

/**
 * @brief Initialize OLED display
 * @return true if successful
 */
bool initializeDisplay() {
    if (!FEATURE_OLED_DISPLAY) return false;
    
    DEBUG_PRINTLN("Display: Initializing...");
    
    // Initialize I2C
    Wire.begin(PIN_I2C_SDA, PIN_I2C_SCL);
    
    // Initialize display
    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDRESS)) {
        DEBUG_PRINTLN("Display: Failed to initialize");
        return false;
    }
    
    // Configure display
    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);
    display.println("Pet Collar v3.0");
    display.println("Initializing...");
    display.display();
    
    systemState.displayActive = true;
    DEBUG_PRINTLN("Display: Initialized successfully");
    return true;
}

/**
 * @brief Update display with current status
 */
void updateDisplay() {
    if (!systemState.displayActive) return;
    
    unsigned long currentTime = millis();
    
    // Update every 2 seconds
    if (currentTime - systemState.lastDisplayUpdate < 2000) return;
    
    display.clearDisplay();
    display.setCursor(0, 0);
    
    // Line 1: Title and WiFi status
    display.print("Pet Collar ");
    display.println(systemState.wifiConnected ? "ONLINE" : "OFFLINE");
    
    // Line 2: Network info
    if (systemState.wifiConnected) {
        display.println(systemState.currentSSID);
    } else {
        display.println("No WiFi");
    }
    
    // Line 3: Beacon info
    display.print("Beacons: ");
    display.print(beaconManager.getActiveBeaconCount());
    display.print("/");
    display.println(beaconManager.getLocationCount());
    
    // Line 4: Alert status
    display.print("Alerts: ");
    if (alertManager.isAlertActive()) {
        display.println("ACTIVE");
    } else if (systemState.alertsEnabled) {
        display.println("READY");
    } else {
        display.println("DISABLED");
    }
    
    // Line 5: Battery and uptime
    display.print("Bat:");
    display.print(systemState.batteryPercent);
    display.print("% Up:");
    display.println(formatUptime(millis()));
    
    // Line 6: Memory usage
    display.print("Mem: ");
    display.print(getFreeHeapPercentage());
    display.println("%");
    
    display.display();
    systemState.lastDisplayUpdate = currentTime;
}

// ==========================================
// BATTERY MONITORING
// ==========================================

/**
 * @brief Update battery status
 */
void updateBatteryStatus() {
    static unsigned long lastUpdate = 0;
    unsigned long currentTime = millis();
    
    // Update every 30 seconds
    if (currentTime - lastUpdate < 30000) return;
    
    // Read battery voltage (assuming voltage divider)
    int adcValue = analogRead(PIN_BATTERY_VOLTAGE);
    systemState.batteryVoltage = (adcValue * 3.3 * 2.0) / 4095.0; // Assuming 2:1 voltage divider
    
    // Convert to percentage (assuming 3.0V to 4.2V range)
    systemState.batteryPercent = map(systemState.batteryVoltage * 1000, 3000, 4200, 0, 100);
    systemState.batteryPercent = constrain(systemState.batteryPercent, 0, 100);
    
    lastUpdate = currentTime;
}

// ==========================================
// SYSTEM STATUS
// ==========================================

/**
 * @brief Get system status as JSON
 */
String getSystemStatusJson() {
    DynamicJsonDocument doc(1024);
    
    doc["uptime"] = millis();
    doc["freeHeap"] = getFreeHeap();
    doc["batteryPercent"] = systemState.batteryPercent;
    doc["wifiConnected"] = systemState.wifiConnected;
    doc["wifiSSID"] = systemState.currentSSID;
    doc["bleActive"] = systemState.bleInitialized;
    doc["activeBeacons"] = beaconManager.getActiveBeaconCount();
    doc["totalDetections"] = systemState.beaconsDetected;
    doc["alertsEnabled"] = systemState.alertsEnabled;
    doc["alertActive"] = alertManager.isAlertActive();
    doc["proximityAlerts"] = systemState.proximityAlerts;
    
    String result;
    serializeJson(doc, result);
    return result;
}

/**
 * @brief Update system status
 */
void updateSystemStatus() {
    static unsigned long lastUpdate = 0;
    unsigned long currentTime = millis();
    
    // Update every 5 seconds
    if (currentTime - lastUpdate < 5000) return;
    
    systemState.uptime = millis();
    systemState.freeHeap = getFreeHeap();
    
    // Send WebSocket update
    if (systemState.webServerRunning) {
        sendWebSocketUpdate("system_status", getSystemStatusJson());
    }
    
    lastUpdate = currentTime;
}

// ==========================================
// MAIN SETUP FUNCTION
// ==========================================

void setup() {
    // Initialize serial communication
    Serial.begin(115200);
    delay(1000);
    
    DEBUG_PRINTLN("========================================");
    DEBUG_PRINTLN("  Pet Collar v3.0 - Starting Up");
    DEBUG_PRINTLN("========================================");
    
    // Initialize preferences for configuration storage
    preferences.begin("petcollar", false);
    
    // Load configuration
    systemState.deviceId = preferences.getString("deviceId", "PetCollar-001");
    systemState.alertsEnabled = preferences.getBool("alertsEnabled", true);
    systemState.defaultAlertMode = (AlertMode)preferences.getInt("alertMode", ALERT_BUZZER);
    
    // Initialize hardware components
    DEBUG_PRINTLN("Initializing hardware...");
    
    // Initialize display first for visual feedback
    initializeDisplay();
    
    // Initialize alert manager
    if (!alertManager.begin()) {
        DEBUG_PRINTLN("Failed to initialize alert manager");
    }
    
    // Initialize beacon manager
    if (!beaconManager.begin()) {
        DEBUG_PRINTLN("Failed to initialize beacon manager");
    }
    
    // Initialize BLE
    if (!initializeBLE()) {
        DEBUG_PRINTLN("Failed to initialize BLE");
    }
    
    // Initialize WiFi
    if (initializeWiFi()) {
        // Initialize web services
        initializeWebServer();
        initializeWebSocket();
        
        // Initialize mDNS for easy discovery
        if (MDNS.begin("petcollar")) {
            MDNS.addService("http", "tcp", 80);
            MDNS.addService("ws", "tcp", 8080);
            DEBUG_PRINTLN("mDNS: Service started");
        }
    }
    
    // Perform initial battery reading
    updateBatteryStatus();
    
    // Startup complete
    DEBUG_PRINTLN("========================================");
    DEBUG_PRINTLN("  Pet Collar v3.0 - Ready!");
    DEBUG_PRINTF("  Device ID: %s\n", systemState.deviceId.c_str());
    DEBUG_PRINTF("  WiFi: %s\n", systemState.wifiConnected ? "Connected" : "Disconnected");
    DEBUG_PRINTF("  BLE: %s\n", systemState.bleInitialized ? "Active" : "Inactive");
    DEBUG_PRINTF("  Free Heap: %d bytes\n", getFreeHeap());
    DEBUG_PRINTLN("========================================");
    
    // Test alert to confirm system is working
    if (alertManager.startAlert(ALERT_BUZZER, 500, 64, "Startup")) {
        DEBUG_PRINTLN("Startup alert triggered");
    }
}

// ==========================================
// MAIN LOOP FUNCTION
// ==========================================

void loop() {
    // Update all managers
    beaconManager.update();
    alertManager.update();
    
    // Maintain network connections
    maintainWiFiConnection();
    
    // Handle web server requests
    if (systemState.webServerRunning) {
        webServer.handleClient();
        webSocket.loop();
    }
    
    // Perform BLE scanning
    performBLEScan();
    
    // Update display
    updateDisplay();
    
    // Update battery status
    updateBatteryStatus();
    
    // Update system status
    updateSystemStatus();
    
    // Small delay to prevent watchdog issues
    delay(10);
} 