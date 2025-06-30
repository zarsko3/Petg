#include "include/BeaconTypes.h"
#include "include/BeaconManager.h"
#include "include/AlertManager.h"
#include "include/WiFiManager.h"
#include "include/SystemStateManager.h"
#include "include/ZoneManager.h"

// External references to global objects from main .ino file
extern AlertManager_Enhanced alertManager;

// ==================== RSSI FILTERING FOR DISTANCE ACCURACY ====================
/**
 * @brief Simple RSSI filter for smoothing noisy readings
 */
class RSSIFilter {
private:
    int samples[BLE_RSSI_FILTER_SIZE];
    int index;
    int count;
    
public:
    RSSIFilter() : index(0), count(0) {
        for (int i = 0; i < BLE_RSSI_FILTER_SIZE; i++) {
            samples[i] = -100; // Initialize with weak signal
        }
    }
    
    int addSample(int rssi) {
        samples[index] = rssi;
        index = (index + 1) % BLE_RSSI_FILTER_SIZE;
        if (count < BLE_RSSI_FILTER_SIZE) count++;
        
        // Calculate moving average
        int sum = 0;
        for (int i = 0; i < count; i++) {
            sum += samples[i];
        }
        return sum / count;
    }
    
    void reset() {
        index = 0;
        count = 0;  
    }
    
    bool hasEnoughSamples() const {
        return count >= (BLE_RSSI_FILTER_SIZE / 2); // At least half the samples
    }
};

// Global RSSI filters for each beacon (keyed by address)
std::map<String, RSSIFilter> rssiFilters;

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
    // Create a mutable copy for RSSI filtering
    BeaconData filteredBeacon = beacon;
    
    // Apply RSSI filtering to reduce noise
    RSSIFilter& filter = rssiFilters[beacon.address];
    int filteredRSSI = filter.addSample(beacon.rssi);
    
    // Use filtered RSSI for distance calculation
    filteredBeacon.rssi = filteredRSSI;
    filteredBeacon.distance = calculateDistance(filteredRSSI);
    filteredBeacon.confidence = calculateConfidence(filteredRSSI);
    
    // Debug output showing both raw and filtered values  
    if (DEBUG_DISTANCE && filter.hasEnoughSamples()) {
        Serial.printf("🔍 Beacon %s: Raw RSSI=%d, Filtered=%d, Distance=%.2f cm\n", 
                     beacon.name.c_str(), beacon.rssi, filteredRSSI, filteredBeacon.distance);
    }
    
    // Update or add beacon to active list
    bool found = false;
    for (auto& existing : activeBeacons) {
        if (existing.address == beacon.address) {
            existing = filteredBeacon;
            found = true;
            break;
        }
    }
    
    if (!found && activeBeacons.size() < 10) { // Limit to 10 beacons
        activeBeacons.push_back(filteredBeacon);
    }
    
    // Only log when we have enough samples for stable readings
    if (filter.hasEnoughSamples()) {
        Serial.printf("🔍 Updated beacon: %s, RSSI: %d dBm, Distance: %.2f cm\n", 
                     filteredBeacon.name.c_str(), filteredBeacon.rssi, filteredBeacon.distance);
    }
}

