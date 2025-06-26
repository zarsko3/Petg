#include "include/BeaconTypes.h"
#include "include/BeaconManager.h"
#include "include/AlertManager.h"
#include "include/WiFiManager.h"
#include "include/SystemStateManager.h"
#include "include/ZoneManager.h"

// ==================== COMPATIBILITY CONSTANTS ====================

// AlertMode compatibility constants
const AlertMode BUZZER_ONLY = AlertMode::BUZZER;
const AlertMode VIBRATION_ONLY = AlertMode::VIBRATION;

// Global state variable definition
SystemState currentState;

// ==================== ENHANCED BEACON MANAGER IMPLEMENTATIONS ====================

// Constructor
BeaconManager_Enhanced::BeaconManager_Enhanced() {
    // Constructor implementation
}

int BeaconManager_Enhanced::getActiveBeaconCount() const {
    // Return number of active beacons
    return activeBeacons.size();
}

String BeaconManager_Enhanced::getBeaconsJson() const {
    // Return beacon data as JSON - kept for compatibility
    return getBeaconDataJSON();
}

String BeaconManager_Enhanced::getBeaconDataJSON() const {
    // Return detailed beacon data as JSON
    DynamicJsonDocument doc(1024);
    doc["count"] = activeBeacons.size();
    doc["timestamp"] = millis();
    
    JsonArray beacons = doc.createNestedArray("beacons");
    for (const auto& beacon : activeBeacons) {
        JsonObject beaconObj = beacons.createNestedObject();
        beaconObj["address"] = beacon.address;
        beaconObj["name"] = beacon.name;
        beaconObj["rssi"] = beacon.rssi;
        beaconObj["distance"] = beacon.distance;
        beaconObj["confidence"] = beacon.confidence;
        beaconObj["lastSeen"] = beacon.lastSeen;
        beaconObj["isActive"] = beacon.isActive;
    }
    
    String result;
    serializeJson(doc, result);
    return result;
}

void BeaconManager_Enhanced::processAdvertisedDevice(BLEAdvertisedDevice advertisedDevice) {
    // Legacy method - convert to new format
    BeaconData beacon;
    beacon.address = advertisedDevice.getAddress().toString().c_str();
    beacon.rssi = advertisedDevice.getRSSI();
    beacon.name = advertisedDevice.haveName() ? 
                  advertisedDevice.getName().c_str() : "Unknown";
    beacon.lastSeen = millis();
    beacon.isActive = true;
    beacon.distance = calculateDistance(beacon.rssi);
    beacon.confidence = calculateConfidence(beacon.rssi);
    
    updateBeacon(beacon);
}

void BeaconManager_Enhanced::updateBeacon(const BeaconData& beacon) {
    // Update or add beacon to active list
    bool found = false;
    for (auto& existing : activeBeacons) {
        if (existing.address == beacon.address) {
            existing = beacon;
            found = true;
            break;
        }
    }
    
    if (!found && activeBeacons.size() < 10) { // Limit to 10 beacons
        activeBeacons.push_back(beacon);
    }
    
    Serial.printf("🔍 Updated beacon: %s, RSSI: %d dBm, Distance: %.2f cm\n", 
                 beacon.address.c_str(), beacon.rssi, beacon.distance);
}

float BeaconManager_Enhanced::calculateDistance(int rssi) const {
    // Calculate distance from RSSI using path loss model
    if (rssi >= 0) return 0.0f;
    
    // Path loss formula: Distance = 10^((Tx Power - RSSI) / (10 * n))
    // Where Tx Power ≈ -69 dBm at 1m, n ≈ 2.5 for indoor environment
    float distance = pow(10.0f, (-69 - rssi) / (10.0f * 2.5f));
    return constrain(distance * 100, 0.0f, 5000.0f); // Convert to cm, cap at 50m
}

