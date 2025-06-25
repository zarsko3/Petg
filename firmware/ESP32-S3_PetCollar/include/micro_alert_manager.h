#ifndef MICRO_ALERT_MANAGER_H
#define MICRO_ALERT_MANAGER_H

#include <Arduino.h>
#include "micro_config.h"

// Alert modes are already defined in micro_config.h

class AlertManager {
private:
    bool initialized;
    bool alertActive;
    AlertMode mode;
    String alertReason;
    unsigned long alertStartTime;
    unsigned long lastUpdateTime;
    
    // Pins
    int buzzerPin;
    int vibrationPin;
    
    // Alert pattern state
    int patternState;
    
    // Buzzer control
    int buzzerFrequency;     // Current buzzer frequency in Hz
    int buzzerVolume;        // Current buzzer volume (0-255)
    int vibrationIntensity;  // Current vibration intensity (0-255)

public:
    AlertManager() : 
        initialized(false),
        alertActive(false),
        mode(ALERT_BOTH),
        alertStartTime(0),
        lastUpdateTime(0),
        buzzerPin(BUZZER_PIN),
        vibrationPin(VIBRATION_PIN),
        patternState(0),
        buzzerFrequency(BUZZER_FREQ),
        buzzerVolume(128),              // Default to 50% volume
        vibrationIntensity(128) {}      // Default to 50% intensity
    
    // Initialize alert system
    bool begin() {
        // Setup buzzer PWM using Arduino ESP32 core API (new style)
        ledcAttach(buzzerPin, buzzerFrequency, BUZZER_RESOLUTION);
        
        // Setup vibration PWM using Arduino ESP32 core API (new style)
        ledcAttach(vibrationPin, VIBRATION_FREQ, VIBRATION_RESOLUTION);
        
        // Start with everything off
        ledcWrite(buzzerPin, 0);
        ledcWrite(vibrationPin, 0);
        
        initialized = true;
        DEBUG_PRINTLN("Alert manager initialized");
        return true;
    }
    
    // Main update loop
    void loop() {
        if (!initialized || !alertActive) {
            return;
        }
        
        // Update alert pattern
        unsigned long currentTime = millis();
        
        // Pulse the alerts every 500ms when active
        if (currentTime - lastUpdateTime > 500) {
            lastUpdateTime = currentTime;
            patternState = !patternState;
            
            // Update outputs based on mode
            if (mode == ALERT_BUZZER || mode == ALERT_BOTH) {
                // Update frequency and volume
                ledcChangeFrequency(buzzerPin, buzzerFrequency, BUZZER_RESOLUTION);
                
                // Then set volume via duty cycle
                if (patternState) {
                    ledcWrite(buzzerPin, buzzerVolume);
                } else {
                    ledcWrite(buzzerPin, 0);
                }
            }
            
            if (mode == ALERT_VIBRATION || mode == ALERT_BOTH) {
                if (patternState) {
                    ledcWrite(vibrationPin, vibrationIntensity);
                } else {
                    ledcWrite(vibrationPin, 0);
                }
            }
        }
        
        // Auto-stop alerts after 5 seconds to save power
        if (currentTime - alertStartTime > 5000) {
            stopAlert();
        }
    }
    
    // Start an alert with optional reason
    void startAlert(const String& reason = "") {
        if (!initialized || mode == ALERT_NONE) {
            return;
        }
        
        alertActive = true;
        alertReason = reason;
        alertStartTime = millis();
        lastUpdateTime = alertStartTime;
        patternState = 1;
        
        // Initial state of outputs
        if (mode == ALERT_BUZZER || mode == ALERT_BOTH) {
            ledcChangeFrequency(buzzerPin, buzzerFrequency, BUZZER_RESOLUTION);
            ledcWrite(buzzerPin, buzzerVolume);
        }
        
        if (mode == ALERT_VIBRATION || mode == ALERT_BOTH) {
            ledcWrite(vibrationPin, vibrationIntensity);
        }
    }
    
    // Stop any active alert
    void stopAlert() {
        alertActive = false;
        alertReason = "";
        
        // Turn off all outputs
        ledcWrite(buzzerPin, 0);
        ledcWrite(vibrationPin, 0);
    }
    
    // Set the alert mode
    void setAlertMode(AlertMode newMode) {
        mode = newMode;
        if (alertActive && mode == ALERT_NONE) {
            stopAlert();
        }
    }
    
    // Cycle through alert modes
    void cycleAlertMode() {
        mode = (AlertMode)(((int)mode + 1) % 4);
        DEBUG_PRINTF("Alert mode changed to: %d\n", mode);
    }
    
    // Get current alert mode
    AlertMode getAlertMode() const {
        return mode;
    }
    
    // Check if an alert is active
    bool isAlertActive() const {
        return alertActive;
    }
    
    // Get reason for current alert
    String getAlertReason() const {
        return alertReason;
    }
    
    // Set buzzer frequency (tone)
    void setBuzzerFrequency(int frequency) {
        // Constrain frequency to reasonable values (100Hz to 20kHz)
        buzzerFrequency = constrain(frequency, 100, 20000);
        
        // Update frequency if alert is active
        if (alertActive && (mode == ALERT_BUZZER || mode == ALERT_BOTH)) {
            ledcChangeFrequency(buzzerPin, buzzerFrequency, BUZZER_RESOLUTION);
        }
    }
    
    // Get current buzzer frequency
    int getBuzzerFrequency() const {
        return buzzerFrequency;
    }
    
    // Set buzzer volume (0-255)
    void setBuzzerVolume(int volume) {
        // Constrain volume to valid PWM range
        buzzerVolume = constrain(volume, 0, 255);
        
        // Update volume if alert is active
        if (alertActive && (mode == ALERT_BUZZER || mode == ALERT_BOTH) && patternState) {
            ledcWrite(buzzerPin, buzzerVolume);
        }
    }
    
    // Get current buzzer volume
    int getBuzzerVolume() const {
        return buzzerVolume;
    }
    
    // Set vibration intensity (0-255)
    void setVibrationIntensity(int intensity) {
        // Constrain intensity to valid PWM range
        vibrationIntensity = constrain(intensity, 0, 255);
        
        // Update intensity if alert is active
        if (alertActive && (mode == ALERT_VIBRATION || mode == ALERT_BOTH) && patternState) {
            ledcWrite(vibrationPin, vibrationIntensity);
        }
    }
    
    // Get current vibration intensity
    int getVibrationIntensity() const {
        return vibrationIntensity;
    }
    
    // Handle proximity detection
    void handleProximityDetection(bool inProximity, const String& reason = "") {
        if (inProximity && !alertActive) {
            startAlert(reason);
        } else if (!inProximity && alertActive) {
            stopAlert();
        }
    }
};

#endif // MICRO_ALERT_MANAGER_H 