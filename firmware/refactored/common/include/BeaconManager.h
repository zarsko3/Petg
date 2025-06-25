/**
 * @file BeaconManager.h
 * @brief Enhanced Beacon Management System
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * This class manages BLE beacon detection, tracking, and location-based grouping
 * for the pet collar system. It provides a clean API for beacon operations
 * and maintains state for proximity detection.
 * 
 * Features:
 * - Efficient beacon detection and tracking
 * - Location-based beacon grouping
 * - RSSI-based distance estimation
 * - Beacon metadata parsing
 * - Memory-efficient storage
 * - Configurable filtering and timeouts
 */

#ifndef BEACON_MANAGER_H
#define BEACON_MANAGER_H

#include <Arduino.h>
#include <vector>
#include <map>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include "PetCollarConfig.h"
#include "Utils.h"

// ==========================================
// BEACON DATA STRUCTURES
// ==========================================

/**
 * @brief Enhanced beacon information structure
 * 
 * Contains all information about a detected beacon including
 * parsed location data, signal strength, and timing information.
 */
struct BeaconInfo {
    String fullName;           ///< Complete beacon name (e.g., "PetZone-Home-01")
    String location;           ///< Extracted location (e.g., "Home")
    String beaconId;          ///< Extracted ID (e.g., "01")
    String zone;              ///< Optional zone for hierarchical naming
    String address;           ///< MAC address
    
    // Signal information
    int rssi;                 ///< Signal strength in dBm
    float distance;           ///< Estimated distance in cm
    
    // Timing information
    unsigned long firstDetected;  ///< When first detected (millis)
    unsigned long lastSeen;       ///< Last seen timestamp (millis)
    unsigned long lastUpdate;     ///< Last data update (millis)
    
    // State information
    bool isActive;            ///< Currently responding
    bool hasMetadata;         ///< Contains additional metadata
    uint8_t metadata[8];      ///< Raw metadata bytes
    int priority;             ///< Beacon priority (0=highest)
    
    /**
     * @brief Default constructor
     */
    BeaconInfo() : 
        fullName(""),
        location("Unknown"),
        beaconId("00"),
        zone(""),
        address(""),
        rssi(-100),
        distance(999.0),
        firstDetected(0),
        lastSeen(0),
        lastUpdate(0),
        isActive(false),
        hasMetadata(false),
        priority(99) {
        memset(metadata, 0, sizeof(metadata));
    }
    
    /**
     * @brief Update beacon information
     * @param newRssi New RSSI value
     * @param newMetadata Optional metadata (can be nullptr)
     */
    void update(int newRssi, const uint8_t* newMetadata = nullptr) {
        rssi = newRssi;
        distance = rssiToDistance(rssi);
        lastSeen = millis();
        lastUpdate = millis();
        isActive = true;
        
        if (newMetadata != nullptr) {
            hasMetadata = true;
            memcpy(metadata, newMetadata, sizeof(metadata));
        }
    }
    
    /**
     * @brief Check if beacon has expired
     * @param timeoutMs Timeout in milliseconds
     * @return true if beacon has expired
     */
    bool isExpired(unsigned long timeoutMs = BLE_DEVICE_TIMEOUT) const {
        return (millis() - lastSeen) > timeoutMs;
    }
    
    /**
     * @brief Get age in milliseconds since last seen
     * @return Age in milliseconds
     */
    unsigned long getAge() const {
        return millis() - lastSeen;
    }
};

/**
 * @brief Location group structure
 * 
 * Groups beacons by location for easier management and
 * provides aggregate information about each location.
 */
struct LocationGroup {
    String name;              ///< Location name
    std::vector<BeaconInfo*> beacons;  ///< Pointers to beacons in this location
    
    // Aggregate statistics
    int activeCount;          ///< Number of active beacons
    int totalCount;           ///< Total beacons in location
    float averageRssi;        ///< Average RSSI of active beacons
    float closestDistance;    ///< Distance to closest beacon
    bool isInRange;           ///< Any beacon within proximity threshold
    
    /**
     * @brief Default constructor
     */
    LocationGroup() : 
        name(""),
        activeCount(0),
        totalCount(0),
        averageRssi(-100.0),
        closestDistance(999.0),
        isInRange(false) {}
    
    /**
     * @brief Update location statistics
     */
    void updateStats() {
        activeCount = 0;
        totalCount = beacons.size();
        float rssiSum = 0;
        closestDistance = 999.0;
        isInRange = false;
        
        for (auto* beacon : beacons) {
            if (beacon->isActive && !beacon->isExpired()) {
                activeCount++;
                rssiSum += beacon->rssi;
                
                if (beacon->distance < closestDistance) {
                    closestDistance = beacon->distance;
                }
                
                if (beacon->rssi > PROXIMITY_RSSI_THRESHOLD) {
                    isInRange = true;
                }
            }
        }
        
        averageRssi = (activeCount > 0) ? (rssiSum / activeCount) : -100.0;
    }
};

