#ifndef ALERT_MANAGER_H
#define ALERT_MANAGER_H

/**
 * @file AlertManager.h
 * @brief Enhanced Alert Management system for ESP32-S3 Pet Collar
 * @version 3.1.0
 * @date 2024
 * 
 * This class manages all alert mechanisms including:
 * - Buzzer control with frequency modulation
 * - Vibration motor control with intensity patterns
 * - Complex alert patterns and sequences
 * - Power-efficient alert management
 * - Integration with system events
 */

#include <Arduino.h>
#include "ESP32_S3_Config.h"
#include "MicroConfig.h"

// ==========================================
// ALERT PATTERNS & DEFINITIONS
// ==========================================

/**
 * @brief Alert trigger reasons
 */
enum class AlertReason : uint8_t {
    NONE = 0,
    PROXIMITY_DETECTED,     ///< Pet collar detected nearby
    PROXIMITY_LOST,         ///< Pet collar signal lost  
    LOW_BATTERY,            ///< Battery level is low
    CRITICAL_BATTERY,       ///< Battery level is critical
    WIFI_DISCONNECTED,      ///< WiFi connection lost
    SYSTEM_ERROR,           ///< System error occurred
    ZONE_ENTERED,           ///< Entered defined zone
    ZONE_EXITED,            ///< Exited defined zone
    MANUAL_TEST,            ///< Manual test activation
    BEACON_FOUND,           ///< Target beacon detected
    CUSTOM                  ///< Custom alert reason
};

/**
 * @brief Alert pattern types
 */
enum class AlertPattern : uint8_t {
    CONTINUOUS = 0,         ///< Continuous alert
    PULSE_SLOW,             ///< Slow pulsing (1 Hz)
    PULSE_FAST,             ///< Fast pulsing (4 Hz)
    TRIPLE_BEEP,            ///< Three short beeps
    SOS_PATTERN,            ///< SOS morse code pattern
    ESCALATING,             ///< Gradually increasing intensity
    CUSTOM                  ///< Custom pattern
};

/**
 * @brief Alert priority levels
 */
enum class AlertPriority : uint8_t {
    LOW = 0,                ///< Low priority (can be overridden)
    NORMAL,                 ///< Normal priority
    HIGH,                   ///< High priority (overrides normal)
    CRITICAL                ///< Critical priority (overrides all)
};

/**
 * @brief Alert step in a pattern sequence
 */
struct AlertStep {
    uint16_t durationMs;    ///< Duration of this step in milliseconds
    uint8_t buzzerVolume;   ///< Buzzer volume (0-255, 0=off)
    uint16_t buzzerFreq;    ///< Buzzer frequency in Hz
    uint8_t vibrationIntensity; ///< Vibration intensity (0-255, 0=off)
    
    AlertStep(uint16_t duration = 500, uint8_t buzVol = 0, uint16_t buzFreq = 2000, uint8_t vibInt = 0) :
        durationMs(duration), buzzerVolume(buzVol), buzzerFreq(buzFreq), vibrationIntensity(vibInt) {}
};

/**
 * @brief Complete alert sequence definition
 */
struct AlertSequence {
    AlertStep steps[8];     ///< Maximum 8 steps per pattern
    uint8_t stepCount;      ///< Number of steps in sequence
    bool repeat;            ///< Whether to repeat the sequence
    uint8_t maxRepeats;     ///< Maximum number of repeats (0=infinite)
    
    AlertSequence() : stepCount(0), repeat(false), maxRepeats(0) {}
    
    void addStep(const AlertStep& step) {
        if (stepCount < 8) {
            steps[stepCount++] = step;
        }
    }
    
    void clear() {
        stepCount = 0;
        repeat = false;
        maxRepeats = 0;
    }
};

// ==========================================
// MAIN ALERT MANAGER CLASS
// ==========================================

/**
 * @brief Enhanced Alert Manager class
 */
class AlertManager {
private:
    // Hardware control
    bool m_isInitialized;
    uint8_t m_buzzerPin;
    uint8_t m_vibrationPin;
    uint8_t m_buzzerChannel;
    uint8_t m_vibrationChannel;
    
    // Current alert state
    bool m_alertActive;
    AlertMode m_currentMode;
    AlertReason m_currentReason;
    AlertPriority m_currentPriority;
    AlertPattern m_currentPattern;
    String m_customReason;
    
    // Pattern control
    AlertSequence m_activeSequence;
    uint8_t m_currentStep;
    uint8_t m_repeatCount;
    unsigned long m_stepStartTime;
    unsigned long m_alertStartTime;
    
    // Configuration
    uint8_t m_defaultVolume;
    uint8_t m_defaultVibrationIntensity;
    uint16_t m_defaultFrequency;
    uint16_t m_maxAlertDuration;
    bool m_enableAutoStop;
    