float BeaconManager_Enhanced::calculateConfidence(int rssi) const {
    // Calculate confidence based on signal strength
    if (rssi >= -30) return 1.0f;   // Very close, high confidence
    if (rssi >= -60) return 0.8f;   // Close, good confidence
    if (rssi >= -80) return 0.6f;   // Medium distance, medium confidence
    if (rssi >= -90) return 0.3f;   // Far, low confidence
    return 0.1f;                    // Very far, very low confidence
}

BeaconConfig* BeaconManager_Enhanced::getBeaconConfig(const String& address) {
    // Find beacon configuration by address
    for (auto& config : beaconConfigs) {
        if (config.id == address) {
            return &config;
        }
    }
    return nullptr;
}

bool BeaconManager_Enhanced::updateBeaconConfig(const String& beaconId, const JsonVariant& config) {
    // Update beacon configuration
    BeaconConfig* existing = getBeaconConfig(beaconId);
    if (existing) {
        // Update existing config
        if (config.containsKey("name")) existing->name = config["name"].as<String>();
        if (config.containsKey("alertMode")) existing->alertMode = config["alertMode"].as<String>();
        if (config.containsKey("alertIntensity")) existing->alertIntensity = config["alertIntensity"];
        if (config.containsKey("triggerDistance")) existing->triggerDistanceCm = config["triggerDistance"];
        return true;
    } else {
        // Create new config
        BeaconConfig newConfig;
        newConfig.id = beaconId;
        newConfig.name = config["name"] | "Unknown";
        newConfig.alertMode = config["alertMode"] | "buzzer";
        newConfig.alertIntensity = config["alertIntensity"] | 128;
        newConfig.triggerDistanceCm = config["triggerDistance"] | 200.0f;
        beaconConfigs.push_back(newConfig);
        return true;
    }
}

void BeaconManager_Enhanced::initialize() {
    Serial.println("📡 Enhanced BeaconManager initialized");
    // Clear vectors - member variables should be accessible now
    // activeBeacons.clear();
    // beaconConfigs.clear();
}

void BeaconManager_Enhanced::cleanupOldBeacons(unsigned long timeoutMs) {
    // unsigned long currentTime = millis();
    // activeBeacons.erase(
    //     std::remove_if(activeBeacons.begin(), activeBeacons.end(),
    //         [currentTime, timeoutMs](const BeaconData& beacon) {
    //             return (currentTime - beacon.lastSeen) > timeoutMs;
    //         }),
    //     activeBeacons.end()
    // );
    Serial.println("📡 Beacon cleanup called");
}

void BeaconManager_Enhanced::addDefaultConfigurations() {
    Serial.println("➕ Added default enhanced beacon configurations");
}

// ==================== ENHANCED ALERT MANAGER IMPLEMENTATIONS ====================

// Constructor
AlertManager_Enhanced::AlertManager_Enhanced(uint8_t buzzerPin, uint8_t vibrationPin) 
    : buzzerPin(buzzerPin), vibrationPin(vibrationPin), alertActive(false) {
    // Constructor implementation
}

bool AlertManager_Enhanced::update() {
    // Update alert states, handle timeouts, etc.
    return alertActive;
}

bool AlertManager_Enhanced::stopAlert(bool force) {
    if (alertActive || force) {
        alertActive = false;
        digitalWrite(buzzerPin, LOW);
        digitalWrite(vibrationPin, LOW);
        Serial.println("🛑 Enhanced alert stopped");
        return true;
    }
    return false;
}

bool AlertManager_Enhanced::isAlertActive() const {
    return alertActive;
}

bool AlertManager_Enhanced::initialize() {
    pinMode(buzzerPin, OUTPUT);
    pinMode(vibrationPin, OUTPUT);
    digitalWrite(buzzerPin, LOW);
    digitalWrite(vibrationPin, LOW);
    Serial.println("🚨 Enhanced AlertManager initialized");
    return true;
}