float BeaconManager_Enhanced::calculateDistance(int rssi) const {
    // Calculate distance from RSSI using ultra-close calibrated path loss model
    if (rssi >= 0) return 0.0f;
    
    // Ultra-close RSSI calibration constants for PetZone beacons:
    constexpr float TX_POWER_DBM   = -65.0f;   // -29 dBm @ 1 cm → calc'd 1 m ref
    constexpr float PATH_LOSS_EXP  = 1.8f;     // short-range indoor exponent  
    constexpr float CLAMP_MIN_M    = 0.005f;   // distances below 5 mm → 0 cm
    
    // Path loss formula: Distance = 10^((Tx Power - RSSI) / (10 * n))
    float d = powf(10.0f, (TX_POWER_DBM - rssi) / (10.0f * PATH_LOSS_EXP));
    
    // Subtract 1 cm and clamp to ensure contact reads 0 cm
    d -= 0.01f;                // offset for physical contact
    if (d < 0.0f) d = 0.0f;    // clamp negative values to zero
    
    float distance_m = d;
    
    float distance_cm = distance_m * 100.0f; // Convert to centimeters
    
    // Apply reasonable limits for collar use case
    return constrain(distance_cm, 0.0f, BLE_MAX_DISTANCE_CM);
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

// Add missing getDetectedBeaconCount method (alias for getActiveBeaconCount)
int BeaconManager_Enhanced::getDetectedBeaconCount() const {
    return getActiveBeaconCount();
}

// Add missing getLastScanTime method
unsigned long BeaconManager_Enhanced::getLastScanTime() const {
    return millis(); // Simple implementation - return current time
}

// ========== PROXIMITY-BASED TRIGGERING IMPLEMENTATION ==========

void BeaconManager_Enhanced::configureProximityBeacon(
    const String& beaconId,
    const String& beaconName,
    const String& macAddress,
    const String& alertMode,
    int triggerDistance,
    int alertDuration,
    int alertIntensity,
    bool enableProximityDelay,
    int proximityDelayTime,
    int cooldownPeriod
) {
    // Find existing configuration or create new one
    ProximityBeaconConfig* config = nullptr;
    for (auto& existing : proximityConfigs) {
        if (existing.beaconId == beaconId || 
            (!macAddress.isEmpty() && existing.macAddress == macAddress)) {
            config = &existing;
            break;
        }
    }
    
    if (!config) {
        proximityConfigs.push_back(ProximityBeaconConfig());
        config = &proximityConfigs.back();
    }
    
    // Configure with exact transmitter settings
    config->beaconId = beaconId;
    config->beaconName = beaconName;
    config->macAddress = macAddress;
    config->alertMode = alertMode;
    config->triggerDistance = triggerDistance;
    config->alertDuration = alertDuration;
    config->alertIntensity = alertIntensity;
    config->enableProximityDelay = enableProximityDelay;
    config->proximityDelayTime = proximityDelayTime;
    config->cooldownPeriod = cooldownPeriod;
    
    Serial.printf("✅ Proximity beacon configured: %s (distance: %dcm, delay: %s)\n",
                 beaconName.c_str(), triggerDistance, 
                 enableProximityDelay ? String(proximityDelayTime + "ms").c_str() : "none");
}

void BeaconManager_Enhanced::clearProximityConfigurations() {
    proximityConfigs.clear();
    Serial.println("🗑️ Cleared all proximity beacon configurations");
}

void BeaconManager_Enhanced::processProximityTriggers() {
    if (proximityConfigs.empty()) return;
    
    unsigned long currentTime = millis();
    
    // Check each proximity configuration
    for (auto& config : proximityConfigs) {
        bool beaconInRange = false;
        float currentDistance = 999.0f; // Start with a large distance
        
        // Find matching beacon in active beacons
        for (const auto& beacon : activeBeacons) {
            bool matches = false;
            
            // Match by beacon ID (preferred) or MAC address
            if (!config.beaconId.isEmpty() && beacon.name.indexOf(config.beaconId) >= 0) {
                matches = true;
            } else if (!config.macAddress.isEmpty() && beacon.address == config.macAddress) {
                matches = true;
            } else if (!config.beaconName.isEmpty() && beacon.name.indexOf(config.beaconName) >= 0) {
                matches = true;
            }
            
            if (matches && beacon.isActive) {
                currentDistance = beacon.distance;
                beaconInRange = (currentDistance <= config.triggerDistance);
                break;
            }
        }
        
        // Handle proximity state changes
        if (beaconInRange && !config.inProximityRange) {
            // Entering proximity range
            config.inProximityRange = true;
            config.proximityStartTime = currentTime;
            
            Serial.printf("📍 Entered proximity range for '%s' at %.1fcm (trigger: %dcm)\n",
                         config.beaconName.c_str(), currentDistance, config.triggerDistance);
            
        } else if (!beaconInRange && config.inProximityRange) {
            // Exiting proximity range
            config.inProximityRange = false;
            config.proximityStartTime = 0;
            
            Serial.printf("📍 Exited proximity range for '%s' (%.1fcm)\n",
                         config.beaconName.c_str(), currentDistance);
        }
        
        // Check if alert should be triggered
        bool shouldTrigger = false;
        
        if (config.inProximityRange && !config.alertActive) {
            // Check cooldown period
            if (currentTime - config.lastTriggered >= config.cooldownPeriod) {
                
                if (config.enableProximityDelay) {
                    // Check if we've been in range long enough
                    if (currentTime - config.proximityStartTime >= config.proximityDelayTime) {
                        shouldTrigger = true;
                    }
                } else {
                    // Immediate trigger
                    shouldTrigger = true;
                }
            }
        }
        
        // Trigger alert if needed
        if (shouldTrigger) {
            config.alertActive = true;
            config.lastTriggered = currentTime;
            
            // Map alert mode to AlertMode enum
            AlertMode mode = AlertMode::BUZZER;
            if (config.alertMode == "vibration") {
                mode = AlertMode::VIBRATION;
            } else if (config.alertMode == "both") {
                mode = AlertMode::BOTH;
            } else if (config.alertMode == "none") {
                continue; // Skip triggering
            }
            
            // Trigger alert with exact transmitter settings
            Serial.printf("🚨 PROXIMITY ALERT: '%s' triggered at %.1fcm (configured: %dcm)\n",
                         config.beaconName.c_str(), currentDistance, config.triggerDistance);
            
            // Start alert with configured duration and intensity
            alertManager.startAlert(AlertReason::PROXIMITY_TRIGGER, mode);
            
            // Schedule alert end (this would need to be handled in AlertManager)
            // For now, the alert will run its default duration
        }
        
        // Check if alert should end
        if (config.alertActive && (currentTime - config.lastTriggered >= config.alertDuration)) {
            config.alertActive = false;
        }
    }
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

// Add missing startAlert method
bool AlertManager_Enhanced::startAlert(AlertReason reason, AlertMode mode, int pattern, int priority, const String& customReason) {
    AlertConfig config;
    config.mode = mode;
    config.intensity = 128; // Default intensity
    config.duration = 5000; // Default 5 seconds
    
    Serial.printf("🚨 Starting alert: reason=%d, mode=%d\n", (int)reason, (int)mode);
    return triggerAlert(config);
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

// Add missing getBatteryLevel method (alias for getBatteryPercent)
int SystemStateManager::getBatteryLevel() const {
    return getBatteryPercent();
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

// Add missing zone management methods
size_t ZoneManager_Enhanced::getZoneCount() const {
    return 0; // Simple implementation - no zones configured yet
}

String ZoneManager_Enhanced::getCurrentZone() const {
    return "none"; // Simple implementation
}

size_t ZoneManager_Enhanced::getBreachCount() const {
    return 0; // Simple implementation
}

String ZoneManager_Enhanced::getStatusJson() const {
    DynamicJsonDocument doc(512);
    doc["zone_count"] = getZoneCount();
    doc["current_zone"] = getCurrentZone();
    doc["breach_count"] = getBreachCount();
    doc["timestamp"] = millis();
    
    String result;
    serializeJson(doc, result);
    return result;
}

// ==================== GLOBAL UTILITY FUNCTIONS ====================
// Note: checkProximityAlerts, triggerProximityAlert, and broadcastAlertStatus
// are implemented in the main .ino file to avoid multiple definition errors 
