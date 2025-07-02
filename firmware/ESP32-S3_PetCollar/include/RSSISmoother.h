#ifndef RSSI_SMOOTHER_H
#define RSSI_SMOOTHER_H

/**
 * @file RSSISmoother.h
 * @brief Packet-Level RSSI Smoothing System for ESP32-S3 Pet Collar
 * @version 1.0.0
 * @date 2024
 * 
 * Provides robust RSSI smoothing by:
 * - Collecting N advertising packets before distance conversion
 * - Quality filtering (CRC errors, weak signals)
 * - Median or trimmed mean aggregation
 * - Low-latency processing (≤500ms)
 * - Per-beacon tracking and management
 * 
 * UNIT TESTING:
 * The system includes comprehensive unit tests accessible via:
 * - Serial command: "rssi-test" - Runs all test scenarios
 * - Function call: runRSSISmootherTests() - Direct test execution
 * 
 * Test scenarios validate:
 * 1. Normal conditions (-60 dBm base, ±10 dB spikes)
 * 2. High noise environment (-75 dBm base, ±15 dB spikes)
 * 3. Weak signal conditions (-90 dBm base, ±8 dB spikes)
 * 4. Strong signal conditions (-40 dBm base, ±12 dB spikes)
 * 
 * Success criteria: Smoothed output deviates ≤2 dB from true baseline
 * 
 * CONFIGURATION:
 * Key parameters in ESP32_S3_Config.h:
 * - BLE_RSSI_PACKET_COUNT: Number of packets to collect (default: 10)
 * - BLE_RSSI_QUALITY_THRESHOLD: Minimum RSSI for acceptance (default: -95 dBm)
 * - BLE_RSSI_MAX_LATENCY_MS: Maximum processing latency (default: 500ms)
 * - BLE_RSSI_SMOOTHING_METHOD: 0=Median, 1=Trimmed Mean (default: 0)
 * 
 * USAGE EXAMPLE:
 * @code
 * // Add raw RSSI packet
 * bool accepted = globalRSSISmoother.addRSSIPacket("AA:BB:CC:DD:EE:FF", -65, true);
 * 
 * // Check if smoothed data is ready
 * if (globalRSSISmoother.hasSmoothedData("AA:BB:CC:DD:EE:FF")) {
 *     int16_t smoothedRssi = globalRSSISmoother.getSmoothedRssi("AA:BB:CC:DD:EE:FF");
 *     // Use smoothedRssi for distance calculation
 * }
 * @endcode
 */

#include <Arduino.h>
#include "ESP32_S3_Config.h"

// ==========================================
// RSSI PACKET DATA STRUCTURES
// ==========================================

/**
 * @brief Individual RSSI packet data
 */
struct RSSIPacket {
    int16_t rssi;                  ///< RSSI value in dBm
    uint32_t timestamp;            ///< Packet timestamp (millis())
    bool crcValid;                 ///< CRC validation status
};

/**
 * @brief RSSI smoothing statistics
 */
struct RSSIStats {
    int16_t smoothedRssi;          ///< Final smoothed RSSI value
    uint8_t validPackets;          ///< Number of valid packets used
    uint8_t totalPackets;          ///< Total packets collected
    uint8_t discardedPackets;      ///< Packets discarded due to quality
    uint32_t latencyMs;            ///< Processing latency
    uint32_t lastUpdate;           ///< Last update timestamp
};

/**
 * @brief Temporal filter state for Kalman/IIR filtering
 */
struct TemporalFilterState {
    // Common state
    bool initialized;              ///< Filter has been initialized
    float filteredRssi;           ///< Current filtered RSSI value
    uint32_t lastUpdateTime;      ///< Last filter update timestamp
    uint16_t updateCount;         ///< Number of filter updates
    
    // IIR filter state
    float iirAlpha;               ///< IIR alpha coefficient (runtime adjustable)
    
    // Kalman filter state
    float kalmanState;            ///< Kalman filter state estimate
    float kalmanCovariance;       ///< Kalman error covariance
    float kalmanQ;                ///< Process noise covariance (runtime adjustable)
    float kalmanR;                ///< Measurement noise covariance (runtime adjustable)
    
    // Performance metrics
    float rawRssiSum;             ///< Sum of raw RSSI values (for RMS calculation)
    float smoothedRssiSum;        ///< Sum of smoothed RSSI values
    float filteredRssiSum;        ///< Sum of filtered RSSI values
    float squaredErrorSum;        ///< Sum of squared errors for RMS calculation
};

/**
 * @brief Comprehensive filter statistics
 */
struct FilterStats {
    uint16_t updateCount;         ///< Total filter updates
    float rmsError;               ///< RMS error vs raw RSSI
    float variance;               ///< RSSI variance
    float convergenceTime;        ///< Time to convergence (ms)
    float avgProcessingTime;      ///< Average processing time per update (ms)
    bool converged;               ///< Filter has converged
};

