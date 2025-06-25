/**
 * @file PetCollarConfig.h
 * @brief Unified Configuration for Pet Collar System
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * This header consolidates all configuration settings for the pet collar ecosystem,
 * including collar devices, camera modules, and shared components.
 * 
 * Features:
 * - Centralized configuration management
 * - Hardware-specific optimizations for ESP32-S3
 * - Feature flags for selective compilation
 * - Memory and performance tuning
 * - Debug and development settings
 */

#ifndef PET_COLLAR_CONFIG_H
#define PET_COLLAR_CONFIG_H

#include <Arduino.h>

// ==========================================
// FIRMWARE INFORMATION
// ==========================================
#define FIRMWARE_VERSION_MAJOR 3
#define FIRMWARE_VERSION_MINOR 0
#define FIRMWARE_VERSION_PATCH 0
#define FIRMWARE_VERSION "3.0.0"
#define HARDWARE_PLATFORM "ESP32-S3"
#define DEVICE_FAMILY "PetCollar"
#define MANUFACTURER "SmartPet"

// ==========================================
// FEATURE CONTROL FLAGS
// ==========================================

/**
 * Core System Features
 * Enable/disable major system components
 */
#define FEATURE_WIFI_ENABLED           true
#define FEATURE_BLE_ENABLED            true
#define FEATURE_WEB_INTERFACE          true
#define FEATURE_WEBSOCKET              true
#define FEATURE_OTA_UPDATES            true

/**
 * Hardware Features
 * Control hardware-specific functionality
 */
#define FEATURE_OLED_DISPLAY           true
#define FEATURE_STATUS_LEDS            true
#define FEATURE_BUZZER                 true
#define FEATURE_VIBRATION              true
#define FEATURE_BATTERY_MONITOR        true

/**
 * Advanced Features
 * ESP32-S3 specific enhancements
 */
#define FEATURE_USB_SERIAL             true
#define FEATURE_POWER_MANAGEMENT       true
#define FEATURE_SECURITY_ENHANCED      true

/**
 * Debug and Development
 * Settings for debugging and development
 */
#define DEBUG_ENABLED                  false
#define DEBUG_SERIAL                   true
#define DEBUG_WEB                      false
#define DEBUG_MEMORY_USAGE             false

// ==========================================
// ESP32-S3 OPTIMIZED PIN CONFIGURATION
// ==========================================

/**
 * Built-in Peripherals
 * ESP32-S3 DevKit specific pins
 */
#define PIN_LED_BUILTIN               48    // RGB LED
#define PIN_BUTTON_BOOT               0     // Boot button
#define PIN_USB_D_MINUS               19    // USB D-
#define PIN_USB_D_PLUS                20    // USB D+

/**
 * I2C Bus Configuration
 * Optimized for OLED display and sensors
 */
#define PIN_I2C_SDA                   8     // I2C Data
#define PIN_I2C_SCL                   9     // I2C Clock
#define I2C_FREQUENCY                 400000 // 400kHz

/**
 * Alert System Pins
 * PWM-capable pins for buzzer and vibration
 */
#define PIN_BUZZER                    15    // Buzzer output
#define PIN_VIBRATION                 16    // Vibration motor
#define PIN_STATUS_LED_WIFI           21    // WiFi status LED
#define PIN_STATUS_LED_BLE            47    // BLE status LED
#define PIN_STATUS_LED_POWER          14    // Power status LED

/**
 * Analog Input Pins
 * Battery and sensor monitoring
 */
#define PIN_BATTERY_VOLTAGE           4     // ADC1_CH3
#define PIN_TEMPERATURE               5     // ADC1_CH4 (optional)

/**
 * SPI Bus (Future Expansion)
 * For SD card or additional peripherals
 */
#define PIN_SPI_MOSI                  11
#define PIN_SPI_MISO                  13
#define PIN_SPI_CLK                   12
#define PIN_SPI_CS                    10

// ==========================================
// MEMORY CONFIGURATION
// ==========================================

/**
 * Heap Management
 * Optimized for ESP32-S3's enhanced memory
 */
#define RESERVED_HEAP_SIZE            (32 * 1024)  // 32KB system reserve
#define WEB_BUFFER_SIZE               (8 * 1024)   // 8KB web responses
#define JSON_BUFFER_SIZE              (4 * 1024)   // 4KB JSON processing
#define BLE_BUFFER_SIZE               (2 * 1024)   // 2KB BLE operations

/**
 * Flash Memory Partitioning
 * Allocation for different system components
 */
#define OTA_PARTITION_SIZE            (2 * 1024 * 1024)  // 2MB OTA
#define SPIFFS_PARTITION_SIZE         (1 * 1024 * 1024)  // 1MB filesystem
#define CONFIG_PARTITION_SIZE         (64 * 1024)        // 64KB config

