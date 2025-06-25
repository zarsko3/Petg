#ifndef MICRO_BEACON_MANAGER_H
#define MICRO_BEACON_MANAGER_H

#include <Arduino.h>
#include <string>
#include <vector>
#include <map>
#include "micro_config.h"

// Enhanced beacon information with location context
struct EnhancedBeaconInfo {
  String fullName;           // Full beacon name (e.g., "PetZone-Home-01")
  String location;           // Extracted location (e.g., "Home")
  String beaconId;          // Extracted ID (e.g., "01")
  String address;           // MAC address
  int rssi;                 // Signal strength
  float distance;           // Estimated distance
  unsigned long firstDetectedTime;
  unsigned long lastSeenTime;
  bool hasMetadata;
  uint8_t metadata[8];
  
  // Derived properties
  String zone;              // For hierarchical naming (e.g., "Living")
  String function;          // For functional naming (e.g., "Safe")
  int priority;             // Beacon priority (0=highest)
  bool isActive;            // Currently active/responding
  
  EnhancedBeaconInfo() : 
    fullName(""), 
    location("Unknown"),
    beaconId("00"),
    address(""),
    rssi(-100), 
    distance(0), 
    firstDetectedTime(0), 
    lastSeenTime(0), 
    hasMetadata(false),
    zone(""),
    function(""),
    priority(99),
    isActive(false) {
    memset(metadata, 0, sizeof(metadata));
  }
};

// Location-based beacon grouping
struct BeaconLocation {
  String name;              // Location name (e.g., "Home")
  std::vector<EnhancedBeaconInfo> beacons;
  int activeCount;          // Number of active beacons
  float averageRssi;        // Average signal strength
  bool isInRange;           // Any beacon in proximity range
  
  BeaconLocation() : name(""), activeCount(0), averageRssi(-100), isInRange(false) {}
};

// Beacon structure definition
struct Beacon {
  String name;
  int rssi;
  float distance;
  String address;
  unsigned long lastSeen;
  
  Beacon() : 
    rssi(0), 
    distance(0), 
    lastSeen(0) {}
};

// BLE scanning constants
#define BLE_SCAN_TIME 1
#define MIN_BEACONS_FOR_TRIANGULATION 3
#define RSSI_TO_DISTANCE_FACTOR -69.0
#define RSSI_TO_DISTANCE_EXPONENT 2.5
#define MAX_TRIANGULATION_DISTANCE 20.0

class BeaconManager {
private:
  std::vector<EnhancedBeaconInfo> allBeacons;
  std::map<String, BeaconLocation> locationGroups;
  unsigned long lastUpdate;
  
  // Name parsing functions
  String extractLocation(const String& beaconName) {
    if (beaconName.startsWith("PetZone-")) {
      int firstDash = beaconName.indexOf('-', 8);
      int secondDash = beaconName.indexOf('-', firstDash + 1);
      if (secondDash > 0) {
        return beaconName.substring(8, secondDash);
      } else if (firstDash > 0) {
        return beaconName.substring(8, firstDash);
      }
    }
    return "Unknown";
  }
  
  String extractBeaconId(const String& beaconName) {
    int lastDash = beaconName.lastIndexOf('-');
    if (lastDash > 0 && lastDash < beaconName.length() - 1) {
      return beaconName.substring(lastDash + 1);
    }
    return "00";
  }
  
  String extractZone(const String& beaconName) {
    // For hierarchical naming: PetZone-Home-Living-01
    if (beaconName.startsWith("PetZone-")) {
      int firstDash = beaconName.indexOf('-', 8);
      int secondDash = beaconName.indexOf('-', firstDash + 1);
      int thirdDash = beaconName.indexOf('-', secondDash + 1);
      
      if (thirdDash > 0) {
        return beaconName.substring(secondDash + 1, thirdDash);
      }
    }
    return "";
  }
  
  String extractFunction(const String& beaconName) {
    // For functional naming: PetZone-Safe-01
    String location = extractLocation(beaconName);
    if (location == "Safe" || location == "Alert" || 
        location == "Track" || location == "Feed") {
      return location;
    }
    return "";
  }
  
