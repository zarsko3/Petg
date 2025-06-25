#ifndef ESP32_S3_WIFI_MANAGER_H
#define ESP32_S3_WIFI_MANAGER_H

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <esp_wifi.h>
#include <ArduinoJson.h>

/*
 * ESP32-S3 Enhanced WiFi Manager
 * 
 * Optimized for ESP32-S3 with:
 * - Enhanced security features
 * - Better memory management
 * - Improved connection stability
 * - Advanced configuration options
 * - Native USB support integration
 */

// WiFi configuration
#define WIFI_CONNECT_TIMEOUT 20000  // 20 seconds
#define WIFI_RECONNECT_INTERVAL 5000  // 5 seconds
#define WIFI_AP_SSID "PetCollar_AP"
#define WIFI_AP_PASSWORD "12345678"
#define WIFI_AP_CHANNEL 1
#define WIFI_AP_MAX_CONN 4
#define WIFI_AP_IP IPAddress(192, 168, 4, 1)
#define WIFI_AP_GATEWAY IPAddress(192, 168, 4, 1)
#define WIFI_AP_SUBNET IPAddress(255, 255, 255, 0)
#define WIFI_AP_DNS IPAddress(192, 168, 4, 1)

class ESP32_S3_WiFiManager {
private:
    // Core components
    WebServer* server;
    DNSServer* dnsServer;
    Preferences preferences;
    
    // Configuration
    String deviceName;
    String apPassword;
    bool autoConnectEnabled;
    bool captivePortal;
    
    // Connection settings
    String ssid;
    String password;
    bool useStaticIP;
    IPAddress staticIP;
    IPAddress gateway;
    IPAddress subnet;
    
    // Status tracking
    bool connected;
    bool configMode;
    unsigned long connectionTimeout;
    unsigned long lastConnectionAttempt;
    int connectionAttempts;
    
    // Security settings
    bool enableWPA3;
    bool enableEnterprise;
    String enterpriseUsername;
    String enterprisePassword;
    
    // Advanced features
    bool smartConfig;
    bool wpsEnabled;
    int channel;
    bool hidden;
    
    bool isInitialized;
    bool isAPMode;
    unsigned long lastReconnectAttempt;
    
    // Callback function type
    typedef std::function<void(bool)> ConnectionCallback;
    ConnectionCallback onConnectionChange;
    
public:
    ESP32_S3_WiFiManager() : 
        server(nullptr),
        dnsServer(nullptr),
        autoConnectEnabled(true),
        captivePortal(false),
        useStaticIP(false),
        connected(false),
        configMode(false),
        connectionTimeout(180000),
        lastConnectionAttempt(0),
        connectionAttempts(0),
        enableWPA3(false),
        enableEnterprise(false),
        smartConfig(false),
        wpsEnabled(false),
        channel(0),
        hidden(false),
        isInitialized(false),
        isAPMode(false),
        lastReconnectAttempt(0) {}
    
    ~ESP32_S3_WiFiManager() {
        if (server) delete server;
        if (dnsServer) delete dnsServer;
    }
    
    bool begin(const String& deviceName = "ESP32-S3-Device") {
        if (isInitialized) return true;
        
        this->deviceName = deviceName;
        
        // Initialize preferences
        preferences.begin("wifi_config", false);
        
        // Load saved configuration
        ssid = preferences.getString("ssid", "");
        password = preferences.getString("password", "");
        autoConnectEnabled = preferences.getBool("auto_connect", true);
        
        // Initialize server and DNS
        server = new WebServer(80);
        dnsServer = new DNSServer();
        
        // Setup web server
        setupWebServer();
        
        isInitialized = true;
        return true;
    }
    
    void update() {
        if (!isInitialized) return;
        
        if (isAPMode) {
            dnsServer->processNextRequest();
            server->handleClient();
        } else if (!connected && autoConnectEnabled) {
            unsigned long currentTime = millis();
            if (currentTime - lastReconnectAttempt >= WIFI_RECONNECT_INTERVAL) {
                connect(ssid, password);
                lastReconnectAttempt = currentTime;
            }
        }
    }
    
