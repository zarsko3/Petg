#ifndef MICRO_CONFIG_H
#define MICRO_CONFIG_H

#include <Arduino.h>

// ==========================================
// MEMORY OPTIMIZATION SETTINGS
// ==========================================
// Set these to 0/false to reduce compiled size

// Debug settings - set to 0 to disable Serial debug prints and save memory
#define DEBUG_ENABLED 1

// Display settings - set to 0 to disable OLED display functionality
#define DISPLAY_ENABLED 1

// WebSocket settings - set to false to save ~200KB
#define WEBSOCKET_ENABLED true

// Web integration - set to false to save ~100KB  
#define WEB_INTEGRATION_ENABLED true

// Advanced features - can be disabled to save memory
#define TRIANGULATION_ENABLED true
#define ZONE_MANAGER_ENABLED true
#define BATTERY_MONITORING_ENABLED true

// Compiler optimizations for size
#pragma GCC optimize ("Os")
#pragma GCC optimize ("ffast-math")

// ==========================================
// System configuration
// ==========================================

// Version information
#define FIRMWARE_VERSION "2.0.0"
#define HARDWARE_VERSION "1.0.0"
#define DEVICE_ID "PETCOLLAR001"

// WiFi settings
#define DEFAULT_WIFI_SSID "TP-Link_C5B4"
#define DEFAULT_WIFI_PASSWORD "24681357"

// Macro for debug printing
#if DEBUG_ENABLED
  #define DEBUG_PRINT(x) Serial.print(x)
  #define DEBUG_PRINTLN(x) Serial.println(x)
  #define DEBUG_PRINTF(...) Serial.printf(__VA_ARGS__)
#else
  #define DEBUG_PRINT(x)
  #define DEBUG_PRINTLN(x)
  #define DEBUG_PRINTF(...)
#endif

// ==========================================
// Hardware pins
// ==========================================
#define BUZZER_PIN         18
#define VIBRATION_PIN      26
#define BUTTON_PIN         0
#define LED_PIN            2
#define BATTERY_PIN        34

// ==========================================
// OLED display settings - 0.49" 64x32 SSD1306
// ==========================================
#define SCREEN_WIDTH 64
#define SCREEN_HEIGHT 32
#define OLED_RESET   -1
#define OLED_SDA     8    // ESP32-S3 I2C pins
#define OLED_SCL     9

// ==========================================
// Alert modes
// ==========================================
enum AlertMode {
  ALERT_NONE,      // No alert
  ALERT_BUZZER,    // Buzzer only
  ALERT_VIBRATION, // Vibration only
  ALERT_BOTH       // Both buzzer and vibration
};

// ==========================================
// Buzzer and vibration PWM settings
// ==========================================
#define BUZZER_CHANNEL     0
#define BUZZER_FREQ        2000
#define BUZZER_RESOLUTION  8
#define VIBRATION_CHANNEL  1
#define VIBRATION_FREQ     160
#define VIBRATION_RESOLUTION 8

// ==========================================
// BLE scanning parameters
// ==========================================
#define BLE_SCAN_INTERVAL  160
#define BLE_SCAN_WINDOW    80
#define BLE_SCAN_DURATION  1
#define BLE_SCAN_PERIOD    1000
#define BLE_MAX_BEACONS    10
#define TARGET_BEACON_NAME "PetZone"

// ==========================================
// Alert thresholds
// ==========================================
#define PROXIMITY_RSSI_THRESHOLD -65
#define PROXIMITY_ALERT_DELAY 3000
#define PROXIMITY_ALERT_TIMEOUT 10000

// ==========================================
// Triangulation parameters
// ==========================================
#define MIN_BEACONS_FOR_TRIANGULATION 3
#define RSSI_TO_DISTANCE_FACTOR -69.0
#define RSSI_TO_DISTANCE_EXPONENT 2.5

// ==========================================
// System states
// ==========================================
#define STATE_NORMAL 0
#define STATE_ALERT 1
#define STATE_LOW_BATTERY 2

// ==========================================
// Web Integration Settings
// ==========================================
#define DATA_UPLOAD_INTERVAL 60000
#define API_ENDPOINT "http://localhost:3000/api/collar/data"
#define DEVICE_TOKEN_LENGTH 32

// ==========================================
// WebSocket Settings
// ==========================================
#define WEBSOCKET_PORT 8080
#define WEBSOCKET_MAX_CLIENTS 3
#define WEBSOCKET_UPDATE_INTERVAL 500

// ==========================================
// Power Management
// ==========================================
#define BATTERY_CHECK_INTERVAL 30000
#define LOW_BATTERY_THRESHOLD 2.0
#define CRITICAL_BATTERY_THRESHOLD 1.0
#define SLEEP_ENABLE false
#define SLEEP_TIMEOUT 300000

// ==========================================
// Global variables
// ==========================================
extern AlertMode currentAlertMode;
extern int currentState;

// ==========================================
// Point structure for zone definitions
// ==========================================
struct Point2D {
  float x;
  float y;
  
  Point2D() : x(0), y(0) {}
  Point2D(float x, float y) : x(x), y(y) {}
};

// ==========================================
// System configuration
// ==========================================
struct SystemConfig {
  char deviceId[16];
  char firmwareVersion[16];
  char hardwareVersion[16];
  bool debugMode;
  bool lowPowerMode;
  uint8_t scanInterval;
  uint8_t scanWindow;
  uint8_t alertVolume;
  uint8_t vibrationIntensity;
  
  SystemConfig() : 
    debugMode(false),
    lowPowerMode(false),
    scanInterval(100),
    scanWindow(50),
    alertVolume(50),
    vibrationIntensity(50) {
    memset(deviceId, 0, sizeof(deviceId));
    memset(firmwareVersion, 0, sizeof(firmwareVersion));
    memset(hardwareVersion, 0, sizeof(hardwareVersion));
  }
};

#endif // MICRO_CONFIG_H 