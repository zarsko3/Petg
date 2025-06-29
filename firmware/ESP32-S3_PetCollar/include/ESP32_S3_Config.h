#ifndef ESP32_S3_CONFIG_H
#define ESP32_S3_CONFIG_H

/**
 * @file ESP32_S3_Config.h
 * @brief Comprehensive configuration file for ESP32-S3 Pet Collar system
 * @version 3.1.0
 * @date 2024
 * 
 * This file contains all hardware-specific configurations, pin assignments,
 * and system parameters optimized for ESP32-S3 DevKitC-1 and compatible boards.
 * 
 * Features:
 * - Enhanced memory management (512KB SRAM, 8MB+ Flash)
 * - Native USB OTG support
 * - Improved WiFi performance
 * - Advanced security features
 * - Power management optimization
 */

#include <Arduino.h>

// ==========================================
// FIRMWARE VERSION INFORMATION
// ==========================================
#define FIRMWARE_VERSION_MAJOR      3
#define FIRMWARE_VERSION_MINOR      1
#define FIRMWARE_VERSION_PATCH      0
#define FIRMWARE_BUILD              "ESP32-S3-Refactored"
#define FIRMWARE_VERSION            "3.1.0-ESP32-S3"
#define FIRMWARE_COMPILE_DATE       __DATE__
#define FIRMWARE_COMPILE_TIME       __TIME__

#define HARDWARE_PLATFORM           "ESP32-S3"
#define DEVICE_FAMILY               "PetCollar"
#define MANUFACTURER                "SmartPet"
#define DEVICE_MODEL                "SC-ESP32S3-001"

// ==========================================
// FEATURE CONTROL FLAGS
// ==========================================

/* Core Communication Features */
#define FEATURE_WIFI_ENABLED        true
#define FEATURE_BLUETOOTH_ENABLED   true
#define FEATURE_BLE_SCANNER_ENABLED true
#define FEATURE_WEBSOCKET_ENABLED   true
#define FEATURE_WEB_INTERFACE       true
#define FEATURE_OTA_UPDATES         true

/* User Interface Features */
#define FEATURE_OLED_DISPLAY        true
#define FEATURE_STATUS_LEDS         true
#define FEATURE_BUZZER_ALERTS       true
#define FEATURE_VIBRATION_ALERTS    true

/* Sensor & Monitoring Features */
#define FEATURE_BATTERY_MONITOR     true
#define FEATURE_TEMPERATURE_SENSOR  true
#define FEATURE_ACCELEROMETER       false  // Future expansion
#define FEATURE_GPS_MODULE          false  // Future expansion

/* ESP32-S3 Specific Features */
#define FEATURE_NATIVE_USB          true
#define FEATURE_USB_SERIAL          true
#define FEATURE_ENHANCED_SECURITY   true
#define FEATURE_POWER_MANAGEMENT    true

/* Development & Debug Features */
#define FEATURE_SERIAL_DEBUG        true
#define FEATURE_WEB_DEBUG           false
#define FEATURE_MEMORY_PROFILING    false

// ==========================================
// ESP32-S3 OPTIMIZED PIN CONFIGURATION
// ==========================================

/* Built-in Hardware */
#define PIN_LED_BUILTIN             48    // RGB LED on ESP32-S3 DevKit
#define PIN_BUTTON_BOOT             0     // Boot button
#define PIN_USB_D_MINUS             19    // USB D- (native USB)
#define PIN_USB_D_PLUS              20    // USB D+ (native USB)

/* I2C Bus Configuration (OLED Display & Sensors) */
#define PIN_I2C_SDA                 8     // I2C Data line
#define PIN_I2C_SCL                 9     // I2C Clock line
#define I2C_FREQUENCY               400000 // 400kHz for fast communication
#define I2C_TIMEOUT_MS              1000  // 1 second timeout

/* SPI Bus Configuration (Future Expansion) */
#define PIN_SPI_MOSI                11
#define PIN_SPI_MISO                13
#define PIN_SPI_CLK                 12
#define PIN_SPI_CS                  10

