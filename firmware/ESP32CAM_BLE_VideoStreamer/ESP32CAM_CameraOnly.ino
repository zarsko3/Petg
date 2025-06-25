/*
 * ESP32-CAM Video Streaming Device
 * Camera-only version for integration with PetZone tracking system
 * 
 * Features:
 * - Live video streaming via HTTP server
 * - WiFi Access Point mode
 * - Web interface for monitoring
 * - Serial configuration
 * - Flash LED control
 * - Lightweight - no BLE functionality
 */

#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"
#include <Preferences.h>
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

// Hardware pins
#define FLASH_LED_PIN      4
#define BUTTON_PIN        15
#define STATUS_LED_PIN    33

// Configuration
struct CameraConfig {
  String deviceName;
  String location;
  String wifiSSID;
  String wifiPassword;
  int streamPort;
  bool flashEnabled;
};

// Global variables
CameraConfig config;
Preferences preferences;
httpd_handle_t camera_httpd = NULL;
int activeClients = 0;
unsigned long lastButtonPress = 0;
bool flashState = false;

// Default configuration
void loadDefaultConfig() {
  config.deviceName = "PetZone-Camera-CAM01";
  config.location = "Living Room";
  config.wifiSSID = "ESP32-CAM-VideoStream";
  config.wifiPassword = "petzone123";
  config.streamPort = 80;
  config.flashEnabled = true;
}

// Load configuration from preferences
void loadConfig() {
  preferences.begin("camera", false);
  
  config.deviceName = preferences.getString("deviceName", "PetZone-Camera-CAM01");
  config.location = preferences.getString("location", "Living Room");
  config.wifiSSID = preferences.getString("wifiSSID", "ESP32-CAM-VideoStream");
  config.wifiPassword = preferences.getString("wifiPass", "petzone123");
  config.streamPort = preferences.getInt("streamPort", 80);
  config.flashEnabled = preferences.getBool("flashEnabled", true);
  
  preferences.end();
}

// Save configuration to preferences
void saveConfig() {
  preferences.begin("camera", false);
  
  preferences.putString("deviceName", config.deviceName);
  preferences.putString("location", config.location);
  preferences.putString("wifiSSID", config.wifiSSID);
  preferences.putString("wifiPass", config.wifiPassword);
  preferences.putInt("streamPort", config.streamPort);
  preferences.putBool("flashEnabled", config.flashEnabled);
  
  preferences.end();
}

// Initialize camera
bool initCamera() {
  camera_config_t camera_config;
  camera_config.ledc_channel = LEDC_CHANNEL_0;
  camera_config.ledc_timer = LEDC_TIMER_0;
  camera_config.pin_d0 = Y2_GPIO_NUM;
  camera_config.pin_d1 = Y3_GPIO_NUM;
  camera_config.pin_d2 = Y4_GPIO_NUM;
  camera_config.pin_d3 = Y5_GPIO_NUM;
  camera_config.pin_d4 = Y6_GPIO_NUM;
  camera_config.pin_d5 = Y7_GPIO_NUM;
  camera_config.pin_d6 = Y8_GPIO_NUM;
  camera_config.pin_d7 = Y9_GPIO_NUM;
  camera_config.pin_xclk = XCLK_GPIO_NUM;
  camera_config.pin_pclk = PCLK_GPIO_NUM;
  camera_config.pin_vsync = VSYNC_GPIO_NUM;
  camera_config.pin_href = HREF_GPIO_NUM;
  camera_config.pin_sscb_sda = SIOD_GPIO_NUM;
  camera_config.pin_sscb_scl = SIOC_GPIO_NUM;
  camera_config.pin_pwdn = PWDN_GPIO_NUM;
  camera_config.pin_reset = RESET_GPIO_NUM;
  camera_config.xclk_freq_hz = 20000000;
  camera_config.pixel_format = PIXFORMAT_JPEG;
  
  // Frame size and quality settings
  if(psramFound()){
    camera_config.frame_size = FRAMESIZE_UXGA;
    camera_config.jpeg_quality = 10;
    camera_config.fb_count = 2;
  } else {
    camera_config.frame_size = FRAMESIZE_SVGA;
    camera_config.jpeg_quality = 12;
    camera_config.fb_count = 1;
  }
  
  // Initialize camera
  esp_err_t err = esp_camera_init(&camera_config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return false;
  }
  
  // Adjust camera settings
  sensor_t * s = esp_camera_sensor_get();
  s->set_brightness(s, 0);     // -2 to 2
  s->set_contrast(s, 0);       // -2 to 2
  s->set_saturation(s, 0);     // -2 to 2
  s->set_special_effect(s, 0); // 0 to 6 (0-No Effect, 1-Negative, 2-Grayscale, 3-Red Tint, 4-Green Tint, 5-Blue Tint, 6-Sepia)
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
  
  return true;
}