// ==========================================
// BEACON MANAGER CLASS
// ==========================================

/**
 * @brief Main beacon management class
 * 
 * Handles all aspects of BLE beacon detection, tracking, and management.
 * Provides a clean API for the rest of the system to interact with beacons.
 */
class BeaconManager {
private:
    // Storage
    std::vector<BeaconInfo> beacons_;          ///< All detected beacons
    std::map<String, LocationGroup> locations_; ///< Location-grouped beacons
    
    // State
    unsigned long lastScan_;                   ///< Last scan timestamp
    unsigned long lastCleanup_;                ///< Last cleanup timestamp
    bool isScanning_;                          ///< Currently scanning
    
    // Statistics
    int totalDetections_;                      ///< Total detections since start
    int uniqueBeacons_;                        ///< Unique beacons detected
    
    /**
     * @brief Parse beacon name and extract components
     * @param beacon Beacon to parse
     */
    void parseBeaconName(BeaconInfo& beacon) {
        beacon.location = extractLocation(beacon.fullName);
        beacon.beaconId = extractBeaconId(beacon.fullName);
        beacon.zone = extractZone(beacon.fullName);
        beacon.priority = calculatePriority(beacon);
    }
    
    /**
     * @brief Calculate beacon priority based on location and function
     * @param beacon Beacon to calculate priority for
     * @return Priority value (0=highest)
     */
    int calculatePriority(const BeaconInfo& beacon) {
        // Priority based on location and special functions
        if (beacon.location == "Safe") return 1;
        if (beacon.location == "Alert") return 2;
        if (beacon.location == "Home") return 3;
        if (beacon.location == "Garden") return 4;
        return 5;
    }
    
    /**
     * @brief Update location groups
     */
    void updateLocationGroups() {
        // Clear existing groups
        locations_.clear();
        
        // Rebuild groups from current beacons
        for (auto& beacon : beacons_) {
            String loc = beacon.location;
            
            // Create location group if it doesn't exist
            if (locations_.find(loc) == locations_.end()) {
                locations_[loc] = LocationGroup();
                locations_[loc].name = loc;
            }
            
            // Add beacon to group
            locations_[loc].beacons.push_back(&beacon);
        }
        
        // Update statistics for all groups
        for (auto& pair : locations_) {
            pair.second.updateStats();
        }
    }
    
    /**
     * @brief Remove expired beacons
     * @return Number of beacons removed
     */
    int removeExpiredBeacons() {
        int removedCount = 0;
        unsigned long currentTime = millis();
        
        auto it = beacons_.begin();
        while (it != beacons_.end()) {
            if (it->isExpired()) {
                DEBUG_PRINTF("Beacon expired: %s (%s)\n", 
                           it->fullName.c_str(), it->address.c_str());
                it = beacons_.erase(it);
                removedCount++;
            } else {
                ++it;
            }
        }
        
        return removedCount;
    }

public:
    /**
     * @brief Constructor
     */
    BeaconManager() : 
        lastScan_(0),
        lastCleanup_(0),
        isScanning_(false),
        totalDetections_(0),
        uniqueBeacons_(0) {}
    
    /**
     * @brief Initialize the beacon manager
     * @return true if successful
     */
    bool begin() {
        DEBUG_PRINTLN("BeaconManager: Initializing...");
        
        // Initialize BLE
        if (!BLEDevice::getInitialized()) {
            BLEDevice::init("");
        }
        
        DEBUG_PRINTLN("BeaconManager: Ready");
        return true;
    }
    
    /**
     * @brief Update beacon manager (call regularly)
     */
    void update() {
        unsigned long currentTime = millis();
        
        // Periodic cleanup of expired beacons
        if (currentTime - lastCleanup_ > 30000) { // Every 30 seconds
            int removed = removeExpiredBeacons();
            if (removed > 0) {
                updateLocationGroups();
            }
            lastCleanup_ = currentTime;
        }
        
        // Update location groups periodically
        if (currentTime - lastScan_ > 5000) { // Every 5 seconds
            updateLocationGroups();
        }
    }
    
    /**
     * @brief Add or update a beacon
     * @param name Beacon name
     * @param address Beacon MAC address
     * @param rssi Signal strength
     * @param metadata Optional metadata (can be nullptr)
     */
    void updateBeacon(const String& name, const String& address, int rssi, 
                     const uint8_t* metadata = nullptr) {
        
        // Validate inputs
        if (name.length() == 0 || address.length() == 0 || !isValidRSSI(rssi)) {
            return;
        }
        
        // Find existing beacon by address
        for (auto& beacon : beacons_) {
            if (beacon.address == address) {
                // Update existing beacon
                beacon.fullName = name;
                parseBeaconName(beacon);
                beacon.update(rssi, metadata);
                return;
            }
        }
        
        // Check if we're at capacity
        if (beacons_.size() >= MAX_BEACONS) {
            DEBUG_PRINTLN("BeaconManager: At capacity, cannot add more beacons");
            return;
        }
        
        // Add new beacon
        BeaconInfo newBeacon;
        newBeacon.fullName = name;
        newBeacon.address = address;
        newBeacon.firstDetected = millis();
        parseBeaconName(newBeacon);
        newBeacon.update(rssi, metadata);
        
        beacons_.push_back(newBeacon);
        totalDetections_++;
        uniqueBeacons_ = beacons_.size();
        
        DEBUG_PRINTF("BeaconManager: New beacon: %s [%s-%s] at %s (RSSI: %d)\n", 
                     name.c_str(), newBeacon.location.c_str(), 
                     newBeacon.beaconId.c_str(), address.c_str(), rssi);
    }
    
