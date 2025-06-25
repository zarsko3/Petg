/**
 * @file TriangulationManager.h
 * @brief Advanced Triangulation and Positioning System - Refactored
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Advanced triangulation system for precise indoor positioning using BLE beacons.
 * Implements multiple positioning algorithms with confidence scoring and position
 * filtering for robust location tracking.
 * 
 * Features:
 * - Multi-beacon triangulation using least squares
 * - Weighted trilateration with confidence scoring
 * - Kalman filtering for position smoothing
 * - Position history and trajectory analysis
 * - Dynamic beacon weight adjustment
 * - Outlier detection and rejection
 */

#ifndef TRIANGULATION_MANAGER_H
#define TRIANGULATION_MANAGER_H

#include <Arduino.h>
#include <vector>
#include <cmath>
#include <algorithm>
#include <functional>
#include "PetCollarConfig.h"
#include "BeaconManager.h"
#include "Utils.h"

// ==========================================
// TRIANGULATION CONSTANTS
// ==========================================

#define MIN_BEACONS_FOR_TRIANGULATION   3       // Minimum beacons for position calculation
#define MAX_TRIANGULATION_DISTANCE      50.0f   // Maximum useful distance (meters)
#define POSITION_CONFIDENCE_THRESHOLD   0.6f    // Minimum confidence for valid position
#define POSITION_HISTORY_SIZE           20      // Number of positions to keep in history
#define BEACON_TIMEOUT_MS               10000   // Beacon timeout (10 seconds)
#define POSITION_UPDATE_INTERVAL        1000    // Position update interval (1 second)
#define KALMAN_PROCESS_NOISE            0.1f    // Process noise for Kalman filter
#define KALMAN_MEASUREMENT_NOISE        1.0f    // Measurement noise for Kalman filter

// RSSI to distance conversion parameters (device-specific calibration)
#define RSSI_REF_POWER                  -59.0f  // RSSI at 1 meter distance
#define PATH_LOSS_EXPONENT              2.0f    // Free space path loss exponent
#define ENVIRONMENTAL_FACTOR            1.2f    // Environmental adjustment factor

// ==========================================
// POSITION STRUCTURES
// ==========================================

/**
 * @brief 2D position structure
 */
struct Position2D {
    float x;
    float y;
    float confidence;
    unsigned long timestamp;
    
    /**
     * @brief Default constructor
     */
    Position2D() : x(0.0f), y(0.0f), confidence(0.0f), timestamp(0) {}
    
    /**
     * @brief Constructor with values
     */
    Position2D(float posX, float posY, float conf = 1.0f, unsigned long time = 0) :
        x(posX), y(posY), confidence(conf), timestamp(time ? time : millis()) {}
    
    /**
     * @brief Calculate distance to another position
     */
    float distanceTo(const Position2D& other) const {
        float dx = x - other.x;
        float dy = y - other.y;
        return sqrt(dx * dx + dy * dy);
    }
    
    /**
     * @brief Check if position is valid
     */
    bool isValid() const {
        return confidence >= POSITION_CONFIDENCE_THRESHOLD && 
               !isnan(x) && !isnan(y) && 
               abs(x) < 1000.0f && abs(y) < 1000.0f; // Sanity check
    }
};

/**
 * @brief Beacon position with coordinates
 */
struct BeaconPosition {
    String name;
    String location;
    float x;
    float y;
    float z;
    bool active;
    unsigned long lastSeen;
    
    /**
     * @brief Default constructor
     */
    BeaconPosition() : x(0.0f), y(0.0f), z(0.0f), active(false), lastSeen(0) {}
    
    /**
     * @brief Constructor with values
     */
    BeaconPosition(const String& beaconName, const String& loc, float posX, float posY, float posZ = 0.0f) :
        name(beaconName), location(loc), x(posX), y(posY), z(posZ), active(true), lastSeen(millis()) {}
};

/**
 * @brief Kalman filter state for position smoothing
 */
struct KalmanState {
    float x, y;           // Position
    float vx, vy;         // Velocity
    float px, py;         // Position uncertainty
    float pvx, pvy;       // Velocity uncertainty
    unsigned long lastUpdate;
    
    /**
     * @brief Default constructor
     */
    KalmanState() :
        x(0.0f), y(0.0f), vx(0.0f), vy(0.0f),
        px(1.0f), py(1.0f), pvx(1.0f), pvy(1.0f),
        lastUpdate(0) {}
};

// ==========================================
// TRIANGULATION MANAGER CLASS
// ==========================================

