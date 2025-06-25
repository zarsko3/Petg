/**
 * @file micro_beacon_manager.h
 * @brief Micro Beacon Manager - Lightweight BLE Beacon Management
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Lightweight beacon management for micro-controller applications.
 * Provides simplified interface to the main BeaconManager.
 */

#ifndef MICRO_BEACON_MANAGER_H
#define MICRO_BEACON_MANAGER_H

#include "micro_config.h"
#include "BeaconManager.h"

// ==========================================
// MICRO BEACON STRUCTURES
// ==========================================

typedef struct {
  char address[18];         // MAC address string
  int8_t rssi;             // Signal strength
  uint16_t distance_cm;    // Distance in centimeters
  uint32_t last_seen;      // Last detection timestamp
  bool is_active;          // Active beacon flag
} micro_beacon_t;

typedef struct {
  micro_beacon_t beacons[MICRO_MAX_BEACONS];
  uint8_t count;
  uint8_t active_count;
  uint32_t last_scan;
  bool scanning;
} micro_beacon_list_t;

// ==========================================
// MICRO BEACON FUNCTIONS
// ==========================================

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize micro beacon manager
 * @return true if successful
 */
bool micro_beacon_init(void);

/**
 * @brief Start beacon scanning
 * @return true if successful
 */
bool micro_beacon_start_scan(void);

/**
 * @brief Stop beacon scanning
 */
void micro_beacon_stop_scan(void);

/**
 * @brief Update beacon manager (call in main loop)
 */
void micro_beacon_update(void);

/**
 * @brief Get beacon list
 * @return pointer to beacon list structure
 */
micro_beacon_list_t* micro_beacon_get_list(void);

/**
 * @brief Find beacon by address
 * @param address MAC address string
 * @return pointer to beacon or NULL if not found
 */
micro_beacon_t* micro_beacon_find(const char* address);

/**
 * @brief Get nearest beacon
 * @return pointer to nearest beacon or NULL
 */
micro_beacon_t* micro_beacon_get_nearest(void);

/**
 * @brief Check if specific beacon is in range
 * @param address MAC address string
 * @param max_distance_cm Maximum distance in centimeters
 * @return true if beacon is in range
 */
bool micro_beacon_is_in_range(const char* address, uint16_t max_distance_cm);

/**
 * @brief Get count of active beacons
 * @return number of active beacons
 */
uint8_t micro_beacon_get_active_count(void);

/**
 * @brief Clear all beacons
 */
void micro_beacon_clear_all(void);

/**
 * @brief Remove old/inactive beacons
 * @param timeout_ms Timeout in milliseconds
 */
void micro_beacon_cleanup(uint32_t timeout_ms);

/**
 * @brief Check if scanning is active
 * @return true if scanning
 */
bool micro_beacon_is_scanning(void);

/**
 * @brief Get signal strength for specific beacon
 * @param address MAC address string
 * @return RSSI value or -100 if not found
 */
int8_t micro_beacon_get_rssi(const char* address);

/**
 * @brief Get distance to specific beacon
 * @param address MAC address string
 * @return distance in centimeters or 0 if not found
 */
uint16_t micro_beacon_get_distance(const char* address);

/**
 * @brief Set beacon as target for tracking
 * @param address MAC address string
 * @return true if successful
 */
bool micro_beacon_set_target(const char* address);

/**
 * @brief Get target beacon
 * @return pointer to target beacon or NULL
 */
micro_beacon_t* micro_beacon_get_target(void);

/**
 * @brief Check if target beacon is connected
 * @return true if target is in range
 */
bool micro_beacon_is_target_connected(void);

#ifdef __cplusplus
}
#endif

// ==========================================
// MICRO BEACON MACROS
// ==========================================

#define MICRO_BEACON_INIT()                micro_beacon_init()
#define MICRO_BEACON_START()               micro_beacon_start_scan()
#define MICRO_BEACON_STOP()                micro_beacon_stop_scan()
#define MICRO_BEACON_UPDATE()              micro_beacon_update()
#define MICRO_BEACON_COUNT()               micro_beacon_get_active_count()
#define MICRO_BEACON_CLEAR()               micro_beacon_clear_all()
#define MICRO_BEACON_IS_SCANNING()         micro_beacon_is_scanning()

// Convenience macros for common operations
#define MICRO_BEACON_FOUND(addr)           (micro_beacon_find(addr) != NULL)
#define MICRO_BEACON_NEAR(addr, dist)      micro_beacon_is_in_range(addr, dist)
#define MICRO_BEACON_RSSI(addr)            micro_beacon_get_rssi(addr)
#define MICRO_BEACON_DISTANCE(addr)        micro_beacon_get_distance(addr)

// ==========================================
// CONSTANTS
// ==========================================

#define MICRO_BEACON_TIMEOUT_MS            10000   // 10 second timeout
#define MICRO_BEACON_SCAN_DURATION_MS      5000    // 5 second scan
#define MICRO_BEACON_MIN_RSSI              -90     // Minimum RSSI to consider
#define MICRO_BEACON_MAX_DISTANCE_CM       1000    // Maximum distance (10m)

// Distance categories
#define MICRO_BEACON_DISTANCE_IMMEDIATE    30      // 0-30cm
#define MICRO_BEACON_DISTANCE_NEAR         100     // 30cm-1m
#define MICRO_BEACON_DISTANCE_FAR          300     // 1-3m
#define MICRO_BEACON_DISTANCE_VERY_FAR     1000    // 3-10m

// RSSI categories
#define MICRO_BEACON_RSSI_EXCELLENT        -30     // Excellent signal
#define MICRO_BEACON_RSSI_GOOD            -50     // Good signal
#define MICRO_BEACON_RSSI_FAIR            -70     // Fair signal
#define MICRO_BEACON_RSSI_POOR            -85     // Poor signal

#endif // MICRO_BEACON_MANAGER_H 