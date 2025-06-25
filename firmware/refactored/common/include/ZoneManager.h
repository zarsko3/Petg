/**
 * @file ZoneManager.h
 * @brief Advanced Zone Management and Geofencing System
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Comprehensive zone management system for pet safety and location tracking.
 * Provides dynamic safe zone creation, real-time boundary monitoring, and
 * intelligent alert generation based on pet movement patterns.
 * 
 * Features:
 * - Multiple zone types (safe, warning, danger)
 * - Dynamic zone creation and modification
 * - Real-time boundary crossing detection
 * - Zone-based alert prioritization
 * - Movement pattern analysis
 * - Time-based zone activation
 * - Zone history and analytics
 */

#ifndef ZONE_MANAGER_H
#define ZONE_MANAGER_H

#include <Arduino.h>
#include <vector>
#include <functional>
#include <cmath>
#include <ArduinoJson.h>
#include "PetCollarConfig.h"
#include "TriangulationManager.h"
#include "Utils.h"

// ==========================================
// ZONE MANAGEMENT CONSTANTS
// ==========================================

#define MAX_ZONES                   10      // Maximum number of zones
#define ZONE_CHECK_INTERVAL         1000    // Zone check interval (1 second)
#define ZONE_TRANSITION_COOLDOWN    5000    // Cooldown between zone transitions
#define BOUNDARY_TOLERANCE          0.5f    // Boundary crossing tolerance (meters)
#define ZONE_HISTORY_SIZE           50      // Zone transition history size
#define MOVEMENT_ANALYSIS_WINDOW    10      // Movement analysis window (transitions)

// Default zone sizes
#define DEFAULT_SAFE_ZONE_RADIUS    10.0f   // 10 meters
#define DEFAULT_WARNING_ZONE_RADIUS 15.0f   // 15 meters
#define DEFAULT_DANGER_ZONE_RADIUS  20.0f   // 20 meters

// ==========================================
// ZONE ENUMS AND STRUCTURES
// ==========================================

/**
 * @brief Zone type enumeration
 */
enum ZoneType {
    ZONE_TYPE_SAFE = 0,
    ZONE_TYPE_WARNING = 1,
    ZONE_TYPE_DANGER = 2,
    ZONE_TYPE_NEUTRAL = 3,
    ZONE_TYPE_CUSTOM = 4
};

/**
 * @brief Zone shape enumeration
 */
enum ZoneShape {
    ZONE_SHAPE_CIRCLE = 0,
    ZONE_SHAPE_RECTANGLE = 1,
    ZONE_SHAPE_POLYGON = 2
};

/**
 * @brief Zone activation schedule
 */
struct ZoneSchedule {
    bool enabled;
    uint8_t startHour;
    uint8_t startMinute;
    uint8_t endHour;
    uint8_t endMinute;
    uint8_t activeDays; // Bitmask: Mon=1, Tue=2, Wed=4, etc.
    
    /**
     * @brief Default constructor
     */
    ZoneSchedule() :
        enabled(false),
        startHour(0),
        startMinute(0),
        endHour(23),
        endMinute(59),
        activeDays(0x7F) {} // All days active by default
    
    /**
     * @brief Check if zone is active at current time
     */
    bool isActive() const {
        if (!enabled) return true;
        
        // Get current time (simplified - would use RTC in production)
        unsigned long currentSeconds = (millis() / 1000) % 86400; // Seconds in day
        uint8_t currentHour = currentSeconds / 3600;
        uint8_t currentMinute = (currentSeconds % 3600) / 60;
        uint8_t currentDay = 1; // Monday (would get from RTC)
        
        // Check day
        if (!(activeDays & (1 << (currentDay - 1)))) {
            return false;
        }
        
        // Check time
        uint16_t startTime = startHour * 60 + startMinute;
        uint16_t endTime = endHour * 60 + endMinute;
        uint16_t currentTime = currentHour * 60 + currentMinute;
        
        if (startTime <= endTime) {
            return currentTime >= startTime && currentTime <= endTime;
        } else {
            // Crosses midnight
            return currentTime >= startTime || currentTime <= endTime;
        }
    }
};

/**
 * @brief 2D point structure
 */