/* Additional UART Pins */
#define PIN_UART1_TX                17
#define PIN_UART1_RX                19    // Moved from GPIO 18 to avoid buzzer conflict

/* Alert System Pins */
#define PIN_BUZZER                  18    // PWM capable pin for buzzer (restored to original)
#define PIN_VIBRATION               16    // PWM capable pin for vibration motor

/* Legacy compatibility macros */
#define BUZZER_PIN                  PIN_BUZZER     // For backward compatibility
#define VIBRATION_PIN               PIN_VIBRATION  // For backward compatibility

/* Status LED Pins */
#define PIN_LED_WIFI_STATUS         21    // WiFi connection status
#define PIN_LED_BLE_STATUS          47    // BLE scanning status
#define PIN_LED_POWER_STATUS        14    // Power/activity indicator

/* Analog Input Pins */
#define PIN_BATTERY_VOLTAGE         4     // ADC1_CH3 for battery monitoring
#define PIN_TEMPERATURE_SENSOR      5     // ADC1_CH4 for temperature sensor

/* General Purpose I/O (Available for expansion) */
#define PIN_GPIO_SPARE_1            6
#define PIN_GPIO_SPARE_2            7
#define PIN_GPIO_SPARE_3            35
#define PIN_GPIO_SPARE_4            36
#define PIN_GPIO_SPARE_5            37
#define PIN_GPIO_SPARE_6            38

// ==========================================
// MEMORY CONFIGURATION (ESP32-S3 Optimized)
// ==========================================

/* Heap Management */
#define MEMORY_RESERVED_HEAP_KB     32    // Reserve 32KB for system
#define MEMORY_WEB_BUFFER_KB        8     // 8KB for web responses
#define MEMORY_JSON_BUFFER_KB       4     // 4KB for JSON processing
#define MEMORY_BLE_BUFFER_KB        2     // 2KB for BLE operations

/* Flash Partitioning */
#define MEMORY_OTA_PARTITION_MB     2     // 2MB for OTA updates
#define MEMORY_SPIFFS_PARTITION_MB  1     // 1MB for file system
#define MEMORY_CONFIG_PARTITION_KB  64    // 64KB for configuration

/* Buffer Sizes (in bytes) */
#define BUFFER_SIZE_WEB             (MEMORY_WEB_BUFFER_KB * 1024)
#define BUFFER_SIZE_JSON            (MEMORY_JSON_BUFFER_KB * 1024)
#define BUFFER_SIZE_BLE             (MEMORY_BLE_BUFFER_KB * 1024)

// ==========================================
// DISPLAY CONFIGURATION
// ==========================================
#if FEATURE_OLED_DISPLAY
#define DISPLAY_WIDTH               128
#define DISPLAY_HEIGHT              32
#define DISPLAY_I2C_ADDRESS         0x3C
#define DISPLAY_RESET_PIN           -1    // No reset pin needed
#define DISPLAY_TIMEOUT_MS          30000 // Screen timeout (30 seconds)
#define DISPLAY_BRIGHTNESS          128   // 0-255 brightness level
#define DISPLAY_CONTRAST            128   // 0-255 contrast level
#define DISPLAY_REFRESH_RATE_MS     1000  // Update every second

/* Alternative for SH1106 displays (1.3-inch modules) */
#define DISPLAY_TYPE_SSD1306        true  // Set to false for SH1106
#define DISPLAY_COLUMN_OFFSET       2     // SH1106 offset (0 for SSD1306)
#endif

// ==========================================
// NETWORK CONFIGURATION
// ==========================================

/* WiFi Connection Settings */
#define WIFI_CONNECTION_TIMEOUT_MS  20000  // 20 seconds
#define WIFI_RETRY_ATTEMPTS         3      // Number of retry attempts
#define WIFI_RETRY_DELAY_MS         5000   // 5 seconds between retries
#define WIFI_SCAN_TIMEOUT_MS        10000  // 10 seconds scan timeout
#define WIFI_AP_CHANNEL             1      // Default AP channel
#define WIFI_USE_MAX_POWER          true   // Use maximum WiFi power