/**
 * @brief Advanced triangulation manager for precise positioning
 * 
 * Implements multiple positioning algorithms with confidence scoring,
 * position filtering, and trajectory analysis for robust indoor positioning.
 */
class TriangulationManager {
public:
    // Callback function types
    typedef std::function<void(const Position2D&)> PositionUpdateCallback;
    typedef std::function<void(float)> ConfidenceUpdateCallback;

private:
    // Beacon management
    std::vector<BeaconPosition> knownBeacons_;
    std::vector<Beacon> activeBeacons_;
    
    // Position tracking
    std::vector<Position2D> positionHistory_;
    Position2D currentPosition_;
    Position2D lastValidPosition_;
    KalmanState kalmanFilter_;
    
    // State management
    bool initialized_;
    bool positionValid_;
    float currentConfidence_;
    unsigned long lastTriangulation_;
    unsigned long lastPositionUpdate_;
    
    // Callbacks
    PositionUpdateCallback onPositionUpdate_;
    ConfidenceUpdateCallback onConfidenceUpdate_;
    
    // Configuration
    bool enableKalmanFilter_;
    bool enableOutlierDetection_;
    float minBeaconDistance_;
    float maxBeaconDistance_;
    
    /**
     * @brief Initialize default beacon positions
     */
    void initializeDefaultBeacons() {
        // Add default beacon positions (can be loaded from config)
        knownBeacons_.clear();
        
        // Example room layout (adjust for your setup)
        knownBeacons_.push_back(BeaconPosition("Living Room", "Living Room", 0.0f, 0.0f));
        knownBeacons_.push_back(BeaconPosition("Kitchen", "Kitchen", 5.0f, 0.0f));
        knownBeacons_.push_back(BeaconPosition("Bedroom", "Bedroom", 0.0f, 4.0f));
        knownBeacons_.push_back(BeaconPosition("Office", "Office", 5.0f, 4.0f));
        
        DEBUG_PRINTF("TriangulationManager: Initialized %d default beacons\n", knownBeacons_.size());
    }
    
    /**
     * @brief Convert RSSI to distance using calibrated model
     */
    float rssiToDistance(int rssi) const {
        if (rssi == 0) return 999.0f;
        
        // Improved RSSI to distance conversion
        float ratio = (float)(RSSI_REF_POWER - rssi);
        float distance = pow(10.0f, ratio / (10.0f * PATH_LOSS_EXPONENT)) * ENVIRONMENTAL_FACTOR;
        
        // Apply bounds
        distance = constrain(distance, minBeaconDistance_, maxBeaconDistance_);
        
        return distance;
    }
    
    /**
     * @brief Find beacon position by name
     */
    BeaconPosition* findBeaconPosition(const String& name) {
        for (auto& beacon : knownBeacons_) {
            if (beacon.name == name || beacon.location == name) {
                return &beacon;
            }
        }
        return nullptr;
    }
    
    /**
     * @brief Calculate position using least squares trilateration
     */
    Position2D calculateLeastSquaresPosition(const std::vector<Beacon>& beacons) {
        if (beacons.size() < MIN_BEACONS_FOR_TRIANGULATION) {
            return Position2D();
        }
        
        // Prepare matrices for least squares solution
        std::vector<std::vector<float>> A;
        std::vector<float> b;
        
        // Use first beacon as reference
        BeaconPosition* refBeacon = findBeaconPosition(beacons[0].name);
        if (!refBeacon) return Position2D();
        
        for (size_t i = 1; i < beacons.size() && i < 6; i++) { // Limit to 6 beacons for performance
            BeaconPosition* beacon = findBeaconPosition(beacons[i].name);
            if (!beacon) continue;
            
            float dx = beacon->x - refBeacon->x;
            float dy = beacon->y - refBeacon->y;
            float dr2 = beacons[0].distance * beacons[0].distance - beacons[i].distance * beacons[i].distance;
            float dxy2 = beacon->x * beacon->x + beacon->y * beacon->y - refBeacon->x * refBeacon->x - refBeacon->y * refBeacon->y;
            
            A.push_back({2 * dx, 2 * dy});
            b.push_back(dr2 + dxy2);
        }
        
        if (A.size() < 2) return Position2D();
        
        // Solve using normal equation (A^T * A)^-1 * A^T * b
        Position2D result = solveLeastSquares(A, b);
        
        // Calculate confidence based on residual error
        float residualError = calculateResidualError(result, beacons);
        float confidence = 1.0f / (1.0f + residualError);
        result.confidence = confidence;
        
        return result;
    }
    