struct Point2D {
    float x;
    float y;
    
    Point2D() : x(0.0f), y(0.0f) {}
    Point2D(float px, float py) : x(px), y(py) {}
    
    float distanceTo(const Point2D& other) const {
        float dx = x - other.x;
        float dy = y - other.y;
        return sqrt(dx * dx + dy * dy);
    }
};

/**
 * @brief Zone definition structure
 */
struct Zone {
    String id;
    String name;
    String description;
    ZoneType type;
    ZoneShape shape;
    bool active;
    bool alertEnabled;
    ZoneSchedule schedule;
    
    // Shape-specific parameters
    Point2D center;
    float radius;                    // For circles
    float width, height;             // For rectangles
    std::vector<Point2D> vertices;   // For polygons
    
    // Zone behavior
    uint16_t alertCooldown;          // Milliseconds between alerts
    uint8_t priority;                // 0-255, higher = more important
    unsigned long lastAlert;
    unsigned long createdTime;
    unsigned long lastModified;
    
    /**
     * @brief Default constructor
     */
    Zone() :
        id(""),
        name(""),
        description(""),
        type(ZONE_TYPE_SAFE),
        shape(ZONE_SHAPE_CIRCLE),
        active(true),
        alertEnabled(true),
        center(0.0f, 0.0f),
        radius(DEFAULT_SAFE_ZONE_RADIUS),
        width(0.0f),
        height(0.0f),
        alertCooldown(5000),
        priority(128),
        lastAlert(0),
        createdTime(millis()),
        lastModified(millis()) {}
    
    /**
     * @brief Constructor for circular zone
     */
    Zone(const String& zoneId, const String& zoneName, ZoneType zoneType,
         const Point2D& zoneCenter, float zoneRadius) :
        id(zoneId),
        name(zoneName),
        description(""),
        type(zoneType),
        shape(ZONE_SHAPE_CIRCLE),
        active(true),
        alertEnabled(true),
        center(zoneCenter),
        radius(zoneRadius),
        width(0.0f),
        height(0.0f),
        alertCooldown(5000),
        priority(128),
        lastAlert(0),
        createdTime(millis()),
        lastModified(millis()) {}
    
    /**
     * @brief Check if point is inside this zone
     */
    bool containsPoint(const Point2D& point) const {
        if (!active || !schedule.isActive()) {
            return false;
        }
        
        switch (shape) {
            case ZONE_SHAPE_CIRCLE:
                return center.distanceTo(point) <= radius;
                
            case ZONE_SHAPE_RECTANGLE: {
                float halfWidth = width / 2.0f;
                float halfHeight = height / 2.0f;
                return (point.x >= center.x - halfWidth && point.x <= center.x + halfWidth &&
                        point.y >= center.y - halfHeight && point.y <= center.y + halfHeight);
            }
            
            case ZONE_SHAPE_POLYGON:
                return pointInPolygon(point, vertices);
                
            default:
                return false;
        }
    }
    
    /**
     * @brief Calculate distance from point to zone boundary
     */
    float distanceToZone(const Point2D& point) const {
        switch (shape) {
            case ZONE_SHAPE_CIRCLE: {
                float distanceToCenter = center.distanceTo(point);
                return abs(distanceToCenter - radius);
            }
            
            case ZONE_SHAPE_RECTANGLE: {
                float halfWidth = width / 2.0f;
                float halfHeight = height / 2.0f;
                float dx = max(0.0f, max(center.x - halfWidth - point.x, point.x - (center.x + halfWidth)));
                float dy = max(0.0f, max(center.y - halfHeight - point.y, point.y - (center.y + halfHeight)));
                return sqrt(dx * dx + dy * dy);
            }
            
            case ZONE_SHAPE_POLYGON:
                return distanceToPolygon(point, vertices);
                
            default:
                return 999.0f;
        }
    }
    