/* Preferred WiFi Networks (hardcoded for priority) */
#define PREFERRED_SSID              "JenoviceAP"
#define PREFERRED_PASSWORD          "your_actual_password"  // Update with your JenoviceAP password
// Add secondary networks if needed:
// #define SECONDARY_SSID           "BackupNetwork"
// #define SECONDARY_PASSWORD       "backup_password"

/* Access Point Settings */
#define AP_SSID_PREFIX              "ESP32-S3-PetCollar"
#define AP_PASSWORD_LENGTH          12     // Generated password length
#define AP_MAX_CLIENTS              4      // Maximum concurrent clients
#define AP_BEACON_INTERVAL_MS       100    // Beacon interval
#define AP_IP_ADDRESS               "192.168.4.1"
#define AP_GATEWAY                  "192.168.4.1"
#define AP_SUBNET_MASK              "255.255.255.0"

/* Web Server Settings */
#define WEB_SERVER_PORT             80
#define WEBSOCKET_PORT              8080
#define WEB_UPDATE_INTERVAL_MS      500    // WebSocket update interval
#define WEB_SESSION_TIMEOUT_MS      300000 // 5 minutes session timeout

/* Network Security */
#define SECURITY_ENABLE_WPA3        true   // Use WPA3 when available
#define SECURITY_ENABLE_ENTERPRISE  false  // Enterprise WPA support
#define SECURITY_MAC_RANDOMIZATION  true   // Privacy feature

// ==========================================
// BLE CONFIGURATION
// ==========================================
#if FEATURE_BLE_SCANNER_ENABLED
#define BLE_SCAN_INTERVAL           1600   // 1600 * 0.625ms = 1000ms
#define BLE_SCAN_WINDOW             800    // 800 * 0.625ms = 500ms
#define BLE_SCAN_DURATION_SEC       5      // 5 seconds per scan
#define BLE_SCAN_PERIOD_MS          10000  // 10 seconds between scans
#define BLE_MAX_DEVICES             20     // Maximum devices to track
#define BLE_RSSI_THRESHOLD          -80    // Minimum RSSI to consider
#define BLE_DEVICE_TIMEOUT_MS       60000  // 1 minute device timeout

/* BLE Beacon Filtering */
#define BLE_FILTER_IBEACON          true   // Filter iBeacon advertisements
#define BLE_FILTER_EDDYSTONE        true   // Filter Eddystone beacons
#define BLE_FILTER_CUSTOM           true   // Filter custom pet collar beacons
#define BLE_TARGET_BEACON_PREFIX    "PetZone"  // Target device name prefix

/* BLE Distance Calculation (Ultra-Close Calibrated for PetZone beacons) */
#define BLE_TX_POWER_1M_DBM         -71.0f // RSSI measured at 1 meter (CALIBRATE THIS!)
#define BLE_PATH_LOSS_EXPONENT      1.9f   // Path loss exponent for close proximity  
#define BLE_RSSI_FILTER_SIZE        5      // Number of RSSI samples for smoothing
#define BLE_MAX_DISTANCE_CM         500.0f // Maximum reasonable distance (5 meters)

/* Ultra-Close Distance Calibration Constants */
#define RSSI_REF_AT_1CM             -29    // measured raw RSSI touching the beacon
#define PATH_LOSS_EXPONENT          1.8    // ultra-close range indoor exponent

/* 
 * ULTRA-CLOSE CALIBRATION INSTRUCTIONS:
 * 1. Touch collar directly to beacon (0 cm distance)
 * 2. Record raw RSSI value (should be around -29 dBm for most beacons)
 * 3. Update RSSI_REF_AT_1CM constant with your measured value
 * 4. Test at various close distances (1cm, 5cm, 10cm) to verify accuracy
 * 
 * Expected results with ultra-close calibration (1cm offset applied):
 * - Touching: RSSI: -29 dBm, Distance: 0.00 cm
 * - 1 cm: RSSI: -32 dBm, Distance: ~0.0 cm (offset corrected)
 * - 5 cm: RSSI: -38 dBm, Distance: ~4.0 cm (offset corrected)
 * - 10 cm: RSSI: -44 dBm, Distance: ~9.0 cm (offset corrected)
 */
#endif

