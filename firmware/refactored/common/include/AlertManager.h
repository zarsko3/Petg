/**
 * @file AlertManager.h
 * @brief Advanced Alert Management System
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * This class manages all alert functionality including buzzer and vibration
 * controls with configurable patterns, intensities, and timing.
 * 
 * Features:
 * - Multiple alert modes (buzzer, vibration, both)
 * - Configurable alert patterns and intensities
 * - Automatic timeout and cooldown periods
 * - PWM-based precise control
 * - Energy-efficient operation
 * - Alert queuing and prioritization
 */

#ifndef ALERT_MANAGER_H
#define ALERT_MANAGER_H

#include <Arduino.h>
#include "PetCollarConfig.h"
#include "Utils.h"

// ==========================================
// ALERT STRUCTURES AND ENUMS
// ==========================================

/**
 * @brief Alert pattern types
 */
enum AlertPattern {
    PATTERN_CONTINUOUS = 0,    ///< Continuous alert
    PATTERN_PULSE = 1,         ///< Pulsing pattern (on/off)
    PATTERN_RAPID = 2,         ///< Rapid pulses
    PATTERN_SOS = 3            ///< SOS pattern (... --- ...)
};

/**
 * @brief Alert priority levels
 */
enum AlertPriority {
    PRIORITY_LOW = 0,          ///< Low priority alert
    PRIORITY_NORMAL = 1,       ///< Normal priority alert
    PRIORITY_HIGH = 2,         ///< High priority alert
    PRIORITY_CRITICAL = 3      ///< Critical priority alert (cannot be interrupted)
};

/**
 * @brief Alert configuration structure
 */
struct AlertConfig {
    AlertMode mode;            ///< Alert mode (none, buzzer, vibration, both)
    AlertPattern pattern;      ///< Alert pattern
    AlertPriority priority;    ///< Alert priority
    
    // Timing parameters
    uint16_t durationMs;       ///< Total alert duration
    uint16_t pulseOnMs;        ///< Pulse on time (for pulsing patterns)
    uint16_t pulseOffMs;       ///< Pulse off time (for pulsing patterns)
    uint16_t cooldownMs;       ///< Cooldown period after alert
    
    // Intensity parameters
    uint8_t buzzerIntensity;   ///< Buzzer intensity (0-255)
    uint8_t vibrationIntensity; ///< Vibration intensity (0-255)
    uint16_t buzzerFrequency;  ///< Buzzer frequency in Hz
    
    // Metadata
    String reason;             ///< Reason for alert
    
    /**
     * @brief Default constructor with sensible defaults
     */
    AlertConfig() :
        mode(ALERT_BUZZER),
        pattern(PATTERN_PULSE),
        priority(PRIORITY_NORMAL),
        durationMs(2000),
        pulseOnMs(500),
        pulseOffMs(500),
        cooldownMs(3000),
        buzzerIntensity(128),
        vibrationIntensity(128),
        buzzerFrequency(BUZZER_PWM_FREQUENCY),
        reason("") {}
    
    /**
     * @brief Constructor with basic parameters
     */
    AlertConfig(AlertMode alertMode, uint16_t duration, uint8_t intensity, const String& alertReason = "") :
        mode(alertMode),
        pattern(PATTERN_PULSE),
        priority(PRIORITY_NORMAL),
        durationMs(duration),
        pulseOnMs(500),
        pulseOffMs(500),
        cooldownMs(3000),
        buzzerIntensity(intensity),
        vibrationIntensity(intensity),
        buzzerFrequency(BUZZER_PWM_FREQUENCY),
        reason(alertReason) {}
};

/**
 * @brief Active alert state
 */
struct AlertState {
    bool isActive;             ///< Alert currently active
    AlertConfig config;        ///< Current alert configuration
    
    // Timing state
    unsigned long startTime;   ///< Alert start time
    unsigned long lastToggle;  ///< Last pattern toggle time
    unsigned long endTime;     ///< Calculated end time
    
    // Pattern state
    bool patternState;         ///< Current pattern state (on/off)
    int patternStep;           ///< Current step in pattern (for SOS)
    
    /**
     * @brief Default constructor
     */
    AlertState() :
        isActive(false),
        startTime(0),
        lastToggle(0),
        endTime(0),
        patternState(false),
        patternStep(0) {}
    
    /**
     * @brief Check if alert should end
     */
    bool shouldEnd() const {
        return isActive && (millis() >= endTime);
    }
    
    /**
     * @brief Get remaining time in milliseconds
     */
    unsigned long getRemainingTime() const {
        if (!isActive) return 0;
        unsigned long current = millis();
        return (current < endTime) ? (endTime - current) : 0;
    }
    