  int calculatePriority(const EnhancedBeaconInfo& beacon) {
    // Priority based on function and location
    if (beacon.function == "Safe") return 1;
    if (beacon.function == "Alert") return 2;
    if (beacon.location == "Home") return 3;
    if (beacon.location == "Garden") return 4;
    return 5;
  }
  
  void updateLocationGroups() {
    locationGroups.clear();
    
    for (const auto& beacon : allBeacons) {
      String loc = beacon.location;
      
      if (locationGroups.find(loc) == locationGroups.end()) {
        locationGroups[loc] = BeaconLocation();
        locationGroups[loc].name = loc;
      }
      
      locationGroups[loc].beacons.push_back(beacon);
      if (beacon.isActive) {
        locationGroups[loc].activeCount++;
        locationGroups[loc].averageRssi = 
          (locationGroups[loc].averageRssi + beacon.rssi) / 2;
        
        if (beacon.rssi > PROXIMITY_RSSI_THRESHOLD) {
          locationGroups[loc].isInRange = true;
        }
      }
    }
  }

public:
  BeaconManager() : lastUpdate(0) {}
  
  // Add or update a beacon
  void updateBeacon(const String& name, const String& address, int rssi, 
                   bool hasMetadata = false, const uint8_t* metadata = nullptr) {
    
    // Find existing beacon by address
    for (auto& beacon : allBeacons) {
      if (beacon.address == address) {
        // Update existing beacon
        beacon.fullName = name;
        beacon.location = extractLocation(name);
        beacon.beaconId = extractBeaconId(name);
        beacon.rssi = rssi;
        beacon.distance = rssiToDistance(rssi);
        beacon.lastSeenTime = millis();
        beacon.isActive = true;
        
        if (hasMetadata && metadata) {
          beacon.hasMetadata = true;
          memcpy(beacon.metadata, metadata, 8);
        }
        
        updateLocationGroups();
        return;
      }
    }
    
    // Add new beacon
    if (allBeacons.size() >= BLE_MAX_BEACONS) {
      return; // At capacity
    }
    
    EnhancedBeaconInfo newBeacon;
    newBeacon.fullName = name;
    newBeacon.location = extractLocation(name);
    newBeacon.beaconId = extractBeaconId(name);
    newBeacon.zone = extractZone(name);
    newBeacon.function = extractFunction(name);
    newBeacon.address = address;
    newBeacon.rssi = rssi;
    newBeacon.distance = rssiToDistance(rssi);
    newBeacon.firstDetectedTime = millis();
    newBeacon.lastSeenTime = millis();
    newBeacon.isActive = true;
    newBeacon.priority = calculatePriority(newBeacon);
    
    if (hasMetadata && metadata) {
      newBeacon.hasMetadata = true;
      memcpy(newBeacon.metadata, metadata, 8);
    }
    
    allBeacons.push_back(newBeacon);
    updateLocationGroups();
    
    DEBUG_PRINTF("New beacon: %s [%s-%s] at %s (RSSI: %d)\n", 
                 name.c_str(), newBeacon.location.c_str(), 
                 newBeacon.beaconId.c_str(), address.c_str(), rssi);
  }
  
  // Remove expired beacons
  void removeExpiredBeacons() {
    unsigned long currentTime = millis();
    const unsigned long BEACON_EXPIRY_TIME = 10000; // 10 seconds
    
    for (auto it = allBeacons.begin(); it != allBeacons.end(); ) {
      if (currentTime - it->lastSeenTime > BEACON_EXPIRY_TIME) {
        DEBUG_PRINTF("Beacon expired: %s (%s)\n", 
                     it->fullName.c_str(), it->address.c_str());
        it = allBeacons.erase(it);
      } else {
        ++it;
      }
    }
    updateLocationGroups();
  }
  
  // Get beacons by location
  std::vector<EnhancedBeaconInfo> getBeaconsByLocation(const String& location) const {
    std::vector<EnhancedBeaconInfo> result;
    for (const auto& beacon : allBeacons) {
      if (beacon.location == location && beacon.isActive) {
        result.push_back(beacon);
      }
    }
    return result;
  }
  