/**
 * @brief Simple beacon RSSI data for embedded systems
 */
struct BeaconRSSIData {
    char mac[18];                           ///< MAC address (xx:xx:xx:xx:xx:xx format)
    RSSIPacket packets[BLE_RSSI_MAX_VALID_PACKETS];  ///< Packet buffer
    uint8_t packetCount;                    ///< Current number of packets
    uint32_t firstPacketTime;               ///< First packet timestamp
    uint32_t lastPacketTime;                ///< Last packet timestamp
    RSSIStats stats;                        ///< Smoothing statistics
    TemporalFilterState filterState;        ///< Temporal filter state (Task 2)
    bool active;                            ///< Beacon is active
};
    
    // ==========================================
// SIMPLE RSSI SMOOTHER FUNCTIONS
// ==========================================

/**
 * @brief Simple RSSI Smoother for embedded systems
 */
class SimpleRSSISmoother {
private:
    BeaconRSSIData beacons[BLE_RSSI_MAX_BEACONS];
    uint8_t beaconCount;
    uint32_t lastCleanup;
    uint32_t totalPacketsProcessed;
    uint32_t totalPacketsDiscarded;
    
    // Temporal filtering runtime parameters
    float runtimeIIRAlpha;
    float runtimeKalmanQ;
    float runtimeKalmanR;
    uint32_t globalLogCount;
    
public:
    SimpleRSSISmoother();
    
    // Original RSSI smoothing interface
    bool addRSSIPacket(const char* beaconMac, int16_t rssi, bool crcValid = true);
    int16_t getSmoothedRssi(const char* beaconMac);
    bool hasSmoothedData(const char* beaconMac);
    RSSIStats getStats(const char* beaconMac);
    void clearBeacon(const char* beaconMac);
    void clearAll();
    void getGlobalStats(uint32_t& processed, uint32_t& discarded, uint8_t& activeBeacons);
    
    // Task 2: Temporal filtering interface
    float getFilteredRssi(const char* beaconMac);
    float getFilteredDistance(const char* beaconMac);
    bool hasFilteredData(const char* beaconMac);
    FilterStats getFilterStats(const char* beaconMac);
    
    // Runtime parameter adjustment
    void setIIRAlpha(float alpha);
    void setKalmanParameters(float processNoise, float measurementNoise);
    float getIIRAlpha() const { return runtimeIIRAlpha; }
    float getKalmanQ() const { return runtimeKalmanQ; }
    float getKalmanR() const { return runtimeKalmanR; }
    
    // Filter management
    void resetFilter(const char* beaconMac);
    void resetAllFilters();
    bool isFilterConverged(const char* beaconMac);
    
private:
    // Original methods
    int8_t findBeaconIndex(const char* mac);
    int8_t findFreeSlot();
    bool addPacketToBeacon(BeaconRSSIData* beacon, int16_t rssi, bool crcValid);
    int16_t calculateMedian(BeaconRSSIData* beacon);
    int16_t calculateTrimmedMean(BeaconRSSIData* beacon);
    int16_t getQuickAverage(BeaconRSSIData* beacon);
    void cleanupStaleData();
    void sortArray(int16_t* arr, uint8_t size);
    
    // Task 2: Temporal filtering methods
    bool updateTemporalFilter(BeaconRSSIData* beacon, int16_t rawRssi, int16_t smoothedRssi);
    float applyIIRFilter(TemporalFilterState* state, float measurement);
    float applyKalmanFilter(TemporalFilterState* state, float measurement);
    void initializeFilter(TemporalFilterState* state);
    float calculateDistance(float rssi);
    bool shouldLogUpdate(BeaconRSSIData* beacon);
    void logFilterUpdate(BeaconRSSIData* beacon, int16_t rawRssi, int16_t smoothedRssi);
    FilterStats calculateFilterStats(const TemporalFilterState* state);
};

// ==========================================
// GLOBAL RSSI SMOOTHER INSTANCE
// ==========================================

// Global instance for easy access throughout the system
extern SimpleRSSISmoother globalRSSISmoother;

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

// Utility functions for easier integration
String formatRSSIStats(const RSSIStats& stats);
String formatFilterStats(const FilterStats& stats);
void printRSSISmootherStats();
void printTemporalFilterStats();
int16_t testRSSISmoothing(int16_t baseRssi, int16_t spikeMagnitude, uint8_t packetCount);
void runRSSISmootherTests();

// Task 2: Temporal filtering utilities
float testTemporalFilter(const char* testMac, const int16_t* rssiTrace, uint16_t traceLength);
void runTemporalFilterTests();
bool validateFilterPerformance(const char* beaconMac, float targetRMSReduction);

#endif // RSSI_SMOOTHER_H