    /**
     * @brief Solve least squares system
     */
    Position2D solveLeastSquares(const std::vector<std::vector<float>>& A, const std::vector<float>& b) {
        if (A.size() < 2) return Position2D();
        
        // Calculate A^T * A (2x2 matrix)
        float ata00 = 0, ata01 = 0, ata11 = 0;
        float atb0 = 0, atb1 = 0;
        
        for (size_t i = 0; i < A.size(); i++) {
            ata00 += A[i][0] * A[i][0];
            ata01 += A[i][0] * A[i][1];
            ata11 += A[i][1] * A[i][1];
            atb0 += A[i][0] * b[i];
            atb1 += A[i][1] * b[i];
        }
        
        // Calculate determinant and inverse
        float det = ata00 * ata11 - ata01 * ata01;
        if (abs(det) < 1e-6) return Position2D(); // Singular matrix
        
        float invDet = 1.0f / det;
        float x = invDet * (ata11 * atb0 - ata01 * atb1);
        float y = invDet * (ata00 * atb1 - ata01 * atb0);
        
        return Position2D(x, y, 1.0f);
    }
    
    /**
     * @brief Calculate residual error for confidence estimation
     */
    float calculateResidualError(const Position2D& position, const std::vector<Beacon>& beacons) {
        float totalError = 0.0f;
        int validBeacons = 0;
        
        for (const auto& beacon : beacons) {
            BeaconPosition* beaconPos = findBeaconPosition(beacon.name);
            if (!beaconPos) continue;
            
            float expectedDistance = sqrt(pow(position.x - beaconPos->x, 2) + pow(position.y - beaconPos->y, 2));
            float error = abs(expectedDistance - beacon.distance);
            totalError += error;
            validBeacons++;
        }
        
        return validBeacons > 0 ? totalError / validBeacons : 999.0f;
    }
    
    /**
     * @brief Apply Kalman filter for position smoothing
     */
    Position2D applyKalmanFilter(const Position2D& measurement) {
        if (!enableKalmanFilter_) return measurement;
        
        unsigned long currentTime = millis();
        float dt = (currentTime - kalmanFilter_.lastUpdate) / 1000.0f; // Convert to seconds
        
        if (kalmanFilter_.lastUpdate == 0) {
            // Initialize filter
            kalmanFilter_.x = measurement.x;
            kalmanFilter_.y = measurement.y;
            kalmanFilter_.vx = 0.0f;
            kalmanFilter_.vy = 0.0f;
            kalmanFilter_.lastUpdate = currentTime;
            return measurement;
        }
        
        // Prediction step
        kalmanFilter_.x += kalmanFilter_.vx * dt;
        kalmanFilter_.y += kalmanFilter_.vy * dt;
        
        // Update uncertainty
        kalmanFilter_.px += KALMAN_PROCESS_NOISE * dt;
        kalmanFilter_.py += KALMAN_PROCESS_NOISE * dt;
        kalmanFilter_.pvx += KALMAN_PROCESS_NOISE * dt;
        kalmanFilter_.pvy += KALMAN_PROCESS_NOISE * dt;
        
        // Update step
        float kx = kalmanFilter_.px / (kalmanFilter_.px + KALMAN_MEASUREMENT_NOISE);
        float ky = kalmanFilter_.py / (kalmanFilter_.py + KALMAN_MEASUREMENT_NOISE);
        
        kalmanFilter_.x += kx * (measurement.x - kalmanFilter_.x);
        kalmanFilter_.y += ky * (measurement.y - kalmanFilter_.y);
        
        kalmanFilter_.px *= (1.0f - kx);
        kalmanFilter_.py *= (1.0f - ky);
        
        kalmanFilter_.lastUpdate = currentTime;
        
        return Position2D(kalmanFilter_.x, kalmanFilter_.y, measurement.confidence);
    }
    
    /**
     * @brief Detect and reject position outliers
     */
    bool isPositionOutlier(const Position2D& position) {
        if (!enableOutlierDetection_ || positionHistory_.empty()) {
            return false;
        }
        
        // Check against recent position history
        int recentCount = min(5, (int)positionHistory_.size());
        float totalDistance = 0.0f;
        
        for (int i = positionHistory_.size() - recentCount; i < positionHistory_.size(); i++) {
            totalDistance += position.distanceTo(positionHistory_[i]);
        }
        
        float averageDistance = totalDistance / recentCount;
        
        // Reject if position is too far from recent average
        return averageDistance > 10.0f; // 10 meter threshold
    }
    
