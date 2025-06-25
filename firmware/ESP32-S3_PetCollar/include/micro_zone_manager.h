#ifndef MICRO_ZONE_MANAGER_H
#define MICRO_ZONE_MANAGER_H

#include <Arduino.h>
#include <vector>
#include <ArduinoJson.h>
#include "micro_config.h"

// Maximum limits for zone system
#define MAX_ZONES 8
#define MAX_POINTS_PER_ZONE 20
#define ZONE_NAME_MAX_LENGTH 32

// Zone configuration structure
struct ZoneConfig {
  uint8_t triggerRadius;        // Trigger radius in cm (1-50)
  uint8_t alertDelay;           // Alert delay in seconds (0-10)
  AlertMode alertType;          // Alert type (ALERT_VIBRATION, ALERT_SOUND, ALERT_BOTH)
  bool isActive;                // Zone is active for monitoring
  
  ZoneConfig() : 
    triggerRadius(5), 
    alertDelay(3), 
    alertType(ALERT_BOTH), 
    isActive(true) {}
};

// Function declarations
bool addZone(const char* name, const char* color);
bool addZonePoint(const char* zoneId, float x, float y);
bool updateZoneConfig(const char* zoneId, const ZoneConfig& newConfig);

// Zone structure
struct Zone {
  char zoneId[16];
  char name[ZONE_NAME_MAX_LENGTH];
  uint8_t pointCount;
  Point2D points[MAX_POINTS_PER_ZONE];
  char color[8];
  ZoneConfig config;
  bool isComplete;
  unsigned long lastTriggered;
  bool currentlyOccupied;
  
  Zone() : 
    pointCount(0), 
    isComplete(false), 
    lastTriggered(0), 
    currentlyOccupied(false) {
    memset(zoneId, 0, sizeof(zoneId));
    memset(name, 0, sizeof(name));
    memset(color, 0, sizeof(color));
    strcpy(color, "#8B5CF6");
  }
};

// Zone transition structure
struct ZoneTransition {
  char zoneId[16];
  char zoneName[ZONE_NAME_MAX_LENGTH];
  bool entered;                 // true=entered, false=exited
  unsigned long timestamp;
  float positionX;
  float positionY;
  
  ZoneTransition() : entered(false), timestamp(0), positionX(0), positionY(0) {
    memset(zoneId, 0, sizeof(zoneId));
    memset(zoneName, 0, sizeof(zoneName));
  }
};

// Zone manager state
struct ZoneManagerState {
  Zone zones[MAX_ZONES];
  uint8_t activeZoneCount;
  uint8_t currentZoneStates;    // Bitmask for zone occupancy
  uint8_t previousZoneStates;   // Previous state for transition detection
  std::vector<ZoneTransition> recentTransitions;
  unsigned long lastUpdate;
  float lastKnownX, lastKnownY;
  bool positionValid;
  
  ZoneManagerState() : 
    activeZoneCount(0), 
    currentZoneStates(0), 
    previousZoneStates(0), 
    lastUpdate(0), 
    lastKnownX(0), 
    lastKnownY(0), 
    positionValid(false) {}
};

class ZoneManager {
private:
  Zone zones[MAX_ZONES];
  uint8_t activeZoneCount;
  uint8_t currentZoneStates;    // Bitmask for zone occupancy
  uint8_t previousZoneStates;   // Previous state for transition detection
  std::vector<ZoneTransition> recentTransitions;
  unsigned long lastPositionUpdate;
  float lastKnownX, lastKnownY;
  bool positionValid;
  
  // Point-in-polygon algorithm using ray casting
  bool isPointInPolygon(float x, float y, const Zone& zone) const {
    if (zone.pointCount < 3 || !zone.isComplete) {
      return false;
    }
    
    int intersections = 0;
    
    for (int i = 0; i < zone.pointCount; i++) {
      int j = (i + 1) % zone.pointCount;
      
      // Check if ray from point intersects with edge
      if (rayIntersectsSegment(x, y, 
                              zone.points[i].x, zone.points[i].y,
                              zone.points[j].x, zone.points[j].y)) {
        intersections++;
      }
    }
    
    return (intersections % 2) == 1;
  }
  
  // Ray casting helper function
  bool rayIntersectsSegment(float px, float py, 
                           float x1, float y1, 
                           float x2, float y2) const {
    // Check if point is on the same horizontal line as segment
    if (y1 == y2) return false;
    
    // Check if ray intersects segment vertically
    if (py < min(y1, y2) || py >= max(y1, y2)) return false;
    
    // Calculate intersection point
    float intersectionX = x1 + (py - y1) * (x2 - x1) / (y2 - y1);
    
    // Ray extends to the right, so intersection must be to the right of point
    return intersectionX > px;
  }
  