    /**
     * @brief Get all beacons
     * @return Vector of all beacons
     */
    const std::vector<BeaconInfo>& getAllBeacons() const {
        return beacons_;
    }
    
    /**
     * @brief Get beacons by location
     * @param location Location name
     * @return Vector of beacons in the specified location
     */
    std::vector<BeaconInfo*> getBeaconsByLocation(const String& location) const {
        std::vector<BeaconInfo*> result;
        
        for (const auto& beacon : beacons_) {
            if (beacon.location == location && beacon.isActive && !beacon.isExpired()) {
                result.push_back(const_cast<BeaconInfo*>(&beacon));
            }
        }
        
        return result;
    }
    
    /**
     * @brief Get closest beacon in each location
     * @return Map of location to closest beacon
     */
    std::map<String, BeaconInfo*> getClosestByLocation() const {
        std::map<String, BeaconInfo*> result;
        
        for (const auto& beacon : beacons_) {
            if (!beacon.isActive || beacon.isExpired()) continue;
            
            String loc = beacon.location;
            if (result.find(loc) == result.end() || 
                beacon.rssi > result[loc]->rssi) {
                result[loc] = const_cast<BeaconInfo*>(&beacon);
            }
        }
        
        return result;
    }
    
    /**
     * @brief Check if in specific location
     * @param location Location name to check
     * @param rssiThreshold RSSI threshold for proximity
     * @return true if any beacon in location is within threshold
     */
    bool isInLocation(const String& location, int rssiThreshold = PROXIMITY_RSSI_THRESHOLD) const {
        for (const auto& beacon : beacons_) {
            if (beacon.location == location && 
                beacon.isActive && 
                !beacon.isExpired() && 
                beacon.rssi > rssiThreshold) {
                return true;
            }
        }
        return false;
    }
    
    /**
     * @brief Get location groups
     * @return Map of location groups
     */
    const std::map<String, LocationGroup>& getLocationGroups() const {
        return locations_;
    }
    
    /**
     * @brief Get beacon count
     * @return Total number of tracked beacons
     */
    int getBeaconCount() const {
        return beacons_.size();
    }
    
    /**
     * @brief Get active beacon count
     * @return Number of currently active beacons
     */
    int getActiveBeaconCount() const {
        int count = 0;
        for (const auto& beacon : beacons_) {
            if (beacon.isActive && !beacon.isExpired()) {
                count++;
            }
        }
        return count;
    }
    
    /**
     * @brief Get location count
     * @return Number of unique locations
     */
    int getLocationCount() const {
        return locations_.size();
    }
    
    /**
     * @brief Clear all beacons
     */
    void clear() {
        beacons_.clear();
        locations_.clear();
        totalDetections_ = 0;
        uniqueBeacons_ = 0;
        DEBUG_PRINTLN("BeaconManager: Cleared all beacons");
    }
    
    /**
     * @brief Get statistics as JSON string
     * @return JSON formatted statistics
     */
    String getStatsAsJson() const {
        String json = "{";
        json += "\"totalBeacons\":" + String(beacons_.size()) + ",";
        json += "\"activeBeacons\":" + String(getActiveBeaconCount()) + ",";
        json += "\"locations\":" + String(locations_.size()) + ",";
        json += "\"totalDetections\":" + String(totalDetections_) + ",";
        json += "\"uptime\":" + String(millis());
        json += "}";
        return json;
    }
    
    /**
     * @brief Get beacons as JSON string
     * @return JSON formatted beacon list
     */
    String getBeaconsAsJson() const {
        String json = "{\"beacons\":[";
        bool first = true;
        
        for (const auto& beacon : beacons_) {
            if (!beacon.isActive || beacon.isExpired()) continue;
            
            if (!first) json += ",";
            first = false;
            
            json += "{";
            json += "\"name\":\"" + beacon.fullName + "\",";
            json += "\"location\":\"" + beacon.location + "\",";
            json += "\"id\":\"" + beacon.beaconId + "\",";
            json += "\"rssi\":" + String(beacon.rssi) + ",";
            json += "\"distance\":" + String(beacon.distance, 1) + ",";
            json += "\"age\":" + String(beacon.getAge());
            json += "}";
        }
        
        json += "]}";
        return json;
    }
};

#endif // BEACON_MANAGER_H 