#ifndef COMPILE_FIX_H
#define COMPILE_FIX_H

// Missing pin definitions
#define I2C_SDA_PIN 8   // Correct ESP32-S3 I2C SDA pin
#define I2C_SCL_PIN 9   // Correct ESP32-S3 I2C SCL pin
#define BUZZER_PIN 18
#define VIBRATION_PIN 26
#define STATUS_LED_WIFI 21  // WiFi status LED on GPIO 21
#define STATUS_LED_BLE 4
#define STATUS_LED_POWER 5
#define BATTERY_VOLTAGE_PIN 35

// Missing timing constants
#define BLE_SCAN_PERIOD 5000
#define BLE_SCAN_DURATION 3

// Missing type definitions
struct AlertConfig {
    AlertMode mode;
    uint8_t intensity;
    uint16_t duration;
    AlertReason reason;
    
    AlertConfig() : mode(AlertMode::BOTH), intensity(128), duration(1000), reason(AlertReason::PROXIMITY_DETECTED) {}
};

struct BeaconData {
    String address;
    String name; 
    int32_t rssi;
    float distance;
    float confidence;
    unsigned long lastSeen;
    bool isActive;
    
    BeaconData() : rssi(-100), distance(0.0f), confidence(0.0f), lastSeen(0), isActive(false) {}
};

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
    
    BeaconConfig() : alertIntensity(128), alertDurationMs(1000), triggerDistanceCm(2.0f), 
                    isInProximity(false), proximityStartTime(0), alertActive(false), 
                    lastAlertTime(0), enableProximityDelay(false), proximityDelayMs(0), 
                    cooldownPeriodMs(5000) {}
};

// Simple state structure
struct SystemStateEx {
    bool wifiConnected = false;
    bool bleInitialized = false;
    bool webServerRunning = false;
    bool systemReady = false;
};

// Global state variable - defined in main .ino file
extern SystemStateEx currentState;

// AlertMode compatibility constants
const AlertMode BUZZER_ONLY = AlertMode::BUZZER;
const AlertMode VIBRATION_ONLY = AlertMode::VIBRATION;

// Simple function declarations for missing functions
void checkProximityAlerts(const BeaconData& beacon);
void triggerProximityAlert(BeaconConfig& config, const BeaconData& beacon);
void broadcastAlertStatus(const BeaconConfig& config, const BeaconData& beacon);

#endif 