    /**
     * @brief Generate JSON representation
     */
    JsonObject toJson(JsonDocument& doc) const {
        JsonObject obj = doc.createNestedObject();
        obj["id"] = id;
        obj["name"] = name;
        obj["description"] = description;
        obj["type"] = (int)type;
        obj["shape"] = (int)shape;
        obj["active"] = active;
        obj["alert_enabled"] = alertEnabled;
        obj["priority"] = priority;
        obj["alert_cooldown"] = alertCooldown;
        obj["created_time"] = createdTime;
        obj["last_modified"] = lastModified;
        
        // Center point
        JsonObject centerObj = obj.createNestedObject("center");
        centerObj["x"] = center.x;
        centerObj["y"] = center.y;
        
        // Shape-specific parameters
        if (shape == ZONE_SHAPE_CIRCLE) {
            obj["radius"] = radius;
        } else if (shape == ZONE_SHAPE_RECTANGLE) {
            obj["width"] = width;
            obj["height"] = height;
        } else if (shape == ZONE_SHAPE_POLYGON) {
            JsonArray verticesArray = obj.createNestedArray("vertices");
            for (const auto& vertex : vertices) {
                JsonObject vertexObj = verticesArray.createNestedObject();
                vertexObj["x"] = vertex.x;
                vertexObj["y"] = vertex.y;
            }
        }
        
        // Schedule
        JsonObject scheduleObj = obj.createNestedObject("schedule");
        scheduleObj["enabled"] = schedule.enabled;
        scheduleObj["start_hour"] = schedule.startHour;
        scheduleObj["start_minute"] = schedule.startMinute;
        scheduleObj["end_hour"] = schedule.endHour;
        scheduleObj["end_minute"] = schedule.endMinute;
        scheduleObj["active_days"] = schedule.activeDays;
        
        return obj;
    }

private:
    /**
     * @brief Check if point is inside polygon using ray casting
     */
    bool pointInPolygon(const Point2D& point, const std::vector<Point2D>& polygon) const {
        if (polygon.size() < 3) return false;
        
        bool inside = false;
        int j = polygon.size() - 1;
        
        for (int i = 0; i < polygon.size(); i++) {
            if (((polygon[i].y > point.y) != (polygon[j].y > point.y)) &&
                (point.x < (polygon[j].x - polygon[i].x) * (point.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x)) {
                inside = !inside;
            }
            j = i;
        }
        
        return inside;
    }
    
    /**
     * @brief Calculate distance from point to polygon
     */
    float distanceToPolygon(const Point2D& point, const std::vector<Point2D>& polygon) const {
        if (polygon.size() < 2) return 999.0f;
        
        float minDistance = 999.0f;
        
        for (int i = 0; i < polygon.size(); i++) {
            int j = (i + 1) % polygon.size();
            float distance = distanceToLineSegment(point, polygon[i], polygon[j]);
            minDistance = min(minDistance, distance);
        }
        
        return minDistance;
    }
    
    /**
     * @brief Calculate distance from point to line segment
     */
    float distanceToLineSegment(const Point2D& point, const Point2D& lineStart, const Point2D& lineEnd) const {
        float dx = lineEnd.x - lineStart.x;
        float dy = lineEnd.y - lineStart.y;
        
        if (dx == 0 && dy == 0) {
            return point.distanceTo(lineStart);
        }
        
        float t = ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy);
        t = constrain(t, 0.0f, 1.0f);
        
        Point2D closest(lineStart.x + t * dx, lineStart.y + t * dy);
        return point.distanceTo(closest);
    }
};

/**
 * @brief Zone transition event
 */
struct ZoneTransition {
    String fromZoneId;
    String toZoneId;
    Position2D position;
    unsigned long timestamp;
    float confidence;
    
    ZoneTransition() : timestamp(0), confidence(0.0f) {}
    
    ZoneTransition(const String& from, const String& to, const Position2D& pos, float conf = 1.0f) :
        fromZoneId(from), toZoneId(to), position(pos), timestamp(millis()), confidence(conf) {}
};

// ==========================================
// ZONE MANAGER CLASS
// ==========================================

/**
 * @brief Advanced zone management system
 * 
 * Provides comprehensive zone management with real-time boundary monitoring,
 * intelligent alerting, and movement pattern analysis for pet safety.
 */
