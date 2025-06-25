/**
 * @file PetCamera_Main.ino
 * @brief Pet Camera Module - Refactored and Optimized
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * This firmware provides camera functionality for the pet tracking system.
 * It combines BLE beacon broadcasting with live video streaming capabilities.
 * 
 * Features:
 * - High-quality video streaming via HTTP
 * - BLE beacon broadcasting for pet tracking integration
 * - Web-based camera controls and settings
 * - Configurable video quality and streaming parameters
 * - Low power operation modes
 * - Integration with pet collar ecosystem
 * 
 * Hardware Requirements:
 * - ESP32-CAM development board (AI-Thinker or compatible)
 * - OV2640 camera module
 * - Optional: External antenna for better range
 * 
 * This refactored version provides better modularity, performance,
 * and maintainability compared to the original implementation.
 */

// ==========================================
// INCLUDES
// ==========================================

// Arduino and ESP32 core libraries
#include <Arduino.h>
#include <WiFi.h>
#include <esp_camera.h>
#include <esp_http_server.h>
#include <esp_timer.h>

// BLE libraries
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLEAdvertising.h>

// JSON and preferences
#include <ArduinoJson.h>
#include <Preferences.h>

// Common utilities
#include "../common/include/PetCollarConfig.h"
#include "../common/include/Utils.h"

// ==========================================
// CAMERA CONFIGURATION
// ==========================================

// Camera model selection (AI-Thinker ESP32-CAM)
#define CAMERA_MODEL_AI_THINKER

// Camera pin definitions for AI-Thinker ESP32-CAM
#ifdef CAMERA_MODEL_AI_THINKER
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
#endif

// Flash LED and button pins
#define FLASH_LED_PIN      4
#define BUTTON_PIN         0

// ==========================================
// STREAMING CONFIGURATION
// ==========================================

#define STREAM_CONTENT_TYPE "multipart/x-mixed-replace;boundary=123456789000000000000987654321"
#define STREAM_BOUNDARY     "\r\n--123456789000000000000987654321\r\n"
#define STREAM_PART         "Content-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n"

// ==========================================
// GLOBAL OBJECTS AND STATE
// ==========================================

// Core objects
Preferences preferences;
httpd_handle_t streamServer = NULL;
httpd_handle_t cameraServer = NULL;

// BLE objects
BLEServer* pBLEServer = nullptr;
BLEAdvertising* pAdvertising = nullptr;

/**
 * @brief Camera system state
 */
struct CameraState {
    // Hardware status
    bool cameraInitialized = false;
    bool wifiConnected = false;
    bool bleEnabled = false;
    bool streamingActive = false;
    
    // Camera settings
    framesize_t frameSize = FRAMESIZE_VGA;  // 640x480
    int jpegQuality = 12;                   // 0-63, lower = better quality
    int brightness = 0;                     // -2 to 2
    int contrast = 0;                       // -2 to 2
    
    // Streaming statistics
    unsigned long totalFrames = 0;
    unsigned long droppedFrames = 0;
    unsigned long lastFrameTime = 0;
    int currentFPS = 0;
    int activeClients = 0;
    
    // Configuration
    String deviceId = "PetCamera-001";
    String location = "Home";
    String beaconName = "";
    
    // Network settings
    String wifiSSID = "";
    String wifiPassword = "";
    bool apMode = false;
    
} cameraState;

// WiFi credentials (multiple networks for failover)
struct NetworkConfig {
    const char* ssid;
    const char* password;
    const char* description;
};

NetworkConfig networks[] = {
    {"JenoviceAP", "DataSecNet", "Primary Network"},
    {"g@n", "0547530732", "Secondary Network"},
    {"ESP32-CAM-VideoBeacon", "VideoBeacon123", "Fallback AP"}
};
const int numNetworks = sizeof(networks) / sizeof(networks[0]);

// ==========================================
// CAMERA MANAGEMENT
// ==========================================

/**
 * @brief Initialize camera with optimized settings
 * @return true if successful
 */
