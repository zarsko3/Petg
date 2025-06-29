#ifndef SYSTEM_STATE_MANAGER_H
#define SYSTEM_STATE_MANAGER_H

/**
 * @file SystemStateManager.h
 * @brief Comprehensive system state management for ESP32-S3 Pet Collar
 * @version 3.1.0
 * @date 2024
 * 
 * This class provides centralized system state management including:
 * - Device information and status tracking
 * - Component health monitoring
 * - Performance metrics collection
 * - System diagnostics and error handling
 * - Status reporting and JSON serialization
 */

#include <Arduino.h>
#include <vector>
#include "ESP32_S3_Config.h"
#include "MicroConfig.h"

// ==========================================
// SYSTEM STATUS DEFINITIONS
// ==========================================

/**
 * @brief Component status enumeration
 */
enum class ComponentStatus : uint8_t {
    UNKNOWN = 0,        ///< Status unknown
    INITIALIZING,       ///< Component is initializing
    RUNNING,            ///< Component is running normally
    WARNING,            ///< Component has warnings
    ERROR,              ///< Component has errors
    STOPPED             ///< Component is stopped
};

/**
 * @brief System performance metrics
 */
struct PerformanceMetrics {
    // Memory metrics
    uint32_t freeHeapBytes;         ///< Available heap memory
    uint32_t totalHeapBytes;        ///< Total heap memory
    uint32_t minFreeHeapBytes;      ///< Minimum free heap observed
    uint32_t heapFragmentation;     ///< Heap fragmentation percentage
    
    // CPU metrics
    uint32_t cpuFrequencyMHz;       ///< Current CPU frequency
    float cpuTemperatureCelsius;    ///< CPU temperature (if available)
    uint32_t uptimeSeconds;         ///< System uptime in seconds
    
    // Task metrics
    uint32_t loopIterations;        ///< Main loop iterations
    uint32_t averageLoopTimeUs;     ///< Average loop time in microseconds
    uint32_t maxLoopTimeUs;         ///< Maximum loop time observed
    
    // Network metrics
    uint32_t wifiReconnects;        ///< WiFi reconnection count
    uint32_t bleScansCompleted;     ///< BLE scans completed
    uint32_t webSocketConnections;  ///< WebSocket connection count
    
    PerformanceMetrics() :
        freeHeapBytes(0),
        totalHeapBytes(0),
        minFreeHeapBytes(0),
        heapFragmentation(0),
        cpuFrequencyMHz(0),
        cpuTemperatureCelsius(0.0f),
        uptimeSeconds(0),
        loopIterations(0),
        averageLoopTimeUs(0),
        maxLoopTimeUs(0),
        wifiReconnects(0),
        bleScansCompleted(0),
        webSocketConnections(0) {}
    
    void update() {
        freeHeapBytes = ESP.getFreeHeap();
        totalHeapBytes = ESP.getHeapSize();
        minFreeHeapBytes = ESP.getMinFreeHeap();
        heapFragmentation = ESP.getMaxAllocHeap();
        cpuFrequencyMHz = ESP.getCpuFreqMHz();
        uptimeSeconds = millis() / 1000;
        
        #ifdef SOC_TEMP_SENSOR_SUPPORTED
        cpuTemperatureCelsius = temperatureRead();
        #endif
    }
};

/**
 * @brief Component health information
 */
struct ComponentHealth {
    char componentName[16];         ///< Component name
    ComponentStatus status;         ///< Current status
    String lastError;               ///< Last error message
    unsigned long lastUpdate;       ///< Last status update timestamp
    unsigned long lastErrorTime;    ///< Last error timestamp
    uint32_t errorCount;            ///< Total error count
    bool isEnabled;                 ///< Component is enabled
    bool isCritical;                ///< Component is critical for operation
    
    ComponentHealth() :
        status(ComponentStatus::UNKNOWN),
        lastUpdate(0),
        lastErrorTime(0),
        errorCount(0),
        isEnabled(true),
        isCritical(false) {
        memset(componentName, 0, sizeof(componentName));
    }
    
    ComponentHealth(const char* name, bool critical = false) : ComponentHealth() {
        strncpy(componentName, name, sizeof(componentName) - 1);
        isCritical = critical;
    }
    
