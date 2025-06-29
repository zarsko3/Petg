#ifndef MICRO_CONFIG_H
#define MICRO_CONFIG_H

/**
 * @file MicroConfig.h
 * @brief Compact configuration and utility definitions for ESP32-S3 Pet Collar
 * @version 3.1.0
 * @date 2024
 * 
 * This file provides essential data structures, enums, and utility functions
 * that are shared across the pet collar system components.
 * 
 * @note This file complements ESP32_S3_Config.h by providing runtime structures
 *       and enums rather than compile-time constants.
 */

#include <Arduino.h>
#include "ESP32_S3_Config.h"
#include "BeaconTypes.h"

// ==========================================
// FORWARD DECLARATIONS
// ==========================================
class AlertManager;
class BeaconManager;
class ZoneManager;

// ==========================================
// ALERT SYSTEM ENUMERATIONS
// ==========================================

// AlertMode now defined in BeaconTypes.h

/**
 * @brief System operational states
 */
enum class SystemState : uint8_t {
    INITIALIZING = 0,  ///< System is starting up
    NORMAL,            ///< Normal operation
    ALERT,             ///< Alert condition active
    LOW_BATTERY,       ///< Low battery state
    ERROR,             ///< System error state
    SLEEP              ///< Power saving sleep mode
};

/**
 * @brief Connection states for various subsystems
 */
enum class ConnectionState : uint8_t {
    DISCONNECTED = 0,  ///< Not connected
    CONNECTING,        ///< Attempting connection
    CONNECTED,         ///< Successfully connected
    RECONNECTING,      ///< Attempting to reconnect
    FAILED             ///< Connection failed
};

// ==========================================
// CORE DATA STRUCTURES
// ==========================================

/**
 * @brief 2D Point structure for position and zone definitions
 */
struct Point2D {
    float x;  ///< X coordinate
    float y;  ///< Y coordinate
    
    Point2D() : x(0.0f), y(0.0f) {}
    Point2D(float x_val, float y_val) : x(x_val), y(y_val) {}
    
    /**
     * @brief Calculate distance to another point
     * @param other The other point
     * @return Distance between points
     */
    float distanceTo(const Point2D& other) const {
        float dx = x - other.x;
        float dy = y - other.y;
        return sqrt(dx * dx + dy * dy);
    }
    
    /**
     * @brief Check if this point equals another (with tolerance)
     * @param other The other point
     * @param tolerance Tolerance for comparison (default 0.01)
     * @return true if points are equal within tolerance
     */
    bool equals(const Point2D& other, float tolerance = 0.01f) const {
        return (abs(x - other.x) <= tolerance) && (abs(y - other.y) <= tolerance);
    }
};

/**
 * @brief Extended system configuration structure
 */
struct SystemConfigExtended {
    char deviceId[MAX_DEVICE_NAME_LENGTH];      ///< Unique device identifier
    char firmwareVersion[16];                   ///< Current firmware version
    char hardwareVersion[16];                   ///< Hardware version string
    
    // Operational settings
    bool debugMode;                             ///< Enable debug output
    bool lowPowerMode;                          ///< Enable power saving features
    AlertMode defaultAlertMode;                 ///< Default alert mode
    
    // BLE scanning settings
    uint16_t scanIntervalMs;                    ///< BLE scan interval in milliseconds
    uint16_t scanWindowMs;                      ///< BLE scan window in milliseconds
    int8_t rssiThreshold;                       ///< Minimum RSSI for proximity detection
    
    // Alert settings
    uint8_t alertVolume;                        ///< Buzzer volume (0-255)
    uint8_t vibrationIntensity;                 ///< Vibration intensity (0-255)
    uint16_t alertTimeoutMs;                    ///< Auto-stop alert timeout
    
    // Network settings
    char wifiSSID[MAX_SSID_LENGTH];            ///< WiFi network name
    char wifiPassword[MAX_PASSWORD_LENGTH];     ///< WiFi password
    bool autoConnectWiFi;                       ///< Auto-connect to saved WiFi
    
