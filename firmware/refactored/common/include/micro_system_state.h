/**
 * @file micro_system_state.h
 * @brief Micro System State - Lightweight System Status Management
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Lightweight system state management for micro-controller applications.
 * Provides simplified interface to the main SystemStateManager.
 */

#ifndef MICRO_SYSTEM_STATE_H
#define MICRO_SYSTEM_STATE_H

#include "micro_config.h"
#include <stdint.h>
#include <stdbool.h>

// ==========================================
// MICRO SYSTEM STATE STRUCTURES
// ==========================================

typedef enum {
  MICRO_STATE_INIT = 0,
  MICRO_STATE_READY,
  MICRO_STATE_ACTIVE,
  MICRO_STATE_SLEEPING,
  MICRO_STATE_LOW_BATTERY,
  MICRO_STATE_ERROR,
  MICRO_STATE_UNKNOWN
} micro_system_state_t;

typedef struct {
  uint8_t percentage;        // Battery percentage (0-100)
  float voltage;            // Battery voltage
  bool charging;            // Is charging
  bool low_battery;         // Low battery warning
} micro_battery_t;

typedef struct {
  uint32_t free_heap;       // Free heap memory
  uint32_t min_free_heap;   // Minimum free heap seen
  uint8_t cpu_usage;        // CPU usage percentage
} micro_memory_t;

typedef struct {
  micro_system_state_t state;
  micro_battery_t battery;
  micro_memory_t memory;
  uint32_t uptime_sec;
  uint32_t error_count;
  bool healthy;
  char last_error[64];
} micro_system_status_t;

// ==========================================
// MICRO SYSTEM STATE FUNCTIONS
// ==========================================

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize micro system state manager
 * @return true if successful
 */
bool micro_system_init(void);

/**
 * @brief Update system state (call in main loop)
 */
void micro_system_update(void);

/**
 * @brief Get current system state
 * @return current system state
 */
micro_system_state_t micro_system_get_state(void);

/**
 * @brief Set system state
 * @param state new system state
 */
void micro_system_set_state(micro_system_state_t state);

/**
 * @brief Check if system is healthy
 * @return true if system is healthy
 */
bool micro_system_is_healthy(void);

/**
 * @brief Get system status structure
 * @return pointer to system status
 */
micro_system_status_t* micro_system_get_status(void);

/**
 * @brief Get battery level
 * @return battery percentage (0-100)
 */
uint8_t micro_system_get_battery_level(void);

/**
 * @brief Get battery voltage
 * @return battery voltage in volts
 */
float micro_system_get_battery_voltage(void);

/**
 * @brief Check if battery is low
 * @return true if battery is low
 */
bool micro_system_is_battery_low(void);

/**
 * @brief Check if device is charging
 * @return true if charging
 */
bool micro_system_is_charging(void);

/**
 * @brief Get free heap memory
 * @return free heap in bytes
 */
uint32_t micro_system_get_free_heap(void);

/**
 * @brief Get uptime in seconds
 * @return uptime in seconds
 */
uint32_t micro_system_get_uptime(void);

/**
 * @brief Get error count
 * @return total error count
 */
uint32_t micro_system_get_error_count(void);

/**
 * @brief Get last error message
 * @return pointer to last error string
 */
const char* micro_system_get_last_error(void);

/**
 * @brief Report system error
 * @param error error message
 */
void micro_system_report_error(const char* error);

/**
 * @brief Clear error count and message
 */
void micro_system_clear_errors(void);

/**
 * @brief Enter sleep mode
 * @param duration_ms sleep duration in milliseconds
 */
void micro_system_sleep(uint32_t duration_ms);

/**
 * @brief Wake up from sleep
 */
void micro_system_wakeup(void);

/**
 * @brief Reset system
 */
void micro_system_reset(void);

/**
 * @brief Perform system health check
 * @return true if all checks pass
 */
bool micro_system_health_check(void);

#ifdef __cplusplus
}
#endif

// ==========================================
// MICRO SYSTEM MACROS
// ==========================================

#define MICRO_SYSTEM_INIT()               micro_system_init()
#define MICRO_SYSTEM_UPDATE()             micro_system_update()
#define MICRO_SYSTEM_STATE()              micro_system_get_state()
#define MICRO_SYSTEM_HEALTHY()            micro_system_is_healthy()
#define MICRO_SYSTEM_BATTERY()            micro_system_get_battery_level()
#define MICRO_SYSTEM_VOLTAGE()            micro_system_get_battery_voltage()
#define MICRO_SYSTEM_LOW_BATTERY()        micro_system_is_battery_low()
#define MICRO_SYSTEM_CHARGING()           micro_system_is_charging()
#define MICRO_SYSTEM_FREE_HEAP()          micro_system_get_free_heap()
#define MICRO_SYSTEM_UPTIME()             micro_system_get_uptime()
#define MICRO_SYSTEM_ERRORS()             micro_system_get_error_count()
#define MICRO_SYSTEM_SLEEP(ms)            micro_system_sleep(ms)
#define MICRO_SYSTEM_RESET()              micro_system_reset()

// State check macros
#define MICRO_IS_INIT()                   (micro_system_get_state() == MICRO_STATE_INIT)
#define MICRO_IS_READY()                  (micro_system_get_state() == MICRO_STATE_READY)
#define MICRO_IS_ACTIVE()                 (micro_system_get_state() == MICRO_STATE_ACTIVE)
#define MICRO_IS_SLEEPING()               (micro_system_get_state() == MICRO_STATE_SLEEPING)
#define MICRO_IS_LOW_BATTERY()            (micro_system_get_state() == MICRO_STATE_LOW_BATTERY)
#define MICRO_IS_ERROR()                  (micro_system_get_state() == MICRO_STATE_ERROR)

// ==========================================
// CONSTANTS
// ==========================================

#define MICRO_SYSTEM_UPDATE_INTERVAL      1000    // 1 second update interval
#define MICRO_BATTERY_LOW_THRESHOLD       20      // 20% low battery threshold
#define MICRO_BATTERY_CRITICAL_THRESHOLD  10      // 10% critical threshold
#define MICRO_MEMORY_LOW_THRESHOLD        1024    // 1KB low memory threshold
#define MICRO_ERROR_MESSAGE_MAX           64      // Maximum error message length

// System state strings
#define MICRO_STATE_STRING_INIT           "INIT"
#define MICRO_STATE_STRING_READY          "READY"
#define MICRO_STATE_STRING_ACTIVE         "ACTIVE"
#define MICRO_STATE_STRING_SLEEPING       "SLEEPING"
#define MICRO_STATE_STRING_LOW_BATTERY    "LOW_BATTERY"
#define MICRO_STATE_STRING_ERROR          "ERROR"
#define MICRO_STATE_STRING_UNKNOWN        "UNKNOWN"

// Health check thresholds
#define MICRO_HEALTH_MIN_FREE_HEAP        512     // Minimum free heap for healthy state
#define MICRO_HEALTH_MAX_ERROR_COUNT      10      // Maximum errors before unhealthy
#define MICRO_HEALTH_MAX_CPU_USAGE        90      // Maximum CPU usage for healthy state

#endif // MICRO_SYSTEM_STATE_H 