// ==========================================
// POWER MANAGEMENT (ESP32-S3 Enhanced)
// ==========================================
#if FEATURE_POWER_MANAGEMENT
/* Battery Monitoring */
#define POWER_BATTERY_CHECK_MS      30000  // 30 seconds
#define POWER_LOW_BATTERY_MV        3200   // 3.2V low battery
#define POWER_CRITICAL_BATTERY_MV   3000   // 3.0V critical battery
#define POWER_FULL_BATTERY_MV       4200   // 4.2V full battery

/* Power Saving Modes */
#define POWER_LIGHT_SLEEP_ENABLED   true   // Enable light sleep
#define POWER_DEEP_SLEEP_ENABLED    false  // Disable deep sleep (keeps WiFi)
#define POWER_CPU_FREQ_NORMAL_MHZ   240    // 240MHz normal operation
#define POWER_CPU_FREQ_SAVE_MHZ     80     // 80MHz power save mode
#define POWER_WIFI_POWER_SAVE       true   // Enable WiFi power saving

/* Sleep Timeouts */
#define POWER_INACTIVITY_TIMEOUT_MS 300000 // 5 minutes inactivity
#define POWER_DISPLAY_SLEEP_MS      30000  // 30 seconds display timeout
#define POWER_BLE_SLEEP_MS          60000  // 1 minute BLE inactivity
#endif

// ==========================================
// ALERT SYSTEM CONFIGURATION
// ==========================================
#if FEATURE_BUZZER_ALERTS
#define BUZZER_PWM_CHANNEL          0
#define BUZZER_PWM_FREQUENCY_HZ     2000   // 2kHz default tone
#define BUZZER_PWM_RESOLUTION_BITS  8      // 8-bit resolution
#define BUZZER_DEFAULT_VOLUME       128    // 50% volume (0-255)
#define BUZZER_MAX_DURATION_MS      5000   // 5 seconds maximum
#endif

#if FEATURE_VIBRATION_ALERTS
#define VIBRATION_PWM_CHANNEL       1
#define VIBRATION_PWM_FREQUENCY_HZ  150    // 150Hz vibration
#define VIBRATION_PWM_RESOLUTION    8      // 8-bit resolution
#define VIBRATION_DEFAULT_INTENSITY 200    // ~78% intensity (0-255)
#define VIBRATION_MAX_DURATION_MS   3000   // 3 seconds maximum
#endif

/* Alert Pattern Definitions */
#define ALERT_PATTERN_COUNT         5
#define ALERT_TYPE_PROXIMITY        0      // Proximity alert
#define ALERT_TYPE_LOW_BATTERY      1      // Low battery alert
#define ALERT_TYPE_CONNECTION_LOST  2      // WiFi connection lost
#define ALERT_TYPE_BEACON_FOUND     3      // Target beacon found
#define ALERT_TYPE_SYSTEM_ERROR     4      // System error

// ==========================================
// TIMING CONFIGURATION
// ==========================================

/* System Update Intervals */
#define TIMING_SYSTEM_STATUS_MS     60000  // 1 minute system status
#define TIMING_SENSOR_UPDATE_MS     5000   // 5 seconds sensor updates
#define TIMING_DISPLAY_UPDATE_MS    1000   // 1 second display updates
#define TIMING_HEARTBEAT_MS         30000  // 30 seconds heartbeat

/* Watchdog Timers */
#define TIMING_WATCHDOG_TIMEOUT_MS  30000  // 30 seconds watchdog
#define TIMING_TASK_WATCHDOG        true   // Enable task watchdog
#define TIMING_INT_WATCHDOG         true   // Enable interrupt watchdog

// ==========================================
// SECURITY CONFIGURATION (ESP32-S3)
// ==========================================
#if FEATURE_ENHANCED_SECURITY
#define SECURITY_ENABLE_FLASH_ENC   false  // Flash encryption (affects OTA)
#define SECURITY_ENABLE_SECURE_BOOT false  // Secure boot (development mode)
#define SECURITY_DEVICE_CERT        true   // Device certificate validation
#define SECURITY_API_KEY_LENGTH     32     // API key length in bytes
#define SECURITY_SESSION_TOKEN_LEN  16     // Session token length
#endif

