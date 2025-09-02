#include "AlertManager.h"

AlertManager_Enhanced::AlertManager_Enhanced(uint8_t buzPin, uint8_t vibPin) 
    : buzzerPin(buzPin)
    , vibrationPin(vibPin)
    , alertActive(false)
{
}

void AlertManager_Enhanced::buzzOn(uint16_t freq, uint8_t duty) {
    // Configure LEDC timer
    ledc_timer_config_t timer_conf = {};
    timer_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    timer_conf.duty_resolution = LEDC_TIMER_8_BIT;  // 8-bit resolution
    timer_conf.timer_num = LEDC_TIMER_0;
    timer_conf.freq_hz = freq;
    timer_conf.clk_cfg = LEDC_AUTO_CLK;
    ledc_timer_config(&timer_conf);

    // Configure LEDC channel
    ledc_channel_config_t channel_conf;
    channel_conf.gpio_num = buzzerPin;
    channel_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    channel_conf.channel = (ledc_channel_t)buzzerChannel;
    channel_conf.timer_sel = LEDC_TIMER_0;
    channel_conf.duty = duty;  // 0-255 for 8-bit resolution
    channel_conf.hpoint = 0;
    ledc_channel_config(&channel_conf);
    
    Serial.printf("🔊 Buzzer PWM: freq=%dHz, duty=%d, pin=%d\n", 
                 freq, duty, buzzerPin);
}

void AlertManager_Enhanced::buzzOff() {
    // First set duty to 0 to stop the sound
    ledc_set_duty(LEDC_LOW_SPEED_MODE, (ledc_channel_t)buzzerChannel, 0);
    ledc_update_duty(LEDC_LOW_SPEED_MODE, (ledc_channel_t)buzzerChannel);
    
    // Then detach the channel to ensure it's completely stopped
    // Use idle level HIGH for active-LOW buzzer
    ledc_stop(LEDC_LOW_SPEED_MODE, (ledc_channel_t)buzzerChannel, 1);  // idle HIGH = OFF
    
    // Set pin back to HIGH for active-LOW buzzer
    pinMode(buzzerPin, OUTPUT);
    digitalWrite(buzzerPin, HIGH);  // OFF for active-LOW
    
    Serial.println("🔇 Buzzer stopped and detached");
}

// Static pointer to instance for timer callback
static AlertManager_Enhanced* gAlertManager = nullptr;

// Timer ISR - must be IRAM_ATTR for hardware timer
void IRAM_ATTR AlertManager_Enhanced::onStopTimer() {
    // Note: Can't use Serial.print in ISR
    // Just set a flag that loop() will check
    if (gAlertManager) {
        gAlertManager->autoStop = true;
    }
}

void AlertManager_Enhanced::setupStopTimer() {
    // Initialize hardware timer (1MHz, count up)
    stopTimer = timerBegin(0, 80, true);  // Timer 0, 80MHz/80=1MHz, count up
    
    // Attach ISR
    timerAttachInterrupt(stopTimer, &AlertManager_Enhanced::onStopTimer, true);
    
    // Store instance pointer for ISR
    gAlertManager = this;
}

void AlertManager_Enhanced::scheduleAutoStop(unsigned long ms) {
    if (!stopTimer) return;
    
    // Cancel any pending alarm
    cancelAutoStop();
    
    // Set new alarm (convert ms to microseconds)
    timerAlarmWrite(stopTimer, ms * 1000, false);  // false = one-shot
    timerAlarmEnable(stopTimer);
    
    Serial.printf("⏰ Auto-stop scheduled for %lums\n", ms);
}

void AlertManager_Enhanced::cancelAutoStop() {
    if (!stopTimer) return;
    
    timerAlarmDisable(stopTimer);
    Serial.println("⏰ Auto-stop cancelled");
}

