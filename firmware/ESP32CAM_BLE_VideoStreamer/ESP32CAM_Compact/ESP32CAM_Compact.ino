/*
 * Compact ESP32-CAM BLE Beacon + Video Streaming Device
 * Optimized version with reduced memory footprint
 * 
 * Features:
 * - BLE beacon functionality (PetZone compatible)
 * - Live video streaming via HTTP server
 * - Basic configuration via serial commands
 * - Reduced memory usage for compilation
 */

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEAdvertising.h>
#include <Preferences.h>
#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

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

// Configuration
#define LED_PIN 4
#define BUTTON_PIN 0
#define ADVERTISE_INTERVAL 100

// WiFi Configuration
const char* ssid = "ESP32-CAM-Beacon";
const char* password = "Beacon123";

// Video streaming
#define PART_BOUNDARY "123456789000000000000987654321"
static const char* _STREAM_CONTENT_TYPE = "multipart/x-mixed-replace;boundary=" PART_BOUNDARY;
static const char* _STREAM_BOUNDARY = "\r\n--" PART_BOUNDARY "\r\n";
static const char* _STREAM_PART = "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n";

// Global variables
Preferences preferences;
String deviceName = "PetZone-Camera-CAM01";
String location = "Home";
String beaconId = "CAM01";
bool cameraReady = false;
bool streamActive = false;
int streamClients = 0;
unsigned long lastLedUpdate = 0;
bool ledState = false;

BLEAdvertising* pAdvertising = nullptr;
httpd_handle_t camera_httpd = NULL;

// Compact metadata structure
struct CompactMetadata {
  uint8_t version;
  uint8_t beaconId;
  uint8_t batteryLevel;
  uint8_t cameraStatus;
  uint8_t streamClients;
} __attribute__((packed));

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  Serial.println("ESP32-CAM BLE Beacon Starting...");
  
  loadConfig();
  initCamera();
  initWiFi();
  startWebServer();
  initBLE();
  startAdvertising();
  
  Serial.println("Ready!");
  Serial.println("Commands: s=status, l=location, i=id, h=help");
}

void loop() {
  handleLED();
  handleSerial();
  delay(10);
}

void loadConfig() {
  preferences.begin("beacon", false);
  location = preferences.getString("location", "Home");
  beaconId = preferences.getString("beaconId", "CAM01");
  preferences.end();
  
  deviceName = "PetZone-" + location + "-" + beaconId;
  Serial.println("Device: " + deviceName);
}

void saveConfig() {
  preferences.begin("beacon", false);
  preferences.putString("location", location);
  preferences.putString("beaconId", beaconId);
  preferences.end();
  Serial.println("Config saved");
}

void initCamera() {
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
  
  // Smaller frame size for memory optimization
  config.frame_size = FRAMESIZE_SVGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;
  
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.println("Camera init failed");
    cameraReady = false;
  } else {
    Serial.println("Camera ready");
    cameraReady = true;
  }
}

void initWiFi() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  Serial.println("WiFi AP: " + String(ssid));
  Serial.println("IP: " + WiFi.softAPIP().toString());
}

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char * part_buf[64];

  streamClients++;
  streamActive = true;
  
  res = httpd_resp_set_type(req, _STREAM_CONTENT_TYPE);
  if(res != ESP_OK) {
    streamClients--;
    return res;
  }

  while(true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      res = ESP_FAIL;
      break;
    }
    
    _jpg_buf_len = fb->len;
    _jpg_buf = fb->buf;
    
    size_t hlen = snprintf((char *)part_buf, 64, _STREAM_PART, _jpg_buf_len);
    res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    
    if(res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    
    if(res == ESP_OK) {
      res = httpd_resp_send_chunk(req, _STREAM_BOUNDARY, strlen(_STREAM_BOUNDARY));
    }
    
    esp_camera_fb_return(fb);
    
    if(res != ESP_OK) {
      break;
    }
  }
  
  streamClients--;
  if(streamClients <= 0) {
    streamActive = false;
    streamClients = 0;
  }
  
  return res;
}

