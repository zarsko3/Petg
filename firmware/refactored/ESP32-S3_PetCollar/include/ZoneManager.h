#ifndef ZONE_MANAGER_H
#define ZONE_MANAGER_H

/**
 * @file ZoneManager.h
 * @brief Enhanced Zone Management system for ESP32-S3 Pet Collar
 * @version 3.1.0
 * @date 2024
 * 
 * This class provides comprehensive zone management including:
 * - Dynamic zone creation and modification
 * - Point-in-polygon detection algorithms
 * - Zone transition tracking and notifications
 * - JSON configuration import/export
 * - Integration with beacon triangulation
 */

#include <Arduino.h>
#include <vector>
#include <ArduinoJson.h>
#include "ESP32_S3_Config.h"
#include "MicroConfig.h"

// ==========================================
// ZONE SYSTEM DEFINITIONS
// ==========================================

/**
 * @brief Zone types for different behaviors
 */
enum class ZoneType : uint8_t {
    SAFE = 0,           ///< Safe zone - no alerts when inside
    ALERT,              ///< Alert zone - trigger alerts when entered
    BOUNDARY,           ///< Boundary zone - trigger when exited
    NOTIFICATION,       ///< Notification only - no alerts
    CUSTOM              ///< Custom zone behavior
};

/**
 * @brief Zone configuration parameters
 */
struct ZoneConfig {
    AlertMode alertMode;        ///< Alert mode for this zone
    uint16_t alertDelayMs;      ///< Delay before triggering alert
    uint16_t alertDurationMs;   ///< Alert duration (0=default)
    uint8_t triggerRadius;      ///< Additional trigger radius in cm
    bool enableEntry;           ///< Enable entry notifications
    bool enableExit;            ///< Enable exit notifications
    bool isActive;              ///< Zone is active for monitoring
    
    ZoneConfig() :
        alertMode(AlertMode::BOTH),
        alertDelayMs(3000),
        alertDurationMs(0),
        triggerRadius(0),
        enableEntry(true),
        enableExit(true),
        isActive(true) {}
    
    /**
     * @brief Validate configuration parameters
     * @return true if configuration is valid
     */
    bool isValid() const {
        return alertDelayMs <= 30000 && triggerRadius <= 100;
    }
};

/**
 * @brief Zone definition structure
 */
struct Zone {
    char zoneId[16];                        ///< Unique zone identifier
    char name[32];                          ///< Human-readable zone name
    ZoneType type;                          ///< Zone type
    std::vector<Point2D> vertices;          ///< Zone boundary vertices
    char color[8];                          ///< Display color (hex format)
    ZoneConfig config;                      ///< Zone configuration
    
    // State information
    bool isComplete;                        ///< Zone has valid boundary
    bool currentlyOccupied;                 ///< Currently inside this zone
    unsigned long lastTriggered;            ///< Last trigger timestamp
    unsigned long occupancyStartTime;       ///< When occupation started
    uint32_t totalOccupancyTime;           ///< Total time spent in zone
    
    // Geometry cache
    Point2D centroid;                       ///< Calculated centroid
    float area;                             ///< Calculated area
    Point2D boundingBoxMin;                 ///< Bounding box minimum
    Point2D boundingBoxMax;                 ///< Bounding box maximum
    
    Zone() :
        type(ZoneType::SAFE),
        isComplete(false),
        currentlyOccupied(false),
        lastTriggered(0),
        occupancyStartTime(0),
        totalOccupancyTime(0),
        area(0.0f) {
        memset(zoneId, 0, sizeof(zoneId));
        memset(name, 0, sizeof(name));
        strcpy(color, "#8B5CF6");  // Default purple color
    }
    
    /**
     * @brief Add vertex to zone boundary
     * @param point Vertex point
     * @return true if vertex added successfully
     */
    bool addVertex(const Point2D& point) {
        if (vertices.size() >= MAX_ZONE_COUNT) return false;
        vertices.push_back(point);
        updateGeometry();
        return true;
    }
    
    /**
     * @brief Remove vertex from zone boundary
     * @param index Vertex index to remove
     * @return true if vertex removed successfully
     */
    bool removeVertex(size_t index) {
        if (index >= vertices.size()) return false;
        vertices.erase(vertices.begin() + index);
        updateGeometry();
        return true;
    }
    