bool initializeCamera() {
    DEBUG_PRINTLN("Camera: Initializing...");
    
    // Camera configuration
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
    config.xclk_freq_hz = 20000000;          // 20MHz for better performance
    config.pixel_format = PIXFORMAT_JPEG;    // JPEG format for streaming
    config.frame_size = cameraState.frameSize;
    config.jpeg_quality = cameraState.jpegQuality;
    config.fb_count = 2;                     // Double buffering
    config.grab_mode = CAMERA_GRAB_LATEST;   // Always get latest frame
    
    // Initialize camera
    esp_err_t err = esp_camera_init(&config);
    if (err != ESP_OK) {
        DEBUG_PRINTF("Camera: Init failed with error 0x%x\n", err);
        return false;
    }
    
    // Get camera sensor for additional configuration
    sensor_t* sensor = esp_camera_sensor_get();
    if (sensor) {
        // Optimize sensor settings for streaming
        sensor->set_brightness(sensor, cameraState.brightness);
        sensor->set_contrast(sensor, cameraState.contrast);
        sensor->set_saturation(sensor, 0);     // Normal saturation
        sensor->set_whitebal(sensor, 1);       // Enable white balance
        sensor->set_awb_gain(sensor, 1);       // Enable auto white balance gain
        sensor->set_wb_mode(sensor, 0);        // Auto white balance mode
        sensor->set_exposure_ctrl(sensor, 1);  // Enable exposure control
        sensor->set_aec2(sensor, 0);           // Disable AEC sensor
        sensor->set_ae_level(sensor, 0);       // Normal AE level
        sensor->set_aec_value(sensor, 300);    // Set AEC value
        sensor->set_gain_ctrl(sensor, 1);      // Enable gain control
        sensor->set_agc_gain(sensor, 0);       // Auto gain
        sensor->set_gainceiling(sensor, (gainceiling_t)0);  // Gain ceiling
        sensor->set_bpc(sensor, 0);            // Disable black pixel correction
        sensor->set_wpc(sensor, 1);            // Enable white pixel correction
        sensor->set_raw_gma(sensor, 1);        // Enable gamma correction
        sensor->set_lenc(sensor, 1);           // Enable lens correction
        sensor->set_hmirror(sensor, 0);        // Horizontal mirror
        sensor->set_vflip(sensor, 0);          // Vertical flip
        sensor->set_dcw(sensor, 1);            // Enable downsize
        sensor->set_colorbar(sensor, 0);       // Disable color bar
    }
    
    cameraState.cameraInitialized = true;
    DEBUG_PRINTLN("Camera: Initialized successfully");
    return true;
}

/**
 * @brief Capture and return camera frame
 * @return Camera frame buffer (caller must return it)
 */
camera_fb_t* captureFrame() {
    if (!cameraState.cameraInitialized) {
        return nullptr;
    }
    
    camera_fb_t* fb = esp_camera_fb_get();
    if (!fb) {
        cameraState.droppedFrames++;
        DEBUG_PRINTLN("Camera: Failed to capture frame");
        return nullptr;
    }
    
    cameraState.totalFrames++;
    cameraState.lastFrameTime = millis();
    
    return fb;
}

/**
 * @brief Update camera settings
 * @param quality JPEG quality (0-63)
 * @param frameSize Frame size
 */
void updateCameraSettings(int quality, framesize_t frameSize) {
    if (!cameraState.cameraInitialized) return;
    
    sensor_t* sensor = esp_camera_sensor_get();
    if (sensor) {
        if (quality != cameraState.jpegQuality) {
            sensor->set_quality(sensor, quality);
            cameraState.jpegQuality = quality;
        }
        
        if (frameSize != cameraState.frameSize) {
            sensor->set_framesize(sensor, frameSize);
            cameraState.frameSize = frameSize;
        }
    }
}

// ==========================================
// WIFI MANAGEMENT
// ==========================================

/**
 * @brief Initialize WiFi connection
 * @return true if connected
 */
bool initializeWiFi() {
    DEBUG_PRINTLN("WiFi: Initializing...");
    
    WiFi.mode(WIFI_STA);
    
    // Try each network
    for (int i = 0; i < numNetworks - 1; i++) { // Skip last (AP mode)
        DEBUG_PRINTF("WiFi: Trying %s...\n", networks[i].ssid);
        
        WiFi.begin(networks[i].ssid, networks[i].password);
        
        // Wait for connection
        int attempts = 0;
        while (WiFi.status() != WL_CONNECTED && attempts < 20) {
            delay(500);
            DEBUG_PRINT(".");
            attempts++;
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            cameraState.wifiConnected = true;
            cameraState.wifiSSID = networks[i].ssid;
            cameraState.apMode = false;
            
            DEBUG_PRINTF("\nWiFi: Connected to %s\n", networks[i].ssid);
            DEBUG_PRINTF("WiFi: IP address: %s\n", WiFi.localIP().toString().c_str());
            return true;
        }
        
        DEBUG_PRINTLN("\nWiFi: Connection failed, trying next...");
        WiFi.disconnect();
    }
    
    // If all networks failed, start AP mode
    DEBUG_PRINTLN("WiFi: Starting AP mode...");
    return startAPMode();
}

