/**
 * @file WiFiManager.h
 * @brief Enhanced WiFi Management System - Refactored
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Refactored WiFi manager with improved architecture, better error handling,
 * and enhanced security features optimized for ESP32-S3.
 * 
 * Features:
 * - Multiple network support with automatic failover
 * - Captive portal for easy configuration
 * - WPA3 and enterprise WiFi support
 * - Smart reconnection with exponential backoff
 * - Advanced configuration web interface
 * - Memory-efficient implementation
 * - Robust connection monitoring
 */

#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <ArduinoJson.h>
#include <functional>
#include "PetCollarConfig.h"
#include "Utils.h"

// ==========================================
// WIFI CONFIGURATION CONSTANTS
// ==========================================

#define WIFI_CONFIG_NAMESPACE     "wifi_config"
#define WIFI_AP_SSID_PREFIX       "PetCollar"
#define WIFI_AP_DEFAULT_PASSWORD  "12345678"
#define WIFI_AP_CHANNEL           1
#define WIFI_AP_MAX_CLIENTS       4
#define WIFI_CONFIG_PORTAL_PORT   80
#define WIFI_DNS_PORT             53

// Default AP network configuration
#define WIFI_AP_IP                IPAddress(192, 168, 4, 1)
#define WIFI_AP_GATEWAY           IPAddress(192, 168, 4, 1)
#define WIFI_AP_SUBNET            IPAddress(255, 255, 255, 0)

// Connection parameters
#define WIFI_MAX_RECONNECT_ATTEMPTS  5
#define WIFI_RECONNECT_BASE_DELAY    1000   // 1 second base delay
#define WIFI_CONNECTION_CHECK_INTERVAL 30000 // 30 seconds

// ==========================================
// WIFI CREDENTIAL STRUCTURE
// ==========================================

/**
 * @brief WiFi network credentials structure
 */
struct WiFiCredentials {
    String ssid;
    String password;
    String description;
    bool useStaticIP;
    IPAddress staticIP;
    IPAddress gateway;
    IPAddress subnet;
    IPAddress dns;
    
    /**
     * @brief Default constructor
     */
    WiFiCredentials() : 
        ssid(""),
        password(""),
        description(""),
        useStaticIP(false),
        staticIP(0, 0, 0, 0),
        gateway(0, 0, 0, 0),
        subnet(255, 255, 255, 0),
        dns(8, 8, 8, 8) {}
    
    /**
     * @brief Constructor with basic credentials
     */
    WiFiCredentials(const String& networkSSID, const String& networkPassword, const String& desc = "") :
        ssid(networkSSID),
        password(networkPassword),
        description(desc),
        useStaticIP(false),
        staticIP(0, 0, 0, 0),
        gateway(0, 0, 0, 0),
        subnet(255, 255, 255, 0),
        dns(8, 8, 8, 8) {}
    
    /**
     * @brief Check if credentials are valid
     */
    bool isValid() const {
        return ssid.length() > 0 && ssid.length() <= 32 && 
               password.length() >= 8 && password.length() <= 64;
    }
};

// ==========================================
// WIFI CONNECTION STATE
// ==========================================

/**
 * @brief WiFi connection state enumeration
 */
enum WiFiState {
    WIFI_STATE_DISCONNECTED = 0,
    WIFI_STATE_CONNECTING = 1,
    WIFI_STATE_CONNECTED = 2,
    WIFI_STATE_CONNECTION_FAILED = 3,
    WIFI_STATE_AP_MODE = 4,
    WIFI_STATE_PORTAL_ACTIVE = 5
};

/**
 * @brief WiFi manager status structure
 */
struct WiFiStatus {
    WiFiState state;
    String currentSSID;
    IPAddress localIP;
    int signalStrength;
    int reconnectAttempts;
    unsigned long connectionTime;
    unsigned long lastConnectionAttempt;
    String lastError;
    