    bool connect(const String& newSSID, const String& newPassword) {
        if (!isInitialized) return false;
        
        ssid = newSSID;
        password = newPassword;
        
        WiFi.begin(ssid.c_str(), password.c_str());
        
        unsigned long startTime = millis();
        while (WiFi.status() != WL_CONNECTED && millis() - startTime < WIFI_CONNECT_TIMEOUT) {
            delay(100);
        }
        
        connected = (WiFi.status() == WL_CONNECTED);
        if (connected && onConnectionChange) {
            onConnectionChange(true);
        }
        
        return connected;
    }
    
    void startAP() {
        if (!isInitialized) return;
        
        WiFi.mode(WIFI_AP);
        WiFi.softAPConfig(WIFI_AP_IP, WIFI_AP_GATEWAY, WIFI_AP_SUBNET);
        WiFi.softAP(WIFI_AP_SSID, WIFI_AP_PASSWORD, WIFI_AP_CHANNEL, 0, WIFI_AP_MAX_CONN);
        
        dnsServer->start(53, "*", WIFI_AP_DNS);
        
        isAPMode = true;
        connected = false;
    }
    
    void stopAP() {
        if (!isInitialized) return;
        
        WiFi.softAPdisconnect(true);
        dnsServer->stop();
        
        isAPMode = false;
    }
    
    void setConnectionCallback(ConnectionCallback callback) {
        onConnectionChange = callback;
    }
    
    bool isWiFiConnected() {
        return connected;
    }
    
    bool isAccessPointMode() {
        return isAPMode;
    }
    
    String getIP() {
        return WiFi.localIP().toString();
    }
    
    String getSSID() {
        return ssid;
    }
    
private:
    void setupWebServer() {
        server->on("/", HTTP_GET, [this]() {
            String html = generateConfigPage();
            server->send(200, "text/html", html);
        });
        
        server->on("/configure", HTTP_POST, [this]() {
            if (server->hasArg("ssid") && server->hasArg("password")) {
                setCredentials(server->arg("ssid"), server->arg("password"));
                server->send(200, "text/plain", "Configuration saved. Restarting...");
                delay(1000);
                ESP.restart();
            } else {
                server->send(400, "text/plain", "Missing parameters");
            }
        });
        
        server->onNotFound([this]() {
            server->send(404, "text/plain", "Not found");
        });
    }
    
    String generateConfigPage() {
        String html = F("<!DOCTYPE html>"
            "<html>"
            "<head>"
                "<title>Pet Collar WiFi Configuration</title>"
                "<meta name='viewport' content='width=device-width, initial-scale=1'>"
                "<style>"
                    "body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f2f5; }"
                    ".container { max-width: 400px; margin: 0 auto; }"
                    ".card { background: white; border-radius: 10px; padding: 20px; margin-bottom: 20px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }"
                    "input { width: 100%; padding: 10px; margin: 5px 0; border: 1px solid #ddd; border-radius: 5px; }"
                    "button { width: 100%; padding: 10px; background: #22c55e; color: white; border: none; border-radius: 5px; cursor: pointer; }"
                    "button:hover { background: #16a34a; }"
                "</style>"
            "</head>"
            "<body>"
                "<div class='container'>"
                    "<div class='card'>"
                        "<h2>WiFi Configuration</h2>"
                        "<form action='/configure' method='post'>"
                            "<input type='text' name='ssid' placeholder='WiFi SSID' required>"
                            "<input type='password' name='password' placeholder='WiFi Password' required>"
                            "<button type='submit'>Save</button>"
                        "</form>"
                    "</div>"
                "</div>"
            "</body>"
            "</html>");
        return html;
    }
    
    void setCredentials(const String& newSSID, const String& newPassword) {
        ssid = newSSID;
        password = newPassword;
        
        preferences.putString("ssid", ssid);
        preferences.putString("password", password);
    }
};

#endif // ESP32_S3_WIFI_MANAGER_H 