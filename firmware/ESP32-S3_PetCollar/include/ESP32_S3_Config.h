#ifndef ESP32_S3_CONFIG_H
#define ESP32_S3_CONFIG_H

/*
 * ESP32-S3 Pet Collar Configuration
 * 
 * Optimized configuration for ESP32-S3 DevKitC-1 and compatible boards
 * Takes advantage of enhanced features:
 * - More memory (512KB SRAM, 384KB ROM, 8MB+ Flash)
 * - Enhanced security features
 * - USB OTG native support
 * - Improved WiFi performance
 * - Better power management
 */

// ==========================================
// FIRMWARE INFORMATION
// ==========================================
#define FIRMWARE_VERSION_MAJOR 3
#define FIRMWARE_VERSION_MINOR 0
#define FIRMWARE_VERSION_PATCH 0
#define FIRMWARE_BUILD "ESP32-S3"
#define FIRMWARE_VERSION "3.0.0-ESP32-S3"

#define HARDWARE_PLATFORM "ESP32-S3"
#define DEVICE_FAMILY "PetCollar"
#define MANUFACTURER "SmartPet"

// ==========================================
// FEATURE CONTROL FLAGS
// ==========================================

// Core features
#define WIFI_ENABLED true
#define BLUETOOTH_ENABLED true
#define BLE_SCANNER_ENABLED true
#define WEB_INTERFACE_ENABLED true
#define WEBSOCKET_ENABLED true
#define OTA_UPDATES_ENABLED true

// Display and UI
#define OLED_DISPLAY_ENABLED true
#define STATUS_LEDS_ENABLED true
#define BUZZER_ENABLED true
#define VIBRATION_ENABLED true

// Sensors and monitoring
#define BATTERY_MONITORING_ENABLED true
#define TEMPERATURE_MONITORING_ENABLED true
#define ACCELEROMETER_ENABLED false  // Future expansion
#define GPS_ENABLED false            // Future expansion

// Advanced features (ESP32-S3 specific)
#define USB_SERIAL_ENABLED true
#define NATIVE_USB_ENABLED true
#define SECURITY_ENHANCED true
#define POWER_MANAGEMENT_ENABLED true

// Debug and development
#define DEBUG_ENABLED false
#define SERIAL_DEBUG_ENABLED true
#define WEB_DEBUG_ENABLED false

// ==========================================
// ESP32-S3 OPTIMIZED PIN CONFIGURATION
// ==========================================

// Built-in peripherals
#define LED_BUILTIN 48          // RGB LED on ESP32-S3 DevKit
#define BUTTON_BOOT 0           // Boot button
#define USB_D_MINUS 19          // USB D- (native USB)
#define USB_D_PLUS 20           // USB D+ (native USB)

// I2C Bus (for OLED and future sensors)
#define I2C_SDA_PIN 8           // I2C Data
#define I2C_SCL_PIN 9           // I2C Clock
#define I2C_FREQUENCY 400000    // 400kHz for faster communication

// SPI Bus (for future expansion - SD card, additional sensors)
#define SPI_MOSI_PIN 11
#define SPI_MISO_PIN 13
#define SPI_CLK_PIN 12
#define SPI_CS_PIN 10

// UART (additional serial ports if needed)
#define UART1_TX_PIN 17
#define UART1_RX_PIN 19         // Moved from GPIO 18 to avoid buzzer conflict

// Alert system
#define BUZZER_PIN 18           // PWM capable pin for buzzer (restored to original GPIO)
#define VIBRATION_PIN 16        // PWM capable pin for vibration motor
#define STATUS_LED_WIFI 21      // WiFi status LED
#define STATUS_LED_BLE 47       // BLE status LED
#define STATUS_LED_POWER 14     // Power/activity LED

// Analog inputs
#define BATTERY_VOLTAGE_PIN 4   // ADC1_CH3 for battery monitoring
#define TEMPERATURE_PIN 5       // ADC1_CH4 for temperature sensor (if external)