    /**
     * @brief Update position history
     */
    void updatePositionHistory(const Position2D& position) {
        positionHistory_.push_back(position);
        
        // Maintain history size
        if (positionHistory_.size() > POSITION_HISTORY_SIZE) {
            positionHistory_.erase(positionHistory_.begin());
        }
    }

public:
    /**
     * @brief Constructor
     */
    TriangulationManager() :
        initialized_(false),
        positionValid_(false),
        currentConfidence_(0.0f),
        lastTriangulation_(0),
        lastPositionUpdate_(0),
        enableKalmanFilter_(true),
        enableOutlierDetection_(true),
        minBeaconDistance_(0.5f),
        maxBeaconDistance_(MAX_TRIANGULATION_DISTANCE) {
        
        positionHistory_.reserve(POSITION_HISTORY_SIZE);
    }
    
    /**
     * @brief Initialize triangulation manager
     */
    bool begin() {
        if (initialized_) return true;
        
        // Initialize default beacon positions
        initializeDefaultBeacons();
        
        // Reset state
        positionValid_ = false;
        currentConfidence_ = 0.0f;
        currentPosition_ = Position2D();
        lastValidPosition_ = Position2D();
        
        initialized_ = true;
        DEBUG_PRINTLN("TriangulationManager: Initialized");
        return true;
    }
    
    /**
     * @brief Update triangulation with new beacon data
     */
    bool updatePosition(const std::vector<Beacon>& beacons) {
        if (!initialized_) return false;
        
        unsigned long currentTime = millis();
        
        // Update active beacon list with distance calculations
        activeBeacons_.clear();
        for (const auto& beacon : beacons) {
            if (beacon.rssi != 0 && findBeaconPosition(beacon.name)) {
                Beacon updatedBeacon = beacon;
                updatedBeacon.distance = rssiToDistance(beacon.rssi);
                activeBeacons_.push_back(updatedBeacon);
            }
        }
        
        // Check if we have enough beacons for triangulation
        if (activeBeacons_.size() < MIN_BEACONS_FOR_TRIANGULATION) {
            positionValid_ = false;
            currentConfidence_ = 0.0f;
            return false;
        }
        
        // Calculate position using least squares
        Position2D newPosition = calculateLeastSquaresPosition(activeBeacons_);
        
        // Check if position is valid and not an outlier
        if (!newPosition.isValid() || isPositionOutlier(newPosition)) {
            DEBUG_PRINTLN("TriangulationManager: Invalid or outlier position rejected");
            return false;
        }
        
        // Apply Kalman filter for smoothing
        newPosition = applyKalmanFilter(newPosition);
        
        // Update current position
        currentPosition_ = newPosition;
        currentConfidence_ = newPosition.confidence;
        positionValid_ = true;
        lastValidPosition_ = newPosition;
        lastTriangulation_ = currentTime;
        
        // Update position history
        updatePositionHistory(newPosition);
        
        // Trigger callbacks
        if (onPositionUpdate_) {
            onPositionUpdate_(newPosition);
        }
        if (onConfidenceUpdate_) {
            onConfidenceUpdate_(newPosition.confidence);
        }
        
        DEBUG_PRINTF("TriangulationManager: Position updated: (%.2f, %.2f) confidence: %.2f\n",
                     newPosition.x, newPosition.y, newPosition.confidence);
        
        return true;
    }
    
    /**
     * @brief Add or update beacon position
     */
    void addBeacon(const String& name, const String& location, float x, float y, float z = 0.0f) {
        BeaconPosition* existing = findBeaconPosition(name);
        if (existing) {
            existing->location = location;
            existing->x = x;
            existing->y = y;
            existing->z = z;
            existing->active = true;
        } else {
            knownBeacons_.push_back(BeaconPosition(name, location, x, y, z));
        }
        
        DEBUG_PRINTF("TriangulationManager: Added beacon %s at (%.2f, %.2f)\n", name.c_str(), x, y);
    }
    
    /**
     * @brief Remove beacon
     */
    void removeBeacon(const String& name) {
        knownBeacons_.erase(
            std::remove_if(knownBeacons_.begin(), knownBeacons_.end(),
                          [&name](const BeaconPosition& beacon) {
                              return beacon.name == name || beacon.location == name;
                          }),
            knownBeacons_.end());
    }
    
    /**
     * @brief Get current position
     */
    Position2D getCurrentPosition() const {
        return currentPosition_;
    }
    
    /**
     * @brief Get last valid position
     */
    Position2D getLastValidPosition() const {
        return lastValidPosition_;
    }
    