/**
 * @brief Start Access Point mode
 * @return true if successful
 */
bool startAPMode() {
    String apSSID = "ESP32-CAM-" + cameraState.deviceId;
    String apPassword = "cam12345";
    
    WiFi.mode(WIFI_AP);
    bool success = WiFi.softAP(apSSID.c_str(), apPassword.c_str());
    
    if (success) {
        cameraState.wifiConnected = true;
        cameraState.apMode = true;
        cameraState.wifiSSID = apSSID;
        
        DEBUG_PRINTF("WiFi: AP started - SSID: %s\n", apSSID.c_str());
        DEBUG_PRINTF("WiFi: AP IP: %s\n", WiFi.softAPIP().toString().c_str());
        return true;
    }
    
    DEBUG_PRINTLN("WiFi: Failed to start AP mode");
    return false;
}

// ==========================================
// HTTP STREAMING SERVER
// ==========================================

/**
 * @brief HTTP handler for video stream
 */
static esp_err_t streamHandler(httpd_req_t *req) {
    camera_fb_t * fb = NULL;
    esp_err_t res = ESP_OK;
    size_t _jpg_buf_len = 0;
    uint8_t * _jpg_buf = NULL;
    char * part_buf[64];
    
    DEBUG_PRINTLN("Stream: Client connected");
    cameraState.activeClients++;
    cameraState.streamingActive = true;
    
    // Set response headers
    res = httpd_resp_set_type(req, STREAM_CONTENT_TYPE);
    if (res != ESP_OK) {
        cameraState.activeClients--;
        return res;
    }
    
    // Streaming loop
    while (true) {
        fb = captureFrame();
        if (!fb) {
            DEBUG_PRINTLN("Stream: Frame capture failed");
            res = ESP_FAIL;
            break;
        }
        
        _jpg_buf_len = fb->len;
        _jpg_buf = fb->buf;
        
        // Send boundary
        size_t hlen = snprintf((char *)part_buf, 64, STREAM_PART, _jpg_buf_len);
        res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
        if (res != ESP_OK) {
            esp_camera_fb_return(fb);
            break;
        }
        
        // Send frame data
        res = httpd_resp_send_chunk(req, (const char *)_jpg_buf, _jpg_buf_len);
        if (res != ESP_OK) {
            esp_camera_fb_return(fb);
            break;
        }
        
        // Send boundary end
        res = httpd_resp_send_chunk(req, STREAM_BOUNDARY, strlen(STREAM_BOUNDARY));
        if (res != ESP_OK) {
            esp_camera_fb_return(fb);
            break;
        }
        
        esp_camera_fb_return(fb);
        
        // Small delay to prevent overwhelming
        delay(33); // ~30 FPS max
    }
    
    DEBUG_PRINTLN("Stream: Client disconnected");
    cameraState.activeClients--;
    if (cameraState.activeClients <= 0) {
        cameraState.streamingActive = false;
    }
    
    return res;
}

/**
 * @brief HTTP handler for single image capture
 */
static esp_err_t captureHandler(httpd_req_t *req) {
    camera_fb_t * fb = captureFrame();
    if (!fb) {
        httpd_resp_send_500(req);
        return ESP_FAIL;
    }
    
    httpd_resp_set_type(req, "image/jpeg");
    httpd_resp_set_hdr(req, "Content-Disposition", "inline; filename=capture.jpg");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    
    esp_err_t res = httpd_resp_send(req, (const char *)fb->buf, fb->len);
    esp_camera_fb_return(fb);
    
    return res;
}

/**
 * @brief HTTP handler for status API
 */