// Digital I/O (available for expansion)
#define GPIO_SPARE_1 6
#define GPIO_SPARE_2 7
#define GPIO_SPARE_3 35
#define GPIO_SPARE_4 36
#define GPIO_SPARE_5 37
#define GPIO_SPARE_6 38

// ==========================================
// MEMORY CONFIGURATION (ESP32-S3 Optimized)
// ==========================================

// Heap management
#define RESERVED_HEAP_SIZE (32 * 1024)     // Reserve 32KB for system
#define WEB_BUFFER_SIZE (8 * 1024)         // 8KB for web responses
#define JSON_BUFFER_SIZE (4 * 1024)        // 4KB for JSON processing
#define BLE_BUFFER_SIZE (2 * 1024)         // 2KB for BLE operations

// Flash memory partitioning
#define OTA_PARTITION_SIZE (2 * 1024 * 1024)  // 2MB for OTA updates
#define SPIFFS_PARTITION_SIZE (1 * 1024 * 1024) // 1MB for file system
#define CONFIG_PARTITION_SIZE (64 * 1024)      // 64KB for configuration

// ==========================================
// DISPLAY CONFIGURATION
// ==========================================
#if OLED_DISPLAY_ENABLED
#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_ADDRESS 0x3C
#define OLED_RESET_PIN -1       // No reset pin needed
#define OLED_TIMEOUT 30000      // Screen timeout (30 seconds)
#define OLED_BRIGHTNESS 128     // 0-255 brightness level
#define OLED_CONTRAST 128       // 0-255 contrast level
#endif

// ==========================================
// NETWORK CONFIGURATION
// ==========================================

// WiFi settings
#define WIFI_CONNECTION_TIMEOUT 20000   // 20 seconds
#define WIFI_RETRY_ATTEMPTS 3           // Number of retry attempts
#define WIFI_RETRY_DELAY 5000           // 5 seconds between retries
#define WIFI_SCAN_TIMEOUT 10000         // 10 seconds scan timeout
#define WIFI_AP_CHANNEL 1               // Default AP channel
#define WIFI_MAX_POWER true             // Use maximum WiFi power

// Access Point settings
#define AP_SSID_PREFIX "ESP32-S3-PetCollar"
#define AP_PASSWORD_LENGTH 12           // Generated password length
#define AP_MAX_CLIENTS 4                // Maximum concurrent clients
#define AP_BEACON_INTERVAL 100          // Beacon interval (ms)

// Web server settings
#define WEB_SERVER_PORT 80
#define WEBSOCKET_PORT 8080
#define WEB_UPDATE_INTERVAL 500         // WebSocket update interval (ms)
#define WEB_SESSION_TIMEOUT 300000      // 5 minutes session timeout

// Network security
#define ENABLE_WPA3 true                // Use WPA3 when available
#define ENABLE_ENTERPRISE false         // Enterprise WPA support
#define MAC_RANDOMIZATION true          // Privacy feature

// ==========================================
// BLE CONFIGURATION
// ==========================================
#if BLE_SCANNER_ENABLED
#define BLE_SCAN_INTERVAL 1600          // 1600 * 0.625ms = 1000ms
#define BLE_SCAN_WINDOW 800             // 800 * 0.625ms = 500ms
#define BLE_SCAN_DURATION 5             // 5 seconds per scan
#define BLE_SCAN_PERIOD 10000           // 10 seconds between scans
#define BLE_MAX_DEVICES 20              // Maximum devices to track
#define BLE_RSSI_THRESHOLD -80          // Minimum RSSI to consider
#define BLE_DEVICE_TIMEOUT 60000        // 1 minute device timeout

// BLE beacon filtering
#define FILTER_IBEACON true             // Filter iBeacon advertisements
#define FILTER_EDDYSTONE true           // Filter Eddystone beacons
#define FILTER_CUSTOM true              // Filter custom pet collar beacons
#define TARGET_BEACON_PREFIX "Pet"      // Target device name prefix
#endif

