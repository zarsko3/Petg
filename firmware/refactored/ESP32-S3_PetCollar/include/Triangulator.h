#ifndef TRIANGULATOR_H
#define TRIANGULATOR_H

/**
 * @file Triangulator.h
 * @brief Advanced triangulation system for ESP32-S3 Pet Collar position estimation
 * @version 3.1.0
 * @date 2024
 * 
 * This class provides sophisticated position estimation using:
 * - Multi-beacon triangulation algorithms
 * - RSSI-based distance estimation
 * - Position filtering and smoothing
 * - Confidence calculation and error handling
 * - Support for various beacon positioning methods
 */

#include <Arduino.h>
#include <vector>
#include <cmath>
#include "ESP32_S3_Config.h"
#include "MicroConfig.h"
#include "BeaconManager.h"

// ==========================================
// TRIANGULATION DEFINITIONS
// ==========================================

/**
 * @brief Triangulation methods
 */
enum class TriangulationMethod : uint8_t {
    LEAST_SQUARES = 0,      ///< Least squares optimization
    WEIGHTED_CENTROID,      ///< Weighted centroid calculation
    TRILATERATION,          ///< Traditional trilateration
    KALMAN_FILTER,          ///< Kalman filter estimation
    HYBRID                  ///< Hybrid approach combining methods
};

/**
 * @brief Beacon reference point for triangulation
 */
struct BeaconReference {
    String beaconId;        ///< Beacon identifier
    String macAddress;      ///< Beacon MAC address
    Point2D position;       ///< Known beacon position
    float transmitPower;    ///< Beacon transmit power (dBm)
    float pathLossExponent; ///< Environmental path loss exponent
    bool isActive;          ///< Beacon is active and available
    bool isCalibrated;      ///< Position has been calibrated
    float accuracy;         ///< Position accuracy estimate (meters)
    unsigned long lastSeen; ///< Last detection timestamp
    
    BeaconReference() :
        transmitPower(-59.0f),
        pathLossExponent(2.0f),
        isActive(false),
        isCalibrated(false),
        accuracy(1.0f),
        lastSeen(0) {}
    
    BeaconReference(const String& id, const Point2D& pos, float txPower = -59.0f) :
        beaconId(id),
        position(pos),
        transmitPower(txPower),
        pathLossExponent(2.0f),
        isActive(true),
        isCalibrated(true),
        accuracy(1.0f),
        lastSeen(millis()) {}
    
    /**
     * @brief Calculate distance from RSSI using path loss model
     * @param rssi Received signal strength (dBm)
     * @return Estimated distance in meters
     */
    float calculateDistance(int32_t rssi) const {
        if (rssi >= 0) return 0.0f;
        
        // Path loss formula: Distance = 10^((TxPower - RSSI) / (10 * n))
        float distance = pow(10.0f, (transmitPower - rssi) / (10.0f * pathLossExponent));
        return constrain(distance, 0.1f, 100.0f);
    }
    
    /**
     * @brief Check if beacon reference is valid for triangulation
     * @param maxAgeMs Maximum age for validity
     * @return true if beacon is valid
     */
    bool isValidForTriangulation(uint32_t maxAgeMs = 30000) const {
        return isActive && isCalibrated && 
               (millis() - lastSeen) < maxAgeMs;
    }
};

/**
 * @brief Position measurement with metadata
 */
struct PositionMeasurement {
    Point2D position;           ///< Estimated position
    float confidence;           ///< Position confidence (0.0-1.0)
    float accuracy;             ///< Estimated accuracy in meters
    uint8_t beaconCount;        ///< Number of beacons used
    TriangulationMethod method; ///< Method used for calculation
    unsigned long timestamp;    ///< Measurement timestamp
    float dilutionOfPrecision;  ///< Geometric dilution of precision
    
    PositionMeasurement() :
        confidence(0.0f),
        accuracy(0.0f),
        beaconCount(0),
        method(TriangulationMethod::LEAST_SQUARES),
        timestamp(0),
        dilutionOfPrecision(999.0f) {}
    
