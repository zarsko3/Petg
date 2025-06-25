#ifndef BEACON_MANAGER_H
#define BEACON_MANAGER_H

/**
 * @file BeaconManager.h
 * @brief Enhanced BLE Beacon Management system for ESP32-S3 Pet Collar
 * @version 3.1.0
 * @date 2024
 * 
 * This class provides comprehensive BLE beacon management including:
 * - Enhanced beacon detection and tracking
 * - Location-based beacon grouping
 * - RSSI-based distance estimation
 * - Beacon metadata extraction and processing
 * - Triangulation support for positioning
 */

#include <Arduino.h>
#include <vector>
#include <map>
#include <string>
#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include "ESP32_S3_Config.h"
#include "MicroConfig.h"

// ==========================================
// BEACON DATA STRUCTURES
// ==========================================

/**
 * @brief Enhanced beacon information with metadata
 */
struct BeaconInfo {
    String deviceName;        ///< Full beacon device name
    String macAddress;        ///< MAC address (unique identifier)
    String location;          ///< Extracted location name
    String beaconId;          ///< Extracted beacon ID
    String zone;              ///< Zone/area within location
    String function;          ///< Functional classification
    
    // Signal information
    int32_t rssi;             ///< Signal strength (dBm)
    float estimatedDistance;  ///< Calculated distance (meters)
    uint8_t txPower;          ///< Transmit power (if available)
    
    // Metadata
    bool hasServiceData;      ///< Has additional service data
    uint8_t serviceData[32];  ///< Raw service data
    uint8_t serviceDataLength; ///< Length of service data
    
    // Timing information
    unsigned long firstSeen;  ///< First detection timestamp
    unsigned long lastSeen;   ///< Last detection timestamp
    unsigned long totalSeen;  ///< Total detection count
    
    // Status flags
    bool isActive;            ///< Currently being detected
    bool isTarget;            ///< Marked as target beacon
    uint8_t priority;         ///< Beacon priority (0=highest)
    float confidence;         ///< Signal confidence (0.0-1.0)
    
    BeaconInfo() : 
        rssi(-100),
        estimatedDistance(0.0f),
        txPower(0),
        hasServiceData(false),
        serviceDataLength(0),
        firstSeen(0),
        lastSeen(0),
        totalSeen(0),
        isActive(false),
        isTarget(false),
        priority(99),
        confidence(0.0f) {
        memset(serviceData, 0, sizeof(serviceData));
    }
    
    /**
     * @brief Check if beacon is valid and active
     * @return true if beacon is valid
     */
    bool isValid() const {
        return !macAddress.isEmpty() && (millis() - lastSeen) < BLE_DEVICE_TIMEOUT_MS;
    }
    
    /**
     * @brief Update signal information
     * @param newRssi New RSSI value
     * @param newDistance New distance estimate
     */
    void updateSignal(int32_t newRssi, float newDistance) {
        rssi = newRssi;
        estimatedDistance = newDistance;
        lastSeen = millis();
        totalSeen++;
        isActive = true;
        
        // Update confidence based on signal stability
        updateConfidence();
    }
    
    /**
     * @brief Update confidence level based on signal history
     */
    void updateConfidence() {
        // Simple confidence calculation based on RSSI and detection frequency
        float rssiConfidence = map(rssi, -100, -30, 0, 100) / 100.0f;
        float detectionRate = min(totalSeen / 10.0f, 1.0f);
        confidence = (rssiConfidence + detectionRate) / 2.0f;
        confidence = constrain(confidence, 0.0f, 1.0f);
    }
};

/**
 * @brief Location-based beacon grouping
 */
struct BeaconLocation {
    String locationName;                    ///< Location identifier
    std::vector<BeaconInfo*> beacons;      ///< Beacons in this location
    uint8_t activeCount;                   ///< Number of active beacons
    float averageRssi;                     ///< Average signal strength
    float averageDistance;                 ///< Average distance
    bool inProximity;                      ///< Any beacon in proximity range
    Point2D estimatedPosition;             ///< Estimated position if triangulation available
    float positionConfidence;              ///< Position estimate confidence
    unsigned long lastUpdate;              ///< Last update timestamp
    
    BeaconLocation() : 
        activeCount(0),
        averageRssi(-100.0f),
        averageDistance(0.0f),
        inProximity(false),
        positionConfidence(0.0f),
        lastUpdate(0) {}
    