// ==========================================
// DISPLAY CONFIGURATION
// ==========================================

#if FEATURE_OLED_DISPLAY
/**
 * OLED Display Settings
 * Optimized for 128x64 SSD1306 displays
 */
#define OLED_WIDTH                    128
#define OLED_HEIGHT                   64
#define OLED_ADDRESS                  0x3C
#define OLED_RESET_PIN                -1    // No reset needed
#define OLED_TIMEOUT                  30000 // 30 second timeout
#define OLED_BRIGHTNESS               128   // 0-255
#define OLED_CONTRAST                 128   // 0-255

/**
 * Display Layout Constants
 * Text layout for different screen sizes
 */
#define DISPLAY_LINE_HEIGHT           8
#define DISPLAY_CHAR_WIDTH            6
#define DISPLAY_MAX_CHARS_PER_LINE    (OLED_WIDTH / DISPLAY_CHAR_WIDTH)
#endif

// ==========================================
// NETWORK CONFIGURATION
// ==========================================

/**
 * WiFi Settings
 * Connection and retry parameters
 */
#define WIFI_CONNECTION_TIMEOUT       20000   // 20 seconds
#define WIFI_RETRY_ATTEMPTS           3       // Retry count
#define WIFI_RETRY_DELAY              5000    // 5 seconds between retries
#define WIFI_SCAN_TIMEOUT             10000   // 10 second scan timeout
#define WIFI_AP_CHANNEL               1       // Default AP channel
#define WIFI_MAX_POWER                true    // Use maximum power

/**
 * Access Point Settings
 * For configuration mode
 */
#define AP_SSID_PREFIX                "ESP32-S3-PetCollar"
#define AP_PASSWORD_LENGTH            12      // Generated password length
#define AP_MAX_CLIENTS                4       // Max concurrent clients
#define AP_BEACON_INTERVAL            100     // Beacon interval (ms)

/**
 * Web Server Settings
 * HTTP and WebSocket configuration
 */
#define WEB_SERVER_PORT               80
#define WEBSOCKET_PORT                8080
#define WEB_UPDATE_INTERVAL           500     // WebSocket update rate (ms)
#define WEB_SESSION_TIMEOUT           300000  // 5 minute timeout

/**
 * Network Security
 * Security and privacy features
 */
#define ENABLE_WPA3                   true    // Use WPA3 when available
#define MAC_RANDOMIZATION             true    // Privacy feature

// ==========================================
// BLE CONFIGURATION
// ==========================================

#if FEATURE_BLE_ENABLED
/**
 * BLE Scanning Parameters
 * Optimized for pet collar detection
 */
#define BLE_SCAN_INTERVAL             1600    // 1600 * 0.625ms = 1000ms
#define BLE_SCAN_WINDOW               800     // 800 * 0.625ms = 500ms
#define BLE_SCAN_DURATION             5       // 5 seconds per scan
#define BLE_SCAN_PERIOD               10000   // 10 seconds between scans
#define BLE_MAX_DEVICES               20      // Maximum tracked devices
#define BLE_RSSI_THRESHOLD            -80     // Minimum RSSI
#define BLE_DEVICE_TIMEOUT            60000   // 1 minute timeout

/**
 * BLE Beacon Filtering
 * Target specific beacon types
 */
#define FILTER_IBEACON                true    // Filter iBeacons
#define FILTER_EDDYSTONE              true    // Filter Eddystone
#define FILTER_CUSTOM                 true    // Filter custom beacons
#define TARGET_BEACON_PREFIX          "Pet"   // Target prefix
#endif

// ==========================================
// POWER MANAGEMENT
// ==========================================

#if FEATURE_POWER_MANAGEMENT
/**
 * Battery Monitoring
 * Voltage thresholds and monitoring
 */
#define BATTERY_CHECK_INTERVAL        30000   // 30 seconds
#define BATTERY_LOW_THRESHOLD         3200    // 3.2V low battery
#define BATTERY_CRITICAL_THRESHOLD    3000    // 3.0V critical
#define BATTERY_FULL_VOLTAGE          4200    // 4.2V full charge

/**
 * Power Saving Modes
 * CPU and wireless power management
 */
#define LIGHT_SLEEP_ENABLED           true    // Enable light sleep
#define DEEP_SLEEP_ENABLED            false   // Keep WiFi active
#define CPU_FREQ_NORMAL               240     // 240MHz normal
#define CPU_FREQ_POWER_SAVE           80      // 80MHz power save
#define WIFI_POWER_SAVE               true    // WiFi power saving

