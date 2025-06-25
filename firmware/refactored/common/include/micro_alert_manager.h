/**
 * @file micro_alert_manager.h
 * @brief Micro Alert Manager - Lightweight Alert System
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Lightweight alert management for micro-controller applications.
 * Provides simplified interface to the main AlertManager.
 */

#ifndef MICRO_ALERT_MANAGER_H
#define MICRO_ALERT_MANAGER_H

#include "micro_config.h"
#include <stdint.h>
#include <stdbool.h>

// ==========================================
// MICRO ALERT STRUCTURES
// ==========================================

typedef enum {
  MICRO_ALERT_NONE = 0,
  MICRO_ALERT_PROXIMITY,
  MICRO_ALERT_ZONE_EXIT,
  MICRO_ALERT_LOW_BATTERY,
  MICRO_ALERT_SYSTEM_ERROR,
  MICRO_ALERT_EMERGENCY
} micro_alert_type_t;

typedef struct {
  micro_alert_type_t type;
  uint8_t priority;         // 0-4 (0=off, 4=critical)
  uint16_t duration_ms;     // Alert duration
  bool buzzer_enabled;
  bool vibration_enabled;
  bool led_enabled;
  uint8_t volume;           // 0-100
} micro_alert_config_t;

typedef struct {
  micro_alert_config_t config;
  uint32_t start_time;
  bool active;
  bool expired;
} micro_alert_state_t;

typedef struct {
  micro_alert_state_t alerts[MICRO_MAX_ALERTS];
  uint8_t active_count;
  uint8_t queue_count;
  bool system_muted;
  uint8_t global_volume;
} micro_alert_manager_t;

// ==========================================
// MICRO ALERT FUNCTIONS
// ==========================================

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize micro alert manager
 * @return true if successful
 */
bool micro_alert_init(void);

/**
 * @brief Update alert manager (call in main loop)
 */
void micro_alert_update(void);

/**
 * @brief Trigger an alert
 * @param type alert type
 * @param priority alert priority (0-4)
 * @param duration_ms alert duration in milliseconds
 * @return true if alert was triggered
 */
bool micro_alert_trigger(micro_alert_type_t type, uint8_t priority, uint16_t duration_ms);

/**
 * @brief Trigger alert with configuration
 * @param config alert configuration
 * @return true if alert was triggered
 */
bool micro_alert_trigger_config(micro_alert_config_t* config);

/**
 * @brief Stop specific alert type
 * @param type alert type to stop
 */
void micro_alert_stop(micro_alert_type_t type);

/**
 * @brief Stop all alerts
 */
void micro_alert_stop_all(void);

/**
 * @brief Check if specific alert is active
 * @param type alert type
 * @return true if alert is active
 */
bool micro_alert_is_active(micro_alert_type_t type);

/**
 * @brief Check if any alert is active
 * @return true if any alert is active
 */
bool micro_alert_any_active(void);

/**
 * @brief Get active alert count
 * @return number of active alerts
 */
uint8_t micro_alert_get_active_count(void);

/**
 * @brief Set global volume
 * @param volume volume level (0-100)
 */
void micro_alert_set_volume(uint8_t volume);

/**
 * @brief Get current volume
 * @return current volume level
 */
uint8_t micro_alert_get_volume(void);

/**
 * @brief Mute all alerts
 */
void micro_alert_mute(void);

/**
 * @brief Unmute all alerts
 */
void micro_alert_unmute(void);

/**
 * @brief Check if system is muted
 * @return true if muted
 */
bool micro_alert_is_muted(void);

/**
 * @brief Simple proximity alert
 * @param distance distance in meters
 * @param threshold threshold distance
 */
void micro_alert_proximity(float distance, float threshold);

/**
 * @brief Simple zone exit alert
 */
void micro_alert_zone_exit(void);

/**
 * @brief Simple low battery alert
 * @param battery_level battery level (0-100)
 */
void micro_alert_low_battery(uint8_t battery_level);

/**
 * @brief Simple system error alert
 * @param error_code error code
 */
void micro_alert_system_error(uint8_t error_code);

/**
 * @brief Emergency alert (highest priority)
 */
void micro_alert_emergency(void);

/**
 * @brief Test buzzer
 * @param frequency frequency in Hz
 * @param duration_ms duration in milliseconds
 */
void micro_alert_test_buzzer(uint16_t frequency, uint16_t duration_ms);

/**
 * @brief Test vibration
 * @param duration_ms duration in milliseconds
 */
void micro_alert_test_vibration(uint16_t duration_ms);

/**
 * @brief Test LED
 * @param duration_ms duration in milliseconds
 */
void micro_alert_test_led(uint16_t duration_ms);

#ifdef __cplusplus
}
#endif

// ==========================================
// MICRO ALERT MACROS
// ==========================================

#define MICRO_ALERT_INIT()                micro_alert_init()
#define MICRO_ALERT_UPDATE()              micro_alert_update()
#define MICRO_ALERT_STOP_ALL()            micro_alert_stop_all()
#define MICRO_ALERT_ACTIVE()              micro_alert_any_active()
#define MICRO_ALERT_COUNT()               micro_alert_get_active_count()
#define MICRO_ALERT_MUTE()                micro_alert_mute()
#define MICRO_ALERT_UNMUTE()              micro_alert_unmute()
#define MICRO_ALERT_IS_MUTED()            micro_alert_is_muted()

