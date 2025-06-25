/**
 * @file CameraOnly_Refactored.ino
 * @brief ESP32-CAM Camera-Only Firmware - Refactored
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Optimized camera-only firmware for ESP32-CAM modules in the pet collar system.
 * Provides high-quality video streaming with minimal resource usage and enhanced
 * stability for continuous operation.
 * 
 * Features:
 * - Optimized camera settings for pet monitoring
 * - Low-power operation modes
 * - Automatic quality adjustment
 * - Web-based streaming interface
 * - Remote configuration capabilities
 * - Status monitoring and diagnostics
 */

// ==========================================
// INCLUDES AND DEPENDENCIES
// ==========================================

#include "esp_camera.h"
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>
#include <ESPAsyncWebServer.h>
#include <AsyncTCP.h>
#include "../common/include/PetCollarConfig.h"
#include "../common/include/SystemStateManager.h"
#include "../common/include/WiFiManager.h"
#include "../common/include/Utils.h"

// ==========================================
// CAMERA CONFIGURATION
// ==========================================

// Camera model selection (AI-Thinker ESP32-CAM)
#define CAMERA_MODEL_AI_THINKER
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

// Camera settings
#define CAMERA_FRAME_SIZE  FRAMESIZE_SVGA  // 800x600 default
#define CAMERA_QUALITY     10              // 0-63, lower is better quality
#define CAMERA_BRIGHTNESS  0               // -2 to 2
#define CAMERA_CONTRAST    0               // -2 to 2
#define CAMERA_SATURATION  0               // -2 to 2

// LED Flash pin
#define FLASH_LED_PIN     4

// ==========================================
// GLOBAL VARIABLES
// ==========================================

// Core system components
SystemStateManager systemState;
WiFiManager wifiManager;
AsyncWebServer server(80);
AsyncWebSocket ws("/ws");

// Camera state
camera_config_t cameraConfig;
bool cameraInitialized = false;
bool streamingActive = false;
unsigned long lastFrameTime = 0;
int activeConnections = 0;

// Performance monitoring
struct CameraStats {
  unsigned long totalFrames;
  unsigned long droppedFrames;
  float averageFPS;
  unsigned long lastStatsUpdate;
  size_t averageFrameSize;
  unsigned long streamStartTime;
};

CameraStats stats = {0, 0, 0.0, 0, 0, 0};

// Configuration
struct CameraSettings {
  framesize_t frameSize;
  int quality;
  int brightness;
  int contrast;
  int saturation;
  bool autoExposure;
  bool autoWhiteBalance;
  bool flashEnabled;
  int streamPort;
  String streamPath;
};

CameraSettings settings = {
  CAMERA_FRAME_SIZE,
  CAMERA_QUALITY,
  CAMERA_BRIGHTNESS,
  CAMERA_CONTRAST,
  CAMERA_SATURATION,
  true,   // autoExposure
  true,   // autoWhiteBalance
  false,  // flashEnabled
  80,     // streamPort
  "/stream"
};

// ==========================================
// SETUP FUNCTION
// ==========================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  printBanner();
  
  // Initialize system components
  if (!initializeSystem()) {
    Serial.println("❌ System initialization failed");
    ESP.restart();
  }
  
  // Initialize camera
  if (!initializeCamera()) {
    Serial.println("❌ Camera initialization failed");
    ESP.restart();
  }
  
  // Initialize network
  if (!initializeNetwork()) {
    Serial.println("❌ Network initialization failed");
    // Continue without network for now
  }
  
  // Initialize web server
  initializeWebServer();
  
  Serial.println("✅ Camera system ready!");
  printSystemInfo();
}

// ==========================================
// MAIN LOOP
// ==========================================

void loop() {
  // Update system components
  systemState.update();
  wifiManager.update();
  
  // Handle WebSocket connections
  ws.cleanupClients();
  
  // Monitor performance
  updatePerformanceStats();
  
  // Handle power management
  handlePowerManagement();
  
  delay(100); // Small delay for stability
}

// ==========================================
// INITIALIZATION FUNCTIONS
// ==========================================

/**
 * @brief Print startup banner
 */