class ZoneManager {
public:
    // Callback function types
    typedef std::function<void(const Zone&, const Position2D&)> ZoneEntryCallback;
    typedef std::function<void(const Zone&, const Position2D&)> ZoneExitCallback;
    typedef std::function<void(const Zone&, const Position2D&, float)> BoundaryAlertCallback;
    typedef std::function<void(const ZoneTransition&)> TransitionCallback;

private:
    // Zone storage
    std::vector<Zone> zones_;
    std::vector<ZoneTransition> transitionHistory_;
    
    // Current state
    String currentZoneId_;
    Position2D lastPosition_;
    unsigned long lastZoneCheck_;
    unsigned long lastTransition_;
    bool positionValid_;
    
    // Callbacks
    ZoneEntryCallback onZoneEntry_;
    ZoneExitCallback onZoneExit_;
    BoundaryAlertCallback onBoundaryAlert_;
    TransitionCallback onTransition_;
    
    // Configuration
    bool initialized_;
    float boundaryTolerance_;
    bool movementAnalysisEnabled_;
    
    /**
     * @brief Find zone by ID
     */
    Zone* findZone(const String& zoneId) {
        for (auto& zone : zones_) {
            if (zone.id == zoneId) {
                return &zone;
            }
        }
        return nullptr;
    }
    
    /**
     * @brief Find active zone containing position
     */
    Zone* findZoneContaining(const Position2D& position) {
        // Check zones by priority (higher priority first)
        std::vector<Zone*> candidateZones;
        
        for (auto& zone : zones_) {
            if (zone.containsPoint(Point2D(position.x, position.y))) {
                candidateZones.push_back(&zone);
            }
        }
        
        if (candidateZones.empty()) {
            return nullptr;
        }
        
        // Sort by priority (descending)
        std::sort(candidateZones.begin(), candidateZones.end(),
                 [](const Zone* a, const Zone* b) {
                     return a->priority > b->priority;
                 });
        
        return candidateZones[0];
    }
    
    /**
     * @brief Record zone transition
     */
    void recordTransition(const String& fromZoneId, const String& toZoneId, const Position2D& position) {
        ZoneTransition transition(fromZoneId, toZoneId, position, position.confidence);
        transitionHistory_.push_back(transition);
        
        // Maintain history size
        if (transitionHistory_.size() > ZONE_HISTORY_SIZE) {
            transitionHistory_.erase(transitionHistory_.begin());
        }
        
        // Trigger callback
        if (onTransition_) {
            onTransition_(transition);
        }
        
        DEBUG_PRINTF("ZoneManager: Transition from %s to %s\n", 
                     fromZoneId.c_str(), toZoneId.c_str());
    }
    
    /**
     * @brief Check for boundary alerts
     */
    void checkBoundaryAlerts(const Position2D& position) {
        Point2D currentPoint(position.x, position.y);
        
        for (auto& zone : zones_) {
            if (!zone.active || !zone.alertEnabled) continue;
            
            // Check if we're near the boundary
            float distanceToBoundary = zone.distanceToZone(currentPoint);
            
            if (distanceToBoundary <= boundaryTolerance_) {
                unsigned long currentTime = millis();
                
                // Check alert cooldown
                if (currentTime - zone.lastAlert >= zone.alertCooldown) {
                    zone.lastAlert = currentTime;
                    
                    if (onBoundaryAlert_) {
                        onBoundaryAlert_(zone, position, distanceToBoundary);
                    }
                }
            }
        }
    }
    
    /**
     * @brief Analyze movement patterns
     */
    void analyzeMovementPatterns() {
        if (!movementAnalysisEnabled_ || transitionHistory_.size() < MOVEMENT_ANALYSIS_WINDOW) {
            return;
        }
        
        // Simple pattern analysis - can be enhanced
        int recentTransitions = 0;
        unsigned long timeWindow = 300000; // 5 minutes
        unsigned long currentTime = millis();
        
        for (int i = transitionHistory_.size() - 1; i >= 0; i--) {
            if (currentTime - transitionHistory_[i].timestamp <= timeWindow) {
                recentTransitions++;
            } else {
                break;
            }
        }
        
        // Alert if too many transitions (possible escape attempt)
        if (recentTransitions > 5) {
            DEBUG_PRINTLN("ZoneManager: High activity detected - possible escape attempt");
            // Could trigger special alert here
        }
    }

public:
    /**
     * @brief Constructor
     */
    ZoneManager() :
        currentZoneId_(""),
        lastZoneCheck_(0),
        lastTransition_(0),
        positionValid_(false),
        initialized_(false),
        boundaryTolerance_(BOUNDARY_TOLERANCE),
        movementAnalysisEnabled_(true) {
        
        zones_.reserve(MAX_ZONES);
        transitionHistory_.reserve(ZONE_HISTORY_SIZE);
    }
    