    // Power management
    bool m_powerSaveMode;
    uint8_t m_powerSaveVolumeReduction;
    uint8_t m_powerSaveIntensityReduction;
    
    /**
     * @brief Initialize predefined alert patterns
     */
    void initializePatterns();
    
    /**
     * @brief Get predefined pattern sequence
     * @param pattern Pattern type
     * @param mode Alert mode
     * @return Alert sequence
     */
    AlertSequence getPatternSequence(AlertPattern pattern, AlertMode mode);
    
    /**
     * @brief Update current alert step
     */
    void updateAlertStep();
    
    /**
     * @brief Apply power saving adjustments to alert parameters
     * @param volume Input volume
     * @param intensity Input vibration intensity
     */
    void applyPowerSaving(uint8_t& volume, uint8_t& intensity);
    
    /**
     * @brief Set buzzer output
     * @param volume Volume level (0-255)
     * @param frequency Frequency in Hz
     */
    void setBuzzerOutput(uint8_t volume, uint16_t frequency);
    
    /**
     * @brief Set vibration output
     * @param intensity Intensity level (0-255)
     */
    void setVibrationOutput(uint8_t intensity);
    
    /**
     * @brief Stop all alert outputs
     */
    void stopAllOutputs();

public:
    /**
     * @brief Constructor
     */
    AlertManager() :
        m_isInitialized(false),
        m_buzzerPin(PIN_BUZZER),
        m_vibrationPin(PIN_VIBRATION),
        m_buzzerChannel(BUZZER_PWM_CHANNEL),
        m_vibrationChannel(VIBRATION_PWM_CHANNEL),
        m_alertActive(false),
        m_currentMode(AlertMode::NONE),
        m_currentReason(AlertReason::NONE),
        m_currentPriority(AlertPriority::NORMAL),
        m_currentPattern(AlertPattern::CONTINUOUS),
        m_currentStep(0),
        m_repeatCount(0),
        m_stepStartTime(0),
        m_alertStartTime(0),
        m_defaultVolume(BUZZER_DEFAULT_VOLUME),
        m_defaultVibrationIntensity(VIBRATION_DEFAULT_INTENSITY),
        m_defaultFrequency(BUZZER_PWM_FREQUENCY_HZ),
        m_maxAlertDuration(BUZZER_MAX_DURATION_MS),
        m_enableAutoStop(true),
        m_powerSaveMode(false),
        m_powerSaveVolumeReduction(50),
        m_powerSaveIntensityReduction(30) {}
    
    /**
     * @brief Initialize alert system
     * @return true if initialization successful
     */
    bool begin();
    
    /**
     * @brief Main update loop - call regularly from main loop
     */
    void update();
    
    /**
     * @brief Start alert with specified parameters
     * @param reason Alert trigger reason
     * @param mode Alert mode (buzzer, vibration, both)
     * @param pattern Alert pattern type
     * @param priority Alert priority level
     * @param customReason Custom reason string (optional)
     * @return true if alert started successfully
     */
    bool startAlert(AlertReason reason, 
                   AlertMode mode = AlertMode::BOTH,
                   AlertPattern pattern = AlertPattern::PULSE_SLOW,
                   AlertPriority priority = AlertPriority::NORMAL,
                   const String& customReason = "");
    
    /**
     * @brief Start alert with custom sequence
     * @param sequence Custom alert sequence
     * @param reason Alert trigger reason
     * @param priority Alert priority level
     * @return true if alert started successfully
     */
    bool startCustomAlert(const AlertSequence& sequence,
                         AlertReason reason = AlertReason::CUSTOM,
                         AlertPriority priority = AlertPriority::NORMAL);
    
    /**
     * @brief Stop current alert
     * @param force Force stop even if higher priority
     * @return true if alert was stopped
     */
    bool stopAlert(bool force = false);
    
    /**
     * @brief Check if alert is currently active
     * @return true if alert is active
     */
    bool isAlertActive() const {
        return m_alertActive;
    }
    
    /**
     * @brief Get current alert mode
     * @return Current alert mode
     */
    AlertMode getAlertMode() const {
        return m_currentMode;
    }
    
    /**
     * @brief Get current alert reason
     * @return Current alert reason
     */
    AlertReason getAlertReason() const {
        return m_currentReason;
    }
    
    /**
     * @brief Get current alert priority
     * @return Current alert priority
     */
    AlertPriority getAlertPriority() const {
        return m_currentPriority;
    }
    
    /**
     * @brief Get alert duration in milliseconds
     * @return Alert duration since start
     */
    unsigned long getAlertDuration() const {
        return m_alertActive ? (millis() - m_alertStartTime) : 0;
    }
    
    /**
     * @brief Get current alert reason as string
     * @return Human-readable alert reason
     */
    String getAlertReasonString() const;
    