    /**
     * @brief Get elapsed time in milliseconds
     */
    unsigned long getElapsedTime() const {
        return isActive ? (millis() - startTime) : 0;
    }
};

// ==========================================
// ALERT MANAGER CLASS
// ==========================================

/**
 * @brief Main alert management class
 * 
 * Handles all alert functionality with precise timing control,
 * configurable patterns, and automatic management.
 */
class AlertManager {
private:
    // Hardware state
    bool initialized_;         ///< Initialization state
    
    // Current alert state
    AlertState currentAlert_;  ///< Currently active alert
    unsigned long lastCooldownEnd_; ///< Last cooldown end time
    
    // Hardware control
    bool buzzerEnabled_;       ///< Buzzer hardware available
    bool vibrationEnabled_;    ///< Vibration hardware available
    
    // Statistics
    unsigned long totalAlerts_;     ///< Total alerts triggered
    unsigned long totalAlertTime_;  ///< Total time in alert state
    
    /**
     * @brief Initialize PWM for buzzer
     */
    void initializeBuzzer() {
        if (!FEATURE_BUZZER) {
            buzzerEnabled_ = false;
            return;
        }
        
        // Configure PWM channel for buzzer
        ledcAttach(PIN_BUZZER, BUZZER_PWM_FREQUENCY, BUZZER_PWM_RESOLUTION);
        ledcWrite(PIN_BUZZER, 0); // Start with buzzer off
        
        buzzerEnabled_ = true;
        DEBUG_PRINTLN("AlertManager: Buzzer initialized");
    }
    
    /**
     * @brief Initialize PWM for vibration motor
     */
    void initializeVibration() {
        if (!FEATURE_VIBRATION) {
            vibrationEnabled_ = false;
            return;
        }
        
        // Configure PWM channel for vibration motor
        ledcAttach(PIN_VIBRATION, VIBRATION_PWM_FREQUENCY, VIBRATION_PWM_RESOLUTION);
        ledcWrite(PIN_VIBRATION, 0); // Start with vibration off
        
        vibrationEnabled_ = true;
        DEBUG_PRINTLN("AlertManager: Vibration motor initialized");
    }
    
    /**
     * @brief Set buzzer state
     * @param enabled Enable/disable buzzer
     * @param intensity Intensity level (0-255)
     * @param frequency Frequency in Hz
     */
    void setBuzzer(bool enabled, uint8_t intensity = 128, uint16_t frequency = BUZZER_PWM_FREQUENCY) {
        if (!buzzerEnabled_) return;
        
        if (enabled && intensity > 0) {
            // Update frequency if changed
            if (frequency != BUZZER_PWM_FREQUENCY) {
                ledcChangeFrequency(PIN_BUZZER, frequency, BUZZER_PWM_RESOLUTION);
            }
            
            // Set intensity
            ledcWrite(PIN_BUZZER, intensity);
        } else {
            // Turn off buzzer
            ledcWrite(PIN_BUZZER, 0);
        }
    }
    
    /**
     * @brief Set vibration motor state
     * @param enabled Enable/disable vibration
     * @param intensity Intensity level (0-255)
     */
    void setVibration(bool enabled, uint8_t intensity = 128) {
        if (!vibrationEnabled_) return;
        
        if (enabled && intensity > 0) {
            ledcWrite(PIN_VIBRATION, intensity);
        } else {
            ledcWrite(PIN_VIBRATION, 0);
        }
    }
    
    /**
     * @brief Update pattern state based on configuration
     */
    void updatePattern() {
        if (!currentAlert_.isActive) return;
        
        unsigned long currentTime = millis();
        unsigned long elapsed = currentTime - currentAlert_.lastToggle;
        
        switch (currentAlert_.config.pattern) {
            case PATTERN_CONTINUOUS:
                // Always on
                currentAlert_.patternState = true;
                break;
                
            case PATTERN_PULSE:
                // Simple on/off pattern
                if (currentAlert_.patternState) {
                    // Currently on, check if should turn off
                    if (elapsed >= currentAlert_.config.pulseOnMs) {
                        currentAlert_.patternState = false;
                        currentAlert_.lastToggle = currentTime;
                    }
                } else {
                    // Currently off, check if should turn on
                    if (elapsed >= currentAlert_.config.pulseOffMs) {
                        currentAlert_.patternState = true;
                        currentAlert_.lastToggle = currentTime;
                    }
                }
                break;
                
            case PATTERN_RAPID:
                // Rapid pulses (faster than normal)
                if (currentAlert_.patternState) {
                    if (elapsed >= (currentAlert_.config.pulseOnMs / 2)) {
                        currentAlert_.patternState = false;
                        currentAlert_.lastToggle = currentTime;
                    }
                } else {
                    if (elapsed >= (currentAlert_.config.pulseOffMs / 2)) {
                        currentAlert_.patternState = true;
                        currentAlert_.lastToggle = currentTime;
                    }
                }
                break;
                
            case PATTERN_SOS:
                // SOS pattern: ... --- ... (3 short, 3 long, 3 short)
                updateSOSPattern(currentTime, elapsed);
                break;
        }
    }
    
