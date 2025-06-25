/**
 * @file micro_triangulator.h
 * @brief Micro Triangulator - Lightweight Position Calculation
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Lightweight triangulation for micro-controller applications.
 * Provides simplified position calculation using beacon distances.
 */

#ifndef MICRO_TRIANGULATOR_H
#define MICRO_TRIANGULATOR_H

#include "micro_config.h"
#include <stdint.h>
#include <stdbool.h>

// ==========================================
// MICRO TRIANGULATION STRUCTURES
// ==========================================

typedef struct {
  float x, y;               // Beacon position
  float distance;           // Distance to beacon
  int8_t rssi;             // Signal strength
  bool valid;              // Valid measurement
} micro_beacon_point_t;

typedef struct {
  float x, y;               // Calculated position
  float accuracy;           // Position accuracy (meters)
  uint8_t beacon_count;     // Number of beacons used
  bool valid;               // Valid position
  uint32_t timestamp;       // Calculation timestamp
} micro_position_result_t;

typedef struct {
  micro_beacon_point_t beacons[MICRO_MAX_BEACONS];
  micro_position_result_t result;
  uint8_t valid_beacon_count;
  bool calculation_ready;
} micro_triangulator_t;

// ==========================================
// MICRO TRIANGULATION FUNCTIONS
// ==========================================

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize micro triangulator
 * @return true if successful
 */
bool micro_triangulator_init(void);

/**
 * @brief Add beacon measurement
 * @param x beacon X coordinate
 * @param y beacon Y coordinate
 * @param distance distance to beacon in meters
 * @param rssi signal strength
 * @return true if successfully added
 */
bool micro_triangulator_add_beacon(float x, float y, float distance, int8_t rssi);

/**
 * @brief Clear all beacon measurements
 */
void micro_triangulator_clear(void);

/**
 * @brief Calculate position using available beacons
 * @return true if calculation successful
 */
bool micro_triangulator_calculate(void);

/**
 * @brief Get calculated position result
 * @return pointer to position result
 */
micro_position_result_t* micro_triangulator_get_result(void);

/**
 * @brief Check if position calculation is ready
 * @return true if enough beacons for calculation
 */
bool micro_triangulator_is_ready(void);

/**
 * @brief Get number of valid beacons
 * @return count of valid beacons
 */
uint8_t micro_triangulator_get_beacon_count(void);

/**
 * @brief Simple 2-beacon position estimate (basic)
 * @param x1 beacon 1 X coordinate
 * @param y1 beacon 1 Y coordinate
 * @param d1 distance to beacon 1
 * @param x2 beacon 2 X coordinate
 * @param y2 beacon 2 Y coordinate
 * @param d2 distance to beacon 2
 * @param result_x pointer to store result X
 * @param result_y pointer to store result Y
 * @return true if calculation successful
 */
bool micro_triangulator_simple_2beacon(float x1, float y1, float d1,
                                       float x2, float y2, float d2,
                                       float* result_x, float* result_y);

/**
 * @brief Simple 3-beacon triangulation
 * @param x1 beacon 1 X coordinate
 * @param y1 beacon 1 Y coordinate
 * @param d1 distance to beacon 1
 * @param x2 beacon 2 X coordinate
 * @param y2 beacon 2 Y coordinate
 * @param d2 distance to beacon 2
 * @param x3 beacon 3 X coordinate
 * @param y3 beacon 3 Y coordinate
 * @param d3 distance to beacon 3
 * @param result_x pointer to store result X
 * @param result_y pointer to store result Y
 * @return true if calculation successful
 */
bool micro_triangulator_simple_3beacon(float x1, float y1, float d1,
                                       float x2, float y2, float d2,
                                       float x3, float y3, float d3,
                                       float* result_x, float* result_y);

/**
 * @brief Calculate distance between two points
 * @param x1 point 1 X coordinate
 * @param y1 point 1 Y coordinate
 * @param x2 point 2 X coordinate
 * @param y2 point 2 Y coordinate
 * @return distance in meters
 */
float micro_triangulator_distance(float x1, float y1, float x2, float y2);

/**
 * @brief Convert RSSI to distance estimate (simple)
 * @param rssi signal strength
 * @return estimated distance in meters
 */
float micro_triangulator_rssi_to_distance(int8_t rssi);

/**
 * @brief Get position accuracy estimate
 * @return accuracy in meters
 */
float micro_triangulator_get_accuracy(void);

/**
 * @brief Check if last calculation was valid
 * @return true if valid
 */
bool micro_triangulator_is_valid(void);

/**
 * @brief Reset triangulator state
 */
void micro_triangulator_reset(void);

#ifdef __cplusplus
}
#endif

// ==========================================
// MICRO TRIANGULATION MACROS
// ==========================================

#define MICRO_TRIANGULATOR_INIT()         micro_triangulator_init()
#define MICRO_TRIANGULATOR_ADD(x,y,d,r)   micro_triangulator_add_beacon(x,y,d,r)
#define MICRO_TRIANGULATOR_CLEAR()        micro_triangulator_clear()
#define MICRO_TRIANGULATOR_CALC()         micro_triangulator_calculate()
#define MICRO_TRIANGULATOR_READY()        micro_triangulator_is_ready()
#define MICRO_TRIANGULATOR_VALID()        micro_triangulator_is_valid()
#define MICRO_TRIANGULATOR_COUNT()        micro_triangulator_get_beacon_count()
#define MICRO_TRIANGULATOR_RESULT()       micro_triangulator_get_result()
#define MICRO_TRIANGULATOR_RESET()        micro_triangulator_reset()

// Distance calculation macros
#define MICRO_DISTANCE(x1,y1,x2,y2)       micro_triangulator_distance(x1,y1,x2,y2)
#define MICRO_RSSI_TO_DIST(rssi)          micro_triangulator_rssi_to_distance(rssi)

// ==========================================
// CONSTANTS
// ==========================================

#define MICRO_TRIANGULATOR_MIN_BEACONS    2      // Minimum beacons for calculation
#define MICRO_TRIANGULATOR_OPTIMAL_BEACONS 3     // Optimal number of beacons
#define MICRO_TRIANGULATOR_MAX_DISTANCE   1000.0f // Maximum reasonable distance (m)
#define MICRO_TRIANGULATOR_MIN_DISTANCE   0.1f   // Minimum distance (10cm)

// RSSI to distance calculation constants (simple model)
#define MICRO_RSSI_REF_DISTANCE          1.0f    // Reference distance (1 meter)
#define MICRO_RSSI_REF_POWER            -59      // RSSI at reference distance
#define MICRO_RSSI_PATH_LOSS            2.0f     // Path loss exponent

// Accuracy thresholds
#define MICRO_ACCURACY_EXCELLENT         1.0f    // Excellent accuracy (1m)
#define MICRO_ACCURACY_GOOD              3.0f    // Good accuracy (3m)
#define MICRO_ACCURACY_FAIR              5.0f    // Fair accuracy (5m)
#define MICRO_ACCURACY_POOR              10.0f   // Poor accuracy (10m)

// Position validation
#define MICRO_POSITION_MAX_X             1000.0f  // Maximum X coordinate
#define MICRO_POSITION_MAX_Y             1000.0f  // Maximum Y coordinate
#define MICRO_POSITION_MIN_X            -1000.0f  // Minimum X coordinate
#define MICRO_POSITION_MIN_Y            -1000.0f  // Minimum Y coordinate

#endif // MICRO_TRIANGULATOR_H 