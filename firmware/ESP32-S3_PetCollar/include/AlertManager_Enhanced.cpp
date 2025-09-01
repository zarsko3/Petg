#include "AlertManager.h"

AlertManager_Enhanced::AlertManager_Enhanced(uint8_t buzPin, uint8_t vibPin) 
    : buzzerPin(buzPin)
    , vibrationPin(vibPin)
    , alertActive(false)
{
}

void AlertManager_Enhanced::buzzOn(uint16_t freq, uint8_t duty) {
    // Configure LEDC timer
    ledc_timer_config_t timer_conf;
    timer_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    timer_conf.duty_resolution = LEDC_TIMER_8_BIT;  // 8-bit resolution
    timer_conf.timer_num = LEDC_TIMER_0;
    timer_conf.freq_hz = freq;
    ledc_timer_config(&timer_conf);

    // Configure LEDC channel
    ledc_channel_config_t channel_conf;
    channel_conf.gpio_num = buzzerPin;
    channel_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    channel_conf.channel = LEDC_CHANNEL_0;
    channel_conf.timer_sel = LEDC_TIMER_0;
    channel_conf.duty = duty;  // 0-255 for 8-bit resolution
    channel_conf.hpoint = 0;
    ledc_channel_config(&channel_conf);
}

void AlertManager_Enhanced::buzzOff() {
    // First set duty to 0 to stop the sound
    ledc_set_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, 0);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0);
    
    // Then detach the channel to ensure it's completely stopped
    ledc_stop(LEDC_LOW_SPEED_MODE, LEDC_CHANNEL_0, 0);
    
    // Set pin back to output low for safety
    pinMode(buzzerPin, OUTPUT);
    digitalWrite(buzzerPin, LOW);
    
    Serial.println("🔇 Buzzer stopped and detached");
}

bool AlertManager_Enhanced::initialize() {
    pinMode(buzzerPin, OUTPUT);
    pinMode(vibrationPin, OUTPUT);
    digitalWrite(buzzerPin, LOW);
    digitalWrite(vibrationPin, LOW);

    // Initial LEDC setup with default frequency
    ledc_timer_config_t timer_conf;
    timer_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    timer_conf.duty_resolution = LEDC_TIMER_8_BIT;
    timer_conf.timer_num = LEDC_TIMER_0;
    timer_conf.freq_hz = defaultFreq;
    ledc_timer_config(&timer_conf);

    // Initial channel configuration
    ledc_channel_config_t channel_conf;
    channel_conf.gpio_num = buzzerPin;
    channel_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    channel_conf.channel = LEDC_CHANNEL_0;
    channel_conf.timer_sel = LEDC_TIMER_0;
    channel_conf.duty = 0;  // Start with buzzer off
    channel_conf.hpoint = 0;
    ledc_channel_config(&channel_conf);

    Serial.printf("🚨 Enhanced AlertManager initialized (LEDC ready on GPIO %d)\n", buzzerPin);
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
    if (alertActive) {
        if (millis() >= alertEndTime) {
            Serial.printf("⏱️ Alert duration elapsed (%ums) - auto-stopping\n", currentDuration);
            stopAlert(false);
        } else {
            // For debugging: show remaining time
            unsigned long remaining = alertEndTime - millis();
            if (remaining % 100 == 0) { // Log every 100ms
                Serial.printf("⏳ Alert time remaining: %ums\n", remaining);
            }
        }
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