// ==========================================
// POWER MANAGEMENT (ESP32-S3 Enhanced)
// ==========================================
#if POWER_MANAGEMENT_ENABLED
#define BATTERY_CHECK_INTERVAL 30000    // 30 seconds
#define LOW_BATTERY_THRESHOLD 3200      // 3.2V low battery
#define CRITICAL_BATTERY_THRESHOLD 3000 // 3.0V critical battery
#define BATTERY_FULL_VOLTAGE 4200       // 4.2V full battery

// Power saving modes
#define LIGHT_SLEEP_ENABLED true        // Enable light sleep
#define DEEP_SLEEP_ENABLED false        // Disable deep sleep (keeps WiFi)
#define CPU_FREQ_NORMAL 240             // 240MHz normal operation
#define CPU_FREQ_POWER_SAVE 80          // 80MHz power save mode
#define WIFI_POWER_SAVE true            // Enable WiFi power saving

// Sleep timeouts
#define INACTIVITY_TIMEOUT 300000       // 5 minutes inactivity
#define DISPLAY_SLEEP_TIMEOUT 30000     // 30 seconds display timeout
#define BLE_SLEEP_TIMEOUT 60000         // 1 minute BLE inactivity
#endif

// ==========================================
// ALERT SYSTEM CONFIGURATION
// ==========================================
#if BUZZER_ENABLED
#define BUZZER_PWM_CHANNEL 0
#define BUZZER_PWM_FREQUENCY 2000       // 2kHz default tone
#define BUZZER_PWM_RESOLUTION 8         // 8-bit resolution
#define BUZZER_DEFAULT_VOLUME 128       // 50% volume
#define BUZZER_MAX_DURATION 5000        // 5 seconds maximum
#endif

#if VIBRATION_ENABLED
#define VIBRATION_PWM_CHANNEL 1
#define VIBRATION_PWM_FREQUENCY 150     // 150Hz vibration
#define VIBRATION_PWM_RESOLUTION 8      // 8-bit resolution
#define VIBRATION_DEFAULT_INTENSITY 200 // ~78% intensity
#define VIBRATION_MAX_DURATION 3000     // 3 seconds maximum
#endif

// Alert patterns
#define ALERT_PATTERN_COUNT 5
#define ALERT_PROXIMITY 0               // Proximity alert
#define ALERT_LOW_BATTERY 1             // Low battery alert
#define ALERT_CONNECTION_LOST 2         // WiFi connection lost
#define ALERT_BEACON_FOUND 3            // Target beacon found
#define ALERT_SYSTEM_ERROR 4            // System error

// ==========================================
// TIMING CONFIGURATION
// ==========================================

// System update intervals
#define SYSTEM_STATUS_INTERVAL 60000    // 1 minute system status
#define SENSOR_UPDATE_INTERVAL 5000     // 5 seconds sensor updates
#define DISPLAY_UPDATE_INTERVAL 1000    // 1 second display updates
#define HEARTBEAT_INTERVAL 30000        // 30 seconds heartbeat

// Watchdog timers
#define WATCHDOG_TIMEOUT 30000          // 30 seconds watchdog
#define TASK_WATCHDOG_ENABLED true      // Enable task watchdog
#define INTERRUPT_WATCHDOG_ENABLED true // Enable interrupt watchdog

// ==========================================
// SECURITY CONFIGURATION (ESP32-S3)
// ==========================================
#if SECURITY_ENHANCED
#define SECURE_BOOT_ENABLED false       // Enable in production
#define FLASH_ENCRYPTION_ENABLED false  // Enable in production
#define JTAG_DISABLED false             // Disable JTAG in production
#define DOWNLOAD_MODE_DISABLED false    // Disable download mode in production