  // Process zone transitions
  void processZoneTransitions(uint8_t enteredZones, uint8_t exitedZones) {
    unsigned long currentTime = millis();
    
    // Handle zone entries
    for (int i = 0; i < activeZoneCount; i++) {
      if (enteredZones & (1 << i)) {
        zones[i].currentlyOccupied = true;
        zones[i].lastTriggered = currentTime;
        
        // Create transition event
        ZoneTransition transition;
        strcpy(transition.zoneId, zones[i].zoneId);
        strcpy(transition.zoneName, zones[i].name);
        transition.entered = true;
        transition.timestamp = currentTime;
        transition.positionX = lastKnownX;
        transition.positionY = lastKnownY;
        
        recentTransitions.push_back(transition);
        
        // Trigger zone-specific alert if configured
        if (zones[i].config.isActive) {
          triggerZoneAlert(zones[i], true);
        }
        
        DEBUG_PRINTF("🟢 Entered zone: %s (%s)\n", zones[i].name, zones[i].zoneId);
      }
    }
    
    // Handle zone exits
    for (int i = 0; i < activeZoneCount; i++) {
      if (exitedZones & (1 << i)) {
        zones[i].currentlyOccupied = false;
        
        // Create transition event
        ZoneTransition transition;
        strcpy(transition.zoneId, zones[i].zoneId);
        strcpy(transition.zoneName, zones[i].name);
        transition.entered = false;
        transition.timestamp = currentTime;
        transition.positionX = lastKnownX;
        transition.positionY = lastKnownY;
        
        recentTransitions.push_back(transition);
        
        // Stop zone-specific alert if configured
        if (zones[i].config.isActive) {
          triggerZoneAlert(zones[i], false);
        }
        
        DEBUG_PRINTF("🔴 Exited zone: %s (%s)\n", zones[i].name, zones[i].zoneId);
      }
    }
    
    // Limit transition history to last 50 events
    while (recentTransitions.size() > 50) {
      recentTransitions.erase(recentTransitions.begin());
    }
  }
  
  // Trigger zone-specific alert
  void triggerZoneAlert(const Zone& zone, bool entering) {
    // This will be integrated with the existing AlertManager
    // For now, just log the event
    DEBUG_PRINTF("🚨 Zone alert: %s %s zone %s\n", 
                 entering ? "Entered" : "Exited",
                 entering ? "into" : "from",
                 zone.name);
  }

public:
  ZoneManager() : 
    activeZoneCount(0), 
    currentZoneStates(0), 
    previousZoneStates(0),
    lastPositionUpdate(0),
    lastKnownX(0),
    lastKnownY(0),
    positionValid(false) {}
  
  // Initialize zone manager
  bool begin() {
    DEBUG_PRINTF("🗺️ Zone Manager initializing...\n");
    
    // Clear all zones
    for (int i = 0; i < MAX_ZONES; i++) {
      zones[i] = Zone();
    }
    
    activeZoneCount = 0;
    currentZoneStates = 0;
    previousZoneStates = 0;
    recentTransitions.clear();
    
    DEBUG_PRINTF("✅ Zone Manager initialized\n");
    return true;
  }
  
  // Update position and process zones
  void updatePosition(float x, float y, bool valid = true) {
    lastKnownX = x;
    lastKnownY = y;
    positionValid = valid;
    lastPositionUpdate = millis();
    
    if (!valid || activeZoneCount == 0) {
      return;
    }
    
    // Calculate new zone states
    uint8_t newZoneStates = 0;
    
    for (int i = 0; i < activeZoneCount; i++) {
      if (zones[i].config.isActive && isPointInPolygon(x, y, zones[i])) {
        newZoneStates |= (1 << i);
      }
    }
    
    // Detect transitions
    uint8_t enteredZones = newZoneStates & ~currentZoneStates;
    uint8_t exitedZones = currentZoneStates & ~newZoneStates;
    
    // Process transitions if any occurred
    if (enteredZones || exitedZones) {
      processZoneTransitions(enteredZones, exitedZones);
    }
    
    // Update states
    previousZoneStates = currentZoneStates;
    currentZoneStates = newZoneStates;
  }
  
