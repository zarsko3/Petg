#include "AlertManager.h"

AlertManager_Enhanced::AlertManager_Enhanced(uint8_t buzPin, uint8_t vibPin) 
    : buzzerPin(buzPin)
    , vibrationPin(vibPin)
    , alertActive(false)
{
}

void AlertManager_Enhanced::buzzOn(uint16_t freq, uint8_t duty) {
    ledcWriteTone(buzzerChannel, freq); // set frequency
    ledcWrite(buzzerChannel, duty);     // non-zero duty => sound
}

void AlertManager_Enhanced::buzzOff() {
    ledcWrite(buzzerChannel, 0);        // duty 0 => silent
}

bool AlertManager_Enhanced::initialize() {
    pinMode(buzzerPin, OUTPUT);
    pinMode(vibrationPin, OUTPUT);
    digitalWrite(buzzerPin, LOW);
    digitalWrite(vibrationPin, LOW);

    // Setup LEDC for passive buzzer
    ledcSetup(buzzerChannel, defaultFreq, pwmResolution);
    ledcAttachPin(buzzerPin, buzzerChannel);
    buzzOff();

    Serial.printf("🚨 Enhanced AlertManager initialized (LEDC ready on GPIO %d, channel %d)\n", 
                 buzzerPin, buzzerChannel);
    return true;
}

bool AlertManager_Enhanced::triggerAlert(const AlertConfig& config) {
    alertActive = true;
    activeMode = config.mode;

    // duration (ms)
    currentDuration = (config.duration > 0) ? config.duration : 500; // default 500ms
    alertEndTime = millis() + currentDuration;

    // BUZZER / BOTH -> play PWM tone using LEDC
    if (config.mode == AlertMode::BUZZER || config.mode == AlertMode::BOTH) {
        // Map intensity (1-255) to a reasonable duty cycle range
        // Avoid 0 duty which would be silent
        uint8_t intensity = (config.intensity > 0) ? config.intensity : defaultDuty; // 0..255
        uint8_t duty = intensity; // Direct mapping for 8-bit resolution
        
        // Use LEDC to generate tone
        buzzOn(defaultFreq, duty);
        
        Serial.printf("🔊 Buzzer PWM: freq=%dHz, duty=%d, pin=%d, channel=%d\n", 
                     defaultFreq, duty, buzzerPin, buzzerChannel);
    }

    // VIBRATION / BOTH -> drive motor pin
    if (config.mode == AlertMode::VIBRATION || config.mode == AlertMode::BOTH) {
        digitalWrite(vibrationPin, HIGH);
    }

    Serial.printf("🚨 Enhanced alert triggered (PWM): mode=%d, intensity=%d, duration=%ums\n",
                 (int)config.mode, config.intensity, currentDuration);
    return true;
}

bool AlertManager_Enhanced::startAlert(
    AlertReason reason,
    AlertMode mode,
    int pattern,
    int priority,
    const String& customReason
) {
    AlertConfig cfg;
    cfg.mode = mode;
    cfg.intensity = 180; // Default intensity (~70%)
    cfg.duration = 5000; // Default 5 seconds
    cfg.reason = reason;
    
    Serial.printf("🚨 Starting alert: reason=%d, mode=%d\n", (int)reason, (int)mode);
    return triggerAlert(cfg);
}

bool AlertManager_Enhanced::update() {
    if (alertActive && millis() >= alertEndTime) {
        Serial.printf("⏱️ Alert duration elapsed (%ums) - auto-stopping\n", currentDuration);
        stopAlert(false);
    }
    return alertActive;
}

bool AlertManager_Enhanced::stopAlert(bool force) {
    if (alertActive || force) {
        alertActive = false;
        
        // Stop PWM buzzer with LEDC
        buzzOff();
        
        // Stop vibration motor
        digitalWrite(vibrationPin, LOW);
        
        Serial.println("🛑 Enhanced alert stopped (PWM off)");
        return true;
    }
    return false;
}

bool AlertManager_Enhanced::isAlertActive() const {
    return alertActive;
}

AlertMode AlertManager_Enhanced::stringToAlertMode(const String& modeStr) {
    if (modeStr.equalsIgnoreCase("buzzer")) return AlertMode::BUZZER;
    if (modeStr.equalsIgnoreCase("vibration")) return AlertMode::VIBRATION;
    if (modeStr.equalsIgnoreCase("both")) return AlertMode::BOTH;
    return AlertMode::NONE;
}