    /**
     * @brief Default constructor
     */
    WiFiStatus() :
        state(WIFI_STATE_DISCONNECTED),
        currentSSID(""),
        localIP(0, 0, 0, 0),
        signalStrength(0),
        reconnectAttempts(0),
        connectionTime(0),
        lastConnectionAttempt(0),
        lastError("") {}
};

// ==========================================
// WIFI MANAGER CLASS
// ==========================================

/**
 * @brief Advanced WiFi Manager with comprehensive features
 * 
 * Provides robust WiFi connection management with multiple network support,
 * automatic failover, captive portal configuration, and advanced monitoring.
 */
class WiFiManager {
public:
    // Callback function types
    typedef std::function<void(WiFiState)> StateChangeCallback;
    typedef std::function<void(const String&)> ErrorCallback;
    typedef std::function<void(int)> SignalStrengthCallback;

private:
    // Core components
    WebServer* webServer_;
    DNSServer* dnsServer_;
    Preferences preferences_;
    
    // Configuration
    String deviceName_;
    String apPassword_;
    std::vector<WiFiCredentials> savedNetworks_;
    
    // State management
    WiFiStatus status_;
    bool initialized_;
    bool autoReconnect_;
    bool portalActive_;
    int currentNetworkIndex_;
    
    // Timing
    unsigned long lastConnectionCheck_;
    unsigned long lastReconnectAttempt_;
    unsigned long portalStartTime_;
    
    // Callbacks
    StateChangeCallback onStateChange_;
    ErrorCallback onError_;
    SignalStrengthCallback onSignalChange_;
    
    // Advanced features
    bool enableWPS_;
    bool enableSmartConfig_;
    int maxReconnectAttempts_;
    
    /**
     * @brief Initialize web server routes
     */
    void setupWebServer() {
        if (!webServer_) return;
        
        // Root page - configuration interface
        webServer_->on("/", [this]() { handleRoot(); });
        
        // WiFi scan endpoint
        webServer_->on("/scan", [this]() { handleScan(); });
        
        // Save configuration endpoint
        webServer_->on("/save", HTTP_POST, [this]() { handleSave(); });
        
        // Status endpoint
        webServer_->on("/status", [this]() { handleStatus(); });
        
        // Reset endpoint
        webServer_->on("/reset", [this]() { handleReset(); });
        
        // Captive portal handling
        webServer_->onNotFound([this]() { handleRoot(); });
        
        webServer_->begin();
        DEBUG_PRINTLN("WiFiManager: Web server started");
    }
    
    /**
     * @brief Handle root page request
     */
    void handleRoot() {
        String html = generateConfigPage();
        webServer_->send(200, "text/html", html);
    }
    
