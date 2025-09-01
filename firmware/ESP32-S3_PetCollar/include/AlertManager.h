#ifndef ALERT_MANAGER_H
#define ALERT_MANAGER_H

#include <Arduino.h>
#include "ESP32_S3_Config.h"
#include "MicroConfig.h"
#include "BeaconTypes.h"

// Forward declarations
class AlertManager_Enhanced;

/**
 * @brief Alert configuration structure
 */
struct AlertConfig {
  AlertMode mode;
  int intensity = 180;  // Default ~70% duty cycle (0-255)
  int duration = 1200;  // Default 1.2s duration
  int pattern = 0;      // 0=steady, 1=single, 2=double, etc. (future)
  AlertReason reason = AlertReason::NONE;
};

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
  
  // Auto-stop state
  bool autoStop = false;
  unsigned long alertStartMs = 0;
  unsigned long alertDurationMs = 0;
  AlertMode activeMode = AlertMode::NONE;
  
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