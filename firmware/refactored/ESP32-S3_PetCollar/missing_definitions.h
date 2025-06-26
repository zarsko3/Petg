#ifndef MISSING_DEFINITIONS_H
#define MISSING_DEFINITIONS_H

#include <Arduino.h>
#include <ArduinoJson.h>
#include <WiFiUdp.h>
#include "include/BeaconTypes.h"

// ==================== MISSING PIN DEFINITIONS ====================
#ifndef BUZZER_PIN
#define BUZZER_PIN 25
#endif

#ifndef VIBRATION_PIN
#define VIBRATION_PIN 26
#endif

#ifndef STATUS_LED_WIFI
#define STATUS_LED_WIFI 2
#endif

#ifndef STATUS_LED_BLE
#define STATUS_LED_BLE 4
#endif

#ifndef STATUS_LED_POWER
#define STATUS_LED_POWER 5
#endif

#ifndef BATTERY_VOLTAGE_PIN
#define BATTERY_VOLTAGE_PIN 35
#endif

#ifndef I2C_SDA_PIN
#define I2C_SDA_PIN 21
#endif

#ifndef I2C_SCL_PIN
#define I2C_SCL_PIN 22
#endif

// ==================== MISSING TYPE DEFINITIONS ====================
// All shared types now defined in BeaconTypes.h

// Missing timing constants
#ifndef BLE_SCAN_PERIOD
#define BLE_SCAN_PERIOD 5000
#endif

#ifndef BLE_SCAN_DURATION
#define BLE_SCAN_DURATION 3
#endif

#ifndef BLE_SCAN_PERIOD_MS
#define BLE_SCAN_PERIOD_MS BLE_SCAN_PERIOD
#endif

#ifndef BLE_SCAN_DURATION_SEC
#define BLE_SCAN_DURATION_SEC BLE_SCAN_DURATION
#endif

// AlertMode constants for compatibility
#define BUZZER_ONLY AlertMode::BUZZER
#define VIBRATION_ONLY AlertMode::VIBRATION

// Extended state structure for compatibility
struct SystemStateData {
    bool wifiConnected = false;
    bool bleInitialized = false;
    bool webServerRunning = false;
    bool systemReady = false;
};

// Global extended state instance  
SystemStateData systemStateData;

// Function prototypes
void checkProximityAlerts(const BeaconData& beacon);
void triggerProximityAlert(BeaconConfig& config, const BeaconData& beacon);
void broadcastAlertStatus(const BeaconConfig& config, const BeaconData& beacon);

#endif // MISSING_DEFINITIONS_H 