    /**
     * @brief Check if measurement is valid
     * @param maxAgeMs Maximum age for validity
     * @return true if measurement is valid
     */
    bool isValid(uint32_t maxAgeMs = 10000) const {
        return confidence > 0.0f && 
               beaconCount >= 3 && 
               (millis() - timestamp) < maxAgeMs;
    }
    
    /**
     * @brief Get quality score (0.0-1.0)
     * @return Quality score based on confidence and accuracy
     */
    float getQualityScore() const {
        if (accuracy <= 0.0f) return 0.0f;
        
        float accuracyScore = 1.0f / (1.0f + accuracy);
        float beaconScore = min(beaconCount / 5.0f, 1.0f);
        float dopScore = 1.0f / (1.0f + dilutionOfPrecision);
        
        return (confidence + accuracyScore + beaconScore + dopScore) / 4.0f;
    }
};

/**
 * @brief Position history for filtering and smoothing
 */
struct PositionHistory {
    std::vector<PositionMeasurement> measurements;
    uint8_t maxHistorySize;
    Point2D filteredPosition;
    float filteredConfidence;
    unsigned long lastUpdate;
    
    PositionHistory(uint8_t maxSize = 10) :
        maxHistorySize(maxSize),
        filteredConfidence(0.0f),
        lastUpdate(0) {}
    
    void addMeasurement(const PositionMeasurement& measurement) {
        measurements.push_back(measurement);
        
        // Remove old measurements
        while (measurements.size() > maxHistorySize) {
            measurements.erase(measurements.begin());
        }
        
        updateFilteredPosition();
        lastUpdate = millis();
    }
    
    void updateFilteredPosition() {
        if (measurements.empty()) {
            filteredConfidence = 0.0f;
            return;
        }
        
        // Weighted average based on quality scores
        float totalWeight = 0.0f;
        float weightedX = 0.0f;
        float weightedY = 0.0f;
        float totalConfidence = 0.0f;
        
        for (const auto& measurement : measurements) {
            float weight = measurement.getQualityScore();
            totalWeight += weight;
            weightedX += measurement.position.x * weight;
            weightedY += measurement.position.y * weight;
            totalConfidence += measurement.confidence * weight;
        }
        
        if (totalWeight > 0.0f) {
            filteredPosition.x = weightedX / totalWeight;
            filteredPosition.y = weightedY / totalWeight;
            filteredConfidence = totalConfidence / totalWeight;
        }
    }
    
    void clear() {
        measurements.clear();
        filteredConfidence = 0.0f;
    }
};

// ==========================================
// MAIN TRIANGULATOR CLASS
// ==========================================

/**
 * @brief Advanced triangulation engine
 */
class Triangulator {
private:
    // Beacon references
    std::vector<BeaconReference> m_beaconReferences;
    
    // Position tracking
    PositionHistory m_positionHistory;
    PositionMeasurement m_lastMeasurement;
    
    // Configuration
    TriangulationMethod m_primaryMethod;
    TriangulationMethod m_fallbackMethod;
    uint8_t m_minBeaconsRequired;
    float m_maxDistanceThreshold;
    float m_minConfidenceThreshold;
    
    // Filtering parameters
    float m_movementThreshold;      // Minimum movement to accept new position
    float m_smoothingFactor;        // Position smoothing factor (0.0-1.0)
    bool m_enableFiltering;         // Enable position filtering
    bool m_enableSmoothing;         // Enable position smoothing
    
    // State tracking
    bool m_isInitialized;
    unsigned long m_lastTriangulation;
    uint32_t m_successfulTriangulations;
    uint32_t m_failedTriangulations;
    
    /**
     * @brief Perform least squares triangulation
     * @param beacons Vector of beacon measurements
     * @param position Output position
     * @param confidence Output confidence
     * @return true if successful
     */
    bool triangulateByLeastSquares(const std::vector<std::pair<BeaconReference*, float>>& beacons,
                                  Point2D& position, float& confidence);
    
