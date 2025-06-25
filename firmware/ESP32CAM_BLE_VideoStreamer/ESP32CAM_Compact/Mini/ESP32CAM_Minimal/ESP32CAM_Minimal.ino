/*
 * Minimal ESP32-CAM BLE Beacon
 * Ultra-compact version for memory-constrained compilation
 * 
 * Core Features Only:
 * - BLE beacon (PetZone compatible)
 * - Basic camera streaming
 * - Minimal configuration
 */

#include <BLEDevice.h>
#include <BLEAdvertising.h>
#include <Preferences.h>
#include "esp_camera.h"
#include <WiFi.h>
#include "esp_http_server.h"
#include "soc/soc.h"
#include "soc/rtc_cntl_reg.h"

// Camera pins for AI-Thinker ESP32-CAM
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

#define LED_PIN 4

// Minimal config
const char* ssid = "ESP32CAM";
const char* password = "12345678";
String deviceName = "PetZone-Home-CAM01";
bool cameraOK = false;
int clients = 0;

BLEAdvertising* pAdv = nullptr;
httpd_handle_t server = NULL;

// Minimal metadata
struct MinMeta {
  uint8_t ver;
  uint8_t id;
  uint8_t bat;
  uint8_t cam;
} __attribute__((packed));

void setup() {
  Serial.begin(115200);
  WRITE_PERI_REG(RTC_CNTL_BROWN_OUT_REG, 0);
  pinMode(LED_PIN, OUTPUT);
  
  Serial.println("Starting...");
  
  initCam();
  initWiFi();
  initWeb();
  initBLE();
  
  Serial.println("Ready");
}

void loop() {
  digitalWrite(LED_PIN, millis() % 1000 < 100);
  delay(50);
}

void initCam() {
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
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 15;
  config.fb_count = 1;
  
  cameraOK = (esp_camera_init(&config) == ESP_OK);
  Serial.println(cameraOK ? "Cam OK" : "Cam FAIL");
}

void initWiFi() {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(ssid, password);
  Serial.println("WiFi: " + String(ssid));
}

static esp_err_t stream_handler(httpd_req_t *req) {
  camera_fb_t * fb = NULL;
  esp_err_t res = ESP_OK;
  char * part_buf[64];
  
  clients++;
  
  res = httpd_resp_set_type(req, "multipart/x-mixed-replace;boundary=frame");
  if(res != ESP_OK) {
    clients--;
    return res;
  }

  while(true) {
    fb = esp_camera_fb_get();
    if (!fb) {
      res = ESP_FAIL;
      break;
    }
    
    size_t hlen = snprintf((char *)part_buf, 64, 
      "\r\n--frame\r\nContent-Type: image/jpeg\r\nContent-Length: %u\r\n\r\n", fb->len);
    
    res = httpd_resp_send_chunk(req, (const char *)part_buf, hlen);
    if(res == ESP_OK) {
      res = httpd_resp_send_chunk(req, (const char *)fb->buf, fb->len);
    }
    
    esp_camera_fb_return(fb);
    
    if(res != ESP_OK) break;
  }
  
  clients--;
  return res;
}

static esp_err_t index_handler(httpd_req_t *req) {
  httpd_resp_set_type(req, "text/html");
  const char* html = "<!DOCTYPE html><html><body>"
    "<h1>ESP32-CAM</h1>"
    "<img src='/stream' style='width:100%;max-width:640px;'>"
    "</body></html>";
  return httpd_resp_send(req, html, strlen(html));
}

void initWeb() {
  httpd_config_t config = HTTPD_DEFAULT_CONFIG();
  config.server_port = 80;

  httpd_uri_t index_uri = {"/", HTTP_GET, index_handler, NULL};
  httpd_uri_t stream_uri = {"/stream", HTTP_GET, stream_handler, NULL};

  if (httpd_start(&server, &config) == ESP_OK) {
    httpd_register_uri_handler(server, &index_uri);
    httpd_register_uri_handler(server, &stream_uri);
    Serial.println("Web OK");
  }
}

void initBLE() {
  BLEDevice::init(deviceName);
  pAdv = BLEDevice::getAdvertising();
  
  BLEAdvertisementData advData;
  advData.setName(deviceName);
  advData.setCompleteServices(BLEUUID("12345678-1234-1234-1234-123456789abc"));
  
  MinMeta meta;
  meta.ver = 3;
  meta.id = 1;
  meta.bat = 100;
  meta.cam = cameraOK ? (clients > 0 ? 2 : 1) : 0;
  
  String metaStr = "";
  for(int i = 0; i < sizeof(meta); i++) {
    metaStr += (char)((uint8_t*)&meta)[i];
  }
  advData.setServiceData(BLEUUID("12345678-1234-1234-1234-123456789abc"), metaStr);
  
  pAdv->setAdvertisementData(advData);
  pAdv->start();
  
  Serial.println("BLE: " + deviceName);
} 