// Cryptographic features
#define AES_ACCELERATION true           // Use hardware AES
#define RSA_ACCELERATION true           // Use hardware RSA
#define SHA_ACCELERATION true           // Use hardware SHA
#define RNG_ENABLED true                // Use hardware RNG

// Security timeouts
#define AUTH_TOKEN_TIMEOUT 3600000      // 1 hour auth token
#define SESSION_TIMEOUT 1800000         // 30 minutes session
#define API_RATE_LIMIT 100              // 100 requests per minute
#endif

// ==========================================
// DEBUG AND LOGGING
// ==========================================
#if DEBUG_ENABLED
#define DEBUG_SERIAL_SPEED 115200       // Serial baud rate
#define DEBUG_BUFFER_SIZE 512           // Debug message buffer
#define DEBUG_LOG_LEVEL 3               // 0=Error, 1=Warn, 2=Info, 3=Debug
#define DEBUG_MEMORY_TRACKING true      // Track memory usage
#define DEBUG_TIMING_ANALYSIS true      // Analyze execution timing

// Debug output control
#define DEBUG_WIFI true                 // WiFi debug messages
#define DEBUG_BLE true                  // BLE debug messages
#define DEBUG_WEB true                  // Web server debug messages
#define DEBUG_SENSORS true              // Sensor debug messages
#define DEBUG_POWER true                // Power management debug
#endif

// ==========================================
// PERFORMANCE OPTIMIZATION
// ==========================================

// Task priorities (ESP32-S3 dual core)
#define TASK_PRIORITY_HIGH 3            // Critical tasks
#define TASK_PRIORITY_NORMAL 2          // Normal tasks
#define TASK_PRIORITY_LOW 1             // Background tasks
#define TASK_PRIORITY_IDLE 0            // Idle tasks

// Core assignment
#define CORE_WIFI_BLE 0                 // Core 0 for WiFi/BLE
#define CORE_APPLICATION 1              // Core 1 for application

// Stack sizes
#define STACK_SIZE_LARGE 8192           // Large stack tasks
#define STACK_SIZE_MEDIUM 4096          // Medium stack tasks
#define STACK_SIZE_SMALL 2048           // Small stack tasks

// ==========================================
// VERSION COMPATIBILITY
// ==========================================
#define MIN_ESP32_CORE_VERSION "2.0.0"
#define RECOMMENDED_ESP32_CORE_VERSION "3.0.0"
#define MIN_ARDUINO_IDE_VERSION "2.0.0"

// Library version requirements
#define MIN_ARDUINOJSON_VERSION "6.21.0"
#define MIN_WEBSOCKETS_VERSION "2.4.0"
#define MIN_ADAFRUIT_GFX_VERSION "1.11.0"

// ==========================================
// DEVICE IDENTIFICATION
// ==========================================

// Generate unique device ID from MAC address
#define DEVICE_ID_PREFIX "ESP32S3-"
#define DEVICE_ID_LENGTH 16             // Total ID length
#define MAC_ADDRESS_LENGTH 6            // MAC address bytes

// Device capabilities flags
#define CAPABILITY_WIFI (1 << 0)
#define CAPABILITY_BLE (1 << 1)
#define CAPABILITY_DISPLAY (1 << 2)
#define CAPABILITY_ALERTS (1 << 3)
#define CAPABILITY_BATTERY (1 << 4)
#define CAPABILITY_OTA (1 << 5)
#define CAPABILITY_USB (1 << 6)
#define CAPABILITY_CRYPTO (1 << 7)

// Calculate device capabilities
#define DEVICE_CAPABILITIES (CAPABILITY_WIFI | CAPABILITY_BLE | CAPABILITY_DISPLAY | \
                           CAPABILITY_ALERTS | CAPABILITY_BATTERY | CAPABILITY_OTA | \
                           CAPABILITY_USB | CAPABILITY_CRYPTO)

#endif // ESP32_S3_CONFIG_H 