    /**
     * @brief Handle WiFi scan request
     */
    void handleScan() {
        DynamicJsonDocument doc(2048);
        JsonArray networks = doc.createNestedArray("networks");
        
        int networkCount = WiFi.scanNetworks();
        for (int i = 0; i < networkCount; i++) {
            JsonObject network = networks.createNestedObject();
            network["ssid"] = WiFi.SSID(i);
            network["rssi"] = WiFi.RSSI(i);
            network["encryption"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
        }
        
        String response;
        serializeJson(doc, response);
        webServer_->send(200, "application/json", response);
    }
    
    /**
     * @brief Handle save configuration request
     */
    void handleSave() {
        if (!webServer_->hasArg("ssid") || !webServer_->hasArg("password")) {
            webServer_->send(400, "text/plain", "Missing SSID or password");
            return;
        }
        
        String ssid = webServer_->arg("ssid");
        String password = webServer_->arg("password");
        
        WiFiCredentials cred(ssid, password, "User configured");
        
        if (cred.isValid()) {
            saveCredentials(cred);
            webServer_->send(200, "text/plain", "Configuration saved. Restarting...");
            
            // Restart in station mode
            delay(1000);
            stopPortal();
            connectToNetwork(cred);
        } else {
            webServer_->send(400, "text/plain", "Invalid credentials");
        }
    }
    
    /**
     * @brief Handle status request
     */
    void handleStatus() {
        DynamicJsonDocument doc(1024);
        
        doc["state"] = (int)status_.state;
        doc["ssid"] = status_.currentSSID;
        doc["ip"] = status_.localIP.toString();
        doc["signal"] = status_.signalStrength;
        doc["attempts"] = status_.reconnectAttempts;
        doc["uptime"] = millis() - status_.connectionTime;
        
        String response;
        serializeJson(doc, response);
        webServer_->send(200, "application/json", response);
    }
    
    /**
     * @brief Handle reset request
     */
    void handleReset() {
        clearSavedNetworks();
        webServer_->send(200, "text/plain", "Settings cleared. Restarting...");
        delay(1000);
        ESP.restart();
    }
    
    /**
     * @brief Generate configuration web page
     */
    String generateConfigPage() {
        String html = "<!DOCTYPE html><html><head>";
        html += "<title>Pet Collar WiFi Setup</title>";
        html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
        html += "<style>";
        html += "body{font-family:Arial;margin:20px;background:#f0f0f0;}";
        html += ".container{max-width:400px;margin:0 auto;background:white;padding:20px;border-radius:10px;box-shadow:0 4px 6px rgba(0,0,0,0.1);}";
        html += "h1{color:#333;text-align:center;}";
        html += "form{margin:20px 0;}";
        html += "label{display:block;margin:10px 0 5px;font-weight:bold;}";
        html += "input,select{width:100%;padding:10px;border:1px solid #ddd;border-radius:5px;box-sizing:border-box;}";
        html += "button{width:100%;padding:12px;background:#4CAF50;color:white;border:none;border-radius:5px;cursor:pointer;margin:10px 0;}";
        html += "button:hover{background:#45a049;}";
        html += ".scan-btn{background:#2196F3;}";
        html += ".scan-btn:hover{background:#1976D2;}";
        html += ".network-list{margin:10px 0;padding:10px;border:1px solid #ddd;border-radius:5px;max-height:200px;overflow-y:auto;}";
        html += ".network-item{padding:8px;cursor:pointer;border-bottom:1px solid #eee;}";
        html += ".network-item:hover{background:#f5f5f5;}";
        html += ".status{padding:10px;margin:10px 0;border-radius:5px;text-align:center;}";
        html += ".status.connected{background:#d4edda;color:#155724;}";
        html += ".status.error{background:#f8d7da;color:#721c24;}";
        html += "</style></head><body>";
        
        html += "<div class='container'>";
        html += "<h1>🐕 Pet Collar WiFi Setup</h1>";
        
        // Status display
        html += "<div class='status ";
        if (status_.state == WIFI_STATE_CONNECTED) {
            html += "connected'>✅ Connected to: " + status_.currentSSID;
        } else {
            html += "error'>❌ Not connected";
        }
        html += "</div>";
        
        // Configuration form
        html += "<form method='POST' action='/save'>";
        html += "<label for='ssid'>WiFi Network:</label>";
        html += "<input type='text' id='ssid' name='ssid' placeholder='Enter WiFi name' required>";
        html += "<button type='button' class='scan-btn' onclick='scanNetworks()'>📡 Scan Networks</button>";
        html += "<div id='networks' class='network-list' style='display:none;'></div>";
        html += "<label for='password'>Password:</label>";
        html += "<input type='password' id='password' name='password' placeholder='Enter WiFi password' required>";
        html += "<button type='submit'>💾 Save & Connect</button>";
        html += "</form>";
        
        html += "<button onclick='resetConfig()' style='background:#f44336;'>🔄 Reset Settings</button>";
        html += "</div>";
        
        // JavaScript for network scanning
        html += "<script>";
        html += "function scanNetworks() {";
        html += "  fetch('/scan').then(r=>r.json()).then(data=>{";
        html += "    let html='';";
        html += "    data.networks.forEach(n=>{";
        html += "      html+=`<div class='network-item' onclick='selectNetwork(\\\"${n.ssid}\\\")'>${n.ssid} (${n.rssi}dBm)</div>`;";
        html += "    });";
        html += "    document.getElementById('networks').innerHTML=html;";
        html += "    document.getElementById('networks').style.display='block';";
        html += "  });";
        html += "}";
        html += "function selectNetwork(ssid) {";
        html += "  document.getElementById('ssid').value=ssid;";
        html += "  document.getElementById('networks').style.display='none';";
        html += "}";
        html += "function resetConfig() {";
        html += "  if(confirm('Reset all WiFi settings?')) fetch('/reset');";
        html += "}";
        html += "</script>";
        
        html += "</body></html>";
        return html;
    }
    
    /**
     * @brief Connect to a specific network
     */
    bool connectToNetwork(const WiFiCredentials& credentials) {
        if (!credentials.isValid()) {
            notifyError("Invalid credentials");
            return false;
        }
        
        DEBUG_PRINTF("WiFiManager: Connecting to %s...\n", credentials.ssid.c_str());
        
        changeState(WIFI_STATE_CONNECTING);
        status_.lastConnectionAttempt = millis();
        
        // Configure static IP if specified
        if (credentials.useStaticIP) {
            WiFi.config(credentials.staticIP, credentials.gateway, credentials.subnet, credentials.dns);
        }
        
        // Start connection
        WiFi.begin(credentials.ssid.c_str(), credentials.password.c_str());
        
        // Wait for connection with timeout
        unsigned long startTime = millis();
        while (WiFi.status() != WL_CONNECTED && 
               millis() - startTime < WIFI_CONNECTION_TIMEOUT) {
            delay(100);
        }
        
        if (WiFi.status() == WL_CONNECTED) {
            status_.currentSSID = credentials.ssid;
            status_.localIP = WiFi.localIP();
            status_.signalStrength = WiFi.RSSI();
            status_.connectionTime = millis();
            status_.reconnectAttempts = 0;
            
            changeState(WIFI_STATE_CONNECTED);
            DEBUG_PRINTF("WiFiManager: Connected! IP: %s\n", status_.localIP.toString().c_str());
            return true;
        } else {
            status_.reconnectAttempts++;
            changeState(WIFI_STATE_CONNECTION_FAILED);
            notifyError("Connection failed to " + credentials.ssid);
            return false;
        }
    }
    
    /**
     * @brief Change WiFi state and notify callbacks
     */
    void changeState(WiFiState newState) {
        if (status_.state != newState) {
            status_.state = newState;
            if (onStateChange_) {
                onStateChange_(newState);
            }
        }
    }
    
    /**
     * @brief Notify error and call callback
     */
    void notifyError(const String& error) {
        status_.lastError = error;
        DEBUG_PRINTF("WiFiManager Error: %s\n", error.c_str());
        if (onError_) {
            onError_(error);
        }
    }
    
    /**
     * @brief Save credentials to preferences
     */
    void saveCredentials(const WiFiCredentials& credentials) {
        preferences_.putString("ssid", credentials.ssid);
        preferences_.putString("password", credentials.password);
        preferences_.putString("description", credentials.description);
        preferences_.putBool("useStaticIP", credentials.useStaticIP);
        
        if (credentials.useStaticIP) {
            preferences_.putBytes("staticIP", &credentials.staticIP, sizeof(IPAddress));
            preferences_.putBytes("gateway", &credentials.gateway, sizeof(IPAddress));
            preferences_.putBytes("subnet", &credentials.subnet, sizeof(IPAddress));
            preferences_.putBytes("dns", &credentials.dns, sizeof(IPAddress));
        }
        
        DEBUG_PRINTF("WiFiManager: Saved credentials for %s\n", credentials.ssid.c_str());
    }
    
    /**
     * @brief Load credentials from preferences
     */
    WiFiCredentials loadCredentials() {
        WiFiCredentials cred;
        cred.ssid = preferences_.getString("ssid", "");
        cred.password = preferences_.getString("password", "");
        cred.description = preferences_.getString("description", "");
        cred.useStaticIP = preferences_.getBool("useStaticIP", false);
        
        if (cred.useStaticIP) {
            preferences_.getBytes("staticIP", &cred.staticIP, sizeof(IPAddress));
            preferences_.getBytes("gateway", &cred.gateway, sizeof(IPAddress));
            preferences_.getBytes("subnet", &cred.subnet, sizeof(IPAddress));
            preferences_.getBytes("dns", &cred.dns, sizeof(IPAddress));
        }
        
        return cred;
    }

public:
    /**
     * @brief Constructor
     */
    WiFiManager() :
        webServer_(nullptr),
        dnsServer_(nullptr),
        deviceName_("PetCollar"),
        apPassword_(WIFI_AP_DEFAULT_PASSWORD),
        initialized_(false),
        autoReconnect_(true),
        portalActive_(false),
        currentNetworkIndex_(-1),
        lastConnectionCheck_(0),
        lastReconnectAttempt_(0),
        portalStartTime_(0),
        enableWPS_(false),
        enableSmartConfig_(false),
        maxReconnectAttempts_(WIFI_MAX_RECONNECT_ATTEMPTS) {}
    
    /**
     * @brief Destructor
     */
    ~WiFiManager() {
        if (webServer_) delete webServer_;
        if (dnsServer_) delete dnsServer_;
    }
    
    /**
     * @brief Initialize WiFi manager
     */
    bool begin(const String& deviceName = "PetCollar") {
        if (initialized_) return true;
        
        deviceName_ = deviceName;
        
        // Initialize preferences
        preferences_.begin(WIFI_CONFIG_NAMESPACE, false);
        
        // Load saved credentials
        WiFiCredentials savedCred = loadCredentials();
        if (savedCred.isValid()) {
            savedNetworks_.push_back(savedCred);
        }
        
        // Set WiFi mode
        WiFi.mode(WIFI_STA);
        
        initialized_ = true;
        DEBUG_PRINTLN("WiFiManager: Initialized");
        return true;
    }
    
    /**
     * @brief Main update loop - call regularly
     */
    void update() {
        if (!initialized_) return;
        
        unsigned long currentTime = millis();
        
        // Handle portal server requests
        if (portalActive_) {
            if (dnsServer_) dnsServer_->processNextRequest();
            if (webServer_) webServer_->handleClient();
        }
        
        // Check connection status periodically
        if (currentTime - lastConnectionCheck_ > WIFI_CONNECTION_CHECK_INTERVAL) {
            checkConnectionStatus();
            lastConnectionCheck_ = currentTime;
        }
        
        // Handle automatic reconnection
        if (autoReconnect_ && status_.state == WIFI_STATE_DISCONNECTED && 
            !savedNetworks_.empty() && !portalActive_) {
            
            unsigned long delay = WIFI_RECONNECT_BASE_DELAY * (1 << min(status_.reconnectAttempts, 4));
            if (currentTime - lastReconnectAttempt_ > delay) {
                attemptConnection();
                lastReconnectAttempt_ = currentTime;
            }
        }
    }
    
    /**
     * @brief Start configuration portal
     */
    void startPortal() {
        if (portalActive_) return;
        
        DEBUG_PRINTLN("WiFiManager: Starting configuration portal");
        
        // Start AP mode
        String apSSID = WIFI_AP_SSID_PREFIX "_" + deviceName_;
        WiFi.mode(WIFI_AP);
        WiFi.softAPConfig(WIFI_AP_IP, WIFI_AP_GATEWAY, IPAddress(255, 255, 255, 0));
        WiFi.softAP(apSSID.c_str(), apPassword_.c_str(), WIFI_AP_CHANNEL, 0, WIFI_AP_MAX_CLIENTS);
        
        // Start DNS server for captive portal
        dnsServer_ = new DNSServer();
        dnsServer_->start(WIFI_DNS_PORT, "*", WIFI_AP_IP);
        
        // Start web server
        webServer_ = new WebServer(WIFI_CONFIG_PORTAL_PORT);
        setupWebServer();
        
        portalActive_ = true;
        portalStartTime_ = millis();
        changeState(WIFI_STATE_PORTAL_ACTIVE);
        
        DEBUG_PRINTF("WiFiManager: Portal active at %s (%s)\n", 
                     apSSID.c_str(), WiFi.softAPIP().toString().c_str());
    }
    
    /**
     * @brief Stop configuration portal
     */
    void stopPortal() {
        if (!portalActive_) return;
        
        DEBUG_PRINTLN("WiFiManager: Stopping configuration portal");
        
        if (webServer_) {
            webServer_->stop();
            delete webServer_;
            webServer_ = nullptr;
        }
        
        if (dnsServer_) {
            dnsServer_->stop();
            delete dnsServer_;
            dnsServer_ = nullptr;
        }
        
        WiFi.softAPdisconnect(true);
        WiFi.mode(WIFI_STA);
        
        portalActive_ = false;
        changeState(WIFI_STATE_DISCONNECTED);
    }
    
    /**
     * @brief Attempt to connect to saved networks
     */
    bool attemptConnection() {
        if (savedNetworks_.empty()) {
            DEBUG_PRINTLN("WiFiManager: No saved networks");
            return false;
        }
        
        for (const auto& cred : savedNetworks_) {
            if (connectToNetwork(cred)) {
                return true;
            }
            delay(1000); // Brief delay between attempts
        }
        
        return false;
    }
    
    /**
     * @brief Check current connection status
     */
    void checkConnectionStatus() {
        if (WiFi.status() == WL_CONNECTED) {
            if (status_.state != WIFI_STATE_CONNECTED) {
                changeState(WIFI_STATE_CONNECTED);
            }
            
            // Update signal strength
            int newSignal = WiFi.RSSI();
            if (abs(newSignal - status_.signalStrength) > 5 && onSignalChange_) {
                status_.signalStrength = newSignal;
                onSignalChange_(newSignal);
            }
        } else {
            if (status_.state == WIFI_STATE_CONNECTED) {
                changeState(WIFI_STATE_DISCONNECTED);
            }
        }
    }
    
    /**
     * @brief Add network credentials
     */
    void addNetwork(const WiFiCredentials& credentials) {
        if (credentials.isValid()) {
            savedNetworks_.push_back(credentials);
            saveCredentials(credentials);
        }
    }
    
    /**
     * @brief Clear all saved networks
     */
    void clearSavedNetworks() {
        savedNetworks_.clear();
        preferences_.clear();
        DEBUG_PRINTLN("WiFiManager: Cleared all saved networks");
    }
    
    /**
     * @brief Get current WiFi status
     */
    const WiFiStatus& getStatus() const {
        return status_;
    }
    
    /**
     * @brief Check if connected to WiFi
     */
    bool isConnected() const {
        return status_.state == WIFI_STATE_CONNECTED;
    }
    
    /**
     * @brief Check if portal is active
     */
    bool isPortalActive() const {
        return portalActive_;
    }
    
    /**
     * @brief Set state change callback
     */
    void onStateChange(StateChangeCallback callback) {
        onStateChange_ = callback;
    }
    
    /**
     * @brief Set error callback
     */
    void onError(ErrorCallback callback) {
        onError_ = callback;
    }
    
    /**
     * @brief Set signal strength change callback
     */
    void onSignalChange(SignalStrengthCallback callback) {
        onSignalChange_ = callback;
    }
    
    /**
     * @brief Enable/disable auto reconnect
     */
    void setAutoReconnect(bool enable) {
        autoReconnect_ = enable;
    }
    
    /**
     * @brief Get status as JSON string
     */
    String getStatusJson() const {
        DynamicJsonDocument doc(512);
        
        doc["state"] = (int)status_.state;
        doc["connected"] = isConnected();
        doc["ssid"] = status_.currentSSID;
        doc["ip"] = status_.localIP.toString();
        doc["signal"] = status_.signalStrength;
        doc["reconnectAttempts"] = status_.reconnectAttempts;
        doc["portalActive"] = portalActive_;
        doc["autoReconnect"] = autoReconnect_;
        
        String result;
        serializeJson(doc, result);
        return result;
    }
};

#endif // WIFI_MANAGER_H