    void updateStatus(ComponentStatus newStatus, const String& error = "") {
        status = newStatus;
        lastUpdate = millis();
        
        if (!error.isEmpty()) {
            lastError = error;
            lastErrorTime = lastUpdate;
            errorCount++;
        }
    }
    
    bool isHealthy() const {
        return status == ComponentStatus::RUNNING || status == ComponentStatus::INITIALIZING;
    }
    
    bool hasRecentActivity(uint32_t timeoutMs = 60000) const {
        return (millis() - lastUpdate) < timeoutMs;
    }
};

/**
 * @brief Comprehensive system state information
 */
struct SystemStatusInfo {
    // Device information
    String deviceId;                ///< Unique device identifier
    String firmwareVersion;         ///< Firmware version
    String hardwareModel;           ///< Hardware model
    String buildDate;               ///< Firmware build date
    String buildTime;               ///< Firmware build time
    
    // System state
    SystemState currentState;       ///< Current system state
    SystemState previousState;      ///< Previous system state
    unsigned long stateChangeTime;  ///< Last state change timestamp
    String lastErrorMessage;        ///< Last system error message
    unsigned long lastErrorTime;    ///< Last error timestamp
    
    // Network status
    NetworkStatus networkStatus;    ///< Network connection status
    
    // Battery status
    BatteryStatus batteryStatus;    ///< Battery status information
    
    // Component status
    std::vector<ComponentHealth> components; ///< Component health status
    
    // Performance metrics
    PerformanceMetrics performance; ///< System performance metrics
    
    // Timing information
    unsigned long lastStatusUpdate; ///< Last full status update
    unsigned long systemStartTime;  ///< System start timestamp
    
    SystemStatusInfo() :
        currentState(SystemState::INITIALIZING),
        previousState(SystemState::INITIALIZING),
        stateChangeTime(0),
        lastErrorTime(0),
        lastStatusUpdate(0),
        systemStartTime(millis()) {
        
        // Initialize device information
        deviceId = "PetCollar-" + String((uint32_t)ESP.getEfuseMac(), HEX);
        firmwareVersion = FIRMWARE_VERSION;
        hardwareModel = HARDWARE_PLATFORM;
        buildDate = FIRMWARE_COMPILE_DATE;
        buildTime = FIRMWARE_COMPILE_TIME;
    }
    
    void changeState(SystemState newState, const String& reason = "") {
        if (newState != currentState) {
            previousState = currentState;
            currentState = newState;
            stateChangeTime = millis();
            
            if (!reason.isEmpty()) {
                lastErrorMessage = reason;
                lastErrorTime = stateChangeTime;
            }
        }
    }
    
    ComponentHealth* findComponent(const char* name) {
        for (auto& component : components) {
            if (strcmp(component.componentName, name) == 0) {
                return &component;
            }
        }
        return nullptr;
    }
    
    void addComponent(const char* name, bool critical = false) {
        if (!findComponent(name)) {
            components.emplace_back(name, critical);
        }
    }
    
    bool areAllCriticalComponentsHealthy() const {
        for (const auto& component : components) {
            if (component.isCritical && !component.isHealthy()) {
                return false;
            }
        }
        return true;
    }
    
    uint8_t getHealthyComponentPercentage() const {
        if (components.empty()) return 100;
        
        uint8_t healthy = 0;
        for (const auto& component : components) {
            if (component.isHealthy()) healthy++;
        }
        
        return (healthy * 100) / components.size();
    }
};

// ==========================================
// MAIN SYSTEM STATE MANAGER CLASS
// ==========================================

/**
 * @brief System State Manager class
 */
class SystemStateManager {
private:
    SystemStatusInfo m_systemStatus;
    
    // Update intervals
    unsigned long m_lastPerformanceUpdate;
    unsigned long m_lastComponentCheck;
    unsigned long m_lastNetworkCheck;
    unsigned long m_lastBatteryCheck;
    
    // Configuration
    uint32_t m_performanceUpdateInterval;
    uint32_t m_componentCheckInterval;
    uint32_t m_networkCheckInterval;
    uint32_t m_batteryCheckInterval;
    
    // Loop timing
    unsigned long m_loopStartTime;
    unsigned long m_totalLoopTime;
    uint32_t m_loopCount;
    