void printBanner() {
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║      ESP32-CAM Pet Monitor v3.0       ║");
  Serial.println("║         Camera-Only Edition           ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
}

/**
 * @brief Initialize core system
 */
bool initializeSystem() {
  Serial.println("🔧 Initializing system...");
  
  // Initialize system state manager
  if (!systemState.begin()) {
    Serial.println("❌ Failed to initialize system state");
    return false;
  }
  
  // Configure flash LED
  pinMode(FLASH_LED_PIN, OUTPUT);
  digitalWrite(FLASH_LED_PIN, LOW);
  
  Serial.println("✅ System initialization complete");
  return true;
}

/**
 * @brief Initialize camera
 */
bool initializeCamera() {
  Serial.println("📷 Initializing camera...");
  
  // Configure camera
  cameraConfig.ledc_channel = LEDC_CHANNEL_0;
  cameraConfig.ledc_timer = LEDC_TIMER_0;
  cameraConfig.pin_d0 = Y2_GPIO_NUM;
  cameraConfig.pin_d1 = Y3_GPIO_NUM;
  cameraConfig.pin_d2 = Y4_GPIO_NUM;
  cameraConfig.pin_d3 = Y5_GPIO_NUM;
  cameraConfig.pin_d4 = Y6_GPIO_NUM;
  cameraConfig.pin_d5 = Y7_GPIO_NUM;
  cameraConfig.pin_d6 = Y8_GPIO_NUM;
  cameraConfig.pin_d7 = Y9_GPIO_NUM;
  cameraConfig.pin_xclk = XCLK_GPIO_NUM;
  cameraConfig.pin_pclk = PCLK_GPIO_NUM;
  cameraConfig.pin_vsync = VSYNC_GPIO_NUM;
  cameraConfig.pin_href = HREF_GPIO_NUM;
  cameraConfig.pin_sscb_sda = SIOD_GPIO_NUM;
  cameraConfig.pin_sscb_scl = SIOC_GPIO_NUM;
  cameraConfig.pin_pwdn = PWDN_GPIO_NUM;
  cameraConfig.pin_reset = RESET_GPIO_NUM;
  cameraConfig.xclk_freq_hz = 20000000;
  cameraConfig.pixel_format = PIXFORMAT_JPEG;
  
  // Frame size and quality based on PSRAM availability
  if (psramFound()) {
    cameraConfig.frame_size = settings.frameSize;
    cameraConfig.jpeg_quality = settings.quality;
    cameraConfig.fb_count = 2;
    Serial.println("📦 PSRAM detected - High quality mode");
  } else {
    cameraConfig.frame_size = FRAMESIZE_CIF;
    cameraConfig.jpeg_quality = 12;
    cameraConfig.fb_count = 1;
    Serial.println("⚠️ No PSRAM - Limited quality mode");
  }
  
  // Initialize camera
  esp_err_t err = esp_camera_init(&cameraConfig);
  if (err != ESP_OK) {
    Serial.printf("❌ Camera init failed with error 0x%x\n", err);
    return false;
  }
  
  // Configure camera sensor
  configureCameraSensor();
  
  cameraInitialized = true;
  Serial.println("✅ Camera initialized successfully");
  return true;
}

/**
 * @brief Configure camera sensor settings
 */
void configureCameraSensor() {
  sensor_t* sensor = esp_camera_sensor_get();
  if (!sensor) return;
  
  // Apply settings
  sensor->set_brightness(sensor, settings.brightness);
  sensor->set_contrast(sensor, settings.contrast);
  sensor->set_saturation(sensor, settings.saturation);
  sensor->set_exposure_ctrl(sensor, settings.autoExposure);
  sensor->set_whitebal(sensor, settings.autoWhiteBalance);
  sensor->set_awb_gain(sensor, settings.autoWhiteBalance);
  sensor->set_wb_mode(sensor, 0); // Auto white balance mode
  
  // Additional optimizations for pet monitoring
  sensor->set_special_effect(sensor, 0); // No special effects
  sensor->set_lenc(sensor, 1);           // Enable lens correction
  sensor->set_hmirror(sensor, 0);        // No horizontal mirror
  sensor->set_vflip(sensor, 0);          // No vertical flip
  
  Serial.println("📹 Camera sensor configured");
}

/**
 * @brief Initialize network connection
 */
bool initializeNetwork() {
  Serial.println("🌐 Initializing network...");
  
  // Initialize WiFi manager
  if (!wifiManager.begin("PetCam")) {
    Serial.println("❌ WiFi manager initialization failed");
    return false;
  }
  
  // Set WiFi callbacks
  wifiManager.onStateChange([](WiFiState state) {
    switch (state) {
      case WIFI_STATE_CONNECTED:
        Serial.printf("✅ WiFi connected: %s\n", WiFi.localIP().toString().c_str());
        break;
      case WIFI_STATE_DISCONNECTED:
        Serial.println("❌ WiFi disconnected");
        break;
      case WIFI_STATE_PORTAL_ACTIVE:
        Serial.printf("🔧 Configuration portal active: %s\n", WiFi.softAPIP().toString().c_str());
        break;
      default:
        break;
    }
  });
  
  // Try to connect to saved networks
  if (!wifiManager.attemptConnection()) {
    Serial.println("⚠️ No saved networks - starting configuration portal");
    wifiManager.startPortal();
  }
  
  return true;
}

/**
 * @brief Initialize web server and endpoints
 */
void initializeWebServer() {
  Serial.println("🌐 Initializing web server...");
  
  // Serve main camera interface
  server.on("/", HTTP_GET, [](AsyncWebServerRequest* request) {
    request->send_P(200, "text/html", generateCameraHTML().c_str());
  });
  
  // Camera stream endpoint
  server.on("/stream", HTTP_GET, handleCameraStream);
  
  // API endpoints
  server.on("/api/status", HTTP_GET, handleStatusAPI);
  server.on("/api/settings", HTTP_GET, handleGetSettings);
  server.on("/api/settings", HTTP_POST, handleSetSettings);
  server.on("/api/capture", HTTP_GET, handleCapture);
  server.on("/api/stats", HTTP_GET, handleStatsAPI);
  
  // WebSocket for real-time communication
  ws.onEvent(onWebSocketEvent);
  server.addHandler(&ws);
  
  // Start server
  server.begin();
  Serial.println("✅ Web server started");
}

// ==========================================
// WEB SERVER HANDLERS
// ==========================================

/**
 * @brief Handle camera stream requests
 */
void handleCameraStream(AsyncWebServerRequest* request) {
  if (!cameraInitialized) {
    request->send(503, "text/plain", "Camera not initialized");
    return;
  }
  
  AsyncWebServerResponse* response = request->beginChunkedResponse(
    "multipart/x-mixed-replace; boundary=frame",
    [](uint8_t* buffer, size_t maxLen, size_t index) -> size_t {
      return generateStreamFrame(buffer, maxLen, index);
    }
  );
  
  response->addHeader("Access-Control-Allow-Origin", "*");
  request->send(response);
  
  streamingActive = true;
  activeConnections++;
  stats.streamStartTime = millis();
  
  Serial.printf("📺 Stream started, active connections: %d\n", activeConnections);
}

/**
 * @brief Generate stream frame data
 */
size_t generateStreamFrame(uint8_t* buffer, size_t maxLen, size_t index) {
  static camera_fb_t* fb = nullptr;
  static size_t frameIndex = 0;
  
  if (index == 0) {
    // Capture new frame
    if (fb) {
      esp_camera_fb_return(fb);
      fb = nullptr;
    }
    
    fb = esp_camera_fb_get();
    if (!fb) {
      stats.droppedFrames++;
      return 0;
    }
    
    stats.totalFrames++;
    stats.averageFrameSize = (stats.averageFrameSize + fb->len) / 2;
    frameIndex = 0;
    
    // Flash LED if enabled
    if (settings.flashEnabled) {
      digitalWrite(FLASH_LED_PIN, HIGH);
      delay(10);
      digitalWrite(FLASH_LED_PIN, LOW);
    }
  }
  
  if (!fb) return 0;
  
  // Send frame header
  if (index == 0) {
    String header = "\r\n--frame\r\n";
    header += "Content-Type: image/jpeg\r\n";
    header += "Content-Length: " + String(fb->len) + "\r\n\r\n";
    
    size_t headerLen = header.length();
    if (headerLen <= maxLen) {
      memcpy(buffer, header.c_str(), headerLen);
      return headerLen;
    }
  }
  
  // Send frame data
  size_t headerOffset = 47; // Approximate header size
  if (index >= headerOffset) {
    size_t dataIndex = index - headerOffset;
    if (dataIndex < fb->len) {
      size_t copyLen = min(maxLen, fb->len - dataIndex);
      memcpy(buffer, fb->buf + dataIndex, copyLen);
      return copyLen;
    }
  }
  
  return 0;
}

/**
 * @brief Handle status API requests
 */
void handleStatusAPI(AsyncWebServerRequest* request) {
  DynamicJsonDocument doc(1024);
  
  doc["camera_initialized"] = cameraInitialized;
  doc["streaming_active"] = streamingActive;
  doc["active_connections"] = activeConnections;
  doc["total_frames"] = stats.totalFrames;
  doc["dropped_frames"] = stats.droppedFrames;
  doc["average_fps"] = stats.averageFPS;
  doc["average_frame_size"] = stats.averageFrameSize;
  doc["uptime"] = millis() / 1000;
  
  // System information
  doc["free_heap"] = ESP.getFreeHeap();
  doc["psram_found"] = psramFound();
  doc["wifi_connected"] = wifiManager.isConnected();
  
  if (wifiManager.isConnected()) {
    doc["ip_address"] = WiFi.localIP().toString();
    doc["wifi_rssi"] = WiFi.RSSI();
  }
  
  String response;
  serializeJson(doc, response);
  request->send(200, "application/json", response);
}

/**
 * @brief Handle get settings API
 */
void handleGetSettings(AsyncWebServerRequest* request) {
  DynamicJsonDocument doc(512);
  
  doc["frame_size"] = (int)settings.frameSize;
  doc["quality"] = settings.quality;
  doc["brightness"] = settings.brightness;
  doc["contrast"] = settings.contrast;
  doc["saturation"] = settings.saturation;
  doc["auto_exposure"] = settings.autoExposure;
  doc["auto_white_balance"] = settings.autoWhiteBalance;
  doc["flash_enabled"] = settings.flashEnabled;
  
  String response;
  serializeJson(doc, response);
  request->send(200, "application/json", response);
}

/**
 * @brief Handle set settings API
 */
void handleSetSettings(AsyncWebServerRequest* request) {
  if (!request->hasParam("data", true)) {
    request->send(400, "text/plain", "Missing settings data");
    return;
  }
  
  String data = request->getParam("data", true)->value();
  DynamicJsonDocument doc(512);
  
  DeserializationError error = deserializeJson(doc, data);
  if (error) {
    request->send(400, "text/plain", "Invalid JSON");
    return;
  }
  
  // Update settings
  if (doc.containsKey("quality")) {
    settings.quality = constrain(doc["quality"], 0, 63);
  }
  if (doc.containsKey("brightness")) {
    settings.brightness = constrain(doc["brightness"], -2, 2);
  }
  if (doc.containsKey("contrast")) {
    settings.contrast = constrain(doc["contrast"], -2, 2);
  }
  if (doc.containsKey("saturation")) {
    settings.saturation = constrain(doc["saturation"], -2, 2);
  }
  if (doc.containsKey("flash_enabled")) {
    settings.flashEnabled = doc["flash_enabled"];
  }
  
  // Apply settings to camera
  configureCameraSensor();
  
  request->send(200, "text/plain", "Settings updated");
}

/**
 * @brief Handle single image capture
 */
void handleCapture(AsyncWebServerRequest* request) {
  if (!cameraInitialized) {
    request->send(503, "text/plain", "Camera not initialized");
    return;
  }
  
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    request->send(500, "text/plain", "Camera capture failed");
    return;
  }
  
  // Flash if enabled
  if (settings.flashEnabled) {
    digitalWrite(FLASH_LED_PIN, HIGH);
    delay(10);
    digitalWrite(FLASH_LED_PIN, LOW);
  }
  
  AsyncWebServerResponse* response = request->beginResponse_P(
    200, "image/jpeg", fb->buf, fb->len
  );
  response->addHeader("Content-Disposition", "attachment; filename=capture.jpg");
  request->send(response);
  
  esp_camera_fb_return(fb);
}

