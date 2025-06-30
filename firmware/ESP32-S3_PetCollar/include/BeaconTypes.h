#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WString.h>
#include <vector>

// Forward declarations for BLE classes to avoid circular dependencies
class BLEAdvertisedDevice;

// ==================== SHARED ENUMS ====================

enum class AlertMode : uint8_t {
    NONE = 0,
    BUZZER = 1,
    VIBRATION = 2,
    BOTH = 3
};

enum class AlertReason : uint8_t {
    NONE = 0,
    PROXIMITY_DETECTED,     ///< Pet collar detected nearby
    PROXIMITY_LOST,         ///< Pet collar signal lost  
    LOW_BATTERY,            ///< Battery level is low
    CRITICAL_BATTERY,       ///< Battery level is critical
    WIFI_DISCONNECTED,      ///< WiFi connection lost
    SYSTEM_ERROR,           ///< System error occurred
    ZONE_ENTERED,           ///< Entered defined zone
    ZONE_EXITED,            ///< Exited defined zone
    MANUAL_TEST,            ///< Manual test activation
    BEACON_FOUND,           ///< Target beacon detected
    CUSTOM,                 ///< Custom alert reason
    // Additional MQTT integration reasons
    REMOTE_COMMAND,         ///< Remote command triggered alert
    ZONE_BREACH,            ///< Zone boundary breach
    LOCATE_REQUEST,         ///< Location request alert
    PROXIMITY_TRIGGER       ///< Proximity-based triggering from transmitter
};

// ==================== SHARED STRUCTS ====================

/**
 * @brief Beacon detection data
 */
struct BeaconData {
    String address;
    String name;
    int32_t rssi;
    float distance;
    float confidence;
    unsigned long lastSeen;
    bool isActive;
    
    BeaconData() : 
        rssi(-100), 
        distance(0.0f), 
        confidence(0.0f), 
        lastSeen(0), 
        isActive(false) {}
};

/**
 * @brief Beacon configuration settings
 */
struct BeaconConfig {
    String id;
    String name;
    String alertMode;
    uint8_t alertIntensity;
    uint16_t alertDurationMs;
    float triggerDistanceCm;
    bool isInProximity;
    unsigned long proximityStartTime;
    bool alertActive;
    unsigned long lastAlertTime;
    bool enableProximityDelay;
    uint16_t proximityDelayMs;
    uint16_t cooldownPeriodMs;
    
    BeaconConfig() : 
        alertIntensity(128), 
        alertDurationMs(1000), 
        triggerDistanceCm(200.0f),
        isInProximity(false), 
        proximityStartTime(0), 
        alertActive(false),
        lastAlertTime(0), 
        enableProximityDelay(false), 
        proximityDelayMs(0),
        cooldownPeriodMs(5000) {}
};

/**
 * @brief Alert configuration
 */
struct AlertConfig {
    AlertMode mode;
    uint8_t intensity;
    uint16_t duration;
    AlertReason reason;
    
    AlertConfig() : 
        mode(AlertMode::BOTH), 
        intensity(128), 
        duration(1000), 
        reason(AlertReason::PROXIMITY_DETECTED) {}
};

/**
 * @brief System configuration  
 */
struct SystemConfig {
    bool autoReconnectWiFi;
    bool enableBluetooth;
    bool enableDisplay;
    uint8_t displayBrightness;
    
    SystemConfig() :
        autoReconnectWiFi(true),
        enableBluetooth(true), 
        enableDisplay(true),
        displayBrightness(128) {}
};

// ==================== TYPE ALIASES ====================

using BeaconList = std::vector<BeaconData>;
using BeaconConfigList = std::vector<BeaconConfig>; 