    /**
     * @brief Update location statistics
     */
    void updateStatistics() {
        activeCount = 0;
        float totalRssi = 0.0f;
        float totalDistance = 0.0f;
        inProximity = false;
        
        for (BeaconInfo* beacon : beacons) {
            if (beacon && beacon->isActive) {
                activeCount++;
                totalRssi += beacon->rssi;
                totalDistance += beacon->estimatedDistance;
                
                if (beacon->rssi > BLE_RSSI_THRESHOLD) {
                    inProximity = true;
                }
            }
        }
        
        if (activeCount > 0) {
            averageRssi = totalRssi / activeCount;
            averageDistance = totalDistance / activeCount;
        }
        
        lastUpdate = millis();
    }
};

/**
 * @brief BLE scan result callback
 */
typedef std::function<void(const BeaconInfo& beacon)> BeaconDetectionCallback;
typedef std::function<void(const String& location, bool inRange)> ProximityCallback;

// ==========================================
// MAIN BEACON MANAGER CLASS
// ==========================================

/**
 * @brief Enhanced BLE Beacon Manager class
 */
class BeaconManager {
private:
    // BLE components
    BLEScan* m_bleScan;
    bool m_isInitialized;
    bool m_isScanning;
    
    // Beacon storage
    std::vector<BeaconInfo> m_beacons;
    std::map<String, BeaconLocation> m_locations;
    
    // Configuration
    uint16_t m_scanIntervalMs;
    uint16_t m_scanWindowMs;
    uint8_t m_scanDurationSec;
    int8_t m_rssiThreshold;
    uint8_t m_maxBeacons;
    
    // State management
    unsigned long m_lastScanTime;
    unsigned long m_lastCleanupTime;
    unsigned long m_scanStartTime;
    uint32_t m_totalScansCompleted;
    
    // Filtering
    bool m_enableFiltering;
    String m_targetPrefix;
    std::vector<String> m_targetDevices;
    
    // Callbacks
    BeaconDetectionCallback m_onBeaconDetected;
    ProximityCallback m_onProximityChange;
    
    /**
     * @brief Parse beacon name to extract location and metadata
     * @param deviceName Full device name
     * @param info Beacon info to populate
     */
    void parseBeaconName(const String& deviceName, BeaconInfo& info);
    
    /**
     * @brief Calculate distance from RSSI using path loss model
     * @param rssi RSSI value in dBm
     * @param txPower Transmit power (optional)
     * @return Estimated distance in meters
     */
    float calculateDistance(int32_t rssi, uint8_t txPower = 0);
    
    /**
     * @brief Update location groupings
     */
    void updateLocationGroups();
    
    /**
     * @brief Remove expired beacons
     */
    void cleanupExpiredBeacons();
    
    /**
     * @brief Find beacon by MAC address
     * @param macAddress MAC address to search for
     * @return Pointer to beacon or nullptr if not found
     */
    BeaconInfo* findBeaconByMac(const String& macAddress);
    
    /**
     * @brief Check if device should be filtered
     * @param deviceName Device name to check
     * @return true if device should be processed
     */
    bool shouldProcessDevice(const String& deviceName);

public:
    /**
     * @brief Constructor
     */
    BeaconManager() :
        m_bleScan(nullptr),
        m_isInitialized(false),
        m_isScanning(false),
        m_scanIntervalMs(BLE_SCAN_INTERVAL),
        m_scanWindowMs(BLE_SCAN_WINDOW),
        m_scanDurationSec(BLE_SCAN_DURATION_SEC),
        m_rssiThreshold(BLE_RSSI_THRESHOLD),
        m_maxBeacons(BLE_MAX_DEVICES),
        m_lastScanTime(0),
        m_lastCleanupTime(0),
        m_scanStartTime(0),
        m_totalScansCompleted(0),
        m_enableFiltering(true),
        m_targetPrefix(BLE_TARGET_BEACON_PREFIX) {}
    
    /**
     * @brief Initialize BLE beacon manager
     * @return true if initialization successful
     */
    bool begin();
    
    /**
     * @brief Main update loop - call regularly from main loop
     */
    void update();
    
    /**
     * @brief Start BLE scanning
     * @param continuous Start continuous scanning
     * @return true if scanning started successfully
     */
    bool startScanning(bool continuous = true);
    
    /**
     * @brief Stop BLE scanning
     */
    void stopScanning();
    
    /**
     * @brief Check if currently scanning
     * @return true if scanning is active
     */
    bool isScanning() const {
        return m_isScanning;
    }
    
    /**
     * @brief Get total number of detected beacons
     * @return Number of beacons
     */
    uint16_t getBeaconCount() const {
        return m_beacons.size();
    }
    