  // Load zones from JSON configuration
  bool loadZonesFromJson(const String& jsonConfig) {
    DynamicJsonDocument doc(4096);
    DeserializationError error = deserializeJson(doc, jsonConfig);
    
    if (error) {
      DEBUG_PRINTF("❌ Failed to parse zone JSON: %s\n", error.c_str());
      return false;
    }
    
    // Clear existing zones
    activeZoneCount = 0;
    
    JsonArray zonesArray = doc["zones"];
    if (zonesArray.isNull()) {
      DEBUG_PRINTF("❌ No zones array found in JSON\n");
      return false;
    }
    
    for (JsonObject zoneObj : zonesArray) {
      if (activeZoneCount >= MAX_ZONES) {
        DEBUG_PRINTF("⚠️ Maximum zones reached, skipping additional zones\n");
        break;
      }
      
      Zone& zone = zones[activeZoneCount];
      
      // Parse zone properties
      String id = zoneObj["id"] | "";
      String name = zoneObj["name"] | "";
      String color = zoneObj["color"] | "#8B5CF6";
      bool isComplete = zoneObj["isComplete"] | false;
      
      if (id.length() == 0 || name.length() == 0 || !isComplete) {
        DEBUG_PRINTF("⚠️ Skipping incomplete zone: %s\n", name.c_str());
        continue;
      }
      
      // Copy basic properties
      strncpy(zone.zoneId, id.c_str(), sizeof(zone.zoneId) - 1);
      strncpy(zone.name, name.c_str(), sizeof(zone.name) - 1);
      strncpy(zone.color, color.c_str(), sizeof(zone.color) - 1);
      zone.isComplete = isComplete;
      
      // Parse points
      JsonArray pointsArray = zoneObj["points"];
      zone.pointCount = 0;
      
      for (JsonObject pointObj : pointsArray) {
        if (zone.pointCount >= MAX_POINTS_PER_ZONE) break;
        
        float x = pointObj["x"] | 0.0f;
        float y = pointObj["y"] | 0.0f;
        
        zone.points[zone.pointCount] = Point2D(x, y);
        zone.pointCount++;
      }
      
      if (zone.pointCount >= 3) {
        activeZoneCount++;
        DEBUG_PRINTF("✅ Loaded zone: %s (%d points)\n", zone.name, zone.pointCount);
      } else {
        DEBUG_PRINTF("⚠️ Zone %s has insufficient points (%d)\n", zone.name, zone.pointCount);
      }
    }
    
    DEBUG_PRINTF("📍 Loaded %d zones successfully\n", activeZoneCount);
    return true;
  }
  
  // Get zone status as JSON
  String getZoneStatusJson() const {
    DynamicJsonDocument doc(2048);
    
    doc["activeZoneCount"] = activeZoneCount;
    doc["currentZoneStates"] = currentZoneStates;
    doc["positionValid"] = positionValid;
    doc["lastKnownX"] = lastKnownX;
    doc["lastKnownY"] = lastKnownY;
    doc["lastUpdate"] = lastPositionUpdate;
    
    JsonArray zonesArray = doc.createNestedArray("zones");
    for (int i = 0; i < activeZoneCount; i++) {
      JsonObject zoneObj = zonesArray.createNestedObject();
      zoneObj["id"] = zones[i].zoneId;
      zoneObj["name"] = zones[i].name;
      zoneObj["occupied"] = zones[i].currentlyOccupied;
      zoneObj["lastTriggered"] = zones[i].lastTriggered;
      zoneObj["pointCount"] = zones[i].pointCount;
      zoneObj["isActive"] = zones[i].config.isActive;
    }
    
    JsonArray transitionsArray = doc.createNestedArray("recentTransitions");
    for (const auto& transition : recentTransitions) {
      JsonObject transObj = transitionsArray.createNestedObject();
      transObj["zoneId"] = transition.zoneId;
      transObj["zoneName"] = transition.zoneName;
      transObj["entered"] = transition.entered;
      transObj["timestamp"] = transition.timestamp;
      transObj["x"] = transition.positionX;
      transObj["y"] = transition.positionY;
    }
    
    String result;
    serializeJson(doc, result);
    return result;
  }
  
  // Get current zone occupancy
  uint8_t getCurrentZoneStates() const {
    return currentZoneStates;
  }
  
  // Get number of active zones
  uint8_t getActiveZoneCount() const {
    return activeZoneCount;
  }
  
  // Check if pet is in any zone
  bool isInAnyZone() const {
    return currentZoneStates != 0;
  }
  
  // Get zones pet is currently in
  std::vector<String> getCurrentZoneNames() const {
    std::vector<String> zoneNames;
    
    for (int i = 0; i < activeZoneCount; i++) {
      if (currentZoneStates & (1 << i)) {
        zoneNames.push_back(String(zones[i].name));
      }
    }
    
    return zoneNames;
  }
  
  // Get recent transitions
  const std::vector<ZoneTransition>& getRecentTransitions() const {
    return recentTransitions;
  }
  
  // Clear all zones
  void clearAllZones() {
    activeZoneCount = 0;
    currentZoneStates = 0;
    previousZoneStates = 0;
    recentTransitions.clear();
    
    for (int i = 0; i < MAX_ZONES; i++) {
      zones[i] = Zone();
    }
    
    DEBUG_PRINTF("🗑️ All zones cleared\n");
  }
  
  // Performance monitoring
  unsigned long getLastUpdateTime() const {
    return lastPositionUpdate;
  }
  
  bool isPositionValid() const {
    return positionValid;
  }
};

#endif // MICRO_ZONE_MANAGER_H 