    /**
     * @brief Initialize zone manager
     */
    bool begin() {
        if (initialized_) return true;
        
        // Create default safe zone
        Zone defaultSafeZone("default_safe", "Home Safe Zone", ZONE_TYPE_SAFE,
                             Point2D(0.0f, 0.0f), DEFAULT_SAFE_ZONE_RADIUS);
        defaultSafeZone.description = "Default safe zone around home base";
        defaultSafeZone.priority = 255; // Highest priority
        
        zones_.push_back(defaultSafeZone);
        
        initialized_ = true;
        DEBUG_PRINTLN("ZoneManager: Initialized with default safe zone");
        return true;
    }
    
    /**
     * @brief Update zone monitoring with new position
     */
    void updatePosition(const Position2D& position) {
        if (!initialized_ || !position.isValid()) return;
        
        unsigned long currentTime = millis();
        
        // Rate limiting
        if (currentTime - lastZoneCheck_ < ZONE_CHECK_INTERVAL) {
            return;
        }
        
        lastPosition_ = position;
        positionValid_ = true;
        lastZoneCheck_ = currentTime;
        
        // Find current zone
        Zone* currentZone = findZoneContaining(position);
        String newZoneId = currentZone ? currentZone->id : "";
        
        // Check for zone transitions
        if (newZoneId != currentZoneId_) {
            // Prevent rapid transitions
            if (currentTime - lastTransition_ >= ZONE_TRANSITION_COOLDOWN) {
                // Record transition
                recordTransition(currentZoneId_, newZoneId, position);
                
                // Trigger exit callback for old zone
                if (!currentZoneId_.isEmpty()) {
                    Zone* oldZone = findZone(currentZoneId_);
                    if (oldZone && onZoneExit_) {
                        onZoneExit_(*oldZone, position);
                    }
                }
                
                // Trigger entry callback for new zone
                if (currentZone && onZoneEntry_) {
                    onZoneEntry_(*currentZone, position);
                }
                
                currentZoneId_ = newZoneId;
                lastTransition_ = currentTime;
            }
        }
        
        // Check boundary alerts
        checkBoundaryAlerts(position);
        
        // Analyze movement patterns
        analyzeMovementPatterns();
    }
    
    /**
     * @brief Add circular zone
     */
    bool addCircularZone(const String& id, const String& name, ZoneType type,
                        float centerX, float centerY, float radius) {
        if (zones_.size() >= MAX_ZONES || findZone(id)) {
            return false;
        }
        
        Zone newZone(id, name, type, Point2D(centerX, centerY), radius);
        zones_.push_back(newZone);
        
        DEBUG_PRINTF("ZoneManager: Added circular zone %s at (%.2f, %.2f) radius %.2f\n",
                     name.c_str(), centerX, centerY, radius);
        return true;
    }
    
    /**
     * @brief Add rectangular zone
     */
    bool addRectangularZone(const String& id, const String& name, ZoneType type,
                           float centerX, float centerY, float width, float height) {
        if (zones_.size() >= MAX_ZONES || findZone(id)) {
            return false;
        }
        
        Zone newZone(id, name, "", type, ZONE_SHAPE_RECTANGLE, true, true, ZoneSchedule());
        newZone.center = Point2D(centerX, centerY);
        newZone.width = width;
        newZone.height = height;
        
        zones_.push_back(newZone);
        
        DEBUG_PRINTF("ZoneManager: Added rectangular zone %s at (%.2f, %.2f) size %.2fx%.2f\n",
                     name.c_str(), centerX, centerY, width, height);
        return true;
    }
    
