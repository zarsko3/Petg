/**
 * @file SystemStateManager.h
 * @brief Enhanced System State Management - Refactored
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Comprehensive system state management with thread-safe operations,
 * performance monitoring, and real-time status tracking.
 * 
 * Features:
 * - Thread-safe state management
 * - Comprehensive device monitoring
 * - Performance metrics tracking
 * - JSON serialization for web interfaces
 * - Event-driven state updates
 * - Memory and battery monitoring
 * - Network status tracking
 */

#ifndef SYSTEM_STATE_MANAGER_H
#define SYSTEM_STATE_MANAGER_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <freertos/FreeRTOS.h>
#include <freertos/semphr.h>
#include <functional>
#include <vector>
#include <esp_wifi.h>
#include <esp_timer.h>
#include "PetCollarConfig.h"
#include "BeaconManager.h"
#include "Utils.h"

// ==========================================
// SYSTEM STATE CONSTANTS
// ==========================================

#define SYSTEM_STATE_UPDATE_INTERVAL    1000    // 1 second
#define BATTERY_CHECK_INTERVAL          10000   // 10 seconds
#define MEMORY_CHECK_INTERVAL           5000    // 5 seconds
#define MAX_ERROR_HISTORY               10      // Maximum error messages to store
#define LOW_BATTERY_THRESHOLD           20      // 20% battery
#define CRITICAL_BATTERY_THRESHOLD      10      // 10% battery
#define LOW_MEMORY_THRESHOLD            10000   // 10KB free heap

// ==========================================
// SYSTEM STATE ENUMS
// ==========================================

/**
 * @brief System operation state
 */
enum SystemOperationState {
    SYSTEM_INITIALIZING = 0,
    SYSTEM_NORMAL = 1,
    SYSTEM_LOW_BATTERY = 2,
    SYSTEM_LOW_MEMORY = 3,
    SYSTEM_NETWORK_ERROR = 4,
    SYSTEM_HARDWARE_ERROR = 5,
    SYSTEM_EMERGENCY = 6
};

/**
 * @brief Connection status enumeration
 */
enum ConnectionStatus {
    CONNECTION_DISCONNECTED = 0,
    CONNECTION_CONNECTING = 1,
    CONNECTION_CONNECTED = 2,
    CONNECTION_ERROR = 3,
    CONNECTION_TIMEOUT = 4
};

/**
 * @brief Alert state enumeration
 */
enum AlertState {
    ALERT_NONE = 0,
    ALERT_PROXIMITY = 1,
    ALERT_ZONE_EXIT = 2,
    ALERT_LOW_BATTERY = 3,
    ALERT_SYSTEM_ERROR = 4,
    ALERT_EMERGENCY = 5
};

// ==========================================
// DEVICE INFORMATION STRUCTURE
// ==========================================

/**
 * @brief Device hardware and firmware information
 */
struct DeviceInfo {
    String deviceId;
    String firmwareVersion;
    String hardwareVersion;
    String buildDate;
    String buildNumber;
    uint32_t chipId;
    String macAddress;
    uint32_t flashSize;
    uint32_t freeSketchSpace;
    
    /**
     * @brief Default constructor
     */
    DeviceInfo() {
        deviceId = "PETCOLLAR-" + String((uint32_t)ESP.getEfuseMac(), HEX);
        firmwareVersion = FIRMWARE_VERSION;
        hardwareVersion = "ESP32-S3";
        buildDate = __DATE__;
        buildNumber = String(__TIME__).substring(0, 5);
        chipId = (uint32_t)ESP.getEfuseMac();
        macAddress = WiFi.macAddress();
        flashSize = ESP.getFlashChipSize();
        freeSketchSpace = ESP.getFreeSketchSpace();
    }
    
    /**
     * @brief Generate JSON representation
     */
    JsonObject toJson(JsonDocument& doc) const {
        JsonObject obj = doc.createNestedObject("device");
        obj["id"] = deviceId;
        obj["firmware"] = firmwareVersion;
        obj["hardware"] = hardwareVersion;
        obj["build_date"] = buildDate;
        obj["build_number"] = buildNumber;
        obj["chip_id"] = chipId;
        obj["mac"] = macAddress;
        obj["flash_size"] = flashSize;
        obj["free_sketch"] = freeSketchSpace;
        return obj;
    }
};