    /**
     * @brief Clear all vertices
     */
    void clearVertices() {
        vertices.clear();
        isComplete = false;
        area = 0.0f;
    }
    
    /**
     * @brief Update cached geometry calculations
     */
    void updateGeometry() {
        if (vertices.size() < 3) {
            isComplete = false;
            area = 0.0f;
            return;
        }
        
        calculateCentroid();
        calculateArea();
        calculateBoundingBox();
        isComplete = true;
    }
    
    /**
     * @brief Calculate zone centroid
     */
    void calculateCentroid() {
        if (vertices.empty()) return;
        
        float totalX = 0.0f, totalY = 0.0f;
        for (const Point2D& vertex : vertices) {
            totalX += vertex.x;
            totalY += vertex.y;
        }
        centroid.x = totalX / vertices.size();
        centroid.y = totalY / vertices.size();
    }
    
    /**
     * @brief Calculate zone area using shoelace formula
     */
    void calculateArea() {
        if (vertices.size() < 3) {
            area = 0.0f;
            return;
        }
        
        float totalArea = 0.0f;
        size_t n = vertices.size();
        
        for (size_t i = 0; i < n; i++) {
            size_t j = (i + 1) % n;
            totalArea += vertices[i].x * vertices[j].y;
            totalArea -= vertices[j].x * vertices[i].y;
        }
        
        area = abs(totalArea) / 2.0f;
    }
    
    /**
     * @brief Calculate bounding box
     */
    void calculateBoundingBox() {
        if (vertices.empty()) return;
        
        boundingBoxMin = boundingBoxMax = vertices[0];
        
        for (const Point2D& vertex : vertices) {
            if (vertex.x < boundingBoxMin.x) boundingBoxMin.x = vertex.x;
            if (vertex.y < boundingBoxMin.y) boundingBoxMin.y = vertex.y;
            if (vertex.x > boundingBoxMax.x) boundingBoxMax.x = vertex.x;
            if (vertex.y > boundingBoxMax.y) boundingBoxMax.y = vertex.y;
        }
    }
    
    /**
     * @brief Check if zone definition is valid
     * @return true if zone is valid
     */
    bool isValid() const {
        return strlen(zoneId) > 0 && strlen(name) > 0 && 
               isComplete && vertices.size() >= 3 && config.isValid();
    }
};

/**
 * @brief Zone transition event
 */
struct ZoneTransition {
    char zoneId[16];                ///< Zone identifier
    char zoneName[32];              ///< Zone name
    ZoneType zoneType;              ///< Zone type
    bool entered;                   ///< true=entered, false=exited
    unsigned long timestamp;        ///< Event timestamp
    Point2D position;               ///< Position when event occurred
    float confidence;               ///< Position confidence (0.0-1.0)
    
    ZoneTransition() :
        zoneType(ZoneType::SAFE),
        entered(false),
        timestamp(0),
        confidence(0.0f) {
        memset(zoneId, 0, sizeof(zoneId));
        memset(zoneName, 0, sizeof(zoneName));
    }
};

/**
 * @brief Zone event callback types
 */
typedef std::function<void(const ZoneTransition& transition)> ZoneTransitionCallback;
typedef std::function<void(const char* zoneId, bool occupied)> ZoneOccupancyCallback;

// ==========================================
// MAIN ZONE MANAGER CLASS
// ==========================================

/**
 * @brief Enhanced Zone Manager class
 */
class ZoneManager {
private:
    // Zone storage
    std::vector<Zone> m_zones;
    std::vector<ZoneTransition> m_recentTransitions;
    
    // State management
    Point2D m_currentPosition;
    float m_positionConfidence;
    bool m_positionValid;
    unsigned long m_lastPositionUpdate;
    unsigned long m_lastTransitionCheck;
    
    // Zone tracking
    std::vector<bool> m_previousOccupancy;  // Previous frame occupancy
    std::vector<bool> m_currentOccupancy;   // Current frame occupancy
    
    // Configuration
    uint16_t m_transitionHistorySize;
    uint16_t m_positionUpdateThreshold;     // Minimum movement to trigger update
    bool m_enableTransitionTracking;
    