    // Error tracking
    std::vector<String> m_recentErrors;
    uint8_t m_maxErrorHistory;
    
    /**
     * @brief Update performance metrics
     */
    void updatePerformanceMetrics();
    
    /**
     * @brief Check component health status
     */
    void updateComponentStatus();
    
    /**
     * @brief Update network status
     */
    void updateNetworkStatus();
    
public:
    /**
     * @brief Update battery status  
     */
    void updateBatteryStatus();
    
    /**
     * @brief Determine overall system state
     */
    void determineSystemState();

public:
    /**
     * @brief Constructor
     */
    SystemStateManager() :
        m_lastPerformanceUpdate(0),
        m_lastComponentCheck(0),
        m_lastNetworkCheck(0),
        m_lastBatteryCheck(0),
        m_performanceUpdateInterval(TIMING_SYSTEM_STATUS_MS),
        m_componentCheckInterval(10000),
        m_networkCheckInterval(5000),
        m_batteryCheckInterval(POWER_BATTERY_CHECK_MS),
        m_loopStartTime(0),
        m_totalLoopTime(0),
        m_loopCount(0),
        m_maxErrorHistory(10) {}
    
    /**
     * @brief Initialize system state manager
     * @return true if initialization successful
     */
    bool begin();
    
    /**
     * @brief Main update loop - call at start of main loop
     */
    void beginLoop();
    
    /**
     * @brief End loop timing - call at end of main loop
     */
    void endLoop();
    
    /**
     * @brief Update system status
     * @param force Force full update regardless of intervals
     */
    void update(bool force = false);
    
    /**
     * @brief Get current system state
     * @return Current system state
     */
    SystemState getCurrentState() const {
        return m_systemStatus.currentState;
    }
    
    /**
     * @brief Set system state manually
     * @param state New system state
     * @param reason Reason for state change
     */
    void setState(SystemState state, const String& reason = "");
    
    /**
     * @brief Get complete system status
     * @return System status information
     */
    const SystemStatusInfo& getSystemStatus() const {
        return m_systemStatus;
    }
    
    /**
     * @brief Update component status
     * @param componentName Component name
     * @param status New status
     * @param errorMessage Error message (optional)
     */
    void updateComponentStatus(const char* componentName, 
                              ComponentStatus status, 
                              const String& errorMessage = "");
    
    /**
     * @brief Register new component for monitoring
     * @param componentName Component name
     * @param isCritical Whether component is critical for operation
     */
    void registerComponent(const char* componentName, bool isCritical = false);
    
    /**
     * @brief Log system error
     * @param error Error message
     * @param component Component name (optional)
     */
    void logError(const String& error, const char* component = nullptr);
    
    /**
     * @brief Get recent errors
     * @param maxCount Maximum number of errors to return
     * @return Vector of recent error messages
     */
    std::vector<String> getRecentErrors(uint8_t maxCount = 5) const;
    
    /**
     * @brief Clear error history
     */
    void clearErrorHistory();
    
    /**
     * @brief Get system status as JSON
     * @param includePerformance Include performance metrics
     * @param includeComponents Include component status
     * @return JSON status string
     */
    String getStatusJson(bool includePerformance = true, bool includeComponents = true) const;
    
    /**
     * @brief Get component status as JSON
     * @return JSON component status string
     */
    String getComponentStatusJson() const;
    
    /**
     * @brief Get performance metrics as JSON
     * @return JSON performance metrics string
     */
    String getPerformanceJson() const;
    
    /**
     * @brief Get system diagnostics as JSON
     * @return JSON diagnostics string
     */
    String getDiagnosticsJson() const;
    
    /**
     * @brief Check if system is healthy
     * @return true if all critical components are healthy
     */
    bool isSystemHealthy() const;
    
    /**
     * @brief Get system health percentage
     * @return Health percentage (0-100)
     */
    uint8_t getSystemHealthPercentage() const;
    
    /**
     * @brief Get system uptime in seconds
     * @return Uptime in seconds
     */
    uint32_t getUptimeSeconds() const;
    
    /**
     * @brief Get battery level percentage
     * @return Battery level (0-100)
     */
    int getBatteryLevel() const;
    