    /**
     * @brief Initialize with default values
     */
    SystemConfigExtended() {
        // Clear all string buffers
        memset(deviceId, 0, sizeof(deviceId));
        memset(firmwareVersion, 0, sizeof(firmwareVersion));
        memset(hardwareVersion, 0, sizeof(hardwareVersion));
        memset(wifiSSID, 0, sizeof(wifiSSID));
        memset(wifiPassword, 0, sizeof(wifiPassword));
        
        // Set default values
        strcpy(firmwareVersion, FIRMWARE_VERSION);
        strcpy(hardwareVersion, HARDWARE_PLATFORM);
        snprintf(deviceId, sizeof(deviceId), "PetCollar-%08X", (uint32_t)ESP.getEfuseMac());
        
        debugMode = FEATURE_SERIAL_DEBUG;
        lowPowerMode = FEATURE_POWER_MANAGEMENT;
        defaultAlertMode = AlertMode::BOTH;
        
        scanIntervalMs = BLE_SCAN_INTERVAL;
        scanWindowMs = BLE_SCAN_WINDOW;
        rssiThreshold = BLE_RSSI_THRESHOLD;
        
        alertVolume = BUZZER_DEFAULT_VOLUME;
        vibrationIntensity = VIBRATION_DEFAULT_INTENSITY;
        alertTimeoutMs = BUZZER_MAX_DURATION_MS;
        
        autoConnectWiFi = true;
    }
    
    /**
     * @brief Validate configuration values
     * @return true if configuration is valid
     */
    bool validate() const {
        // Check scan parameters
        if (scanIntervalMs < scanWindowMs) return false;
        if (scanIntervalMs < MIN_SCAN_INTERVAL_MS || scanIntervalMs > MAX_SCAN_INTERVAL_MS) return false;
        
        // Check alert parameters
        if (alertVolume > MAX_ALERT_VOLUME) return false;
        if (vibrationIntensity > MAX_ALERT_VOLUME) return false;
        
        // Check string lengths
        if (strlen(deviceId) == 0) return false;
        if (strlen(wifiSSID) > MAX_SSID_LENGTH - 1) return false;
        if (strlen(wifiPassword) > MAX_PASSWORD_LENGTH - 1) return false;
        
        return true;
    }
    
    /**
     * @brief Apply constraints to configuration values
     */
    void constrainValues() {
        scanIntervalMs = (scanIntervalMs < MIN_SCAN_INTERVAL_MS) ? MIN_SCAN_INTERVAL_MS : 
                        (scanIntervalMs > MAX_SCAN_INTERVAL_MS) ? MAX_SCAN_INTERVAL_MS : scanIntervalMs;
        scanWindowMs = (scanWindowMs < MIN_SCAN_INTERVAL_MS) ? MIN_SCAN_INTERVAL_MS : 
                      (scanWindowMs > scanIntervalMs) ? scanIntervalMs : scanWindowMs;
        alertVolume = CONSTRAIN_BYTE(alertVolume);
        vibrationIntensity = CONSTRAIN_BYTE(vibrationIntensity);
        rssiThreshold = (rssiThreshold < -120) ? -120 : (rssiThreshold > -30) ? -30 : rssiThreshold;
    }
};

/**
 * @brief Battery status information
 */
struct BatteryStatus {
    float voltageV;           ///< Battery voltage in volts
    uint8_t percentage;       ///< Battery percentage (0-100)
    bool isCharging;          ///< True if currently charging
    bool isLowBattery;        ///< True if battery is low
    bool isCriticalBattery;   ///< True if battery is critically low
    unsigned long lastUpdate; ///< Last update timestamp
    
    BatteryStatus() : 
        voltageV(0.0f),
        percentage(0),
        isCharging(false),
        isLowBattery(false),
        isCriticalBattery(false),
        lastUpdate(0) {}
    