    /**
     * @brief Check if position is valid
     */
    bool isPositionValid() const {
        return positionValid_ && currentConfidence_ >= POSITION_CONFIDENCE_THRESHOLD;
    }
    
    /**
     * @brief Get current confidence
     */
    float getConfidence() const {
        return currentConfidence_;
    }
    
    /**
     * @brief Get position history
     */
    const std::vector<Position2D>& getPositionHistory() const {
        return positionHistory_;
    }
    
    /**
     * @brief Get known beacons
     */
    const std::vector<BeaconPosition>& getKnownBeacons() const {
        return knownBeacons_;
    }
    
    /**
     * @brief Set position update callback
     */
    void onPositionUpdate(PositionUpdateCallback callback) {
        onPositionUpdate_ = callback;
    }
    
    /**
     * @brief Set confidence update callback
     */
    void onConfidenceUpdate(ConfidenceUpdateCallback callback) {
        onConfidenceUpdate_ = callback;
    }
    
    /**
     * @brief Enable/disable Kalman filtering
     */
    void setKalmanFilterEnabled(bool enabled) {
        enableKalmanFilter_ = enabled;
        if (!enabled) {
            kalmanFilter_ = KalmanState(); // Reset filter
        }
    }
    
    /**
     * @brief Enable/disable outlier detection
     */
    void setOutlierDetectionEnabled(bool enabled) {
        enableOutlierDetection_ = enabled;
    }
    
    /**
     * @brief Set distance bounds for beacons
     */
    void setDistanceBounds(float minDistance, float maxDistance) {
        minBeaconDistance_ = minDistance;
        maxBeaconDistance_ = maxDistance;
    }
    
    /**
     * @brief Get triangulation statistics
     */
    String getStatistics() const {
        DynamicJsonDocument doc(1024);
        
        doc["position_valid"] = positionValid_;
        doc["confidence"] = currentConfidence_;
        doc["active_beacons"] = activeBeacons_.size();
        doc["known_beacons"] = knownBeacons_.size();
        doc["position_history_size"] = positionHistory_.size();
        doc["last_triangulation"] = lastTriangulation_;
        doc["kalman_enabled"] = enableKalmanFilter_;
        doc["outlier_detection"] = enableOutlierDetection_;
        
        if (positionValid_) {
            doc["current_x"] = currentPosition_.x;
            doc["current_y"] = currentPosition_.y;
        }
        
        String result;
        serializeJson(doc, result);
        return result;
    }
    
    /**
     * @brief Reset triangulation system
     */
    void reset() {
        positionValid_ = false;
        currentConfidence_ = 0.0f;
        currentPosition_ = Position2D();
        kalmanFilter_ = KalmanState();
        positionHistory_.clear();
        activeBeacons_.clear();
        
        DEBUG_PRINTLN("TriangulationManager: Reset");
    }
    
    /**
     * @brief Load beacon configuration from JSON
     */
    bool loadBeaconConfig(const String& jsonConfig) {
        DynamicJsonDocument doc(2048);
        DeserializationError error = deserializeJson(doc, jsonConfig);
        
        if (error) {
            DEBUG_PRINTF("TriangulationManager: Failed to parse beacon config: %s\n", error.c_str());
            return false;
        }
        
        knownBeacons_.clear();
        JsonArray beacons = doc["beacons"];
        
        for (JsonObject beacon : beacons) {
            String name = beacon["name"];
            String location = beacon["location"];
            float x = beacon["x"];
            float y = beacon["y"];
            float z = beacon["z"] | 0.0f;
            
            addBeacon(name, location, x, y, z);
        }
        
        DEBUG_PRINTF("TriangulationManager: Loaded %d beacons from config\n", knownBeacons_.size());
        return true;
    }
    
    /**
     * @brief Save beacon configuration to JSON
     */
    String saveBeaconConfig() const {
        DynamicJsonDocument doc(2048);
        JsonArray beacons = doc.createNestedArray("beacons");
        
        for (const auto& beacon : knownBeacons_) {
            JsonObject beaconObj = beacons.createNestedObject();
            beaconObj["name"] = beacon.name;
            beaconObj["location"] = beacon.location;
            beaconObj["x"] = beacon.x;
            beaconObj["y"] = beacon.y;
            beaconObj["z"] = beacon.z;
            beaconObj["active"] = beacon.active;
        }
        
        String result;
        serializeJson(doc, result);
        return result;
    }
};

#endif // TRIANGULATION_MANAGER_H