bool AlertManager_Enhanced::initialize() {
    pinMode(buzzerPin, OUTPUT);
    pinMode(vibrationPin, OUTPUT);
    digitalWrite(buzzerPin, HIGH);  // active-LOW buzzer: HIGH = OFF
    digitalWrite(vibrationPin, LOW);

    // Initial LEDC setup with default frequency
    ledc_timer_config_t timer_conf = {};
    timer_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    timer_conf.duty_resolution = LEDC_TIMER_8_BIT;
    timer_conf.timer_num = LEDC_TIMER_0;
    timer_conf.freq_hz = defaultFreq;
    timer_conf.clk_cfg = LEDC_AUTO_CLK;
    ledc_timer_config(&timer_conf);

    // Initial channel configuration
    ledc_channel_config_t channel_conf = {};
    channel_conf.gpio_num = buzzerPin;
    channel_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    channel_conf.channel = (ledc_channel_t)buzzerChannel;
    channel_conf.timer_sel = LEDC_TIMER_0;
    channel_conf.duty = 255;  // Hold steady HIGH = OFF for active-LOW
    channel_conf.hpoint = 0;
    ledc_channel_config(&channel_conf);
    
    // Ensure the channel is truly idle-high and detached until needed
    ledc_stop(LEDC_LOW_SPEED_MODE, (ledc_channel_t)buzzerChannel, 1);  // idle=HIGH

    // Initialize hardware timer for auto-stop
    setupStopTimer();

    Serial.printf("🚨 Enhanced AlertManager initialized (LEDC ready on GPIO %d)\n", buzzerPin);
    return true;
}

bool AlertManager_Enhanced::triggerAlert(const AlertConfig& config) {
    // Stop any existing alert
    if (alertActive) {
        stopAlert(true);
    }

    alertActive = true;
    activeMode = config.mode;

    // Schedule auto-stop via loop check
    alertStartMs = millis();
    alertDurationMs = (config.duration > 0) ? (unsigned long)config.duration : 1000; // default 1s
    autoStop = false;  // Will be set by timer ISR

    // BUZZER / BOTH -> play PWM tone
    if (config.mode == AlertMode::BUZZER || config.mode == AlertMode::BOTH) {
        // Map intensity (1-255) to a reasonable duty cycle range
        uint8_t intensity = (config.intensity > 0) ? config.intensity : defaultDuty;
        buzzOn(defaultFreq, intensity);
    }

    // VIBRATION / BOTH -> drive motor pin
    if (config.mode == AlertMode::VIBRATION || config.mode == AlertMode::BOTH) {
        digitalWrite(vibrationPin, HIGH);
    }

    // Schedule hardware timer backup
    scheduleAutoStop(alertDurationMs);

    Serial.printf("🚨 Enhanced alert triggered: mode=%d, intensity=%d, duration=%lums\n",
                 (int)config.mode, config.intensity, alertDurationMs);
    return true;
}

bool AlertManager_Enhanced::startAlertDuration(AlertReason reason, AlertMode mode, int duration_ms, int intensity) {
    AlertConfig cfg;
    cfg.mode = mode;
    cfg.intensity = intensity > 0 ? intensity : defaultDuty;
    cfg.duration = duration_ms > 0 ? duration_ms : 1000;
    cfg.reason = reason;
    
    Serial.printf("🚨 Starting alert: reason=%d, mode=%d, duration=%dms, intensity=%d\n", 
                 (int)reason, (int)mode, duration_ms, intensity);
    return triggerAlert(cfg);
}

bool AlertManager_Enhanced::startAlert(AlertReason reason, AlertMode mode, int pattern, int priority, const String& customReason) {
    // Keep backward compatibility; default 1.2s duration and 70% intensity
    return startAlertDuration(reason, mode, /*duration_ms=*/1000, /*intensity=*/180);
}

bool AlertManager_Enhanced::update() {
    if (alertActive) {
        // Check if timer ISR has set the auto-stop flag
        if (autoStop) {
            Serial.printf("⏱️ Alert duration elapsed (%lums) - auto-stopping\n", alertDurationMs);
            stopAlert(/*force=*/true);
            return false;
        }

        // Backup: also check millis() in case timer fails
        unsigned long now = millis();
        if (now - alertStartMs >= alertDurationMs) {
            Serial.printf("⏱️ Alert duration elapsed (%lums) - loop auto-stop\n", alertDurationMs);
            stopAlert(/*force=*/true);
            return false;
        }

        // For debugging: show remaining time
        unsigned long remaining = alertDurationMs - (now - alertStartMs);
        if (remaining % 100 == 0) { // Log every 100ms
            Serial.printf("⏳ Alert time remaining: %lums\n", remaining);
        }
    }
    return alertActive;
}

bool AlertManager_Enhanced::stopAlert(bool force) {
    if (alertActive || force) {
        alertActive = false;
        autoStop = false;
        
        // Cancel hardware timer
        cancelAutoStop();
        
        // Stop PWM buzzer with LEDC
        buzzOff();
        
        // Stop vibration motor
        digitalWrite(vibrationPin, LOW);
        
        Serial.println("🛑 Enhanced alert stopped");
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