// ==========================================
// SYSTEM LIMITS & CONSTANTS
// ==========================================

/* String Length Limits */
#define MAX_SSID_LENGTH             32
#define MAX_PASSWORD_LENGTH         64
#define MAX_DEVICE_NAME_LENGTH      32
#define MAX_ERROR_MESSAGE_LENGTH    128

/* Collection Size Limits */
#define MAX_BEACON_COUNT            20
#define MAX_ZONE_COUNT              8
#define MAX_RECENT_POSITIONS        10
#define MAX_LOG_ENTRIES             50

/* Validation Ranges */
#define MIN_SCAN_INTERVAL_MS        100
#define MAX_SCAN_INTERVAL_MS        10000
#define MIN_ALERT_VOLUME            0
#define MAX_ALERT_VOLUME            255
#define MIN_BATTERY_PERCENTAGE      0
#define MAX_BATTERY_PERCENTAGE      100

// ==========================================
// DEBUGGING & LOGGING
// ==========================================
#if FEATURE_SERIAL_DEBUG
#define DEBUG_SERIAL_BAUD           115200
#define DEBUG_BUFFER_SIZE           256
#define DEBUG_LOG_LEVEL_ERROR       0
#define DEBUG_LOG_LEVEL_WARNING     1
#define DEBUG_LOG_LEVEL_INFO        2
#define DEBUG_LOG_LEVEL_DEBUG       3
#define DEBUG_LOG_LEVEL_VERBOSE     4

/* Debug Macros */
#define DEBUG_PRINT(x)              Serial.print(x)
#define DEBUG_PRINTLN(x)            Serial.println(x)
#define DEBUG_PRINTF(...)           Serial.printf(__VA_ARGS__)

/* Module-specific debug flags */
#define DEBUG_WIFI                  true
#define DEBUG_DISPLAY               true
#define DEBUG_I2C                   true
#define DEBUG_BLE                   true
#define DEBUG_DISTANCE              true
#else
#define DEBUG_PRINT(x)
#define DEBUG_PRINTLN(x)
#define DEBUG_PRINTF(...)
#define DEBUG_WIFI                  false
#define DEBUG_DISPLAY               false
#define DEBUG_I2C                   false
#define DEBUG_BLE                   false
#define DEBUG_DISTANCE              false
#endif

// ==========================================
// COMPILE-TIME VALIDATIONS
// ==========================================

/* Validate critical pin assignments */
#if (PIN_I2C_SDA == PIN_I2C_SCL)
#error "I2C SDA and SCL pins cannot be the same"
#endif

#if (PIN_BUZZER == PIN_VIBRATION)
#error "Buzzer and vibration pins cannot be the same"
#endif

/* Validate memory allocations */
#if (MEMORY_RESERVED_HEAP_KB < 16)
#error "Reserved heap must be at least 16KB"
#endif

/* Validate timing constraints */
#if (BLE_SCAN_INTERVAL < BLE_SCAN_WINDOW)
#error "BLE scan interval must be >= scan window"
#endif

// ==========================================
// UTILITY MACROS
// ==========================================

/* Conversion macros */
#define MS_TO_SECONDS(ms)           ((ms) / 1000)
#define SECONDS_TO_MS(s)            ((s) * 1000)
#define KB_TO_BYTES(kb)             ((kb) * 1024)
#define MB_TO_BYTES(mb)             ((mb) * 1024 * 1024)

/* Range checking macros */
#define CONSTRAIN_BYTE(val)         constrain((val), 0, 255)
#define CONSTRAIN_PERCENT(val)      constrain((val), 0, 100)

/* Bit manipulation */
#define SET_BIT(reg, bit)           ((reg) |= (1 << (bit)))
#define CLEAR_BIT(reg, bit)         ((reg) &= ~(1 << (bit)))
#define TOGGLE_BIT(reg, bit)        ((reg) ^= (1 << (bit)))
#define CHECK_BIT(reg, bit)         (((reg) >> (bit)) & 1)

#endif // ESP32_S3_CONFIG_H 