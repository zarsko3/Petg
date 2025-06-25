/**
 * @file ESP32_S3_Config.h
 * @brief Legacy ESP32-S3 Configuration Header - Backward Compatibility
 * @author PetCollar Development Team  
 * @version 3.0.0
 * 
 * This file provides backward compatibility with original ESP32-S3 firmware.
 * All new development should use PetCollarConfig.h instead.
 */

#ifndef ESP32_S3_CONFIG_H
#define ESP32_S3_CONFIG_H

// Include the refactored configuration
#include "PetCollarConfig.h"

// ==========================================
// LEGACY COMPATIBILITY ALIASES
// ==========================================

// Legacy device identification
#define DEVICE_TYPE_COLLAR        PETCOLLAR_DEVICE_TYPE_COLLAR
#define DEVICE_TYPE_TRANSMITTER   PETCOLLAR_DEVICE_TYPE_TRANSMITTER
#define DEVICE_TYPE_CAMERA        PETCOLLAR_DEVICE_TYPE_CAMERA

// Legacy pin definitions (maintained for backward compatibility)
#ifndef ESP32_S3_BUZZER_PIN
#define ESP32_S3_BUZZER_PIN       BUZZER_PIN
#endif

#ifndef ESP32_S3_VIBRATION_PIN
#define ESP32_S3_VIBRATION_PIN    VIBRATION_PIN
#endif

#ifndef ESP32_S3_LED_PIN
#define ESP32_S3_LED_PIN          LED_PIN
#endif

#ifndef ESP32_S3_BATTERY_PIN
#define ESP32_S3_BATTERY_PIN      BATTERY_PIN
#endif

// Legacy WiFi settings
#define ESP32_S3_WIFI_SSID        WIFI_DEFAULT_SSID
#define ESP32_S3_WIFI_PASSWORD    WIFI_DEFAULT_PASSWORD
#define ESP32_S3_AP_SSID          WIFI_AP_SSID
#define ESP32_S3_AP_PASSWORD      WIFI_AP_PASSWORD

// Legacy BLE settings
#define ESP32_S3_BLE_DEVICE_NAME  BLE_DEVICE_NAME
#define ESP32_S3_BLE_SERVICE_UUID BLE_SERVICE_UUID

// Legacy timing constants
#define ESP32_S3_SCAN_INTERVAL    BLE_SCAN_INTERVAL
#define ESP32_S3_SCAN_WINDOW      BLE_SCAN_WINDOW
#define ESP32_S3_ADVERTISE_INTERVAL BLE_ADVERTISE_INTERVAL

// Legacy power management
#define ESP32_S3_DEEP_SLEEP_TIME  POWER_DEEP_SLEEP_TIME
#define ESP32_S3_LIGHT_SLEEP_TIME POWER_LIGHT_SLEEP_TIME
#define ESP32_S3_LOW_BATTERY_THRESHOLD POWER_LOW_BATTERY_THRESHOLD

// Legacy alert settings
#define ESP32_S3_PROXIMITY_THRESHOLD_NEAR    PROXIMITY_THRESHOLD_NEAR
#define ESP32_S3_PROXIMITY_THRESHOLD_FAR     PROXIMITY_THRESHOLD_FAR
#define ESP32_S3_PROXIMITY_THRESHOLD_LOST    PROXIMITY_THRESHOLD_LOST

// Legacy zone management
#define ESP32_S3_SAFE_ZONE_RADIUS      ZONE_SAFE_RADIUS_DEFAULT
#define ESP32_S3_WARNING_ZONE_RADIUS   ZONE_WARNING_RADIUS_DEFAULT
#define ESP32_S3_DANGER_ZONE_RADIUS    ZONE_DANGER_RADIUS_DEFAULT

// ==========================================
// LEGACY STRUCTURE DEFINITIONS
// ==========================================

// Legacy device info structure
typedef struct {
  String deviceId;
  String firmwareVersion;
  String hardwareVersion;
  uint32_t serialNumber;
  bool isInitialized;
} ESP32_S3_DeviceInfo;

// Legacy WiFi configuration
typedef struct {
  String ssid;
  String password;
  String apSSID;
  String apPassword;
  bool enableAP;
  bool enableSTA;
  uint32_t connectionTimeout;
  uint8_t maxRetries;
} ESP32_S3_WiFiConfig;

// Legacy BLE configuration
typedef struct {
  String deviceName;
  String serviceUUID;
  String characteristicUUID;
  uint16_t scanInterval;
  uint16_t scanWindow;
  uint16_t advertiseInterval;
  bool enableScanning;
  bool enableAdvertising;
} ESP32_S3_BLEConfig;

