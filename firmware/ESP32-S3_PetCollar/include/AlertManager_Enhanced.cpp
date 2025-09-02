#include "AlertManager.h"

AlertManager_Enhanced::AlertManager_Enhanced(uint8_t buzPin, uint8_t vibPin) 
    : buzzerPin(buzPin)
    , vibrationPin(vibPin)
    , alertActive(false)
{
}

void AlertManager_Enhanced::buzzOn(uint16_t freq, uint8_t duty) {
    // Configure LEDC timer with zero-init
    ledc_timer_config_t timer_conf = {};
    timer_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    timer_conf.duty_resolution = LEDC_TIMER_8_BIT;  // 8-bit resolution
    timer_conf.timer_num = LEDC_TIMER_0;
    timer_conf.freq_hz = freq;
    timer_conf.clk_cfg = LEDC_AUTO_CLK;  // Let ESP-IDF handle clock
    ledc_timer_config(&timer_conf);

    // Configure LEDC channel with zero-init
    ledc_channel_config_t channel_conf = {};
    channel_conf.gpio_num = buzzerPin;
    channel_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    channel_conf.channel = (ledc_channel_t)buzzerChannel;
    channel_conf.timer_sel = LEDC_TIMER_0;
    channel_conf.duty = duty;  // 0-255 for 8-bit resolution
    channel_conf.hpoint = 0;
    channel_conf.intr_type = LEDC_INTR_DISABLE;  // No interrupts needed
    ledc_channel_config(&channel_conf);
    
    Serial.printf("🔊 Buzzer PWM: freq=%dHz, duty=%d, pin=%d\n", 
                 freq, duty, buzzerPin);
}

void AlertManager_Enhanced::buzzOff() {
    // Stop PWM and keep pin parked HIGH (OFF for active-LOW)
    ledc_stop(LEDC_LOW_SPEED_MODE, (ledc_channel_t)buzzerChannel, 1); // idle=HIGH
    // IMPORTANT: do NOT call set_duty/update after ledc_stop; that re-enables PWM.
    
    // Ensure pin stays HIGH (OFF)
    pinMode(buzzerPin, OUTPUT);
    digitalWrite(buzzerPin, HIGH); // OFF
    
    Serial.println("🔇 Buzzer stopped and parked HIGH");
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
    // Store instance pointer for ISR first
    gAlertManager = this;
    
    // Initialize hardware timer (1MHz, count up)
    stopTimer = timerBegin(0, 80, true);  // Timer 0, 80MHz/80=1MHz, count up
    
    if (!stopTimer) {
        Serial.println("❌ Failed to initialize hardware timer");
        return;
    }
    
    // Attach ISR (edge-triggered)
    timerAttachInterrupt(stopTimer, &AlertManager_Enhanced::onStopTimer, true);
    
    // Set auto-reload OFF, count UP
    timerSetAutoReload(stopTimer, false);
    timerSetCountUp(stopTimer, true);
    
    Serial.println("⏰ Hardware timer initialized for auto-stop");
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
    // Set pins to safe state first
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
    timer_conf.clk_cfg = LEDC_AUTO_CLK;  // Let ESP-IDF handle clock
    ledc_timer_config(&timer_conf);

    // Initial channel configuration - start detached
    ledc_channel_config_t channel_conf = {};
    channel_conf.gpio_num = buzzerPin;
    channel_conf.speed_mode = LEDC_LOW_SPEED_MODE;
    channel_conf.channel = (ledc_channel_t)buzzerChannel;
    channel_conf.timer_sel = LEDC_TIMER_0;
    channel_conf.intr_type = LEDC_INTR_DISABLE;  // No interrupts needed
    channel_conf.duty = 0;  // Will be overridden by ledc_stop
    channel_conf.hpoint = 0;
    ledc_channel_config(&channel_conf);
    
    // Immediately stop and park HIGH (OFF)
    ledc_stop(LEDC_LOW_SPEED_MODE, (ledc_channel_t)buzzerChannel, 1);  // idle=HIGH
    
    // Double-check pin is still HIGH
    digitalWrite(buzzerPin, HIGH);  // Ensure OFF

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
    // Default 1s duration and 70% intensity
    return startAlertDuration(reason, mode, /*duration_ms=*/1000, /*intensity=*/180);
}

bool AlertManager_Enhanced::update() {
    if (!alertActive) {
        // No alert running - ensure everything is off
        if (isAlertActive() || autoStop) {
            stopAlert(true);
        }
        return false;
    }
    
    unsigned long now = millis();
    bool shouldStop = false;
    
    // Check timer ISR flag first (fastest path)
    if (autoStop) {
        Serial.printf("⏱️ Alert auto-stopped by timer ISR (%lums)\n", alertDurationMs);
        shouldStop = true;
    }
    
    // Backup: check millis() duration
    else if (now - alertStartMs >= alertDurationMs) {
        Serial.printf("⏱️ Alert duration elapsed (%lums) - stopping\n", alertDurationMs);
        shouldStop = true;
    }
    
    // Stop if needed
    if (shouldStop) {
        stopAlert(true);
        return false;
    }
    
    // For debugging: show remaining time
    unsigned long remaining = alertDurationMs - (now - alertStartMs);
    if (remaining % 100 == 0) { // Log every 100ms
        Serial.printf("⏳ Alert time remaining: %lums\n", remaining);
    }
    
    return true;
}

bool AlertManager_Enhanced::stopAlert(bool force) {
    if (!alertActive && !force) {
        return false;
    }
    
    // Cancel hardware timer first
    cancelAutoStop();
    
    // Stop PWM buzzer with LEDC
    buzzOff();
    
    // Stop vibration motor
    digitalWrite(vibrationPin, LOW);
    
    // Reset all state flags
    alertActive = false;
    autoStop = false;
    alertStartMs = 0;
    alertDurationMs = 0;
    activeMode = AlertMode::NONE;
    
    Serial.println("🛑 Enhanced alert stopped and state reset");
    return true;
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