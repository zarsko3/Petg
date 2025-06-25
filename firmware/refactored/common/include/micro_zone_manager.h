/**
 * @file micro_zone_manager.h
 * @brief Micro Zone Manager - Lightweight Zone Management
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Lightweight zone management for micro-controller applications.
 * Provides simplified interface to the main ZoneManager.
 */

#ifndef MICRO_ZONE_MANAGER_H
#define MICRO_ZONE_MANAGER_H

#include "micro_config.h"
#include <stdint.h>
#include <stdbool.h>

// ==========================================
// MICRO ZONE STRUCTURES
// ==========================================

typedef enum {
  MICRO_ZONE_SAFE = 0,
  MICRO_ZONE_WARNING,
  MICRO_ZONE_DANGER,
  MICRO_ZONE_UNKNOWN
} micro_zone_type_t;

typedef struct {
  float x, y;               // Center coordinates
  float radius;             // Zone radius in meters
  micro_zone_type_t type;   // Zone type
  bool active;              // Zone active flag
  char name[16];            // Zone name (short)
} micro_zone_t;

typedef struct {
  float x, y;               // Current position
  micro_zone_type_t current_zone;
  micro_zone_type_t previous_zone;
  bool zone_changed;
  uint32_t last_update;
} micro_position_t;

typedef struct {
  micro_zone_t zones[MICRO_MAX_ZONES];
  micro_position_t position;
  uint8_t zone_count;
  bool monitoring_active;
} micro_zone_manager_t;

// ==========================================
// MICRO ZONE FUNCTIONS
// ==========================================

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize micro zone manager
 * @return true if successful
 */
bool micro_zone_init(void);

/**
 * @brief Update zone manager (call in main loop)
 */
void micro_zone_update(void);

/**
 * @brief Start zone monitoring
 * @return true if successful
 */
bool micro_zone_start_monitoring(void);

/**
 * @brief Stop zone monitoring
 */
void micro_zone_stop_monitoring(void);

/**
 * @brief Add a zone
 * @param x center X coordinate
 * @param y center Y coordinate
 * @param radius zone radius in meters
 * @param type zone type
 * @param name zone name
 * @return zone index or -1 if failed
 */
int8_t micro_zone_add(float x, float y, float radius, micro_zone_type_t type, const char* name);

/**
 * @brief Remove a zone
 * @param index zone index
 * @return true if successful
 */
bool micro_zone_remove(uint8_t index);

/**
 * @brief Clear all zones
 */
void micro_zone_clear_all(void);

/**
 * @brief Update current position
 * @param x current X coordinate
 * @param y current Y coordinate
 */
void micro_zone_update_position(float x, float y);

/**
 * @brief Get current zone type
 * @return current zone type
 */
micro_zone_type_t micro_zone_get_current(void);

/**
 * @brief Check if zone has changed
 * @return true if zone changed since last check
 */
bool micro_zone_has_changed(void);

/**
 * @brief Get zone count
 * @return number of active zones
 */
uint8_t micro_zone_get_count(void);

/**
 * @brief Get zone by index
 * @param index zone index
 * @return pointer to zone or NULL
 */
micro_zone_t* micro_zone_get(uint8_t index);

/**
 * @brief Check if position is in zone
 * @param x position X coordinate
 * @param y position Y coordinate
 * @param zone_index zone index
 * @return true if position is in zone
 */
bool micro_zone_is_position_in_zone(float x, float y, uint8_t zone_index);

/**
 * @brief Get distance to zone edge
 * @param x position X coordinate
 * @param y position Y coordinate
 * @param zone_index zone index
 * @return distance to zone edge in meters (negative if inside)
 */
float micro_zone_get_distance_to_edge(float x, float y, uint8_t zone_index);

/**
 * @brief Find zone at position
 * @param x position X coordinate
 * @param y position Y coordinate
 * @return zone type at position
 */
micro_zone_type_t micro_zone_find_at_position(float x, float y);

/**
 * @brief Check if monitoring is active
 * @return true if monitoring
 */
bool micro_zone_is_monitoring(void);

/**
 * @brief Get current position
 * @return pointer to position structure
 */
micro_position_t* micro_zone_get_position(void);

/**
 * @brief Set safe zone (convenience function)
 * @param x center X coordinate
 * @param y center Y coordinate
 * @param radius radius in meters
 * @return zone index or -1 if failed
 */
int8_t micro_zone_set_safe_zone(float x, float y, float radius);

/**
 * @brief Check if in safe zone
 * @return true if in safe zone
 */
bool micro_zone_is_safe(void);

/**
 * @brief Check if outside all zones
 * @return true if outside all zones
 */
bool micro_zone_is_outside_all(void);

#ifdef __cplusplus
}
#endif

// ==========================================
// MICRO ZONE MACROS
// ==========================================

#define MICRO_ZONE_INIT()                 micro_zone_init()
#define MICRO_ZONE_UPDATE()               micro_zone_update()
#define MICRO_ZONE_START()                micro_zone_start_monitoring()
#define MICRO_ZONE_STOP()                 micro_zone_stop_monitoring()
#define MICRO_ZONE_CLEAR()                micro_zone_clear_all()
#define MICRO_ZONE_CURRENT()              micro_zone_get_current()
#define MICRO_ZONE_CHANGED()              micro_zone_has_changed()
#define MICRO_ZONE_COUNT()                micro_zone_get_count()
#define MICRO_ZONE_IS_SAFE()              micro_zone_is_safe()
#define MICRO_ZONE_IS_MONITORING()        micro_zone_is_monitoring()

// Position macros
#define MICRO_ZONE_UPDATE_POS(x, y)       micro_zone_update_position(x, y)
#define MICRO_ZONE_GET_POS()              micro_zone_get_position()

// Zone type check macros
#define MICRO_IN_SAFE_ZONE()              (micro_zone_get_current() == MICRO_ZONE_SAFE)
#define MICRO_IN_WARNING_ZONE()           (micro_zone_get_current() == MICRO_ZONE_WARNING)
#define MICRO_IN_DANGER_ZONE()            (micro_zone_get_current() == MICRO_ZONE_DANGER)
#define MICRO_ZONE_UNKNOWN()              (micro_zone_get_current() == MICRO_ZONE_UNKNOWN)

// ==========================================
// CONSTANTS
// ==========================================

#define MICRO_ZONE_UPDATE_INTERVAL        1000    // 1 second update interval
#define MICRO_ZONE_NAME_MAX               16      // Maximum zone name length
#define MICRO_ZONE_MIN_RADIUS             1.0f    // Minimum zone radius (1 meter)
#define MICRO_ZONE_MAX_RADIUS             1000.0f // Maximum zone radius (1 km)

// Default zone sizes
#define MICRO_ZONE_DEFAULT_SAFE_RADIUS    50.0f   // 50 meter safe zone
#define MICRO_ZONE_DEFAULT_WARNING_RADIUS 100.0f  // 100 meter warning zone
#define MICRO_ZONE_DEFAULT_DANGER_RADIUS  200.0f  // 200 meter danger zone

// Zone type strings
#define MICRO_ZONE_STRING_SAFE            "SAFE"
#define MICRO_ZONE_STRING_WARNING         "WARNING"
#define MICRO_ZONE_STRING_DANGER          "DANGER"
#define MICRO_ZONE_STRING_UNKNOWN         "UNKNOWN"

// Position tolerance
#define MICRO_ZONE_POSITION_TOLERANCE     1.0f    // 1 meter position tolerance
#define MICRO_ZONE_HYSTERESIS            2.0f    // 2 meter hysteresis for zone changes

#endif // MICRO_ZONE_MANAGER_H 