/**
 * @brief Handle statistics API
 */
void handleStatsAPI(AsyncWebServerRequest* request) {
  DynamicJsonDocument doc(1024);
  
  doc["total_frames"] = stats.totalFrames;
  doc["dropped_frames"] = stats.droppedFrames;
  doc["success_rate"] = stats.totalFrames > 0 ? 
    (float)(stats.totalFrames - stats.droppedFrames) / stats.totalFrames * 100 : 0;
  doc["average_fps"] = stats.averageFPS;
  doc["average_frame_size"] = stats.averageFrameSize;
  doc["stream_uptime"] = stats.streamStartTime > 0 ? 
    (millis() - stats.streamStartTime) / 1000 : 0;
  
  String response;
  serializeJson(doc, response);
  request->send(200, "application/json", response);
}

// ==========================================
// WEBSOCKET HANDLING
// ==========================================

/**
 * @brief Handle WebSocket events
 */
void onWebSocketEvent(AsyncWebSocket* server, AsyncWebSocketClient* client,
                     AwsEventType type, void* arg, uint8_t* data, size_t len) {
  switch (type) {
    case WS_EVT_CONNECT:
      Serial.printf("🔌 WebSocket client connected: %u\n", client->id());
      activeConnections++;
      break;
      
    case WS_EVT_DISCONNECT:
      Serial.printf("🔌 WebSocket client disconnected: %u\n", client->id());
      activeConnections--;
      if (activeConnections <= 0) {
        streamingActive = false;
        activeConnections = 0;
      }
      break;
      
    case WS_EVT_DATA:
      handleWebSocketMessage(client, (char*)data, len);
      break;
      
    default:
      break;
  }
}