static esp_err_t statusHandler(httpd_req_t *req) {
    DynamicJsonDocument doc(1024);
    
    doc["camera"]["initialized"] = cameraState.cameraInitialized;
    doc["camera"]["streaming"] = cameraState.streamingActive;
    doc["camera"]["activeClients"] = cameraState.activeClients;
    doc["camera"]["totalFrames"] = cameraState.totalFrames;
    doc["camera"]["droppedFrames"] = cameraState.droppedFrames;
    doc["camera"]["frameSize"] = (int)cameraState.frameSize;
    doc["camera"]["quality"] = cameraState.jpegQuality;
    
    doc["system"]["deviceId"] = cameraState.deviceId;
    doc["system"]["location"] = cameraState.location;
    doc["system"]["uptime"] = millis();
    doc["system"]["freeHeap"] = ESP.getFreeHeap();
    
    doc["network"]["wifiConnected"] = cameraState.wifiConnected;
    doc["network"]["ssid"] = cameraState.wifiSSID;
    doc["network"]["apMode"] = cameraState.apMode;
    doc["network"]["bleEnabled"] = cameraState.bleEnabled;
    
    String response;
    serializeJson(doc, response);
    
    httpd_resp_set_type(req, "application/json");
    httpd_resp_set_hdr(req, "Access-Control-Allow-Origin", "*");
    return httpd_resp_sendstr(req, response.c_str());
}

/**
 * @brief Initialize HTTP server
 */
bool initializeHTTPServer() {
    if (!cameraState.wifiConnected) return false;
    
    DEBUG_PRINTLN("HTTP: Initializing server...");
    
    httpd_config_t config = HTTPD_DEFAULT_CONFIG();
    config.server_port = 80;
    config.ctrl_port = 32768;
    config.max_open_sockets = 7;
    config.max_uri_handlers = 8;
    config.max_resp_headers = 8;
    config.stack_size = 8192;
    
    // Start the HTTP server
    if (httpd_start(&cameraServer, &config) == ESP_OK) {
        // Register URI handlers
        httpd_uri_t stream_uri = {
            .uri       = "/stream",
            .method    = HTTP_GET,
            .handler   = streamHandler,
            .user_ctx  = NULL
        };
        httpd_register_uri_handler(cameraServer, &stream_uri);
        
        httpd_uri_t capture_uri = {
            .uri       = "/capture",
            .method    = HTTP_GET,
            .handler   = captureHandler,
            .user_ctx  = NULL
        };
        httpd_register_uri_handler(cameraServer, &capture_uri);
        
        httpd_uri_t status_uri = {
            .uri       = "/status",
            .method    = HTTP_GET,
            .handler   = statusHandler,
            .user_ctx  = NULL
        };
        httpd_register_uri_handler(cameraServer, &status_uri);
        
        DEBUG_PRINTLN("HTTP: Server started successfully");
        return true;
    }
    
    DEBUG_PRINTLN("HTTP: Failed to start server");
    return false;
}

// ==========================================
// BLE BEACON MANAGEMENT
// ==========================================

/**
 * @brief Initialize BLE beacon
 * @return true if successful
 */
bool initializeBLE() {
    DEBUG_PRINTLN("BLE: Initializing beacon...");
    
    try {
        // Generate beacon name
        cameraState.beaconName = "PetZone-Camera-" + cameraState.location + "-" + cameraState.deviceId;
        
        // Initialize BLE device
        BLEDevice::init(cameraState.beaconName.c_str());
        
        // Create BLE server
        pBLEServer = BLEDevice::createServer();
        if (!pBLEServer) {
            DEBUG_PRINTLN("BLE: Failed to create server");
            return false;
        }
        
        // Get advertising object
        pAdvertising = BLEDevice::getAdvertising();
        if (!pAdvertising) {
            DEBUG_PRINTLN("BLE: Failed to get advertising");
            return false;
        }
        
        // Configure advertising
        pAdvertising->addServiceUUID("12345678-1234-1234-1234-123456789abc");
        pAdvertising->setScanResponse(false);
        pAdvertising->setMinPreferred(0x0);
        
        // Start advertising
        BLEDevice::startAdvertising();
        
        cameraState.bleEnabled = true;
        DEBUG_PRINTF("BLE: Beacon started - Name: %s\n", cameraState.beaconName.c_str());
        return true;
        
    } catch (const std::exception& e) {
        DEBUG_PRINTF("BLE: Initialization failed: %s\n", e.what());
        return false;
    }
}

// ==========================================
// MAIN SETUP AND LOOP
// ==========================================

