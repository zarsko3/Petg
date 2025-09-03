#ifndef ALERT_MANAGER_H
#define ALERT_MANAGER_H

#include <Arduino.h>
#include "include/ESP32_S3_Config.h"
#include "include/MicroConfig.h"
#include "include/BeaconTypes.h"

// Forward declarations
class AlertManager_Enhanced;

// AlertConfig is now defined in BeaconTypes.h

/**
 * @brief Enhanced Alert Manager with simplified interface
 */
class AlertManager_Enhanced {
private:
    uint8_t buzzerPin;
    uint8_t vibrationPin;
    bool alertActive;
    
  // LEDC / timing members
  uint8_t  buzzerChannel   = 0;     // pick a free LEDC channel (0..7)
  uint16_t defaultFreq     = 2000;  // 2 kHz is good for piezo
  uint8_t  pwmResolution   = 8;     // 8-bit resolution
  uint8_t  defaultDuty     = 180;   // 0..255 (~70%)
  
  // Auto-stop state (ISR-safe)
  volatile bool autoStop = false;  // written in ISR, read in loop
  unsigned long alertStartMs = 0;
  unsigned long alertDurationMs = 0;
  AlertMode activeMode = AlertMode::NONE;
  
  // Hardware timer for reliable auto-stop
  hw_timer_t* stopTimer = nullptr;
  static void IRAM_ATTR onStopTimer();  // Timer ISR (no args)
  void setupStopTimer();                         // Initialize timer
  void scheduleAutoStop(unsigned long ms);       // Schedule auto-stop
  void cancelAutoStop();                         // Cancel pending stop
  
  // Helpers
  void buzzOn(uint16_t freq, uint8_t duty);
  void buzzOff();
  
public:
    AlertManager_Enhanced(uint8_t buzzerPin, uint8_t vibrationPin);
    
    // Core functionality
  bool initialize();
  bool update();                 // must be called from loop()
    bool stopAlert(bool force = false);
    bool isAlertActive() const;
    bool triggerAlert(const AlertConfig& config);
  
  // Start alert with explicit duration/intensity
  bool startAlertDuration(
    AlertReason reason,
    AlertMode mode,
    int duration_ms,
    int intensity = 180
  );
  
  // Legacy method for backward compatibility
  bool startAlert(
    AlertReason reason,
    AlertMode mode = AlertMode::BOTH,
    int pattern = 0,
    int priority = 0,
    const String& customReason = ""
  );
    
    // Utility functions
    AlertMode stringToAlertMode(const String& modeStr);
};

#endif // ALERT_MANAGER_H 