    /**
     * @brief Set default alert parameters
     * @param volume Default buzzer volume (0-255)
     * @param vibrationIntensity Default vibration intensity (0-255)
     * @param frequency Default buzzer frequency (Hz)
     */
    void setDefaults(uint8_t volume, uint8_t vibrationIntensity, uint16_t frequency);
    
    /**
     * @brief Enable or disable power save mode
     * @param enabled Enable power saving
     * @param volumeReduction Volume reduction percentage
     * @param intensityReduction Vibration reduction percentage
     */
    void setPowerSaveMode(bool enabled, uint8_t volumeReduction = 50, uint8_t intensityReduction = 30);
    
    /**
     * @brief Set maximum alert duration
     * @param durationMs Maximum duration in milliseconds (0=unlimited)
     */
    void setMaxAlertDuration(uint16_t durationMs) {
        m_maxAlertDuration = durationMs;
    }
    
    /**
     * @brief Enable or disable auto-stop feature
     * @param enabled Enable auto-stop after max duration
     */
    void setAutoStop(bool enabled) {
        m_enableAutoStop = enabled;
    }
    
    /**
     * @brief Test alert system with brief test pattern
     * @param mode Alert mode to test
     * @return true if test started successfully
     */
    bool testAlert(AlertMode mode = AlertMode::BOTH);
    
    /**
     * @brief Handle proximity detection event
     * @param detected Proximity detected status
     * @param distance Distance to target (optional)
     * @param reason Additional reason string (optional)
     */
    void handleProximityEvent(bool detected, float distance = 0.0f, const String& reason = "");
    
    /**
     * @brief Handle battery level change
     * @param percentage Battery percentage
     * @param voltage Battery voltage
     */
    void handleBatteryEvent(uint8_t percentage, float voltage);
    
    /**
     * @brief Handle WiFi connection event
     * @param connected Connection status
     */
    void handleWiFiEvent(bool connected);
    
    /**
     * @brief Handle zone transition event
     * @param entered True if entered zone, false if exited
     * @param zoneName Zone name
     */
    void handleZoneEvent(bool entered, const String& zoneName);
    
    /**
     * @brief Get alert status as JSON string
     * @return JSON status information
     */
    String getStatusJson() const;
    
    /**
     * @brief Get available alert patterns as JSON array
     * @return JSON array of available patterns
     */
    String getAvailablePatternsJson() const;
    
    /**
     * @brief Create custom alert sequence builder
     * @return Empty alert sequence for customization
     */
    static AlertSequence createCustomSequence();
};

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * @brief Convert alert reason enum to string
 * @param reason Alert reason
 * @return String representation
 */
inline const char* alertReasonToString(AlertReason reason) {
    switch (reason) {
        case AlertReason::NONE: return "None";
        case AlertReason::PROXIMITY_DETECTED: return "Proximity Detected";
        case AlertReason::PROXIMITY_LOST: return "Proximity Lost";
        case AlertReason::LOW_BATTERY: return "Low Battery";
        case AlertReason::CRITICAL_BATTERY: return "Critical Battery";
        case AlertReason::WIFI_DISCONNECTED: return "WiFi Disconnected";
        case AlertReason::SYSTEM_ERROR: return "System Error";
        case AlertReason::ZONE_ENTERED: return "Zone Entered";
        case AlertReason::ZONE_EXITED: return "Zone Exited";
        case AlertReason::MANUAL_TEST: return "Manual Test";
        case AlertReason::BEACON_FOUND: return "Beacon Found";
        case AlertReason::CUSTOM: return "Custom";
        default: return "Unknown";
    }
}

/**
 * @brief Convert alert pattern enum to string
 * @param pattern Alert pattern
 * @return String representation
 */
inline const char* alertPatternToString(AlertPattern pattern) {
    switch (pattern) {
        case AlertPattern::CONTINUOUS: return "Continuous";
        case AlertPattern::PULSE_SLOW: return "Slow Pulse";
        case AlertPattern::PULSE_FAST: return "Fast Pulse";
        case AlertPattern::TRIPLE_BEEP: return "Triple Beep";
        case AlertPattern::SOS_PATTERN: return "SOS Pattern";
        case AlertPattern::ESCALATING: return "Escalating";
        case AlertPattern::CUSTOM: return "Custom";
        default: return "Unknown";
    }
}

/**
 * @brief Convert alert priority enum to string
 * @param priority Alert priority
 * @return String representation
 */
inline const char* alertPriorityToString(AlertPriority priority) {
    switch (priority) {
        case AlertPriority::LOW: return "Low";
        case AlertPriority::NORMAL: return "Normal";
        case AlertPriority::HIGH: return "High";
        case AlertPriority::CRITICAL: return "Critical";
        default: return "Unknown";
    }
}

#endif // ALERT_MANAGER_H 