    /**
     * @brief Update SOS pattern state
     * @param currentTime Current time in milliseconds
     * @param elapsed Time since last toggle
     */
    void updateSOSPattern(unsigned long currentTime, unsigned long elapsed) {
        const uint16_t shortPulse = 200;  // 200ms
        const uint16_t longPulse = 600;   // 600ms
        const uint16_t pauseShort = 200;  // 200ms between pulses
        const uint16_t pauseLong = 600;   // 600ms between groups
        
        // SOS pattern steps: 0-5=short pulses, 6-11=long pulses, 12-17=short pulses
        // Odd steps are pauses, even steps are pulses
        
        if (currentAlert_.patternStep >= 18) {
            // End of pattern, reset and add long pause
            currentAlert_.patternStep = 0;
            currentAlert_.patternState = false;
            currentAlert_.lastToggle = currentTime;
            return;
        }
        
        bool isPulse = (currentAlert_.patternStep % 2 == 0);
        bool isLongPulse = (currentAlert_.patternStep >= 6 && currentAlert_.patternStep <= 11);
        
        uint16_t requiredTime;
        if (isPulse) {
            requiredTime = isLongPulse ? longPulse : shortPulse;
            currentAlert_.patternState = true;
        } else {
            if (currentAlert_.patternStep == 17) {
                requiredTime = pauseLong; // Long pause at end
            } else if (currentAlert_.patternStep == 5 || currentAlert_.patternStep == 11) {
                requiredTime = pauseLong; // Pause between groups
            } else {
                requiredTime = pauseShort; // Short pause between pulses
            }
            currentAlert_.patternState = false;
        }
        
        if (elapsed >= requiredTime) {
            currentAlert_.patternStep++;
            currentAlert_.lastToggle = currentTime;
        }
    }
    
    /**
     * @brief Apply current pattern state to hardware
     */
    void applyPatternToHardware() {
        const AlertConfig& config = currentAlert_.config;
        bool state = currentAlert_.patternState;
        
        // Apply to buzzer
        if (config.mode == ALERT_BUZZER || config.mode == ALERT_BOTH) {
            setBuzzer(state, config.buzzerIntensity, config.buzzerFrequency);
        }
        
        // Apply to vibration
        if (config.mode == ALERT_VIBRATION || config.mode == ALERT_BOTH) {
            setVibration(state, config.vibrationIntensity);
        }
    }
    
    /**
     * @brief Stop all alert outputs
     */
    void stopAllOutputs() {
        setBuzzer(false);
        setVibration(false);
    }

public:
    /**
     * @brief Constructor
     */
    AlertManager() :
        initialized_(false),
        lastCooldownEnd_(0),
        buzzerEnabled_(false),
        vibrationEnabled_(false),
        totalAlerts_(0),
        totalAlertTime_(0) {}
    
    /**
     * @brief Initialize the alert manager
     * @return true if successful
     */
    bool begin() {
        DEBUG_PRINTLN("AlertManager: Initializing...");
        
        // Initialize hardware
        initializeBuzzer();
        initializeVibration();
        
        // Ensure all outputs are off
        stopAllOutputs();
        
        initialized_ = true;
        DEBUG_PRINTLN("AlertManager: Ready");
        return true;
    }
    
    /**
     * @brief Update alert manager (call regularly)
     */
    void update() {
        if (!initialized_) return;
        
        // Check if current alert should end
        if (currentAlert_.shouldEnd()) {
            stopAlert();
            return;
        }
        
        // Update pattern if alert is active
        if (currentAlert_.isActive) {
            updatePattern();
            applyPatternToHardware();
        }
    }
    