/**
 * Sleep Timeouts
 * Automatic power saving triggers
 */
#define IDLE_SLEEP_TIMEOUT            300000  // 5 minutes
#define DISPLAY_SLEEP_TIMEOUT         30000   // 30 seconds
#define BLE_SLEEP_TIMEOUT             600000  // 10 minutes
#endif

// ==========================================
// ALERT SYSTEM CONFIGURATION
// ==========================================

/**
 * Alert Modes
 * Available alert types
 */
enum AlertMode {
    ALERT_NONE = 0,
    ALERT_BUZZER = 1,
    ALERT_VIBRATION = 2,
    ALERT_BOTH = 3
};

/**
 * PWM Configuration
 * For buzzer and vibration motor control
 */
#define BUZZER_PWM_CHANNEL            0
#define BUZZER_PWM_FREQUENCY          2000    // 2kHz
#define BUZZER_PWM_RESOLUTION         8       // 8-bit resolution

#define VIBRATION_PWM_CHANNEL         1
#define VIBRATION_PWM_FREQUENCY       160     // 160Hz
#define VIBRATION_PWM_RESOLUTION      8       // 8-bit resolution

/**
 * Alert Thresholds and Timings
 * Proximity detection and alert behavior
 */
#define PROXIMITY_RSSI_THRESHOLD      -65     // RSSI threshold for proximity
#define PROXIMITY_ALERT_DELAY         3000    // 3 second delay
#define PROXIMITY_ALERT_TIMEOUT       10000   // 10 second timeout
#define ALERT_COOLDOWN_PERIOD         5000    // 5 second cooldown

// ==========================================
// CAMERA MODULE CONFIGURATION
// ==========================================

/**
 * ESP32-CAM Pin Definitions
 * AI-Thinker ESP32-CAM specific pins
 */
#define CAM_PIN_PWDN                  32
#define CAM_PIN_RESET                 -1
#define CAM_PIN_XCLK                  0
#define CAM_PIN_SIOD                  26
#define CAM_PIN_SIOC                  27
#define CAM_PIN_Y9                    35
#define CAM_PIN_Y8                    34
#define CAM_PIN_Y7                    39
#define CAM_PIN_Y6                    36
#define CAM_PIN_Y5                    21
#define CAM_PIN_Y4                    19
#define CAM_PIN_Y3                    18
#define CAM_PIN_Y2                    5
#define CAM_PIN_VSYNC                 25
#define CAM_PIN_HREF                  23
#define CAM_PIN_PCLK                  22

/**
 * Camera Settings
 * Image quality and streaming parameters
 */
#define CAM_DEFAULT_FRAME_SIZE        FRAMESIZE_VGA  // 640x480
#define CAM_DEFAULT_JPEG_QUALITY      12             // 0-63, lower = better
#define CAM_DEFAULT_BRIGHTNESS        0              // -2 to 2
#define CAM_DEFAULT_CONTRAST          0              // -2 to 2

// ==========================================
// DEBUG MACROS
// ==========================================

#if DEBUG_ENABLED
    #define DEBUG_PRINT(x)            Serial.print(x)
    #define DEBUG_PRINTLN(x)          Serial.println(x)
    #define DEBUG_PRINTF(...)         Serial.printf(__VA_ARGS__)
#else
    #define DEBUG_PRINT(x)
    #define DEBUG_PRINTLN(x)
    #define DEBUG_PRINTF(...)
#endif

// ==========================================
// SYSTEM CONSTANTS
// ==========================================

/**
 * Update Intervals
 * System timing constants
 */
#define SYSTEM_UPDATE_INTERVAL        100     // Main loop interval (ms)
#define STATUS_LED_UPDATE_INTERVAL    500     // Status LED blink rate
#define SENSOR_UPDATE_INTERVAL        1000    // Sensor read interval
#define WEB_DATA_UPDATE_INTERVAL      500     // Web interface updates

/**
 * Buffer Sizes
 * String and data buffer allocations
 */
#define MAX_SSID_LENGTH               32
#define MAX_PASSWORD_LENGTH           64
#define MAX_BEACON_NAME_LENGTH        32
#define MAX_LOCATION_NAME_LENGTH      16
#define MAX_DEVICE_ID_LENGTH          16

/**
 * System Limits
 * Resource allocation limits
 */
#define MAX_BEACONS                   20      // Maximum tracked beacons
#define MAX_LOCATIONS                 10      // Maximum location groups
#define MAX_ALERT_CONFIGS             10      // Maximum alert configurations
#define MAX_WEBSOCKET_CLIENTS         4       // Maximum concurrent WebSocket clients

#endif // PET_COLLAR_CONFIG_H 