// HTTP streaming handler
static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  size_t _jpg_buf_len = 0;
  uint8_t * _jpg_buf = NULL;
  char * part_buf[64];
  
  activeClients++;
  
  res = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  if(res != ESP_OK){
    activeClients--;
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
      size_t hlen = snprintf((char *)part_buf, 64, "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", _jpg_buf_len);
      res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    }
    if(res == ESP_OK){
      res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
    }
    if(res == ESP_OK){
      res = httpd_resp_send_chunk(req, "\r\n--frame\r\n", 12);
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
  
  activeClients--;
  return res;
}

// HTTP index page handler
static esp_err_t index_handler(httpd_req_t *req) {
  const char* html = R"rawliteral(
<!DOCTYPE html>
<html>
<head>
    <title>PetZone Camera Stream</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 20px; }
        .status { background: #e8f5e8; padding: 10px; border-radius: 5px; margin-bottom: 20px; }
        .stream-container { text-align: center; }
        .stream { max-width: 100%; height: auto; border: 2px solid #ddd; border-radius: 5px; }
        .controls { margin-top: 20px; text-align: center; }
        .btn { background: #007bff; color: white; border: none; padding: 10px 20px; margin: 5px; border-radius: 5px; cursor: pointer; }
        .btn:hover { background: #0056b3; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐾 PetZone Camera Stream</h1>
            <h2>%DEVICE_NAME%</h2>
            <p>Location: %LOCATION%</p>
        </div>
        
        <div class="status">
            <strong>Status:</strong> Camera Online | 
            <strong>Active Viewers:</strong> <span id="viewers">%ACTIVE_CLIENTS%</span> |
            <strong>WiFi:</strong> %WIFI_SSID%
        </div>
        
        <div class="stream-container">
            <img src="/stream" class="stream" id="stream">
        </div>
        
        <div class="controls">
            <button class="btn" onclick="toggleFlash()">Toggle Flash</button>
            <button class="btn" onclick="location.reload()">Refresh</button>
        </div>
    </div>
    
    <script>
        function toggleFlash() {
            fetch('/flash').then(() => {
                console.log('Flash toggled');
            });
        }
        
        // Update viewer count every 5 seconds
        setInterval(() => {
            fetch('/status').then(r => r.json()).then(data => {
                document.getElementById('viewers').textContent = data.activeClients;
            });
        }, 5000);
    </script>
</body>
</html>
)rawliteral";

  String response = String(html);
  response.replace("%DEVICE_NAME%", config.deviceName);
  response.replace("%LOCATION%", config.location);
  response.replace("%ACTIVE_CLIENTS%", String(activeClients));
  response.replace("%WIFI_SSID%", config.wifiSSID);
  
  httpd_resp_send(req, response.c_str(), response.length());
  return ESP_OK;
}

// Flash control handler
static esp_err_t flash_handler(httpd_req_t *req) {
  if (config.flashEnabled) {
    flashState = !flashState;
    digitalWrite(FLASH_LED_PIN, flashState ? HIGH : LOW);
  }
  httpd_resp_send(req, "OK", 2);
  return ESP_OK;
}

// Status API handler
static esp_err_t status_handler(httpd_req_t *req) {
  String json = "{";
  json += "\"activeClients\":" + String(activeClients) + ",";
  json += "\"deviceName\":\"" + config.deviceName + "\",";
  json += "\"location\":\"" + config.location + "\",";
  json += "\"flashState\":" + String(flashState ? "true" : "false") + ",";
  json += "\"uptime\":" + String(millis()) + ",";
  json += "\"freeHeap\":" + String(ESP.getFreeHeap());
  json += "}";
  
  httpd_resp_set_type(req, "application/json");
  httpd_resp_send(req, json.c_str(), json.length());
  return ESP_OK;
}

// Start HTTP server
void startCameraServer() {
  httpd_config_t config_httpd = HTTPD_DEFAULT_CONFIG();
  config_httpd.server_port = config.streamPort;
  
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
  
  httpd_uri_t flash_uri = {
    .uri       = "/flash",
    .method    = HTTP_GET,
    .handler   = flash_handler,
    .user_ctx  = NULL
  };
  
  httpd_uri_t status_uri = {
    .uri       = "/status",
    .method    = HTTP_GET,
    .handler   = status_handler,
    .user_ctx  = NULL
  };
  
  if (httpd_start(&camera_httpd, &config_httpd) == ESP_OK) {
    httpd_register_uri_handler(camera_httpd, &index_uri);
    httpd_register_uri_handler(camera_httpd, &stream_uri);
    httpd_register_uri_handler(camera_httpd, &flash_uri);
    httpd_register_uri_handler(camera_httpd, &status_uri);
    Serial.println("Camera server started successfully");
  } else {
    Serial.println("Failed to start camera server");
  }
}

// Handle serial commands
void handleSerialCommands() {
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    
    if (command.startsWith("SET_NAME:")) {
      config.deviceName = command.substring(9);
      saveConfig();
      Serial.println("Device name updated: " + config.deviceName);
    }
    else if (command.startsWith("SET_LOCATION:")) {
      config.location = command.substring(13);
      saveConfig();
      Serial.println("Location updated: " + config.location);
    }
    else if (command.startsWith("SET_WIFI_SSID:")) {
      config.wifiSSID = command.substring(14);
      saveConfig();
      Serial.println("WiFi SSID updated: " + config.wifiSSID);
    }
    else if (command.startsWith("SET_WIFI_PASS:")) {
      config.wifiPassword = command.substring(14);
      saveConfig();
      Serial.println("WiFi password updated");
    }
    else if (command == "SHOW_CONFIG") {
      Serial.println("\n=== Camera Configuration ===");
      Serial.println("Device Name: " + config.deviceName);
      Serial.println("Location: " + config.location);
      Serial.println("WiFi SSID: " + config.wifiSSID);
      Serial.println("Stream Port: " + String(config.streamPort));
      Serial.println("Flash Enabled: " + String(config.flashEnabled ? "Yes" : "No"));
      Serial.println("Active Clients: " + String(activeClients));
      Serial.println("Free Heap: " + String(ESP.getFreeHeap()) + " bytes");
      Serial.println("============================\n");
    }
    else if (command == "RESTART") {
      Serial.println("Restarting device...");
      ESP.restart();
    }
    else if (command == "FLASH_ON") {
      if (config.flashEnabled) {
        digitalWrite(FLASH_LED_PIN, HIGH);
        flashState = true;
        Serial.println("Flash LED turned ON");
      }
    }
    else if (command == "FLASH_OFF") {
      digitalWrite(FLASH_LED_PIN, LOW);
      flashState = false;
      Serial.println("Flash LED turned OFF");
    }
    else if (command == "HELP") {
      Serial.println("\n=== Available Commands ===");
      Serial.println("SET_NAME:<name>        - Set device name");
      Serial.println("SET_LOCATION:<loc>     - Set location");
      Serial.println("SET_WIFI_SSID:<ssid>   - Set WiFi SSID");
      Serial.println("SET_WIFI_PASS:<pass>   - Set WiFi password");
      Serial.println("SHOW_CONFIG            - Show current configuration");
      Serial.println("FLASH_ON/FLASH_OFF     - Control flash LED");
      Serial.println("RESTART                - Restart device");
      Serial.println("HELP                   - Show this help");
      Serial.println("=========================\n");
    }
  }
}

// Handle button press
void handleButton() {
  if (digitalRead(BUTTON_PIN) == LOW) {
    if (millis() - lastButtonPress > 500) { // Debounce
      if (config.flashEnabled) {
        flashState = !flashState;
        digitalWrite(FLASH_LED_PIN, flashState ? HIGH : LOW);
        Serial.println("Flash toggled via button: " + String(flashState ? "ON" : "OFF"));
      }
      lastButtonPress = millis();
    }
  }
}

// Status LED patterns
void updateStatusLED() {
  static unsigned long lastBlink = 0;
  static bool ledState = false;
  
  unsigned long now = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    // Fast blink when not connected
    if (now - lastBlink > 200) {
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
      lastBlink = now;
    }
  } else if (activeClients > 0) {
    // Solid on when streaming
    digitalWrite(STATUS_LED_PIN, HIGH);
  } else {
    // Slow blink when connected but not streaming
    if (now - lastBlink > 1000) {
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState ? HIGH : LOW);
      lastBlink = now;
    }
  }
}

