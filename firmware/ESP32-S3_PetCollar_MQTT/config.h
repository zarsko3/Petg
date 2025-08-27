// ==================== WARNING ====================
// DO NOT COMMIT REAL SECRETS (WIFI/MQTT PASSWORDS) TO GIT
// Replace all values below with your actual credentials before uploading
// ==================================================

// ==================== MQTT CLOUD CONFIGURATION ====================
// Edit these values before uploading to your ESP32-S3

// WiFi Configuration
#define WIFI_SSID "<YOUR_WIFI_SSID>"
#define WIFI_PASSWORD "<YOUR_WIFI_PASSWORD>"

// MQTT Cloud Configuration (HiveMQ Cloud)
#define MQTT_SERVER "<YOUR_MQTT_SERVER>"
#define MQTT_PORT <YOUR_MQTT_PORT>
#define MQTT_USER "<YOUR_MQTT_USER>"
#define MQTT_PASSWORD "<YOUR_MQTT_PASSWORD>"

// Device Configuration  
#define COLLAR_ID "<YOUR_COLLAR_ID>"
#define DEVICE_NAME "<YOUR_DEVICE_NAME>"

// Hardware Configuration
#define BUZZER_PIN 18
#define BATTERY_ADC_PIN 34
#define SDA_PIN 21
#define SCL_PIN 22

// Timing Configuration (milliseconds)
#define TELEMETRY_INTERVAL 30000    // 30 seconds
#define HEARTBEAT_INTERVAL 60000    // 1 minute
#define BLE_SCAN_DURATION 5         // 5 seconds
#define WIFI_TIMEOUT 20000          // 20 seconds
#define MQTT_KEEPALIVE 60           // 60 seconds

// Topic Configuration
#define TOPIC_STATUS "pet-collar/" COLLAR_ID "/status"
#define TOPIC_TELEMETRY "pet-collar/" COLLAR_ID "/telemetry"
#define TOPIC_HEARTBEAT "pet-collar/" COLLAR_ID "/heartbeat"
#define TOPIC_ALERT "pet-collar/" COLLAR_ID "/alert"
#define TOPIC_COMMAND "pet-collar/" COLLAR_ID "/command"
#define TOPIC_CONFIG "pet-collar/" COLLAR_ID "/config"

// Debug Configuration
#define DEBUG_SERIAL true
#define SERIAL_BAUD 115200 