    /**
     * @brief Add polygon zone
     */
    bool addPolygonZone(const String& id, const String& name, ZoneType type,
                       const std::vector<Point2D>& vertices) {
        if (zones_.size() >= MAX_ZONES || findZone(id) || vertices.size() < 3) {
            return false;
        }
        
        Zone newZone(id, name, "", type, ZONE_SHAPE_POLYGON, true, true, ZoneSchedule());
        newZone.vertices = vertices;
        
        // Calculate center as centroid
        float centerX = 0, centerY = 0;
        for (const auto& vertex : vertices) {
            centerX += vertex.x;
            centerY += vertex.y;
        }
        newZone.center = Point2D(centerX / vertices.size(), centerY / vertices.size());
        
        zones_.push_back(newZone);
        
        DEBUG_PRINTF("ZoneManager: Added polygon zone %s with %d vertices\n",
                     name.c_str(), vertices.size());
        return true;
    }
    
    /**
     * @brief Remove zone by ID
     */
    bool removeZone(const String& id) {
        auto it = std::remove_if(zones_.begin(), zones_.end(),
                                [&id](const Zone& zone) {
                                    return zone.id == id;
                                });
        
        if (it != zones_.end()) {
            zones_.erase(it, zones_.end());
            DEBUG_PRINTF("ZoneManager: Removed zone %s\n", id.c_str());
            return true;
        }
        
        return false;
    }
    
    /**
     * @brief Get zone by ID
     */
    const Zone* getZone(const String& id) const {
        for (const auto& zone : zones_) {
            if (zone.id == id) {
                return &zone;
            }
        }
        return nullptr;
    }
    
    /**
     * @brief Get current zone ID
     */
    String getCurrentZoneId() const {
        return currentZoneId_;
    }
    
    /**
     * @brief Get all zones
     */
    const std::vector<Zone>& getAllZones() const {
        return zones_;
    }
    
    /**
     * @brief Get transition history
     */
    const std::vector<ZoneTransition>& getTransitionHistory() const {
        return transitionHistory_;
    }
    
    /**
     * @brief Check if pet is in safe zone
     */
    bool isInSafeZone() const {
        if (currentZoneId_.isEmpty()) return false;
        
        const Zone* currentZone = getZone(currentZoneId_);
        return currentZone && currentZone->type == ZONE_TYPE_SAFE;
    }
    
    /**
     * @brief Set zone entry callback
     */
    void onZoneEntry(ZoneEntryCallback callback) {
        onZoneEntry_ = callback;
    }
    
    /**
     * @brief Set zone exit callback
     */
    void onZoneExit(ZoneExitCallback callback) {
        onZoneExit_ = callback;
    }
    
    /**
     * @brief Set boundary alert callback
     */
    void onBoundaryAlert(BoundaryAlertCallback callback) {
        onBoundaryAlert_ = callback;
    }
    
    /**
     * @brief Set transition callback
     */
    void onTransition(TransitionCallback callback) {
        onTransition_ = callback;
    }
    
    /**
     * @brief Enable/disable movement analysis
     */
    void setMovementAnalysisEnabled(bool enabled) {
        movementAnalysisEnabled_ = enabled;
    }
    
    /**
     * @brief Set boundary tolerance
     */
    void setBoundaryTolerance(float tolerance) {
        boundaryTolerance_ = tolerance;
    }
    
    /**
     * @brief Get zone statistics as JSON
     */
    String getStatistics() const {
        DynamicJsonDocument doc(2048);
        
        doc["total_zones"] = zones_.size();
        doc["current_zone"] = currentZoneId_;
        doc["position_valid"] = positionValid_;
        doc["in_safe_zone"] = isInSafeZone();
        doc["transition_count"] = transitionHistory_.size();
        doc["boundary_tolerance"] = boundaryTolerance_;
        doc["movement_analysis"] = movementAnalysisEnabled_;
        
        if (positionValid_) {
            doc["last_position_x"] = lastPosition_.x;
            doc["last_position_y"] = lastPosition_.y;
            doc["last_position_confidence"] = lastPosition_.confidence;
        }
        
        // Zone type counts
        int safeCo = 0, warningCount = 0, dangerCount = 0;
        for (const auto& zone : zones_) {
            switch (zone.type) {
                case ZONE_TYPE_SAFE: safeCo++; break;
                case ZONE_TYPE_WARNING: warningCount++; break;
                case ZONE_TYPE_DANGER: dangerCount++; break;
                default: break;
            }
        }
        
        doc["safe_zones"] = safeCo;
        doc["warning_zones"] = warningCount;
        doc["danger_zones"] = dangerCount;
        
        String result;
        serializeJson(doc, result);
        return result;
    }
    