void setup() {
  // Disable brownout detector
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  
  Serial.begin(115200);
  Serial.println("\n🐾 PetZone ESP32-CAM Starting...");
  
  // Initialize pins
  pinMode(FLASH_LED_PIN, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(STATUS_LED_PIN, OUTPUT);
  
  digitalWrite(FLASH_LED_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);
  
  // Load configuration
  loadDefaultConfig();
  loadConfig();
  
  // Initialize camera
  if (!initCamera()) {
    Serial.println("❌ Camera initialization failed!");
    while(1) {
      digitalWrite(STATUS_LED_PIN, HIGH);
      delay(200);
      digitalWrite(STATUS_LED_PIN, LOW);
      delay(200);
    }
  }
  Serial.println("✅ Camera initialized successfully");
  
  // Start WiFi Access Point
  WiFi.mode(WIFI_AP);
  WiFi.softAP(config.wifiSSID.c_str(), config.wifiPassword.c_str());
  
  IPAddress IP = WiFi.softAPIP();
  Serial.println("📶 WiFi AP Started");
  Serial.println("SSID: " + config.wifiSSID);
  Serial.println("IP Address: " + IP.toString());
  Serial.println("Stream URL: http://" + IP.toString() + ":" + String(config.streamPort));
  
  // Start camera server
  startCameraServer();
  
  Serial.println("\n🎥 " + config.deviceName + " Ready!");
  Serial.println("Location: " + config.location);
  Serial.println("Type 'HELP' for available commands\n");
}

void loop() {
  handleSerialCommands();
  handleButton();
  updateStatusLED();
  
  delay(10);
} 