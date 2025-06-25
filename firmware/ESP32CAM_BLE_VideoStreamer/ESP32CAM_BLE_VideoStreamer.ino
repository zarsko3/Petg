/*
 * Enhanced ESP32-CAM BLE Beacon + Video Streaming Device
 * Combines the existing PetZone BLE beacon functionality with live video streaming
 * 
 * Features:
 * - Location-based BLE beacon naming (PetZone-Location-ID)
 * - Live video streaming via HTTP server
 * - Configurable beacon settings via serial commands
 * - Enhanced metadata with location context and video status
 * - Dual-purpose operation: Beacon + Camera
 * 
 * Hardware Requirements:
 * - ESP32-CAM development board (AI-Thinker or compatible)
 * - OV2640 camera module
 * - LED (optional, Pin 4 - built-in flash)
 * - Button (optional, Pin 0)
 * 
 * Compatible with existing PetZone collar tracking system
 * 
 * Author: Generated for Pet Collar System with Video Enhancement
 * Last Updated: 2025
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <BLEAdvertising.h>
#include <Preferences.h>

// Camera libraries
#include "esp_camera.h"
#include <WiFi.h>
#include "esp_timer.h"
#include "img_converters.h"
#include "Arduino.h"
#include "fb_gfx.h"
#include "soc/soc.h"           // Disable brownout problems
#include "soc/rtc_cntl_reg.h"  // Disable brownout problems
#include "esp_http_server.h"

// Camera pin definitions for AI-Thinker ESP32-CAM
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// Default Configuration (can be changed via serial commands)
#define DEFAULT_LOCATION "Home"        // Default location name
#define DEFAULT_BEACON_ID "CAM01"      // Default beacon ID for camera devices
#define DEFAULT_ZONE ""                // Optional zone for hierarchical naming
#define DEFAULT_FUNCTION "Camera"      // Function identifier for camera beacons

// Hardware pins
#define LED_PIN 4                      // Flash LED pin (built-in)
#define BUTTON_PIN 0                   // Button pin (built-in)

// BLE Configuration
#define ADVERTISE_INTERVAL 100         // Milliseconds between advertisements
#define TX_POWER ESP_PWR_LVL_P9        // Maximum transmission power

// WiFi Configuration
const char* ssid = "ESP32-CAM-VideoBeacon";
const char* password = "VideoBeacon123";

// Video streaming configuration
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// Persistent storage
Preferences preferences;

// Current beacon configuration
struct BeaconConfig {
  String location;
  String beaconId;
  String zone;
  String function;
  String fullName;
  
  void updateFullName() {
    if (function.length() > 0) {
      // Functional naming: PetZone-Function-ID
      fullName = "PetZone-" + function + "-" + beaconId;
    } else if (zone.length() > 0) {
      // Hierarchical naming: PetZone-Location-Zone-ID
      fullName = "PetZone-" + location + "-" + zone + "-" + beaconId;
    } else {
      // Basic naming: PetZone-Location-ID
      fullName = "PetZone-" + location + "-" + beaconId;
    }
  }
} config;

// Timing variables
unsigned long lastLedUpdate = 0;
unsigned long lastBatteryCheck = 0;
unsigned long lastButtonCheck = 0;
unsigned long lastConfigSave = 0;
unsigned long lastStreamUpdate = 0;
bool ledState = false;
bool isAdvertising = true;
bool configChanged = false;
bool cameraInitialized = false;
bool streamingActive = false;
int batteryLevel = 100;
int streamClients = 0;

// BLE objects
BLEServer* pServer = nullptr;
BLEAdvertising* pAdvertising = nullptr;

// HTTP server handle
httpd_handle_t stream_httpd = NULL;
httpd_handle_t camera_httpd = NULL;

// Enhanced beacon metadata structure for camera devices
struct CameraBeaconMetadata {
  uint8_t version;          // Protocol version
  uint8_t beaconId;         // Numeric beacon ID
  uint8_t batteryLevel;     // Battery percentage
  uint8_t locationHash;     // Hash of location name
  uint8_t cameraStatus;     // Camera status: 0=off, 1=ready, 2=streaming
  uint8_t streamClients;    // Number of active stream clients
  uint16_t uptime;          // Uptime in minutes
} __attribute__((packed));

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  // Disable brownout detector
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  
  // Initialize hardware
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  Serial.println("═══════════════════════════════════");
  Serial.println("  ESP32-CAM BLE Beacon + Video Stream");
  Serial.println("═══════════════════════════════════");
  
  // Load configuration from flash
  loadConfiguration();
  
  // Display current configuration
  displayConfiguration();
  
  // Initialize Camera
  initializeCamera();
  
  // Initialize WiFi Access Point
  initializeWiFi();
  
  // Start camera web server
  startCameraServer();
  
  // Initialize BLE
  initializeBLE();
  
  // Start advertising
  startAdvertising();
  
  Serial.println("✅ ESP32-CAM BLE Beacon + Video Stream is ready!");
  Serial.println("✅ BLE Beacon broadcasting for PetCollar detection");
  Serial.println("✅ Video stream available via WiFi");
  Serial.println();
  showCommands();
}

void loop() {
  // Handle LED blinking (status indicator)
  handleStatusLED();
  
  // Check battery level periodically
  handleBatteryCheck();
  
  // Handle button input
  handleButton();
  
  // Handle serial commands
  handleSerialCommands();
  
  // Save configuration if changed
  handleConfigurationSave();
  
  // Update streaming status
  updateStreamingStatus();
  
  // Small delay to prevent excessive CPU usage
  delay(10);
}

void initializeCamera() {
  Serial.println("🔧 Initializing camera...");
  
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Init with high specs to pre-allocate larger buffers
  if(psramFound()){
    config.frame_size = FRAMESIZE_UXGA;
    config.jpeg_quality = 10;
    config.fb_count = 2;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }
  
  // Camera init
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);
    cameraInitialized = false;
    return;
  }
  
  // Set initial camera settings
  sensor_t * s = esp_camera_sensor_get();
  if (s != NULL) {
    // Initial settings
    s->set_brightness(s, 0);     // -2 to 2
    s->set_contrast(s, 0);       // -2 to 2
    s->set_saturation(s, 0);     // -2 to 2
    s->set_special_effect(s, 0); // 0 to 6 (0 - No Effect, 1 - Negative, 2 - Grayscale, 3 - Red Tint, 4 - Green Tint, 5 - Blue Tint, 6 - Sepia)
    s->set_whitebal(s, 1);       // 0 = disable , 1 = enable
    s->set_awb_gain(s, 1);       // 0 = disable , 1 = enable
    s->set_wb_mode(s, 0);        // 0 to 4 - if awb_gain enabled (0 - Auto, 1 - Sunny, 2 - Cloudy, 3 - Office, 4 - Home)
    s->set_exposure_ctrl(s, 1);  // 0 = disable , 1 = enable
    s->set_aec2(s, 0);           // 0 = disable , 1 = enable
    s->set_ae_level(s, 0);       // -2 to 2
    s->set_aec_value(s, 300);    // 0 to 1200
    s->set_gain_ctrl(s, 1);      // 0 = disable , 1 = enable
    s->set_agc_gain(s, 0);       // 0 to 30
    s->set_gainceiling(s, (gainceiling_t)0);  // 0 to 6
    s->set_bpc(s, 0);            // 0 = disable , 1 = enable
    s->set_wpc(s, 1);            // 0 = disable , 1 = enable
    s->set_raw_gma(s, 1);        // 0 = disable , 1 = enable
    s->set_lenc(s, 1);           // 0 = disable , 1 = enable
    s->set_hmirror(s, 0);        // 0 = disable , 1 = enable
    s->set_vflip(s, 0);          // 0 = disable , 1 = enable
    s->set_dcw(s, 1);            // 0 = disable , 1 = enable
    s->set_colorbar(s, 0);       // 0 = disable , 1 = enable
  }
  
  cameraInitialized = true;
  Serial.println("✅ Camera initialized successfully");
}

void initializeWiFi() {
  Serial.println("🔧 Initializing WiFi Access Point...");
  
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  
  IPAddress IP = WiFi.softAPIP();
  Serial.printf("✅ WiFi AP started: %s\n", ssid);
  Serial.printf("✅ AP IP address: %s\n", IP.toString().c_str());
  Serial.printf("✅ Video stream: http://%s/stream\n", IP.toString().c_str());
  Serial.printf("✅ Camera control: http://%s\n", IP.toString().c_str());
}

// HTTP streaming handler
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char * part_buf[64];

  streamClients++;
  streamingActive = true;
  
  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if(res != ESP_OK){
    streamClients--;
    return res;
  }

  while(true){
    fb = esp_camera_fb_get();
    if (!fb) {
      Serial.println("Camera capture failed");
      res = ESP_FAIL;
    } else {
      if(fb->width > 400){
        if(fb->format != PIXFORMAT_JPEG){
          bool jpeg_converted = frame2jpg(fb, 80, &_jpg_buf, &_jpg_buf_len);
          esp_camera_fb_return(fb);
          fb = NULL;
          if(!jpeg_converted){
            Serial.println("JPEG compression failed");
            res = ESP_FAIL;
          }
        } else {
          _jpg_buf_len = fb->len;
          _jpg_buf = fb->buf;
        }
      }
    }
    if(res == ESP_OK){
      size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART, _jpg_buf_len);
      res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    }
    if(res == ESP_OK){
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if(res == ESP_OK){
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }
    if(fb){
      esp_camera_fb_return(fb);
      fb = NULL;
      _jpg_buf = NULL;
    } else if(_jpg_buf){
      free(_jpg_buf);
      _jpg_buf = NULL;
    }
    if(res != ESP_OK){
      break;
    }
  }
  
  streamClients--;
  if(streamClients <= 0) {
    streamingActive = false;
    streamClients = 0;
  }
  
  return res;
}

// Basic camera control page
static esp_err_t index_handler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html");
  String html = "<!DOCTYPE html><html><head><title>ESP32-CAM BLE Beacon</title></head><body>";
  html += "<h1>ESP32-CAM BLE Video Beacon</h1>";
  html += "<h2>Device: " + config.fullName + "</h2>";
  html += "<p><strong>Location:</strong> " + config.location + "</p>";
  html += "<p><strong>Beacon ID:</strong> " + config.beaconId + "</p>";
  html += "<p><strong>Battery:</strong> " + String(batteryLevel) + "%</p>";
  html += "<p><strong>Streaming:</strong> " + String(streamingActive ? "Active" : "Inactive") + "</p>";
  html += "<p><strong>Connected Clients:</strong> " + String(streamClients) + "</p>";
  html += "<hr>";
  html += "<h3>Video Stream</h3>";
  html += "<img src='/stream' style='width:100%; max-width:800px;'>";
  html += "<hr>";
  html += "<p><a href='/stream'>Direct Stream Link</a></p>";
  html += "</body></html>";
  
  return httpd_resp_send(req, html.c_str(), html.length());
}

void startCameraServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t index_uri = {
    .uri       = "/",
    .method    = HTTP_GET,
    .handler   = index_handler,
    .user_ctx  = NULL
  };

  httpd_uri_t stream_uri = {
    .uri       = "/stream",
    .method    = HTTP_GET,
    .handler   = stream_handler,
    .user_ctx  = NULL
  };

  Serial.printf("Starting web server on port: '%d'\n", config.server_port);
  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    Serial.println("✅ Camera web server started successfully");
  } else {
    Serial.println("❌ Failed to start camera web server");
  }
}

void loadConfiguration() {
  Serial.println("🔧 Loading configuration from flash...");
  
  preferences.begin("beacon", false);
  
  config.location = preferences.getString("location", DEFAULT_LOCATION);
  config.beaconId = preferences.getString("beaconId", DEFAULT_BEACON_ID);
  config.zone = preferences.getString("zone", DEFAULT_ZONE);
  config.function = preferences.getString("function", DEFAULT_FUNCTION);
  
  preferences.end();
  
  config.updateFullName();
  
  Serial.printf("✅ Configuration loaded: %s\n", config.fullName.c_str());
}

void saveConfiguration() {
  Serial.println("💾 Saving configuration to flash...");
  
  preferences.begin("beacon", false);
  
  preferences.putString("location", config.location);
  preferences.putString("beaconId", config.beaconId);
  preferences.putString("zone", config.zone);
  preferences.putString("function", config.function);
  
  preferences.end();
  
  configChanged = false;
  lastConfigSave = millis();
  
  Serial.println("✅ Configuration saved successfully");
}

void displayConfiguration() {
  Serial.println("📋 Current Camera Beacon Configuration:");
  Serial.println("─────────────────────────────────────");
  Serial.printf("Full Name: %s\n", config.fullName.c_str());
  Serial.printf("Location:  %s\n", config.location.c_str());
  Serial.printf("Beacon ID: %s\n", config.beaconId.c_str());
  if (config.zone.length() > 0) {
    Serial.printf("Zone:      %s\n", config.zone.c_str());
  }
  if (config.function.length() > 0) {
    Serial.printf("Function:  %s\n", config.function.c_str());
  }
  Serial.printf("Camera:    %s\n", cameraInitialized ? "Ready" : "Failed");
  Serial.println("─────────────────────────────────────");
}

void initializeBLE() {
  Serial.println("🔧 Initializing BLE...");
  
  // Initialize BLE device with current name
  BLEDevice::init(config.fullName);
  
  // Set TX power for better range
  BLEDevice::setPower(TX_POWER);
  
  // Create BLE Server
  pServer = BLEDevice::createServer();
  
  // Get advertising object
  pAdvertising = BLEDevice::getAdvertising();
  
  Serial.printf("✅ BLE initialized as: %s\n", config.fullName.c_str());
}

void startAdvertising() {
  if (!pAdvertising) return;
  
  Serial.println("📡 Starting BLE advertising...");
  
  // Stop any existing advertising
  pAdvertising->stop();
  
  // Set advertising data
  BLEAdvertisementData advertisementData;
  advertisementData.setName(config.fullName);
  advertisementData.setCompleteServices(BLEUUID("12345678-1234-1234-1234-123456789abc"));
  
  // Add enhanced camera beacon metadata
  CameraBeaconMetadata metadata;
  metadata.version = 3; // Camera beacon version
  metadata.beaconId = config.beaconId.substring(config.beaconId.length()-2).toInt(); // Last 2 digits
  metadata.batteryLevel = batteryLevel;
  metadata.locationHash = calculateLocationHash(config.location);
  metadata.cameraStatus = cameraInitialized ? (streamingActive ? 2 : 1) : 0;
  metadata.streamClients = streamClients;
  metadata.uptime = millis() / 60000; // Uptime in minutes
  
  // Set service data with metadata
  String metadataString = "";
  for(int i = 0; i < sizeof(metadata); i++) {
    metadataString += (char)((uint8_t*)&metadata)[i];
  }
  advertisementData.setServiceData(BLEUUID("12345678-1234-1234-1234-123456789abc"), metadataString);
  
  // Configure advertising
  pAdvertising->setAdvertisementData(advertisementData);
  pAdvertising->setMinInterval(ADVERTISE_INTERVAL);
  pAdvertising->setMaxInterval(ADVERTISE_INTERVAL + 50);
  
  // Start advertising
  pAdvertising->start();
  
  Serial.printf("✅ Broadcasting as: %s\n", config.fullName.c_str());
  Serial.printf("✅ Location: %s, ID: %s\n", config.location.c_str(), config.beaconId.c_str());
  Serial.printf("✅ Camera Status: %s\n", cameraInitialized ? (streamingActive ? "Streaming" : "Ready") : "Offline");
}

uint8_t calculateLocationHash(const String& location) {
  // Simple hash function for location identification
  uint8_t hash = 0;
  for (int i = 0; i < location.length(); i++) {
    hash = hash * 31 + location.charAt(i);
  }
  return hash;
}

void handleStatusLED() {
  unsigned long currentTime = millis();
  
  // Different blink patterns based on status
  int blinkInterval;
  if (!cameraInitialized) {
    blinkInterval = 2000; // Slow blink when camera failed
  } else if (streamingActive) {
    blinkInterval = 200;  // Fast blink when streaming
  } else if (configChanged) {
    blinkInterval = 500;  // Medium blink when config changed
  } else {
    blinkInterval = 1000; // Normal blink when ready
  }
  
  if (currentTime - lastLedUpdate > blinkInterval) {
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState);
    lastLedUpdate = currentTime;
  }
}

void handleBatteryCheck() {
  unsigned long currentTime = millis();
  
  // Check battery every 30 seconds
  if (currentTime - lastBatteryCheck > 30000) {
    // For ESP32-CAM, we'll simulate battery reading or use a voltage divider
    // This is a placeholder - implement actual battery monitoring if needed
    batteryLevel = 100; // USB powered assumption
    
    Serial.printf("🔋 Power Status: %d%% (USB/External)\n", batteryLevel);
    lastBatteryCheck = currentTime;
  }
}

void handleButton() {
  unsigned long currentTime = millis();
  
  if (currentTime - lastButtonCheck > 100) {
    if (digitalRead(BUTTON_PIN) == LOW) {
      // Button pressed - toggle flash LED
      toggleFlashLED();
      
      // Wait for button release
      while (digitalRead(BUTTON_PIN) == LOW) {
        delay(50);
      }
      delay(200); // Debounce
    }
    
    lastButtonCheck = currentTime;
  }
}

void toggleFlashLED() {
  static bool flashState = false;
  flashState = !flashState;
  digitalWrite(LED_PIN, flashState ? HIGH : LOW);
  Serial.printf("💡 Flash LED: %s\n", flashState ? "ON" : "OFF");
}

void updateStreamingStatus() {
  unsigned long currentTime = millis();
  
  // Update streaming status every 5 seconds
  if (currentTime - lastStreamUpdate > 5000) {
    // Update BLE advertising with current status
    if (pAdvertising && isAdvertising) {
      startAdvertising(); // Refresh with current status
    }
    lastStreamUpdate = currentTime;
  }
}

void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.length() == 0) return;
    
    char cmd = command.charAt(0);
    
    switch (cmd) {
      case 's':
      case 'S':
        showStatus();
        break;
        
      case 'l':
      case 'L':
        setLocation(command.substring(2));
        break;
        
      case 'i':
      case 'I':
        setBeaconId(command.substring(2));
        break;
        
      case 'z':
      case 'Z':
        setZone(command.substring(2));
        break;
        
      case 'f':
      case 'F':
        setFunction(command.substring(2));
        break;
        
      case 'r':
      case 'R':
        restartAdvertising();
        break;
        
      case 'p':
      case 'P':
        showPresets();
        break;
        
      case 'c':
      case 'C':
        displayConfiguration();
        break;
        
      case 't':
      case 'T':
        toggleFlashLED();
        break;
        
      case 'h':
      case 'H':
        showCommands();
        break;
        
      default:
        Serial.printf("Unknown command: %c (try 'h' for help)\n", cmd);
        break;
    }
  }
}

void setLocation(String location) {
  if (location.length() == 0) {
    Serial.print("Enter location name: ");
    while (!Serial.available()) delay(10);
    location = Serial.readStringUntil('\n');
    location.trim();
  }
  
  if (location.length() > 0) {
    config.location = location;
    config.updateFullName();
    configChanged = true;
    
    Serial.printf("✅ Location set to: %s\n", config.location.c_str());
    Serial.printf("✅ New name: %s\n", config.fullName.c_str());
    
    restartAdvertising();
  } else {
    Serial.println("❌ Invalid location name");
  }
}

void setBeaconId(String id) {
  if (id.length() == 0) {
    Serial.print("Enter beacon ID (CAM01-CAM99): ");
    while (!Serial.available()) delay(10);
    id = Serial.readStringUntil('\n');
    id.trim();
  }
  
  if (id.length() > 0) {
    config.beaconId = id;
    config.updateFullName();
    configChanged = true;
    
    Serial.printf("✅ Beacon ID set to: %s\n", config.beaconId.c_str());
    Serial.printf("✅ New name: %s\n", config.fullName.c_str());
    
    restartAdvertising();
  } else {
    Serial.println("❌ Invalid beacon ID");
  }
}

void setZone(String zone) {
  if (zone.length() == 0) {
    Serial.print("Enter zone name (or 'clear' to remove): ");
    while (!Serial.available()) delay(10);
    zone = Serial.readStringUntil('\n');
    zone.trim();
  }
  
  if (zone.equalsIgnoreCase("clear")) {
    config.zone = "";
    Serial.println("✅ Zone cleared");
  } else {
    config.zone = zone;
    Serial.printf("✅ Zone set to: %s\n", config.zone.c_str());
  }
  
  config.updateFullName();
  configChanged = true;
  
  Serial.printf("✅ New name: %s\n", config.fullName.c_str());
  restartAdvertising();
}

void setFunction(String function) {
  if (function.length() == 0) {
    Serial.print("Enter function (Camera/Security/Monitor or 'clear'): ");
    while (!Serial.available()) delay(10);
    function = Serial.readStringUntil('\n');
    function.trim();
  }
  
  if (function.equalsIgnoreCase("clear")) {
    config.function = "";
    Serial.println("✅ Function cleared");
  } else if (function.equalsIgnoreCase("Camera") || function.equalsIgnoreCase("Security") ||
             function.equalsIgnoreCase("Monitor") || function.equalsIgnoreCase("Surveillance")) {
    config.function = function;
    config.function.toLowerCase();
    config.function.setCharAt(0, config.function.charAt(0) - 32); // Capitalize first letter
    Serial.printf("✅ Function set to: %s\n", config.function.c_str());
  } else {
    Serial.println("❌ Invalid function (use: Camera, Security, Monitor, Surveillance, or 'clear')");
    return;
  }
  
  config.updateFullName();
  configChanged = true;
  
  Serial.printf("✅ New name: %s\n", config.fullName.c_str());
  restartAdvertising();
}

void restartAdvertising() {
  Serial.println("🔄 Restarting BLE advertising...");
  
  BLEDevice::deinit();
  delay(100);
  initializeBLE();
  startAdvertising();
}

void showPresets() {
  Serial.println("📋 Available Preset Configurations:");
  Serial.println("─────────────────────────────────");
  Serial.println("1. PetZone-Camera-CAM01    (Basic camera)");
  Serial.println("2. PetZone-Security-CAM01  (Security camera)");
  Serial.println("3. PetZone-Monitor-CAM01   (Monitoring camera)");
  Serial.println("4. PetZone-Home-Indoor-CAM01 (Indoor home camera)");
  Serial.println("5. PetZone-Garden-CAM01    (Garden camera)");
  Serial.println("─────────────────────────────────");
  Serial.println("Press button to toggle flash LED");
}

void showStatus() {
  Serial.println("═══════════════════════════════════");
  Serial.println("    ESP32-CAM BLE BEACON STATUS");
  Serial.println("═══════════════════════════════════");
  Serial.printf("Full Name: %s\n", config.fullName.c_str());
  Serial.printf("Location: %s\n", config.location.c_str());
  Serial.printf("Beacon ID: %s\n", config.beaconId.c_str());
  if (config.zone.length() > 0) {
    Serial.printf("Zone: %s\n", config.zone.c_str());
  }
  if (config.function.length() > 0) {
    Serial.printf("Function: %s\n", config.function.c_str());
  }
  Serial.printf("Battery: %d%%\n", batteryLevel);
  Serial.printf("Uptime: %lu seconds\n", millis() / 1000);
  Serial.printf("BLE Advertising: %s\n", isAdvertising ? "ACTIVE" : "STOPPED");
  Serial.printf("Camera: %s\n", cameraInitialized ? "READY" : "FAILED");
  Serial.printf("Video Streaming: %s\n", streamingActive ? "ACTIVE" : "INACTIVE");
  Serial.printf("Stream Clients: %d\n", streamClients);
  Serial.printf("WiFi AP: %s\n", ssid);
  Serial.printf("Video URL: http://%s/stream\n", WiFi.softAPIP().toString().c_str());
  Serial.printf("Config Changed: %s\n", configChanged ? "YES" : "NO");
  Serial.printf("Free Heap: %d bytes\n", ESP.getFreeHeap());
  Serial.println("═══════════════════════════════════");
}

void showCommands() {
  Serial.println("═══════════════════════════════════");
  Serial.println("       AVAILABLE COMMANDS");
  Serial.println("═══════════════════════════════════");
  Serial.println("s - Show detailed status");
  Serial.println("l [name] - Set location name");
  Serial.println("i [id] - Set beacon ID (CAM01-CAM99)");
  Serial.println("z [zone] - Set zone name (hierarchical)");
  Serial.println("f [func] - Set function (Camera/Security/Monitor)");
  Serial.println("r - Restart BLE advertising");
  Serial.println("p - Show preset configurations");
  Serial.println("c - Display current configuration");
  Serial.println("t - Toggle flash LED");
  Serial.println("h - Show this help menu");
  Serial.println();
  Serial.println("Examples:");
  Serial.println("  l Garden      → Set location to 'Garden'");
  Serial.println("  i CAM02       → Set beacon ID to 'CAM02'");
  Serial.println("  z Outdoor     → Set zone to 'Outdoor'");
  Serial.println("  f Security    → Set function to 'Security'");
  Serial.println("  z clear       → Remove zone");
  Serial.println("  f clear       → Remove function");
  Serial.println();
  Serial.println("Hardware Controls:");
  Serial.println("Button (Pin 0) - Toggle flash LED");
  Serial.println("LED (Pin 4) - Status indicator & flash");
  Serial.println();
  Serial.println("Video Access:");
  Serial.printf("WiFi: %s (Pass: %s)\n", ssid, password);
  Serial.printf("Stream: http://%s/stream\n", WiFi.softAPIP().toString().c_str());
  Serial.println("═══════════════════════════════════");
}

void handleConfigurationSave() {
  // Auto-save configuration 5 seconds after changes
  if (configChanged && (millis() - lastConfigSave > 5000)) {
    saveConfiguration();
  }
} 