// ==========================================
// NETWORK STATUS STRUCTURE
// ==========================================

/**
 * @brief Network connectivity status
 */
struct NetworkStatus {
    ConnectionStatus wifiStatus;
    String ssid;
    IPAddress localIP;
    IPAddress gateway;
    IPAddress dns;
    int signalStrength;
    unsigned long connectTime;
    unsigned long lastConnectAttempt;
    int reconnectAttempts;
    bool apModeActive;
    int connectedClients;
    
    /**
     * @brief Default constructor
     */
    NetworkStatus() :
        wifiStatus(CONNECTION_DISCONNECTED),
        ssid(""),
        localIP(0, 0, 0, 0),
        gateway(0, 0, 0, 0),
        dns(0, 0, 0, 0),
        signalStrength(0),
        connectTime(0),
        lastConnectAttempt(0),
        reconnectAttempts(0),
        apModeActive(false),
        connectedClients(0) {}
    
    /**
     * @brief Update from current WiFi status
     */
    void update() {
        if (WiFi.status() == WL_CONNECTED) {
            wifiStatus = CONNECTION_CONNECTED;
            ssid = WiFi.SSID();
            localIP = WiFi.localIP();
            gateway = WiFi.gatewayIP();
            dns = WiFi.dnsIP();
            signalStrength = WiFi.RSSI();
        } else {
            wifiStatus = CONNECTION_DISCONNECTED;
            localIP = IPAddress(0, 0, 0, 0);
            signalStrength = 0;
        }
        
        // Check AP mode
        apModeActive = (WiFi.getMode() == WIFI_AP || WiFi.getMode() == WIFI_AP_STA);
        if (apModeActive) {
            connectedClients = WiFi.softAPgetStationNum();
        }
    }
    
    /**
     * @brief Generate JSON representation
     */
    JsonObject toJson(JsonDocument& doc) const {
        JsonObject obj = doc.createNestedObject("network");
        obj["wifi_status"] = (int)wifiStatus;
        obj["connected"] = (wifiStatus == CONNECTION_CONNECTED);
        obj["ssid"] = ssid;
        obj["ip"] = localIP.toString();
        obj["gateway"] = gateway.toString();
        obj["dns"] = dns.toString();
        obj["signal"] = signalStrength;
        obj["connect_time"] = connectTime;
        obj["reconnect_attempts"] = reconnectAttempts;
        obj["ap_mode"] = apModeActive;
        obj["ap_clients"] = connectedClients;
        return obj;
    }
};

// ==========================================
// BATTERY STATUS STRUCTURE
// ==========================================

/**
 * @brief Battery and power management status
 */
struct BatteryStatus {
    int percentage;
    float voltage;
    bool isCharging;
    bool isLowBattery;
    bool isCriticalBattery;
    unsigned long lastUpdate;
    float averageVoltage;
    std::vector<float> voltageHistory;
    
    /**
     * @brief Default constructor
     */
    BatteryStatus() :
        percentage(100),
        voltage(4.2f),
        isCharging(false),
        isLowBattery(false),
        isCriticalBattery(false),
        lastUpdate(0),
        averageVoltage(4.2f) {
        voltageHistory.reserve(10); // Reserve space for 10 readings
    }
    
    /**
     * @brief Update battery status
     */
    void update() {
        #ifdef BATTERY_PIN
        // Read battery voltage (assuming voltage divider)
        int adcValue = analogRead(BATTERY_PIN);
        voltage = (adcValue / 4095.0) * 3.3 * 2.0; // Adjust for voltage divider
        
        // Add to history and calculate average
        voltageHistory.push_back(voltage);
        if (voltageHistory.size() > 10) {
            voltageHistory.erase(voltageHistory.begin());
        }
        
        float sum = 0;
        for (float v : voltageHistory) {
            sum += v;
        }
        averageVoltage = sum / voltageHistory.size();
        
        // Calculate percentage (3.0V = 0%, 4.2V = 100%)
        percentage = (int)((voltage - 3.0) / (4.2 - 3.0) * 100);
        percentage = constrain(percentage, 0, 100);
        
        // Update status flags
        isLowBattery = (percentage <= LOW_BATTERY_THRESHOLD);
        isCriticalBattery = (percentage <= CRITICAL_BATTERY_THRESHOLD);
        
        // Check if charging (voltage increasing)
        if (voltageHistory.size() >= 2) {
            isCharging = (voltage > voltageHistory[voltageHistory.size() - 2] + 0.01);
        }
        
        lastUpdate = millis();
        #else
        // Simulated battery for development
        percentage = 85;
        voltage = 3.9f;
        isCharging = false;
        isLowBattery = false;
        isCriticalBattery = false;
        #endif
    }
    
