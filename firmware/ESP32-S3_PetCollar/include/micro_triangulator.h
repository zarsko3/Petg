#ifndef MICRO_TRIANGULATOR_H
#define MICRO_TRIANGULATOR_H

#include <Arduino.h>
#include <vector>
#include <utility>
#include "micro_system_state.h"

// Triangulation constants
#define MIN_BEACONS_FOR_TRIANGULATION 3
#define RSSI_TO_DISTANCE_FACTOR -69.0
#define RSSI_TO_DISTANCE_EXPONENT 2.5
#define MAX_TRIANGULATION_DISTANCE 20.0
#define POSITION_UPDATE_INTERVAL 1000
#define POSITION_HISTORY_SIZE 5

// Function declarations
void updatePosition();
bool getPosition(float& x, float& y, float& confidence);
float calculateDistance(int rssi);
void updateTriangulation(const String& beaconName, float distance);

#endif // MICRO_TRIANGULATOR_H 