/**
 * @brief Handle WebSocket messages
 */
void handleWebSocketMessage(AsyncWebSocketClient* client, const char* message, size_t length) {
  DynamicJsonDocument doc(256);
  DeserializationError error = deserializeJson(doc, message, length);
  
  if (error) return;
  
  String command = doc["command"];
  
  if (command == "get_status") {
    sendWebSocketStatus(client);
  } else if (command == "set_flash") {
    settings.flashEnabled = doc["enabled"];
    DynamicJsonDocument response(128);
    response["type"] = "flash_updated";
    response["enabled"] = settings.flashEnabled;
    String responseStr;
    serializeJson(response, responseStr);
    client->text(responseStr);
  }
}

/**
 * @brief Send status via WebSocket
 */
void sendWebSocketStatus(AsyncWebSocketClient* client) {
  DynamicJsonDocument doc(512);
  doc["type"] = "status";
  doc["streaming"] = streamingActive;
  doc["connections"] = activeConnections;
  doc["fps"] = stats.averageFPS;
  doc["frames"] = stats.totalFrames;
  doc["quality"] = settings.quality;
  
  String response;
  serializeJson(doc, response);
  client->text(response);
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * @brief Update performance statistics
 */
void updatePerformanceStats() {
  unsigned long currentTime = millis();
  
  if (currentTime - stats.lastStatsUpdate >= 5000) { // Update every 5 seconds
    if (stats.totalFrames > 0 && stats.streamStartTime > 0) {
      unsigned long streamDuration = (currentTime - stats.streamStartTime) / 1000;
      if (streamDuration > 0) {
        stats.averageFPS = (float)stats.totalFrames / streamDuration;
      }
    }
    
    stats.lastStatsUpdate = currentTime;
    
    // Send stats via WebSocket if connected
    if (ws.count() > 0) {
      DynamicJsonDocument doc(256);
      doc["type"] = "stats_update";
      doc["fps"] = stats.averageFPS;
      doc["total_frames"] = stats.totalFrames;
      doc["dropped_frames"] = stats.droppedFrames;
      
      String statsMsg;
      serializeJson(doc, statsMsg);
      ws.textAll(statsMsg);
    }
  }
}

/**
 * @brief Handle power management
 */
void handlePowerManagement() {
  // Reduce frame rate when no active connections
  if (activeConnections == 0 && streamingActive) {
    // Stop streaming after 5 minutes of no connections
    if (millis() - stats.streamStartTime > 300000) {
      streamingActive = false;
      Serial.println("🔋 Stopping stream due to inactivity");
    }
  }
}

/**
 * @brief Print system information
 */
void printSystemInfo() {
  Serial.println("📊 System Information:");
  Serial.println("─────────────────────");
  Serial.printf("Chip Model: %s\n", ESP.getChipModel());
  Serial.printf("Free Heap: %d KB\n", ESP.getFreeHeap() / 1024);
  Serial.printf("PSRAM: %s\n", psramFound() ? "Available" : "Not found");
  
  if (wifiManager.isConnected()) {
    Serial.printf("WiFi: Connected (%s)\n", WiFi.localIP().toString().c_str());
    Serial.printf("Camera Stream: http://%s/stream\n", WiFi.localIP().toString().c_str());
    Serial.printf("Web Interface: http://%s/\n", WiFi.localIP().toString().c_str());
  } else if (wifiManager.isPortalActive()) {
    Serial.printf("Config Portal: http://%s/\n", WiFi.softAPIP().toString().c_str());
  } else {
    Serial.println("WiFi: Not connected");
  }
  
  Serial.println("─────────────────────");
}

/**
 * @brief Generate camera interface HTML
 */
String generateCameraHTML() {
  return R"html(
<!DOCTYPE html>
<html>
<head>
    <title>Pet Camera Monitor</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial; margin: 20px; background: #f0f0f0; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
        h1 { color: #333; text-align: center; }
        .camera-stream { width: 100%; max-width: 640px; border: 2px solid #ddd; border-radius: 5px; }
        .controls { margin: 20px 0; text-align: center; }
        button { padding: 10px 20px; margin: 5px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer; }
        button:hover { background: #45a049; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; margin: 20px 0; }
        .stat-card { background: #f9f9f9; padding: 15px; border-radius: 5px; text-align: center; }
        .status { padding: 10px; margin: 10px 0; border-radius: 5px; text-align: center; }
        .online { background: #d4edda; color: #155724; }
        .offline { background: #f8d7da; color: #721c24; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🐕 Pet Camera Monitor</h1>
        
        <div id="status" class="status offline">Camera Offline</div>
        
        <div style="text-align: center;">
            <img id="stream" class="camera-stream" src="/stream" style="display: none;" 
                 onload="this.style.display='block'; updateStatus('online')"
                 onerror="this.style.display='none'; updateStatus('offline')">
        </div>
        
        <div class="controls">
            <button onclick="capturePhoto()">📸 Capture Photo</button>
            <button onclick="toggleFlash()">💡 Toggle Flash</button>
            <button onclick="refreshStream()">🔄 Refresh</button>
        </div>
        
        <div class="stats">
            <div class="stat-card">
                <strong>FPS</strong><br>
                <span id="fps">-</span>
            </div>
            <div class="stat-card">
                <strong>Connections</strong><br>
                <span id="connections">-</span>
            </div>
            <div class="stat-card">
                <strong>Total Frames</strong><br>
                <span id="frames">-</span>
            </div>
            <div class="stat-card">
                <strong>Quality</strong><br>
                <span id="quality">-</span>
            </div>
        </div>
    </div>

    <script>
        let ws;
        let flashEnabled = false;

        function connectWebSocket() {
            const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(protocol + '//' + location.host + '/ws');
            
            ws.onopen = function() {
                console.log('WebSocket connected');
                requestStatus();
            };
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                if (data.type === 'status' || data.type === 'stats_update') {
                    updateStats(data);
                }
            };
            
            ws.onclose = function() {
                console.log('WebSocket disconnected');
                setTimeout(connectWebSocket, 5000);
            };
        }

        function requestStatus() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({command: 'get_status'}));
            }
        }

        function updateStats(data) {
            document.getElementById('fps').textContent = data.fps ? data.fps.toFixed(1) : '-';
            document.getElementById('connections').textContent = data.connections || 0;
            document.getElementById('frames').textContent = data.frames || 0;
            document.getElementById('quality').textContent = data.quality || '-';
        }

        function updateStatus(status) {
            const statusEl = document.getElementById('status');
            if (status === 'online') {
                statusEl.textContent = '✅ Camera Online';
                statusEl.className = 'status online';
            } else {
                statusEl.textContent = '❌ Camera Offline';
                statusEl.className = 'status offline';
            }
        }

        function capturePhoto() {
            window.open('/api/capture', '_blank');
        }

        function toggleFlash() {
            flashEnabled = !flashEnabled;
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    command: 'set_flash',
                    enabled: flashEnabled
                }));
            }
        }

        function refreshStream() {
            const stream = document.getElementById('stream');
            stream.src = '/stream?' + new Date().getTime();
        }

        // Initialize
        connectWebSocket();
        setInterval(requestStatus, 5000);
    </script>
</body>
</html>
)html";
}