  // Get beacons by function
  std::vector<EnhancedBeaconInfo> getBeaconsByFunction(const String& function) const {
    std::vector<EnhancedBeaconInfo> result;
    for (const auto& beacon : allBeacons) {
      if (beacon.function == function && beacon.isActive) {
        result.push_back(beacon);
      }
    }
    return result;
  }
  
  // Get closest beacon in each location
  std::map<String, EnhancedBeaconInfo> getClosestByLocation() const {
    std::map<String, EnhancedBeaconInfo> result;
    
    for (const auto& beacon : allBeacons) {
      if (!beacon.isActive) continue;
      
      String loc = beacon.location;
      if (result.find(loc) == result.end() || 
          beacon.rssi > result[loc].rssi) {
        result[loc] = beacon;
      }
    }
    return result;
  }
  
  // Check if in specific location
  bool isInLocation(const String& location, int rssiThreshold = PROXIMITY_RSSI_THRESHOLD) const {
    for (const auto& beacon : allBeacons) {
      if (beacon.location == location && beacon.isActive && 
          beacon.rssi > rssiThreshold) {
        return true;
      }
    }
    return false;
  }
  
  // Get location summary
  String getLocationSummary() const {
    String summary = "Locations: ";
    bool first = true;
    
    for (const auto& pair : locationGroups) {
      if (!first) summary += ", ";
      first = false;
      
      const BeaconLocation& loc = pair.second;
      summary += loc.name + "(" + String(loc.activeCount) + ")";
      if (loc.isInRange) summary += "*";
    }
    return summary;
  }
  
  // Generate enhanced JSON with location grouping
  String getBeaconsAsJson() const {
    String json = "{\"locations\":{";
    bool firstLoc = true;
    
    for (const auto& pair : locationGroups) {
      if (!firstLoc) json += ",";
      firstLoc = false;
      
      const BeaconLocation& loc = pair.second;
      json += "\"" + loc.name + "\":{";
      json += "\"activeCount\":" + String(loc.activeCount) + ",";
      json += "\"averageRssi\":" + String(loc.averageRssi) + ",";
      json += "\"inRange\":" + String(loc.isInRange ? "true" : "false") + ",";
      json += "\"beacons\":[";
      
      bool firstBeacon = true;
      for (const auto& beacon : loc.beacons) {
        if (!firstBeacon) json += ",";
        firstBeacon = false;
        
        json += "{";
        json += "\"name\":\"" + beacon.fullName + "\",";
        json += "\"id\":\"" + beacon.beaconId + "\",";
        json += "\"zone\":\"" + beacon.zone + "\",";
        json += "\"function\":\"" + beacon.function + "\",";
        json += "\"address\":\"" + beacon.address + "\",";
        json += "\"rssi\":" + String(beacon.rssi) + ",";
        json += "\"distance\":" + String(beacon.distance) + ",";
        json += "\"priority\":" + String(beacon.priority) + ",";
        json += "\"active\":" + String(beacon.isActive ? "true" : "false");
        json += "}";
      }
      json += "]}";
    }
    json += "}}";
    return json;
  }
  
  // Get all active beacons (for compatibility)
  const std::vector<EnhancedBeaconInfo>& getAllBeacons() const {
    return allBeacons;
  }
  
  // Get beacon count
  int getBeaconCount() const {
    int count = 0;
    for (const auto& beacon : allBeacons) {
      if (beacon.isActive) count++;
    }
    return count;
  }
  
  // Get location count
  int getLocationCount() const {
    return locationGroups.size();
  }

private:
  // Convert RSSI to distance (same as original)
  double rssiToDistance(int rssi, int txPower = -59) {
    if (rssi == 0) return -1.0;
    
    double ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
      return pow(ratio, 10);
    } else {
      double accuracy = (0.89976) * pow(ratio, 7.7095) + 0.111;
      return accuracy;
    }
  }
};

#endif // MICRO_BEACON_MANAGER_H 