    // Callbacks
    ZoneTransitionCallback m_onZoneTransition;
    ZoneOccupancyCallback m_onZoneOccupancy;
    
    /**
     * @brief Check if point is inside zone using ray casting algorithm
     * @param point Point to test
     * @param zone Zone to test against
     * @return true if point is inside zone
     */
    bool isPointInZone(const Point2D& point, const Zone& zone) const;
    
    /**
     * @brief Ray casting helper function
     * @param point Test point
     * @param vertex1 First vertex of edge
     * @param vertex2 Second vertex of edge
     * @return true if ray intersects edge
     */
    bool rayIntersectsEdge(const Point2D& point, 
                          const Point2D& vertex1, 
                          const Point2D& vertex2) const;
    
    /**
     * @brief Update zone occupancy states
     */
    void updateOccupancyStates();
    
    /**
     * @brief Process zone transitions
     */
    void processTransitions();
    
    /**
     * @brief Find zone by ID
     * @param zoneId Zone identifier
     * @return Pointer to zone or nullptr if not found
     */
    Zone* findZoneById(const char* zoneId);
    
    /**
     * @brief Generate unique zone ID
     * @param baseName Base name for ID generation
     * @return Unique zone ID
     */
    String generateZoneId(const String& baseName);
    
    /**
     * @brief Validate zone configuration
     * @param zone Zone to validate
     * @return true if zone is valid
     */
    bool validateZone(const Zone& zone) const;

public:
    /**
     * @brief Constructor
     */
    ZoneManager() :
        m_positionConfidence(0.0f),
        m_positionValid(false),
        m_lastPositionUpdate(0),
        m_lastTransitionCheck(0),
        m_transitionHistorySize(50),
        m_positionUpdateThreshold(10),
        m_enableTransitionTracking(true) {}
    
    /**
     * @brief Initialize zone manager
     * @return true if initialization successful
     */
    bool begin();
    
    /**
     * @brief Main update loop - call regularly from main loop
     */
    void update();
    
    /**
     * @brief Update current position
     * @param x X coordinate
     * @param y Y coordinate
     * @param confidence Position confidence (0.0-1.0)
     * @param force Force update even if position hasn't changed significantly
     */
    void updatePosition(float x, float y, float confidence = 1.0f, bool force = false);
    
    /**
     * @brief Create new zone
     * @param name Zone name
     * @param type Zone type
     * @param color Zone color (hex format)
     * @return Zone ID if successful, empty string if failed
     */
    String createZone(const String& name, ZoneType type = ZoneType::SAFE, const String& color = "#8B5CF6");
    
    /**
     * @brief Delete zone
     * @param zoneId Zone identifier
     * @return true if zone deleted successfully
     */
    bool deleteZone(const char* zoneId);
    
    /**
     * @brief Add vertex to zone
     * @param zoneId Zone identifier
     * @param point Vertex point
     * @return true if vertex added successfully
     */
    bool addZoneVertex(const char* zoneId, const Point2D& point);
    
    /**
     * @brief Remove vertex from zone
     * @param zoneId Zone identifier
     * @param vertexIndex Vertex index to remove
     * @return true if vertex removed successfully
     */
    bool removeZoneVertex(const char* zoneId, size_t vertexIndex);
    
    /**
     * @brief Update zone configuration
     * @param zoneId Zone identifier
     * @param config New zone configuration
     * @return true if configuration updated successfully
     */
    bool updateZoneConfig(const char* zoneId, const ZoneConfig& config);
    
    /**
     * @brief Get zone by ID
     * @param zoneId Zone identifier
     * @return Pointer to zone or nullptr if not found
     */
    const Zone* getZone(const char* zoneId) const;
    
    /**
     * @brief Get all zones
     * @return Vector of all zones
     */
    const std::vector<Zone>& getAllZones() const {
        return m_zones;
    }
    
    /**
     * @brief Get zones by type
     * @param type Zone type
     * @return Vector of zones of specified type
     */
    std::vector<const Zone*> getZonesByType(ZoneType type) const;
    