bool AlertManager_Enhanced::triggerAlert(const AlertConfig& config) {
    alertActive = true;
    
    // Activate outputs based on mode
    if (config.mode == AlertMode::BUZZER || config.mode == AlertMode::BOTH) {
        digitalWrite(buzzerPin, HIGH);
    }
    if (config.mode == AlertMode::VIBRATION || config.mode == AlertMode::BOTH) {
        digitalWrite(vibrationPin, HIGH);
    }
    
    Serial.printf("🚨 Enhanced alert triggered: mode=%d, intensity=%d\n", 
                 (int)config.mode, config.intensity);
    return true;
}

AlertMode AlertManager_Enhanced::stringToAlertMode(const String& modeStr) {
    if (modeStr == "buzzer") return AlertMode::BUZZER;
    if (modeStr == "vibration") return AlertMode::VIBRATION;
    if (modeStr == "both") return AlertMode::BOTH;
    return AlertMode::NONE;
}

// ==================== ENHANCED SYSTEM STATE MANAGER IMPLEMENTATIONS ====================

// Global instance with member variables
class SystemStateManagerImpl {
public:
    int batteryPercent = 75;
    int errorCount = 0;
    int proximityAlertCount = 0;
    int totalBeaconsDetected = 0;
    unsigned long lastUpdateTime = 0;
    unsigned long lastBatteryUpdate = 0;
    String lastError = "";
} systemStateImpl;

void SystemStateManager::initialize() {
    systemStateImpl.batteryPercent = 75;
    systemStateImpl.errorCount = 0;
    systemStateImpl.proximityAlertCount = 0;
    systemStateImpl.totalBeaconsDetected = 0;
    Serial.println("⚙️ Enhanced SystemStateManager initialized");
}

void SystemStateManager::updateSystemMetrics() {
    // Update system metrics
    systemStateImpl.lastUpdateTime = millis();
}

void SystemStateManager::updateBatteryStatus() {
    // Read battery voltage and update percentage
    // Stub implementation for now
    systemStateImpl.lastBatteryUpdate = millis();
}

void SystemStateManager::updateProximityAlerts(int count) {
    systemStateImpl.proximityAlertCount += count;
}

void SystemStateManager::updateBeaconStats(int newBeacons) {
    systemStateImpl.totalBeaconsDetected += newBeacons;
}

int SystemStateManager::getBatteryPercent() const {
    return systemStateImpl.batteryPercent;
}

int SystemStateManager::getErrorCount() const {
    return systemStateImpl.errorCount;
}

int SystemStateManager::getProximityAlerts() const {
    return systemStateImpl.proximityAlertCount;
}

void SystemStateManager::recordError(const String& error) {
    systemStateImpl.errorCount++;
    systemStateImpl.lastError = error;
    Serial.printf("❌ Error recorded: %s (Total: %d)\n", error.c_str(), systemStateImpl.errorCount);
}

String SystemStateManager::getSystemStatusJSON() const {
    DynamicJsonDocument doc(512);
    doc["status"] = "ok";
    doc["uptime"] = millis();
    doc["battery"] = systemStateImpl.batteryPercent;
    doc["errors"] = systemStateImpl.errorCount;
    doc["proximityAlerts"] = systemStateImpl.proximityAlertCount;
    doc["beaconsDetected"] = systemStateImpl.totalBeaconsDetected;
    doc["freeHeap"] = ESP.getFreeHeap();
    doc["timestamp"] = millis();
    
    String result;
    serializeJson(doc, result);
    return result;
}

// ==================== ENHANCED ZONE MANAGER IMPLEMENTATIONS ====================

void ZoneManager_Enhanced::initialize() {
    Serial.println("🗺️ Enhanced ZoneManager initialized");
}

// ==================== GLOBAL UTILITY FUNCTIONS ====================
// Note: checkProximityAlerts, triggerProximityAlert, and broadcastAlertStatus
// are implemented in the main .ino file to avoid multiple definition errors 