    /**
     * @brief Load zones from JSON configuration
     */
    bool loadConfiguration(const String& jsonConfig) {
        DynamicJsonDocument doc(4096);
        DeserializationError error = deserializeJson(doc, jsonConfig);
        
        if (error) {
            DEBUG_PRINTF("ZoneManager: Failed to parse configuration: %s\n", error.c_str());
            return false;
        }
        
        zones_.clear();
        JsonArray zonesArray = doc["zones"];
        
        for (JsonObject zoneObj : zonesArray) {
            Zone zone;
            zone.id = zoneObj["id"].as<String>();
            zone.name = zoneObj["name"].as<String>();
            zone.description = zoneObj["description"].as<String>();
            zone.type = (ZoneType)zoneObj["type"].as<int>();
            zone.shape = (ZoneShape)zoneObj["shape"].as<int>();
            zone.active = zoneObj["active"] | true;
            zone.alertEnabled = zoneObj["alert_enabled"] | true;
            zone.priority = zoneObj["priority"] | 128;
            zone.alertCooldown = zoneObj["alert_cooldown"] | 5000;
            
            // Center
            JsonObject centerObj = zoneObj["center"];
            zone.center.x = centerObj["x"];
            zone.center.y = centerObj["y"];
            
            // Shape-specific parameters
            if (zone.shape == ZONE_SHAPE_CIRCLE) {
                zone.radius = zoneObj["radius"];
            } else if (zone.shape == ZONE_SHAPE_RECTANGLE) {
                zone.width = zoneObj["width"];
                zone.height = zoneObj["height"];
            } else if (zone.shape == ZONE_SHAPE_POLYGON) {
                JsonArray verticesArray = zoneObj["vertices"];
                for (JsonObject vertexObj : verticesArray) {
                    zone.vertices.push_back(Point2D(vertexObj["x"], vertexObj["y"]));
                }
            }
            
            // Schedule
            JsonObject scheduleObj = zoneObj["schedule"];
            if (!scheduleObj.isNull()) {
                zone.schedule.enabled = scheduleObj["enabled"] | false;
                zone.schedule.startHour = scheduleObj["start_hour"] | 0;
                zone.schedule.startMinute = scheduleObj["start_minute"] | 0;
                zone.schedule.endHour = scheduleObj["end_hour"] | 23;
                zone.schedule.endMinute = scheduleObj["end_minute"] | 59;
                zone.schedule.activeDays = scheduleObj["active_days"] | 0x7F;
            }
            
            zones_.push_back(zone);
        }
        
        DEBUG_PRINTF("ZoneManager: Loaded %d zones from configuration\n", zones_.size());
        return true;
    }
    
    /**
     * @brief Save zones to JSON configuration
     */
    String saveConfiguration() const {
        DynamicJsonDocument doc(4096);
        JsonArray zonesArray = doc.createNestedArray("zones");
        
        for (const auto& zone : zones_) {
            zone.toJson(doc);
        }
        
        String result;
        serializeJson(doc, result);
        return result;
    }
    
    /**
     * @brief Clear all zones
     */
    void clearAllZones() {
        zones_.clear();
        currentZoneId_ = "";
        transitionHistory_.clear();
        DEBUG_PRINTLN("ZoneManager: Cleared all zones");
    }
    
    /**
     * @brief Reset zone manager
     */
    void reset() {
        currentZoneId_ = "";
        lastPosition_ = Position2D();
        positionValid_ = false;
        transitionHistory_.clear();
        lastZoneCheck_ = 0;
        lastTransition_ = 0;
        
        DEBUG_PRINTLN("ZoneManager: Reset");
    }
};

#endif // ZONE_MANAGER_H 