// ==========================================
// LEGACY FUNCTION MACROS
// ==========================================

// Legacy initialization macros
#define ESP32_S3_init()                   PetCollar_init()
#define ESP32_S3_WiFi_init()              WiFi_init()
#define ESP32_S3_BLE_init()               BLE_init()
#define ESP32_S3_Sensors_init()           Sensors_init()

// Legacy utility macros
#define ESP32_S3_getDeviceID()            getDeviceID()
#define ESP32_S3_getFirmwareVersion()     getFirmwareVersion()
#define ESP32_S3_getBatteryLevel()        getBatteryLevel()
#define ESP32_S3_getUptime()              getUptime()

// Legacy power management macros
#define ESP32_S3_enterDeepSleep(time)     enterDeepSleep(time)
#define ESP32_S3_enterLightSleep(time)    enterLightSleep(time)
#define ESP32_S3_enableWakeup()           enableWakeup()

// Legacy alert macros
#define ESP32_S3_triggerAlert(type)       triggerAlert(type)
#define ESP32_S3_stopAlert()              stopAlert()
#define ESP32_S3_setAlertVolume(vol)      setAlertVolume(vol)

// ==========================================
// LEGACY COMPATIBILITY FUNCTIONS
// ==========================================

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Get legacy device information
 * @return ESP32_S3_DeviceInfo structure
 */
ESP32_S3_DeviceInfo ESP32_S3_getDeviceInfo();

/**
 * @brief Get legacy WiFi configuration
 * @return ESP32_S3_WiFiConfig structure
 */
ESP32_S3_WiFiConfig ESP32_S3_getWiFiConfig();

/**
 * @brief Get legacy BLE configuration
 * @return ESP32_S3_BLEConfig structure
 */
ESP32_S3_BLEConfig ESP32_S3_getBLEConfig();

/**
 * @brief Legacy system status check
 * @return true if system is healthy
 */
bool ESP32_S3_isSystemHealthy();

/**
 * @brief Legacy memory check
 * @return free heap size in bytes
 */
uint32_t ESP32_S3_getFreeHeap();

/**
 * @brief Legacy temperature reading
 * @return temperature in Celsius
 */
float ESP32_S3_getTemperature();

#ifdef __cplusplus
}
#endif

// ==========================================
// DEPRECATION WARNINGS
// ==========================================

#ifdef __cplusplus
// C++ deprecation warnings
#pragma message("ESP32_S3_Config.h is deprecated. Please use PetCollarConfig.h for new development.")

// Legacy namespace for backward compatibility
namespace ESP32_S3 {
  // Legacy constants
  static const int BUZZER_PIN = ::BUZZER_PIN;
  static const int VIBRATION_PIN = ::VIBRATION_PIN;
  static const int LED_PIN = ::LED_PIN;
  static const int BATTERY_PIN = ::BATTERY_PIN;
  
  // Legacy functions
  inline bool init() { return PetCollar_init(); }
  inline String getDeviceID() { return ::getDeviceID(); }
  inline float getBatteryLevel() { return ::getBatteryLevel(); }
  inline uint32_t getUptime() { return ::getUptime(); }
}
#endif

// ==========================================
// VERSION INFORMATION
// ==========================================

#define ESP32_S3_CONFIG_VERSION_MAJOR    3
#define ESP32_S3_CONFIG_VERSION_MINOR    0
#define ESP32_S3_CONFIG_VERSION_PATCH    0
#define ESP32_S3_CONFIG_VERSION_STRING   "3.0.0"

// Build information
#define ESP32_S3_CONFIG_BUILD_DATE       __DATE__
#define ESP32_S3_CONFIG_BUILD_TIME       __TIME__
#define ESP32_S3_CONFIG_COMPILER         "ESP32 Arduino"

// Feature flags for legacy compatibility
#define ESP32_S3_FEATURE_WIFI            1
#define ESP32_S3_FEATURE_BLE             1
#define ESP32_S3_FEATURE_BUZZER          1
#define ESP32_S3_FEATURE_VIBRATION       1
#define ESP32_S3_FEATURE_LED             1
#define ESP32_S3_FEATURE_BATTERY         1
#define ESP32_S3_FEATURE_DEEP_SLEEP      1
#define ESP32_S3_FEATURE_LIGHT_SLEEP     1
#define ESP32_S3_FEATURE_PROXIMITY       1
#define ESP32_S3_FEATURE_ZONES           1
#define ESP32_S3_FEATURE_TRIANGULATION   1

#endif // ESP32_S3_CONFIG_H 