    /**
     * @brief Perform weighted centroid calculation
     * @param beacons Vector of beacon measurements
     * @param position Output position
     * @param confidence Output confidence
     * @return true if successful
     */
    bool triangulateByWeightedCentroid(const std::vector<std::pair<BeaconReference*, float>>& beacons,
                                      Point2D& position, float& confidence);
    
    /**
     * @brief Perform traditional trilateration
     * @param beacons Vector of beacon measurements
     * @param position Output position
     * @param confidence Output confidence
     * @return true if successful
     */
    bool triangulateByTrilateration(const std::vector<std::pair<BeaconReference*, float>>& beacons,
                                   Point2D& position, float& confidence);
    
    /**
     * @brief Calculate geometric dilution of precision
     * @param beacons Vector of beacon positions
     * @return DOP value
     */
    float calculateDOP(const std::vector<BeaconReference*>& beacons) const;
    
    /**
     * @brief Validate triangulation result
     * @param position Calculated position
     * @param beacons Beacon measurements used
     * @return true if result is valid
     */
    bool validateTriangulationResult(const Point2D& position,
                                    const std::vector<std::pair<BeaconReference*, float>>& beacons) const;
    
    /**
     * @brief Apply position filtering
     * @param newPosition New position measurement
     * @param filteredPosition Output filtered position
     * @return true if position was filtered
     */
    bool applyPositionFilter(const Point2D& newPosition, Point2D& filteredPosition);
    
    /**
     * @brief Find beacon reference by ID
     * @param beaconId Beacon identifier
     * @return Pointer to beacon reference or nullptr
     */
    BeaconReference* findBeaconReference(const String& beaconId);

public:
    /**
     * @brief Constructor
     */
    Triangulator() :
        m_positionHistory(MAX_RECENT_POSITIONS),
        m_primaryMethod(TriangulationMethod::LEAST_SQUARES),
        m_fallbackMethod(TriangulationMethod::WEIGHTED_CENTROID),
        m_minBeaconsRequired(3),
        m_maxDistanceThreshold(50.0f),
        m_minConfidenceThreshold(0.3f),
        m_movementThreshold(0.5f),
        m_smoothingFactor(0.7f),
        m_enableFiltering(true),
        m_enableSmoothing(true),
        m_isInitialized(false),
        m_lastTriangulation(0),
        m_successfulTriangulations(0),
        m_failedTriangulations(0) {}
    
    /**
     * @brief Initialize triangulator
     * @return true if initialization successful
     */
    bool begin();
    
    /**
     * @brief Add beacon reference point
     * @param beaconId Beacon identifier
     * @param position Known beacon position
     * @param transmitPower Beacon transmit power (dBm)
     * @param pathLossExponent Environmental path loss exponent
     * @return true if beacon added successfully
     */
    bool addBeaconReference(const String& beaconId,
                           const Point2D& position,
                           float transmitPower = -59.0f,
                           float pathLossExponent = 2.0f);
    
    /**
     * @brief Remove beacon reference
     * @param beaconId Beacon identifier
     * @return true if beacon removed successfully
     */
    bool removeBeaconReference(const String& beaconId);
    
    /**
     * @brief Update beacon reference position
     * @param beaconId Beacon identifier
     * @param position New position
     * @return true if position updated successfully
     */
    bool updateBeaconPosition(const String& beaconId, const Point2D& position);
    
    /**
     * @brief Calculate position from beacon measurements
     * @param beaconMeasurements Map of beacon ID to RSSI values
     * @param result Output position measurement
     * @return true if triangulation successful
     */
    bool triangulatePosition(const std::map<String, int32_t>& beaconMeasurements,
                            PositionMeasurement& result);
    
    /**
     * @brief Calculate position from BeaconManager data
     * @param beaconManager Beacon manager instance
     * @param result Output position measurement
     * @return true if triangulation successful
     */
    bool triangulateFromBeaconManager(const BeaconManager& beaconManager,
                                     PositionMeasurement& result);
    