    /**
     * @brief Get system uptime as formatted string
     * @return Formatted uptime string (e.g., "1d 2h 30m")
     */
    String getUptimeString() const;
    
    /**
     * @brief Get free memory percentage
     * @return Free memory percentage (0-100)
     */
    uint8_t getFreeMemoryPercentage() const;
    
    /**
     * @brief Check if memory is low
     * @param threshold Low memory threshold percentage
     * @return true if memory is below threshold
     */
    bool isMemoryLow(uint8_t threshold = 20) const;
    
    /**
     * @brief Reset performance statistics
     */
    void resetPerformanceStats();
    
    /**
     * @brief Enable or disable component monitoring
     * @param componentName Component name
     * @param enabled Enable monitoring
     */
    void setComponentEnabled(const char* componentName, bool enabled);
    
    /**
     * @brief Set update intervals
     * @param performanceMs Performance update interval
     * @param componentMs Component check interval
     * @param networkMs Network check interval
     * @param batteryMs Battery check interval
     */
    void setUpdateIntervals(uint32_t performanceMs = 60000,
                           uint32_t componentMs = 10000,
                           uint32_t networkMs = 5000,
                           uint32_t batteryMs = 30000);
    
    // ==================== COMPATIBILITY METHODS ====================
    /**
     * @brief Initialize system state manager (compatibility)
     */
    void initialize();
    
    /**
     * @brief Get battery percentage (compatibility)
     * @return Battery percentage (0-100)
     */
    int getBatteryPercent() const;
    
    /**
     * @brief Get error count (compatibility)
     * @return Total error count
     */
    int getErrorCount() const;
    
    /**
     * @brief Get proximity alerts count (compatibility)
     * @return Proximity alerts count
     */
    int getProximityAlerts() const;
    
    /**
     * @brief Record system error (compatibility)
     * @param error Error message
     */
    void recordError(const String& error);
    
    /**
     * @brief Update proximity alerts count (compatibility)
     * @param count Number of alerts to add
     */
    void updateProximityAlerts(int count);
    
    /**
     * @brief Update beacon statistics (compatibility)
     * @param newBeacons Number of new beacons detected
     */
    void updateBeaconStats(int newBeacons);
    
    /**
     * @brief Update system metrics (compatibility)
     */
    void updateSystemMetrics();
    
    /**
     * @brief Get system status as JSON (compatibility)
     * @return JSON status string
     */
    String getSystemStatusJSON() const;
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * @brief Convert component status enum to string
 * @param status Component status
 * @return String representation
 */
inline const char* componentStatusToString(ComponentStatus status) {
    switch (status) {
        case ComponentStatus::UNKNOWN: return "Unknown";
        case ComponentStatus::INITIALIZING: return "Initializing";
        case ComponentStatus::RUNNING: return "Running";
        case ComponentStatus::WARNING: return "Warning";
        case ComponentStatus::ERROR: return "Error";
        case ComponentStatus::STOPPED: return "Stopped";
        default: return "Invalid";
    }
}

/**
 * @brief Format memory size as human-readable string
 * @param bytes Memory size in bytes
 * @return Formatted string (e.g., "1.2KB", "3.4MB")
 */
inline String formatMemorySize(uint32_t bytes) {
    if (bytes < 1024) {
        return String(bytes) + "B";
    } else if (bytes < 1024 * 1024) {
        return String(bytes / 1024.0f, 1) + "KB";
    } else {
        return String(bytes / (1024.0f * 1024.0f), 1) + "MB";
    }
}

/**
 * @brief Format uptime as human-readable string
 * @param seconds Uptime in seconds
 * @return Formatted string (e.g., "1d 2h 30m")
 */
inline String formatUptime(uint32_t seconds) {
    uint32_t days = seconds / (24 * 3600);
    seconds %= (24 * 3600);
    uint32_t hours = seconds / 3600;
    seconds %= 3600;
    uint32_t minutes = seconds / 60;
    
    String result = "";
    if (days > 0) result += String(days) + "d ";
    if (hours > 0 || days > 0) result += String(hours) + "h ";
    result += String(minutes) + "m";
    
    return result;
}

#endif // SYSTEM_STATE_MANAGER_H 