    /**
     * @brief Generate JSON representation
     */
    JsonObject toJson(JsonDocument& doc) const {
        JsonObject obj = doc.createNestedObject("battery");
        obj["percentage"] = percentage;
        obj["voltage"] = voltage;
        obj["charging"] = isCharging;
        obj["low_battery"] = isLowBattery;
        obj["critical"] = isCriticalBattery;
        obj["average_voltage"] = averageVoltage;
        obj["last_update"] = lastUpdate;
        return obj;
    }
};

// ==========================================
// MEMORY STATUS STRUCTURE
// ==========================================

/**
 * @brief Memory usage and performance metrics
 */
struct MemoryStatus {
    uint32_t totalHeap;
    uint32_t freeHeap;
    uint32_t usedHeap;
    uint32_t maxAllocHeap;
    uint32_t minFreeHeap;
    float heapFragmentation;
    uint32_t psramTotal;
    uint32_t psramFree;
    bool lowMemoryWarning;
    unsigned long lastUpdate;
    
    /**
     * @brief Default constructor
     */
    MemoryStatus() :
        totalHeap(0),
        freeHeap(0),
        usedHeap(0),
        maxAllocHeap(0),
        minFreeHeap(0),
        heapFragmentation(0.0f),
        psramTotal(0),
        psramFree(0),
        lowMemoryWarning(false),
        lastUpdate(0) {}
    
    /**
     * @brief Update memory status
     */
    void update() {
        totalHeap = ESP.getHeapSize();
        freeHeap = ESP.getFreeHeap();
        usedHeap = totalHeap - freeHeap;
        maxAllocHeap = ESP.getMaxAllocHeap();
        minFreeHeap = ESP.getMinFreeHeap();
        
        // Calculate fragmentation
        if (freeHeap > 0) {
            heapFragmentation = 100.0f * (1.0f - (float)maxAllocHeap / (float)freeHeap);
        }
        
        // Check PSRAM if available
        if (psramFound()) {
            psramTotal = ESP.getPsramSize();
            psramFree = ESP.getFreePsram();
        }
        
        // Check for low memory warning
        lowMemoryWarning = (freeHeap < LOW_MEMORY_THRESHOLD);
        
        lastUpdate = millis();
    }
    
    /**
     * @brief Generate JSON representation
     */
    JsonObject toJson(JsonDocument& doc) const {
        JsonObject obj = doc.createNestedObject("memory");
        obj["total_heap"] = totalHeap;
        obj["free_heap"] = freeHeap;
        obj["used_heap"] = usedHeap;
        obj["max_alloc"] = maxAllocHeap;
        obj["min_free"] = minFreeHeap;
        obj["fragmentation"] = heapFragmentation;
        obj["psram_total"] = psramTotal;
        obj["psram_free"] = psramFree;
        obj["low_memory"] = lowMemoryWarning;
        obj["last_update"] = lastUpdate;
        return obj;
    }
};

// ==========================================
// LOCATION STATUS STRUCTURE
// ==========================================

/**
 * @brief Current location and proximity information
 */
struct LocationStatus {
    bool positionValid;
    float positionX;
    float positionY;
    float confidence;
    String currentZone;
    bool inSafeZone;
    float distanceToClosestBeacon;
    int beaconsInRange;
    unsigned long lastPositionUpdate;
    
    /**
     * @brief Default constructor
     */
    LocationStatus() :
        positionValid(false),
        positionX(0.0f),
        positionY(0.0f),
        confidence(0.0f),
        currentZone(""),
        inSafeZone(true),
        distanceToClosestBeacon(999.0f),
        beaconsInRange(0),
        lastPositionUpdate(0) {}
    