    /**
     * @brief Get currently occupied zones
     * @return Vector of currently occupied zones
     */
    std::vector<const Zone*> getOccupiedZones() const;
    
    /**
     * @brief Check if position is in any zone
     * @param point Position to check (optional, uses current position if not provided)
     * @return true if position is in any zone
     */
    bool isInAnyZone(const Point2D* point = nullptr) const;
    
    /**
     * @brief Check if position is in specific zone
     * @param zoneId Zone identifier
     * @param point Position to check (optional, uses current position if not provided)
     * @return true if position is in specified zone
     */
    bool isInZone(const char* zoneId, const Point2D* point = nullptr) const;
    
    /**
     * @brief Get recent zone transitions
     * @param maxCount Maximum number of transitions to return
     * @return Vector of recent transitions
     */
    std::vector<ZoneTransition> getRecentTransitions(size_t maxCount = 10) const;
    
    /**
     * @brief Clear zone transition history
     */
    void clearTransitionHistory();
    
    /**
     * @brief Load zones from JSON configuration
     * @param jsonConfig JSON configuration string
     * @return true if zones loaded successfully
     */
    bool loadZonesFromJson(const String& jsonConfig);
    
    /**
     * @brief Save zones to JSON configuration
     * @return JSON configuration string
     */
    String saveZonesToJson() const;
    
    /**
     * @brief Get zone manager status as JSON
     * @return JSON status string
     */
    String getStatusJson() const;
    
    /**
     * @brief Get zone statistics as JSON
     * @return JSON statistics string
     */
    String getStatisticsJson() const;
    
    /**
     * @brief Set zone transition callback
     * @param callback Callback function
     */
    void setZoneTransitionCallback(ZoneTransitionCallback callback) {
        m_onZoneTransition = callback;
    }
    
    /**
     * @brief Set zone occupancy callback
     * @param callback Callback function
     */
    void setZoneOccupancyCallback(ZoneOccupancyCallback callback) {
        m_onZoneOccupancy = callback;
    }
    
    /**
     * @brief Enable or disable transition tracking
     * @param enabled Enable transition tracking
     */
    void setTransitionTracking(bool enabled) {
        m_enableTransitionTracking = enabled;
    }
    
    /**
     * @brief Get current position
     * @return Current position
     */
    Point2D getCurrentPosition() const {
        return m_currentPosition;
    }
    
    /**
     * @brief Get current position confidence
     * @return Position confidence (0.0-1.0)
     */
    float getPositionConfidence() const {
        return m_positionConfidence;
    }
    
    /**
     * @brief Check if position is valid
     * @return true if position is valid
     */
    bool isPositionValid() const {
        return m_positionValid;
    }
    
    /**
     * @brief Get zone count
     * @return Number of defined zones
     */
    size_t getZoneCount() const {
        return m_zones.size();
    }
    
    /**
     * @brief Clear all zones
     */
    void clearAllZones();
    
    /**
     * @brief Reset zone manager to initial state
     */
    void reset();
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * @brief Convert zone type enum to string
 * @param type Zone type
 * @return String representation
 */
inline const char* zoneTypeToString(ZoneType type) {
    switch (type) {
        case ZoneType::SAFE: return "Safe";
        case ZoneType::ALERT: return "Alert";
        case ZoneType::BOUNDARY: return "Boundary";
        case ZoneType::NOTIFICATION: return "Notification";
        case ZoneType::CUSTOM: return "Custom";
        default: return "Unknown";
    }
}

/**
 * @brief Convert string to zone type enum
 * @param typeStr String representation
 * @return Zone type enum
 */
inline ZoneType stringToZoneType(const String& typeStr) {
    if (typeStr.equalsIgnoreCase("Safe")) return ZoneType::SAFE;
    if (typeStr.equalsIgnoreCase("Alert")) return ZoneType::ALERT;
    if (typeStr.equalsIgnoreCase("Boundary")) return ZoneType::BOUNDARY;
    if (typeStr.equalsIgnoreCase("Notification")) return ZoneType::NOTIFICATION;
    if (typeStr.equalsIgnoreCase("Custom")) return ZoneType::CUSTOM;
    return ZoneType::SAFE;  // Default
}

#endif // ZONE_MANAGER_H 