void setup() {
    // Initialize serial
    Serial.begin(115200);
    DEBUG_PRINTLN("========================================");
    DEBUG_PRINTLN("  Pet Camera v3.0 - Starting Up");
    DEBUG_PRINTLN("========================================");
    
    // Initialize hardware pins
    pinMode(FLASH_LED_PIN, OUTPUT);
    pinMode(BUTTON_PIN, INPUT_PULLUP);
    digitalWrite(FLASH_LED_PIN, LOW);
    
    // Initialize preferences
    preferences.begin("petcamera", false);
    
    // Load configuration
    cameraState.deviceId = preferences.getString("deviceId", "CAM001");
    cameraState.location = preferences.getString("location", "Home");
    cameraState.jpegQuality = preferences.getInt("quality", 12);
    cameraState.frameSize = (framesize_t)preferences.getInt("frameSize", FRAMESIZE_VGA);
    
    // Initialize camera
    if (!initializeCamera()) {
        DEBUG_PRINTLN("FATAL: Camera initialization failed!");
        while(1) delay(1000);
    }
    
    // Initialize WiFi
    if (!initializeWiFi()) {
        DEBUG_PRINTLN("WARNING: WiFi initialization failed!");
    }
    
    // Initialize HTTP server
    if (cameraState.wifiConnected) {
        initializeHTTPServer();
    }
    
    // Initialize BLE beacon
    initializeBLE();
    
    // Startup complete
    DEBUG_PRINTLN("========================================");
    DEBUG_PRINTLN("  Pet Camera v3.0 - Ready!");
    DEBUG_PRINTF("  Device ID: %s\n", cameraState.deviceId.c_str());
    DEBUG_PRINTF("  Location: %s\n", cameraState.location.c_str());
    if (cameraState.wifiConnected) {
        if (cameraState.apMode) {
            DEBUG_PRINTF("  AP Mode: %s\n", cameraState.wifiSSID.c_str());
            DEBUG_PRINTF("  AP IP: %s\n", WiFi.softAPIP().toString().c_str());
        } else {
            DEBUG_PRINTF("  WiFi: %s\n", cameraState.wifiSSID.c_str());
            DEBUG_PRINTF("  IP: %s\n", WiFi.localIP().toString().c_str());
        }
        DEBUG_PRINTLN("  Stream: http://[IP]/stream");
        DEBUG_PRINTLN("  Capture: http://[IP]/capture");
        DEBUG_PRINTLN("  Status: http://[IP]/status");
    }
    DEBUG_PRINTF("  BLE Beacon: %s\n", cameraState.beaconName.c_str());
    DEBUG_PRINTLN("========================================");
    
    // Flash LED to indicate ready
    for (int i = 0; i < 3; i++) {
        digitalWrite(FLASH_LED_PIN, HIGH);
        delay(200);
        digitalWrite(FLASH_LED_PIN, LOW);
        delay(200);
    }
}

void loop() {
    // Update FPS calculation
    static unsigned long lastFPSUpdate = 0;
    static int frameCount = 0;
    
    if (millis() - lastFPSUpdate > 1000) {
        cameraState.currentFPS = frameCount;
        frameCount = 0;
        lastFPSUpdate = millis();
    }
    
    // Handle button press (toggle flash LED)
    static bool lastButtonState = true;
    bool currentButtonState = digitalRead(BUTTON_PIN);
    
    if (lastButtonState && !currentButtonState) { // Button pressed
        static bool flashState = false;
        flashState = !flashState;
        digitalWrite(FLASH_LED_PIN, flashState ? HIGH : LOW);
        DEBUG_PRINTF("Flash LED: %s\n", flashState ? "ON" : "OFF");
        delay(50); // Debounce
    }
    lastButtonState = currentButtonState;
    
    // Periodic status update
    static unsigned long lastStatusUpdate = 0;
    if (millis() - lastStatusUpdate > 30000) { // Every 30 seconds
        DEBUG_PRINTF("Status - Streaming: %s, Clients: %d, Frames: %lu, Dropped: %lu, FPS: %d\n",
                     cameraState.streamingActive ? "YES" : "NO",
                     cameraState.activeClients,
                     cameraState.totalFrames,
                     cameraState.droppedFrames,
                     cameraState.currentFPS);
        lastStatusUpdate = millis();
    }
    
    delay(100);
} 