    /**
     * @brief Update location from beacon data
     */
    void updateFromBeacons(const std::vector<Beacon>& beacons) {
        beaconsInRange = beacons.size();
        
        if (!beacons.empty()) {
            // Find closest beacon
            float minDistance = 999.0f;
            for (const auto& beacon : beacons) {
                if (beacon.distance < minDistance) {
                    minDistance = beacon.distance;
                    currentZone = beacon.location;
                }
            }
            distanceToClosestBeacon = minDistance;
            
            // Simple zone logic (can be enhanced)
            inSafeZone = (minDistance <= SAFE_ZONE_RADIUS);
            
            lastPositionUpdate = millis();
        } else {
            distanceToClosestBeacon = 999.0f;
            inSafeZone = false;
            currentZone = "Unknown";
        }
    }
    
    /**
     * @brief Generate JSON representation
     */
    JsonObject toJson(JsonDocument& doc) const {
        JsonObject obj = doc.createNestedObject("location");
        obj["position_valid"] = positionValid;
        obj["x"] = positionX;
        obj["y"] = positionY;
        obj["confidence"] = confidence;
        obj["zone"] = currentZone;
        obj["safe_zone"] = inSafeZone;
        obj["closest_distance"] = distanceToClosestBeacon;
        obj["beacons_count"] = beaconsInRange;
        obj["last_update"] = lastPositionUpdate;
        return obj;
    }
};

// ==========================================
// SYSTEM STATE MANAGER CLASS
// ==========================================

/**
 * @brief Comprehensive system state management
 * 
 * Thread-safe system state manager that tracks all aspects of device operation
 * including hardware status, network connectivity, battery levels, memory usage,
 * and location information.
 */
class SystemStateManager {
public:
    // Callback function types
    typedef std::function<void(SystemOperationState)> StateChangeCallback;
    typedef std::function<void(AlertState, const String&)> AlertCallback;
    typedef std::function<void(const String&)> ErrorCallback;

private:
    // Core state data
    DeviceInfo deviceInfo_;
    NetworkStatus networkStatus_;
    BatteryStatus batteryStatus_;
    MemoryStatus memoryStatus_;
    LocationStatus locationStatus_;
    
    // System state
    SystemOperationState currentState_;
    AlertState currentAlert_;
    bool initialized_;
    unsigned long systemStartTime_;
    unsigned long lastUpdate_;
    
    // Error tracking
    std::vector<String> errorHistory_;
    String lastError_;
    unsigned long lastErrorTime_;
    
    // Thread safety
    SemaphoreHandle_t stateMutex_;
    
    // Timing
    unsigned long lastBatteryCheck_;
    unsigned long lastMemoryCheck_;
    
    // Callbacks
    StateChangeCallback onStateChange_;
    AlertCallback onAlert_;
    ErrorCallback onError_;
    
    /**
     * @brief Check system health and update state
     */
    void checkSystemHealth() {
        SystemOperationState newState = SYSTEM_NORMAL;
        
        // Check critical conditions
        if (batteryStatus_.isCriticalBattery) {
            newState = SYSTEM_EMERGENCY;
        } else if (memoryStatus_.lowMemoryWarning) {
            newState = SYSTEM_LOW_MEMORY;
        } else if (batteryStatus_.isLowBattery) {
            newState = SYSTEM_LOW_BATTERY;
        } else if (networkStatus_.wifiStatus == CONNECTION_ERROR) {
            newState = SYSTEM_NETWORK_ERROR;
        }
        
        // Update state if changed
        if (newState != currentState_) {
            SystemOperationState oldState = currentState_;
            currentState_ = newState;
            
            DEBUG_PRINTF("SystemState: State changed from %d to %d\n", oldState, newState);
            
            if (onStateChange_) {
                onStateChange_(newState);
            }
        }
    }
    