    /**
     * @brief Update battery status from raw voltage reading
     * @param rawVoltage Raw voltage reading
     */
    void updateFromVoltage(float rawVoltage) {
        voltageV = rawVoltage;
        lastUpdate = millis();
        
        // Convert voltage to percentage (simplified linear mapping)
        float minVoltage = POWER_CRITICAL_BATTERY_MV / 1000.0f;
        float maxVoltage = POWER_FULL_BATTERY_MV / 1000.0f;
        
        percentage = CONSTRAIN_PERCENT(
            ((voltageV - minVoltage) / (maxVoltage - minVoltage)) * 100
        );
        
        // Update status flags
        isLowBattery = voltageV < (POWER_LOW_BATTERY_MV / 1000.0f);
        isCriticalBattery = voltageV < (POWER_CRITICAL_BATTERY_MV / 1000.0f);
    }
    
    /**
     * @brief Get battery status as string
     * @return Human-readable battery status
     */
    String getStatusString() const {
        if (isCriticalBattery) return "Critical";
        if (isLowBattery) return "Low";
        if (isCharging) return "Charging";
        return "Good";
    }
};

/**
 * @brief Network connection information
 */
struct NetworkStatus {
    ConnectionState wifiState;    ///< WiFi connection state
    ConnectionState bleState;     ///< BLE connection state
    String localIP;               ///< Local IP address
    String ssid;                  ///< Connected WiFi SSID
    int8_t signalStrength;        ///< WiFi signal strength (RSSI)
    unsigned long lastUpdate;     ///< Last update timestamp
    uint32_t reconnectAttempts;   ///< Number of reconnection attempts
    
    NetworkStatus() : 
        wifiState(ConnectionState::DISCONNECTED),
        bleState(ConnectionState::DISCONNECTED),
        localIP("0.0.0.0"),
        ssid(""),
        signalStrength(-100),
        lastUpdate(0),
        reconnectAttempts(0) {}
    
    /**
     * @brief Check if any network connection is active
     * @return true if WiFi or BLE is connected
     */
    bool hasConnection() const {
        return (wifiState == ConnectionState::CONNECTED) || 
               (bleState == ConnectionState::CONNECTED);
    }
    
    /**
     * @brief Get connection quality as percentage
     * @return Connection quality (0-100)
     */
    uint8_t getConnectionQuality() const {
        if (wifiState != ConnectionState::CONNECTED) return 0;
        
        // Convert RSSI to quality percentage
        // -30 dBm = 100%, -90 dBm = 0%
        int quality = map(signalStrength, -90, -30, 0, 100);
        return CONSTRAIN_PERCENT(quality);
    }
};

// ==========================================
// GLOBAL CONFIGURATION INSTANCE
// ==========================================

/**
 * @brief Global system configuration instance
 * @note This is declared here and defined in the main source file
 */
extern SystemConfigExtended g_systemConfig;
extern BatteryStatus g_batteryStatus;
extern NetworkStatus g_networkStatus;
extern SystemState g_currentSystemState;

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * @brief Calculate distance from RSSI using path loss model
 * @param rssi Received Signal Strength Indicator
 * @return Estimated distance in meters
 */
inline float rssiToDistance(int rssi) {
    if (rssi >= 0) return 0.0f;
    
    // Path loss formula: Distance = 10^((Tx Power - RSSI) / (10 * n))
    // Where Tx Power ≈ -69 dBm at 1m, n ≈ 2.5 for indoor environment
    float distance = pow(10.0f, (BLE_RSSI_THRESHOLD - rssi) / (10.0f * 2.5f));
    return constrain(distance, 0.0f, 50.0f); // Cap at 50 meters
}

/**
 * @brief Convert alert mode enum to string
 * @param mode Alert mode
 * @return String representation
 */
inline const char* alertModeToString(AlertMode mode) {
    switch (mode) {
        case AlertMode::NONE: return "None";
        case AlertMode::BUZZER: return "Buzzer";
        case AlertMode::VIBRATION: return "Vibration";
        case AlertMode::BOTH: return "Both";
        default: return "Unknown";
    }
}