// Quick alert macros
#define MICRO_ALERT_PROXIMITY_QUICK(d,t)  micro_alert_proximity(d,t)
#define MICRO_ALERT_ZONE_EXIT_QUICK()     micro_alert_zone_exit()
#define MICRO_ALERT_LOW_BATTERY_QUICK(b)  micro_alert_low_battery(b)
#define MICRO_ALERT_ERROR_QUICK(e)        micro_alert_system_error(e)
#define MICRO_ALERT_EMERGENCY_QUICK()     micro_alert_emergency()

// Test macros
#define MICRO_TEST_BUZZER(f,d)            micro_alert_test_buzzer(f,d)
#define MICRO_TEST_VIBRATION(d)           micro_alert_test_vibration(d)
#define MICRO_TEST_LED(d)                 micro_alert_test_led(d)

// Alert type check macros
#define MICRO_PROXIMITY_ACTIVE()          micro_alert_is_active(MICRO_ALERT_PROXIMITY)
#define MICRO_ZONE_EXIT_ACTIVE()          micro_alert_is_active(MICRO_ALERT_ZONE_EXIT)
#define MICRO_LOW_BATTERY_ACTIVE()        micro_alert_is_active(MICRO_ALERT_LOW_BATTERY)
#define MICRO_SYSTEM_ERROR_ACTIVE()       micro_alert_is_active(MICRO_ALERT_SYSTEM_ERROR)
#define MICRO_EMERGENCY_ACTIVE()          micro_alert_is_active(MICRO_ALERT_EMERGENCY)

// ==========================================
// CONSTANTS
// ==========================================

#define MICRO_ALERT_UPDATE_INTERVAL       100     // 100ms update interval
#define MICRO_ALERT_DEFAULT_VOLUME        50      // Default volume (50%)
#define MICRO_ALERT_MAX_VOLUME            100     // Maximum volume
#define MICRO_ALERT_MIN_VOLUME            0       // Minimum volume (mute)

// Priority levels
#define MICRO_ALERT_PRIORITY_OFF          0       // Alert disabled
#define MICRO_ALERT_PRIORITY_LOW          1       // Low priority
#define MICRO_ALERT_PRIORITY_MEDIUM       2       // Medium priority
#define MICRO_ALERT_PRIORITY_HIGH         3       // High priority
#define MICRO_ALERT_PRIORITY_CRITICAL     4       // Critical priority

// Default durations (milliseconds)
#define MICRO_ALERT_DURATION_SHORT        500     // Short alert
#define MICRO_ALERT_DURATION_MEDIUM       2000    // Medium alert
#define MICRO_ALERT_DURATION_LONG         5000    // Long alert
#define MICRO_ALERT_DURATION_EMERGENCY    10000   // Emergency alert

// Frequency settings for buzzer
#define MICRO_ALERT_FREQ_LOW              500     // Low frequency
#define MICRO_ALERT_FREQ_MEDIUM           1000    // Medium frequency
#define MICRO_ALERT_FREQ_HIGH             2000    // High frequency
#define MICRO_ALERT_FREQ_EMERGENCY        3000    // Emergency frequency

// Default alert configurations
#define MICRO_ALERT_DEFAULT_PROXIMITY     {MICRO_ALERT_PROXIMITY, MICRO_ALERT_PRIORITY_MEDIUM, MICRO_ALERT_DURATION_MEDIUM, true, false, true, MICRO_ALERT_DEFAULT_VOLUME}
#define MICRO_ALERT_DEFAULT_ZONE_EXIT     {MICRO_ALERT_ZONE_EXIT, MICRO_ALERT_PRIORITY_HIGH, MICRO_ALERT_DURATION_LONG, true, true, true, MICRO_ALERT_DEFAULT_VOLUME}
#define MICRO_ALERT_DEFAULT_LOW_BATTERY   {MICRO_ALERT_LOW_BATTERY, MICRO_ALERT_PRIORITY_LOW, MICRO_ALERT_DURATION_SHORT, true, false, true, MICRO_ALERT_DEFAULT_VOLUME}
#define MICRO_ALERT_DEFAULT_SYSTEM_ERROR  {MICRO_ALERT_SYSTEM_ERROR, MICRO_ALERT_PRIORITY_HIGH, MICRO_ALERT_DURATION_MEDIUM, true, false, true, MICRO_ALERT_DEFAULT_VOLUME}
#define MICRO_ALERT_DEFAULT_EMERGENCY     {MICRO_ALERT_EMERGENCY, MICRO_ALERT_PRIORITY_CRITICAL, MICRO_ALERT_DURATION_EMERGENCY, true, true, true, 100}

// Alert type strings
#define MICRO_ALERT_STRING_NONE           "NONE"
#define MICRO_ALERT_STRING_PROXIMITY      "PROXIMITY"
#define MICRO_ALERT_STRING_ZONE_EXIT      "ZONE_EXIT"
#define MICRO_ALERT_STRING_LOW_BATTERY    "LOW_BATTERY"
#define MICRO_ALERT_STRING_SYSTEM_ERROR   "SYSTEM_ERROR"
#define MICRO_ALERT_STRING_EMERGENCY      "EMERGENCY"

#endif // MICRO_ALERT_MANAGER_H 