    /**
     * @brief Get last successful position measurement
     * @return Last position measurement
     */
    const PositionMeasurement& getLastPosition() const {
        return m_lastMeasurement;
    }
    
    /**
     * @brief Get filtered position from history
     * @return Filtered position and confidence
     */
    std::pair<Point2D, float> getFilteredPosition() const {
        return {m_positionHistory.filteredPosition, m_positionHistory.filteredConfidence};
    }
    
    /**
     * @brief Get all beacon references
     * @return Vector of beacon references
     */
    const std::vector<BeaconReference>& getBeaconReferences() const {
        return m_beaconReferences;
    }
    
    /**
     * @brief Get active beacon references
     * @return Vector of active beacon references
     */
    std::vector<BeaconReference*> getActiveBeaconReferences();
    
    /**
     * @brief Check if triangulation is possible
     * @param beaconMeasurements Map of beacon measurements
     * @return true if triangulation is possible
     */
    bool canTriangulate(const std::map<String, int32_t>& beaconMeasurements) const;
    
    /**
     * @brief Set triangulation method
     * @param primary Primary triangulation method
     * @param fallback Fallback method if primary fails
     */
    void setTriangulationMethod(TriangulationMethod primary,
                               TriangulationMethod fallback = TriangulationMethod::WEIGHTED_CENTROID);
    
    /**
     * @brief Set minimum beacons required
     * @param minBeacons Minimum number of beacons (3-8)
     */
    void setMinimumBeacons(uint8_t minBeacons) {
        m_minBeaconsRequired = constrain(minBeacons, 3, 8);
    }
    
    /**
     * @brief Set filtering parameters
     * @param enableFiltering Enable position filtering
     * @param enableSmoothing Enable position smoothing
     * @param movementThreshold Minimum movement threshold
     * @param smoothingFactor Smoothing factor (0.0-1.0)
     */
    void setFilteringParameters(bool enableFiltering,
                               bool enableSmoothing,
                               float movementThreshold = 0.5f,
                               float smoothingFactor = 0.7f);
    
    /**
     * @brief Clear position history
     */
    void clearHistory() {
        m_positionHistory.clear();
    }
    
    /**
     * @brief Reset triangulation statistics
     */
    void resetStatistics() {
        m_successfulTriangulations = 0;
        m_failedTriangulations = 0;
    }
    
    /**
     * @brief Get triangulation success rate
     * @return Success rate as percentage (0-100)
     */
    float getSuccessRate() const {
        uint32_t total = m_successfulTriangulations + m_failedTriangulations;
        return total > 0 ? (m_successfulTriangulations * 100.0f) / total : 0.0f;
    }
    
    /**
     * @brief Get triangulator status as JSON
     * @return JSON status string
     */
    String getStatusJson() const;
    
    /**
     * @brief Get beacon references as JSON
     * @return JSON beacon references string
     */
    String getBeaconReferencesJson() const;
    
    /**
     * @brief Load beacon references from JSON
     * @param jsonConfig JSON configuration string
     * @return true if loaded successfully
     */
    bool loadBeaconReferencesFromJson(const String& jsonConfig);
    
    /**
     * @brief Save beacon references to JSON
     * @return JSON configuration string
     */
    String saveBeaconReferencesToJson() const;
    
    /**
     * @brief Calibrate beacon position using known reference points
     * @param beaconId Beacon to calibrate
     * @param referencePositions Known positions where measurements were taken
     * @param rssiMeasurements RSSI measurements at reference positions
     * @return true if calibration successful
     */
    bool calibrateBeaconPosition(const String& beaconId,
                                const std::vector<Point2D>& referencePositions,
                                const std::vector<int32_t>& rssiMeasurements);
    
    /**
     * @brief Check if triangulator is ready for operation
     * @return true if ready
     */
    bool isReady() const {
        return m_isInitialized && getActiveBeaconReferences().size() >= m_minBeaconsRequired;
    }
};

#endif // TRIANGULATOR_H 