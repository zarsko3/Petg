/**
 * @file micro_config.h
 * @brief Micro-Controller Lightweight Configuration
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Lightweight configuration header for micro-controller applications
 * with memory-constrained environments.
 */

#ifndef MICRO_CONFIG_H
#define MICRO_CONFIG_H

// Include main configuration
#include "PetCollarConfig.h"

// ==========================================
// MICRO-CONTROLLER SPECIFIC SETTINGS
// ==========================================

// Memory optimization settings
#define MICRO_USE_MINIMAL_FEATURES      1
#define MICRO_REDUCE_MEMORY_USAGE       1
#define MICRO_OPTIMIZE_FOR_SPEED        1

// Reduced buffer sizes for micro-controllers
#define MICRO_SERIAL_BUFFER_SIZE        256
#define MICRO_WIFI_BUFFER_SIZE          512
#define MICRO_BLE_BUFFER_SIZE           256
#define MICRO_JSON_BUFFER_SIZE          512

// Simplified pin definitions
#define MICRO_BUZZER_PIN                BUZZER_PIN
#define MICRO_LED_PIN                   LED_PIN
#define MICRO_BATTERY_PIN               BATTERY_PIN

// Basic timing constants (reduced for micro use)
#define MICRO_UPDATE_INTERVAL           100    // 100ms update interval
#define MICRO_SLEEP_INTERVAL            1000   // 1 second sleep
#define MICRO_HEARTBEAT_INTERVAL        5000   // 5 second heartbeat

// Simplified alert levels
#define MICRO_ALERT_OFF                 0
#define MICRO_ALERT_LOW                 1
#define MICRO_ALERT_MEDIUM              2
#define MICRO_ALERT_HIGH                3
#define MICRO_ALERT_CRITICAL            4

// Micro power management
#define MICRO_LOW_POWER_MODE            1
#define MICRO_BATTERY_THRESHOLD         20     // 20% battery threshold
#define MICRO_SLEEP_TIME_MS             30000  // 30 second sleep

// Simplified BLE settings
#define MICRO_BLE_SCAN_TIME             5      // 5 second scan
#define MICRO_BLE_ADVERTISE_TIME        10     // 10 second advertise
#define MICRO_BLE_MAX_CONNECTIONS       1      // Single connection

// Memory limits
#define MICRO_MAX_BEACONS               5      // Maximum tracked beacons
#define MICRO_MAX_ZONES                 3      // Maximum zones
#define MICRO_MAX_ALERTS                2      // Maximum queued alerts

// ==========================================
// MICRO FEATURE FLAGS
// ==========================================

#ifdef MICRO_USE_MINIMAL_FEATURES
  #undef FEATURE_WEB_SERVER
  #undef FEATURE_OTA_UPDATES
  #undef FEATURE_FILE_SYSTEM
  #undef FEATURE_ADVANCED_DIAGNOSTICS
  
  #define FEATURE_BASIC_ALERTS          1
  #define FEATURE_BASIC_BLE             1
  #define FEATURE_BASIC_POWER_MGMT      1
#endif

// ==========================================
// COMPATIBILITY MACROS
// ==========================================

#define MICRO_INIT()                    micro_init()
#define MICRO_UPDATE()                  micro_update()
#define MICRO_SLEEP()                   micro_sleep()
#define MICRO_WAKEUP()                  micro_wakeup()

// Function declarations
#ifdef __cplusplus
extern "C" {
#endif

bool micro_init(void);
void micro_update(void);
void micro_sleep(void);
void micro_wakeup(void);
uint8_t micro_get_battery_level(void);
bool micro_is_alert_active(void);
void micro_trigger_alert(uint8_t level);
void micro_stop_alert(void);

#ifdef __cplusplus
}
#endif

#endif // MICRO_CONFIG_H 