static esp_err_t index_handler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html");
  String html = "<!DOCTYPE html><html><head><title>ESP32-CAM</title></head><body>";
  html += "<h1>" + deviceName + "</h1>";
  html += "<p>Location: " + location + "</p>";
  html += "<p>Beacon ID: " + beaconId + "</p>";
  html += "<p>Camera: " + String(cameraReady ? "Ready" : "Failed") + "</p>";
  html += "<p>Streaming: " + String(streamActive ? "Active" : "Inactive") + "</p>";
  html += "<p>Clients: " + String(streamClients) + "</p>";
  html += "<hr><img src='/stream' style='width:100%; max-width:640px;'>";
  html += "</body></html>";
  
  return httpd_resp_send(req, html.c_str(), html.length());
}

void startWebServer() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t index_uri = {
    .uri = "/",
    .method = HTTP_GET,
    .handler = index_handler,
    .user_ctx = NULL
  };

  httpd_uri_t stream_uri = {
    .uri = "/stream",
    .method = HTTP_GET,
    .handler = stream_handler,
    .user_ctx = NULL
  };

  if (httpd_start(&camera_httpd, &config) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    Serial.println("Web server started");
  }
}

void initBLE() {
  BLEDevice::init(deviceName);
  BLEDevice::setPower(ESP_PWR_LVL_P9);
  pAdvertising = BLEDevice::getAdvertising();
  Serial.println("BLE initialized");
}

void startAdvertising() {
  if (!pAdvertising) return;
  
  pAdvertising->stop();
  
  BLEAdvertisementData advertisementData;
  advertisementData.setName(deviceName);
  advertisementData.setCompleteServices(BLEUUID("12345678-1234-1234-1234-123456789abc"));
  
  // Compact metadata
  CompactMetadata metadata;
  metadata.version = 3;
  metadata.beaconId = beaconId.substring(beaconId.length()-2).toInt();
  metadata.batteryLevel = 100;
  metadata.cameraStatus = cameraReady ? (streamActive ? 2 : 1) : 0;
  metadata.streamClients = streamClients;
  
  String metadataString = "";
  for(int i = 0; i < sizeof(metadata); i++) {
    metadataString += (char)((uint8_t*)&metadata)[i];
  }
  advertisementData.setServiceData(BLEUUID("12345678-1234-1234-1234-123456789abc"), metadataString);
  
  pAdvertising->setAdvertisementData(advertisementData);
  pAdvertising->setMinInterval(ADVERTISE_INTERVAL);
  pAdvertising->setMaxInterval(ADVERTISE_INTERVAL + 50);
  pAdvertising->start();
  
  Serial.println("BLE advertising: " + deviceName);
}

void handleLED() {
  unsigned long currentTime = millis();
  int interval = streamActive ? 200 : (cameraReady ? 1000 : 2000);
  
  if (currentTime - lastLedUpdate > interval) {
    ledState = !ledState;
    digitalWrite(LED_PIN, ledState);
    lastLedUpdate = currentTime;
  }
}

void handleSerial() {
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
        if (command.length() > 2) {
          location = command.substring(2);
          deviceName = "PetZone-" + location + "-" + beaconId;
          saveConfig();
          Serial.println("Location: " + location);
          startAdvertising();
        }
        break;
        
      case 'i':
      case 'I':
        if (command.length() > 2) {
          beaconId = command.substring(2);
          deviceName = "PetZone-" + location + "-" + beaconId;
          saveConfig();
          Serial.println("Beacon ID: " + beaconId);
          startAdvertising();
        }
        break;
        
      case 'h':
      case 'H':
        showHelp();
        break;
        
      default:
        Serial.println("Unknown command. Type 'h' for help.");
        break;
    }
  }
}

void showStatus() {
  Serial.println("=== STATUS ===");
  Serial.println("Device: " + deviceName);
  Serial.println("Location: " + location);
  Serial.println("Beacon ID: " + beaconId);
  Serial.println("Camera: " + String(cameraReady ? "Ready" : "Failed"));
  Serial.println("Streaming: " + String(streamActive ? "Active" : "Inactive"));
  Serial.println("Clients: " + String(streamClients));
  Serial.println("WiFi: " + String(ssid));
  Serial.println("IP: " + WiFi.softAPIP().toString());
  Serial.println("Free heap: " + String(ESP.getFreeHeap()));
  Serial.println("==============");
}

void showHelp() {
  Serial.println("=== COMMANDS ===");
  Serial.println("s - Show status");
  Serial.println("l [name] - Set location");
  Serial.println("i [id] - Set beacon ID");
  Serial.println("h - Show help");
  Serial.println("================");
  Serial.println("Examples:");
  Serial.println("l Garden");
  Serial.println("i CAM02");
} 