/**
 * @brief Convert system state enum to string
 * @param state System state
 * @return String representation
 */
inline const char* systemStateToString(SystemState state) {
    switch (state) {
        case SystemState::INITIALIZING: return "Initializing";
        case SystemState::NORMAL: return "Normal";
        case SystemState::ALERT: return "Alert";
        case SystemState::LOW_BATTERY: return "Low Battery";
        case SystemState::ERROR: return "Error";
        case SystemState::SLEEP: return "Sleep";
        default: return "Unknown";
    }
}

/**
 * @brief Convert connection state enum to string
 * @param state Connection state
 * @return String representation
 */
inline const char* connectionStateToString(ConnectionState state) {
    switch (state) {
        case ConnectionState::DISCONNECTED: return "Disconnected";
        case ConnectionState::CONNECTING: return "Connecting";
        case ConnectionState::CONNECTED: return "Connected";
        case ConnectionState::RECONNECTING: return "Reconnecting";
        case ConnectionState::FAILED: return "Failed";
        default: return "Unknown";
    }
}

/**
 * @brief Get current system uptime in seconds
 * @return Uptime in seconds
 */
inline uint32_t getSystemUptimeSeconds() {
    return millis() / 1000;
}

/**
 * @brief Get free heap memory in bytes
 * @return Free heap size
 */
inline uint32_t getFreeHeapBytes() {
    return ESP.getFreeHeap();
}

/**
 * @brief Check if system has sufficient memory
 * @param requiredBytes Required memory in bytes
 * @return true if sufficient memory is available
 */
inline bool hasMemoryAvailable(uint32_t requiredBytes) {
    return getFreeHeapBytes() > (requiredBytes + KB_TO_BYTES(MEMORY_RESERVED_HEAP_KB));
}

// ==========================================
// DEBUG HELPER MACROS
// ==========================================

#if FEATURE_SERIAL_DEBUG
    #define DEBUG_INIT()            Serial.begin(DEBUG_SERIAL_BAUD)
    #define DEBUG_PRINT_LN(msg)     Serial.println(F(msg))
    #define DEBUG_PRINT_VAL(var)    Serial.println(var)
    #define DEBUG_PRINT_F(fmt, ...) Serial.printf(fmt, ##__VA_ARGS__)
    
    // Memory debugging
    #define DEBUG_HEAP()            DEBUG_PRINT_F("Free heap: %u bytes\n", getFreeHeapBytes())
    #define DEBUG_UPTIME()          DEBUG_PRINT_F("Uptime: %u seconds\n", getSystemUptimeSeconds())
    
    // System state debugging
    #define DEBUG_STATE(state)      DEBUG_PRINT_F("System state: %s\n", systemStateToString(state))
    #define DEBUG_ALERT(mode)       DEBUG_PRINT_F("Alert mode: %s\n", alertModeToString(mode))
#else
    #define DEBUG_INIT()
    #define DEBUG_PRINT_LN(msg)
    #define DEBUG_PRINT_VAL(var)
    #define DEBUG_PRINT_F(fmt, ...)
    #define DEBUG_HEAP()
    #define DEBUG_UPTIME()
    #define DEBUG_STATE(state)
    #define DEBUG_ALERT(mode)
#endif

// ==================== JSON SERIALIZATION HELPERS ====================

// JSON serialization for SystemState enum to fix ArduinoJson compilation errors
inline void convertToJson(const SystemState& src, JsonVariant dst) {
    switch (src) {
        case SystemState::INITIALIZING: dst.set("initializing"); break;
        case SystemState::NORMAL: dst.set("normal"); break;
        case SystemState::ALERT: dst.set("alert"); break;
        case SystemState::LOW_BATTERY: dst.set("low_battery"); break;
        case SystemState::ERROR: dst.set("error"); break;
        case SystemState::SLEEP: dst.set("sleep"); break;
        default: dst.set("unknown"); break;
    }
}

#endif // MICRO_CONFIG_H 