    /**
     * @brief Check for alert conditions
     */
    void checkAlertConditions() {
        AlertState newAlert = ALERT_NONE;
        String alertMessage = "";
        
        // Priority-based alert checking
        if (batteryStatus_.isCriticalBattery) {
            newAlert = ALERT_EMERGENCY;
            alertMessage = "Critical battery level: " + String(batteryStatus_.percentage) + "%";
        } else if (currentState_ == SYSTEM_HARDWARE_ERROR) {
            newAlert = ALERT_SYSTEM_ERROR;
            alertMessage = "Hardware error detected";
        } else if (!locationStatus_.inSafeZone && locationStatus_.beaconsInRange > 0) {
            newAlert = ALERT_ZONE_EXIT;
            alertMessage = "Pet left safe zone";
        } else if (batteryStatus_.isLowBattery) {
            newAlert = ALERT_LOW_BATTERY;
            alertMessage = "Low battery: " + String(batteryStatus_.percentage) + "%";
        } else if (locationStatus_.beaconsInRange > 0 && locationStatus_.distanceToClosestBeacon > PROXIMITY_ALERT_DISTANCE) {
            newAlert = ALERT_PROXIMITY;
            alertMessage = "Pet distance: " + String(locationStatus_.distanceToClosestBeacon, 1) + "m";
        }
        
        // Trigger alert if changed
        if (newAlert != currentAlert_) {
            currentAlert_ = newAlert;
            if (onAlert_ && newAlert != ALERT_NONE) {
                onAlert_(newAlert, alertMessage);
            }
        }
    }
    
    /**
     * @brief Add error to history
     */
    void addErrorToHistory(const String& error) {
        errorHistory_.push_back(error);
        if (errorHistory_.size() > MAX_ERROR_HISTORY) {
            errorHistory_.erase(errorHistory_.begin());
        }
        lastError_ = error;
        lastErrorTime_ = millis();
    }

public:
    /**
     * @brief Constructor
     */
    SystemStateManager() :
        currentState_(SYSTEM_INITIALIZING),
        currentAlert_(ALERT_NONE),
        initialized_(false),
        systemStartTime_(0),
        lastUpdate_(0),
        lastErrorTime_(0),
        stateMutex_(nullptr),
        lastBatteryCheck_(0),
        lastMemoryCheck_(0) {
        
        // Create mutex for thread safety
        stateMutex_ = xSemaphoreCreateMutex();
    }
    
    /**
     * @brief Destructor
     */
    ~SystemStateManager() {
        if (stateMutex_) {
            vSemaphoreDelete(stateMutex_);
        }
    }
    
    /**
     * @brief Initialize system state manager
     */
    bool begin() {
        if (initialized_) return true;
        
        if (!stateMutex_) {
            DEBUG_PRINTLN("SystemState: Failed to create mutex");
            return false;
        }
        
        systemStartTime_ = millis();
        
        // Initialize all subsystems
        deviceInfo_ = DeviceInfo();
        networkStatus_.update();
        batteryStatus_.update();
        memoryStatus_.update();
        
        initialized_ = true;
        currentState_ = SYSTEM_NORMAL;
        
        DEBUG_PRINTLN("SystemState: Initialized");
        return true;
    }
    