    /**
     * @brief Get number of active beacons
     * @return Number of active beacons
     */
    uint16_t getActiveBeaconCount() const;
    
    /**
     * @brief Get all detected beacons
     * @return Vector of beacon information
     */
    const std::vector<BeaconInfo>& getAllBeacons() const {
        return m_beacons;
    }
    
    /**
     * @brief Get beacons by location
     * @param location Location name
     * @return Vector of beacons in the specified location
     */
    std::vector<BeaconInfo> getBeaconsByLocation(const String& location) const;
    
    /**
     * @brief Get closest beacon
     * @return Pointer to closest beacon or nullptr
     */
    const BeaconInfo* getClosestBeacon() const;
    
    /**
     * @brief Get closest beacon in specific location
     * @param location Location name
     * @return Pointer to closest beacon in location or nullptr
     */
    const BeaconInfo* getClosestBeaconInLocation(const String& location) const;
    
    /**
     * @brief Check if in proximity of any beacon
     * @param location Specific location (optional)
     * @return true if in proximity
     */
    bool isInProximity(const String& location = "") const;
    
    /**
     * @brief Get all location groups
     * @return Map of location groups
     */
    const std::map<String, BeaconLocation>& getLocationGroups() const {
        return m_locations;
    }
    
    /**
     * @brief Set target devices for filtering
     * @param targetDevices Vector of target device names/prefixes
     */
    void setTargetDevices(const std::vector<String>& targetDevices);
    
    /**
     * @brief Add target device
     * @param deviceName Device name or prefix
     */
    void addTargetDevice(const String& deviceName);
    
    /**
     * @brief Remove target device
     * @param deviceName Device name or prefix
     */
    void removeTargetDevice(const String& deviceName);
    
    /**
     * @brief Set beacon detection callback
     * @param callback Callback function
     */
    void setBeaconDetectionCallback(BeaconDetectionCallback callback) {
        m_onBeaconDetected = callback;
    }
    
    /**
     * @brief Set proximity change callback
     * @param callback Callback function
     */
    void setProximityCallback(ProximityCallback callback) {
        m_onProximityChange = callback;
    }
    
    /**
     * @brief Configure scan parameters
     * @param intervalMs Scan interval in milliseconds
     * @param windowMs Scan window in milliseconds
     * @param durationSec Scan duration in seconds
     */
    void setScanParameters(uint16_t intervalMs, uint16_t windowMs, uint8_t durationSec);
    
    /**
     * @brief Set RSSI threshold for proximity detection
     * @param threshold RSSI threshold in dBm
     */
    void setRSSIThreshold(int8_t threshold) {
        m_rssiThreshold = threshold;
    }
    
    /**
     * @brief Clear all beacon data
     */
    void clearBeacons();
    
    /**
     * @brief Get beacon manager status as JSON
     * @return JSON status string
     */
    String getStatusJson() const;
    
    /**
     * @brief Get beacons as JSON array
     * @return JSON array of beacons
     */
    String getBeaconsJson() const;
    
    /**
     * @brief Get location groups as JSON
     * @return JSON object of location groups
     */
    String getLocationsJson() const;
    
    /**
     * @brief Get scan statistics
     * @return Scan statistics as JSON
     */
    String getScanStatsJson() const;
    
    /**
     * @brief Process advertised device (called by BLE callback)
     * @param advertisedDevice BLE advertised device
     */
    void processAdvertisedDevice(BLEAdvertisedDevice advertisedDevice);
    
    /**
     * @brief Get beacons suitable for triangulation
     * @param minBeacons Minimum number of beacons required
     * @return Vector of beacons for triangulation
     */
    std::vector<BeaconInfo> getTriangulationBeacons(uint8_t minBeacons = 3) const;
    
    /**
     * @brief Enable or disable filtering
     * @param enabled Enable beacon filtering
     */
    void setFilteringEnabled(bool enabled) {
        m_enableFiltering = enabled;
    }
    
    /**
     * @brief Check if beacon manager is initialized
     * @return true if initialized
     */
    bool isInitialized() const {
        return m_isInitialized;
    }
};

/**
 * @brief BLE scan callback class
 */
class BeaconScanCallback : public BLEAdvertisedDeviceCallbacks {
private:
    BeaconManager* m_manager;
    
public:
    BeaconScanCallback(BeaconManager* manager) : m_manager(manager) {}
    
    void onResult(BLEAdvertisedDevice advertisedDevice) override {
        if (m_manager) {
            m_manager->processAdvertisedDevice(advertisedDevice);
        }
    }
};

#endif // BEACON_MANAGER_H 