    /**
     * @brief Start an alert with given configuration
     * @param config Alert configuration
     * @return true if alert was started
     */
    bool startAlert(const AlertConfig& config) {
        if (!initialized_) return false;
        
        // Check cooldown period
        unsigned long currentTime = millis();
        if (currentTime - lastCooldownEnd_ < config.cooldownMs) {
            DEBUG_PRINTLN("AlertManager: In cooldown period, ignoring alert");
            return false;
        }
        
        // Check if we should interrupt current alert
        if (currentAlert_.isActive) {
            if (config.priority <= currentAlert_.config.priority) {
                DEBUG_PRINTLN("AlertManager: Current alert has higher priority, ignoring");
                return false;
            }
            
            // Stop current alert to start new one
            stopAlert();
        }
        
        // Start new alert
        currentAlert_.isActive = true;
        currentAlert_.config = config;
        currentAlert_.startTime = currentTime;
        currentAlert_.lastToggle = currentTime;
        currentAlert_.endTime = currentTime + config.durationMs;
        currentAlert_.patternState = true;
        currentAlert_.patternStep = 0;
        
        // Update statistics
        totalAlerts_++;
        
        DEBUG_PRINTF("AlertManager: Starting alert - Mode: %d, Duration: %dms, Reason: %s\n",
                     config.mode, config.durationMs, config.reason.c_str());
        
        return true;
    }
    
    /**
     * @brief Start a simple alert
     * @param mode Alert mode
     * @param durationMs Duration in milliseconds
     * @param intensity Intensity (0-255)
     * @param reason Optional reason string
     * @return true if alert was started
     */
    bool startAlert(AlertMode mode, uint16_t durationMs, uint8_t intensity, const String& reason = "") {
        AlertConfig config(mode, durationMs, intensity, reason);
        return startAlert(config);
    }
    
    /**
     * @brief Stop current alert
     */
    void stopAlert() {
        if (!currentAlert_.isActive) return;
        
        // Update statistics
        totalAlertTime_ += currentAlert_.getElapsedTime();
        
        // Stop hardware outputs
        stopAllOutputs();
        
        // Record cooldown start
        lastCooldownEnd_ = millis() + currentAlert_.config.cooldownMs;
        
        DEBUG_PRINTF("AlertManager: Alert stopped - Duration: %lums\n", currentAlert_.getElapsedTime());
        
        // Reset state
        currentAlert_.isActive = false;
    }
    
    /**
     * @brief Check if an alert is currently active
     * @return true if alert is active
     */
    bool isAlertActive() const {
        return currentAlert_.isActive;
    }
    
    /**
     * @brief Get current alert configuration
     * @return Current alert config (only valid if alert is active)
     */
    const AlertConfig& getCurrentAlert() const {
        return currentAlert_.config;
    }
    
    /**
     * @brief Get current alert state
     * @return Current alert state
     */
    const AlertState& getAlertState() const {
        return currentAlert_;
    }
    
    /**
     * @brief Check if in cooldown period
     * @return true if in cooldown
     */
    bool isInCooldown() const {
        return millis() < lastCooldownEnd_;
    }
    
    /**
     * @brief Get remaining cooldown time
     * @return Remaining cooldown time in milliseconds
     */
    unsigned long getRemainingCooldown() const {
        unsigned long current = millis();
        return (current < lastCooldownEnd_) ? (lastCooldownEnd_ - current) : 0;
    }
    
    /**
     * @brief Force stop all alerts and clear cooldown
     */
    void emergencyStop() {
        stopAllOutputs();
        currentAlert_.isActive = false;
        lastCooldownEnd_ = 0;
        DEBUG_PRINTLN("AlertManager: Emergency stop executed");
    }
    
    /**
     * @brief Get hardware status
     * @return JSON string with hardware status
     */
    String getHardwareStatus() const {
        String json = "{";
        json += "\"buzzerEnabled\":" + String(buzzerEnabled_ ? "true" : "false") + ",";
        json += "\"vibrationEnabled\":" + String(vibrationEnabled_ ? "true" : "false") + ",";
        json += "\"initialized\":" + String(initialized_ ? "true" : "false");
        json += "}";
        return json;
    }
    
    /**
     * @brief Get statistics
     * @return JSON string with statistics
     */
    String getStats() const {
        String json = "{";
        json += "\"totalAlerts\":" + String(totalAlerts_) + ",";
        json += "\"totalAlertTime\":" + String(totalAlertTime_) + ",";
        json += "\"isActive\":" + String(currentAlert_.isActive ? "true" : "false") + ",";
        json += "\"isInCooldown\":" + String(isInCooldown() ? "true" : "false");
        if (currentAlert_.isActive) {
            json += ",\"remainingTime\":" + String(currentAlert_.getRemainingTime());
            json += ",\"elapsedTime\":" + String(currentAlert_.getElapsedTime());
        }
        json += "}";
        return json;
    }
};

#endif // ALERT_MANAGER_H 