    /**
     * @brief Main update loop - call regularly
     */
    void update() {
        if (!initialized_) return;
        
        unsigned long currentTime = millis();
        
        // Take mutex for thread safety
        if (xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(10)) == pdTRUE) {
            
            // Update network status
            networkStatus_.update();
            
            // Update battery status periodically
            if (currentTime - lastBatteryCheck_ >= BATTERY_CHECK_INTERVAL) {
                batteryStatus_.update();
                lastBatteryCheck_ = currentTime;
            }
            
            // Update memory status periodically
            if (currentTime - lastMemoryCheck_ >= MEMORY_CHECK_INTERVAL) {
                memoryStatus_.update();
                lastMemoryCheck_ = currentTime;
            }
            
            // Check system health
            checkSystemHealth();
            
            // Check alert conditions
            checkAlertConditions();
            
            lastUpdate_ = currentTime;
            
            xSemaphoreGive(stateMutex_);
        }
    }
    
    /**
     * @brief Update location status from beacon manager
     */
    void updateLocation(const std::vector<Beacon>& beacons) {
        if (!initialized_) return;
        
        if (xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(10)) == pdTRUE) {
            locationStatus_.updateFromBeacons(beacons);
            xSemaphoreGive(stateMutex_);
        }
    }
    
    /**
     * @brief Report system error
     */
    void reportError(const String& error) {
        if (xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(10)) == pdTRUE) {
            addErrorToHistory(error);
            if (onError_) {
                onError_(error);
            }
            xSemaphoreGive(stateMutex_);
        }
    }
    
    /**
     * @brief Get current system state
     */
    SystemOperationState getCurrentState() const {
        return currentState_;
    }
    
    /**
     * @brief Get current alert state
     */
    AlertState getCurrentAlert() const {
        return currentAlert_;
    }
    
    /**
     * @brief Get system uptime in seconds
     */
    unsigned long getUptime() const {
        return (millis() - systemStartTime_) / 1000;
    }
    
    /**
     * @brief Get device information
     */
    const DeviceInfo& getDeviceInfo() const {
        return deviceInfo_;
    }
    
    /**
     * @brief Get network status
     */
    const NetworkStatus& getNetworkStatus() const {
        return networkStatus_;
    }
    
    /**
     * @brief Get battery status
     */
    const BatteryStatus& getBatteryStatus() const {
        return batteryStatus_;
    }
    
    /**
     * @brief Get memory status
     */
    const MemoryStatus& getMemoryStatus() const {
        return memoryStatus_;
    }
    
    /**
     * @brief Get location status
     */
    const LocationStatus& getLocationStatus() const {
        return locationStatus_;
    }
    
    /**
     * @brief Set state change callback
     */
    void onStateChange(StateChangeCallback callback) {
        onStateChange_ = callback;
    }
    
    /**
     * @brief Set alert callback
     */
    void onAlert(AlertCallback callback) {
        onAlert_ = callback;
    }
    
    /**
     * @brief Set error callback
     */
    void onError(ErrorCallback callback) {
        onError_ = callback;
    }
    
    /**
     * @brief Get complete system status as JSON
     */
    String getStatusJson() const {
        DynamicJsonDocument doc(2048);
        
        // Basic system info
        doc["uptime"] = getUptime();
        doc["state"] = (int)currentState_;
        doc["alert"] = (int)currentAlert_;
        doc["last_error"] = lastError_;
        doc["last_error_time"] = lastErrorTime_;
        doc["last_update"] = lastUpdate_;
        
        // Add all subsystem status
        deviceInfo_.toJson(doc);
        networkStatus_.toJson(doc);
        batteryStatus_.toJson(doc);
        memoryStatus_.toJson(doc);
        locationStatus_.toJson(doc);
        
        // Error history
        JsonArray errors = doc.createNestedArray("error_history");
        for (const auto& error : errorHistory_) {
            errors.add(error);
        }
        
        String result;
        serializeJson(doc, result);
        return result;
    }
    
    /**
     * @brief Get compact status for displays
     */
    String getCompactStatus() const {
        String status = "State: ";
        switch (currentState_) {
            case SYSTEM_NORMAL: status += "OK"; break;
            case SYSTEM_LOW_BATTERY: status += "LOW BAT"; break;
            case SYSTEM_LOW_MEMORY: status += "LOW MEM"; break;
            case SYSTEM_NETWORK_ERROR: status += "NET ERR"; break;
            case SYSTEM_HARDWARE_ERROR: status += "HW ERR"; break;
            case SYSTEM_EMERGENCY: status += "EMERGENCY"; break;
            default: status += "INIT"; break;
        }
        
        status += " | Bat: " + String(batteryStatus_.percentage) + "%";
        status += " | Mem: " + String(memoryStatus_.freeHeap / 1024) + "KB";
        
        if (networkStatus_.wifiStatus == CONNECTION_CONNECTED) {
            status += " | WiFi: " + networkStatus_.ssid;
        } else {
            status += " | WiFi: OFF";
        }
        
        return status;
    }
    
    /**
     * @brief Check if system is healthy
     */
    bool isHealthy() const {
        return (currentState_ == SYSTEM_NORMAL && 
                !batteryStatus_.isCriticalBattery &&
                !memoryStatus_.lowMemoryWarning);
    }
    
    /**
     * @brief Reset error history
     */
    void clearErrorHistory() {
        if (xSemaphoreTake(stateMutex_, pdMS_TO_TICKS(10)) == pdTRUE) {
            errorHistory_.clear();
            lastError_ = "";
            lastErrorTime_ = 0;
            xSemaphoreGive(stateMutex_);
        }
    }
};

#endif // SYSTEM_STATE_MANAGER_H