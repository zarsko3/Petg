#ifndef WIFI_MANAGER_H
#define WIFI_MANAGER_H

/**
 * @file WiFiManager.h
 * @brief Enhanced WiFi Manager for ESP32-S3 Pet Collar system
 * @version 3.1.0
 * @date 2024
 * 
 * This class provides comprehensive WiFi management including:
 * - Auto-connection with fallback to AP mode
 * - Web-based configuration portal
 * - Connection monitoring and auto-reconnection
 * - ESP32-S3 specific optimizations
 * - Enhanced security features
 */

#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <Preferences.h>
#include <esp_wifi.h>
#include <ArduinoJson.h>
#include "ESP32_S3_Config.h"
#include "MicroConfig.h"

// ==========================================
// WIFI MANAGER CONFIGURATION
// ==========================================

/**
 * @brief WiFi Manager callback function types
 */
typedef std::function<void(bool connected)> WiFiConnectionCallback;
typedef std::function<void(String ssid, String password)> WiFiCredentialsCallback;

/**
 * @brief WiFi configuration parameters
 */
struct WiFiCredentials {
    String ssid;
    String password;
    bool useStaticIP;
    IPAddress staticIP;
    IPAddress gateway;
    IPAddress subnet;
    IPAddress dns1;
    IPAddress dns2;
    
    WiFiCredentials() : 
        useStaticIP(false),
        staticIP(0, 0, 0, 0),
        gateway(0, 0, 0, 0),
        subnet(255, 255, 255, 0),
        dns1(8, 8, 8, 8),
        dns2(8, 8, 4, 4) {}
    
    bool isValid() const {
        return ssid.length() > 0 && ssid.length() <= MAX_SSID_LENGTH;
    }
};

/**
 * @brief Access Point configuration
 */
struct APConfig {
    String ssid;
    String password;
    uint8_t channel;
    bool hidden;
    uint8_t maxConnections;
    IPAddress localIP;
    IPAddress gateway;
    IPAddress subnet;
    
    APConfig() : 
        ssid(AP_SSID_PREFIX),
        password(""),
        channel(WIFI_AP_CHANNEL),
        hidden(false),
        maxConnections(AP_MAX_CLIENTS),
        localIP(192, 168, 4, 1),
        gateway(192, 168, 4, 1),
        subnet(255, 255, 255, 0) {
        
        // Generate unique AP name and password
        uint32_t chipId = (uint32_t)ESP.getEfuseMac();
        ssid += "-" + String(chipId, HEX).substring(2);
        password = "PetCollar" + String(chipId & 0xFFFF, HEX);
    }
};

// ==========================================
// MAIN WIFI MANAGER CLASS
// ==========================================

/**
 * @brief Enhanced WiFi Manager class
 */
class WiFiManager {
private:
    // Core components
    WebServer* m_webServer;
    DNSServer* m_dnsServer;
    Preferences m_preferences;
    
    // Configuration
    WiFiCredentials m_credentials;
    APConfig m_apConfig;
    String m_deviceName;
    
    // State management
    ConnectionState m_connectionState;
    bool m_isAPMode;
    bool m_isInitialized;
    bool m_captivePortalEnabled;
    bool m_autoReconnectEnabled;
    
    // Timing and retry logic
    unsigned long m_lastConnectionAttempt;
    unsigned long m_lastReconnectAttempt;
    unsigned long m_connectionStartTime;
    uint8_t m_connectionAttempts;
    uint8_t m_maxRetryAttempts;
    
    // Callbacks
    WiFiConnectionCallback m_onConnectionChange;
    WiFiCredentialsCallback m_onCredentialsUpdated;
    
    // Security settings
    bool m_enableWPA3;
    bool m_enableEnterprise;
    
    /**
     * @brief Load WiFi credentials from flash storage
     */
    void loadCredentials() {
        m_credentials.ssid = m_preferences.getString("ssid", "");
        m_credentials.password = m_preferences.getString("password", "");
        m_credentials.useStaticIP = m_preferences.getBool("use_static", false);
        
        if (m_credentials.useStaticIP) {
            m_credentials.staticIP.fromString(m_preferences.getString("static_ip", ""));
            m_credentials.gateway.fromString(m_preferences.getString("gateway", ""));
            m_credentials.subnet.fromString(m_preferences.getString("subnet", "255.255.255.0"));
        }
        
        DEBUG_PRINT_F("Loaded WiFi credentials: SSID='%s'\n", m_credentials.ssid.c_str());
    }
    
    /**
     * @brief Save WiFi credentials to flash storage
     */
    void saveCredentials() {
        m_preferences.putString("ssid", m_credentials.ssid);
        m_preferences.putString("password", m_credentials.password);
        m_preferences.putBool("use_static", m_credentials.useStaticIP);
        
        if (m_credentials.useStaticIP) {
            m_preferences.putString("static_ip", m_credentials.staticIP.toString());
            m_preferences.putString("gateway", m_credentials.gateway.toString());
            m_preferences.putString("subnet", m_credentials.subnet.toString());
        }
        
        DEBUG_PRINT_F("Saved WiFi credentials: SSID='%s'\n", m_credentials.ssid.c_str());
    }
    
    /**
     * @brief Setup web server routes for configuration portal
     */
    void setupWebServer();
    
    /**
     * @brief Generate configuration portal HTML page
     */
    String generateConfigPage();
    
    /**
     * @brief Generate network scan results as JSON
     */
    String generateNetworkScanJson();
    
    /**
     * @brief Handle configuration form submission
     */
    void handleConfigSubmission();
    
    /**
     * @brief Handle network scan request
     */
    void handleNetworkScan();
    
    /**
     * @brief Handle device information request
     */
    void handleDeviceInfo();
    
    /**
     * @brief Update connection state and notify callbacks
     */
    void updateConnectionState(ConnectionState newState);

public:
    /**
     * @brief Constructor
     */
    WiFiManager() : 
        m_webServer(nullptr),
        m_dnsServer(nullptr),
        m_deviceName("ESP32-S3-PetCollar"),
        m_connectionState(ConnectionState::DISCONNECTED),
        m_isAPMode(false),
        m_isInitialized(false),
        m_captivePortalEnabled(true),
        m_autoReconnectEnabled(true),
        m_lastConnectionAttempt(0),
        m_lastReconnectAttempt(0),
        m_connectionStartTime(0),
        m_connectionAttempts(0),
        m_maxRetryAttempts(WIFI_RETRY_ATTEMPTS),
        m_enableWPA3(SECURITY_ENABLE_WPA3),
        m_enableEnterprise(SECURITY_ENABLE_ENTERPRISE) {}
    
    /**
     * @brief Destructor
     */
    ~WiFiManager() {
        if (m_webServer) delete m_webServer;
        if (m_dnsServer) delete m_dnsServer;
    }
    
    /**
     * @brief Initialize WiFi manager
     * @param deviceName Custom device name for AP mode
     * @return true if initialization successful
     */
    bool begin(const String& deviceName = "");
    
    /**
     * @brief Main update loop - call regularly from main loop
     */
    void update();
    
    /**
     * @brief Attempt to connect to WiFi with stored or provided credentials
     * @param ssid WiFi network name (optional)
     * @param password WiFi password (optional)
     * @return true if connection initiated successfully
     */
    bool connect(const String& ssid = "", const String& password = "");
    
    /**
     * @brief Start Access Point mode for configuration
     * @param force Force AP mode even if WiFi credentials exist
     * @return true if AP started successfully
     */
    bool startConfigurationAP(bool force = false);
    
    /**
     * @brief Stop Access Point mode
     */
    void stopConfigurationAP();
    
    /**
     * @brief Disconnect from WiFi and stop all services
     */
    void disconnect();
    
    /**
     * @brief Check if WiFi is connected
     * @return true if connected to WiFi network
     */
    bool isConnected() const {
        return (m_connectionState == ConnectionState::CONNECTED) && 
               (WiFi.status() == WL_CONNECTED);
    }
    
    /**
     * @brief Check if in Access Point mode
     * @return true if AP mode is active
     */
    bool isAPMode() const {
        return m_isAPMode;
    }
    
    /**
     * @brief Get current connection state
     * @return Current connection state
     */
    ConnectionState getConnectionState() const {
        return m_connectionState;
    }
    
    /**
     * @brief Get local IP address
     * @return IP address as string
     */
    String getLocalIP() const {
        if (isConnected()) {
            return WiFi.localIP().toString();
        } else if (m_isAPMode) {
            return WiFi.softAPIP().toString();
        }
        return "0.0.0.0";
    }
    
    /**
     * @brief Get connected WiFi SSID
     * @return SSID string
     */
    String getSSID() const {
        return m_credentials.ssid;
    }
    
    /**
     * @brief Get WiFi signal strength
     * @return RSSI value in dBm
     */
    int32_t getSignalStrength() const {
        return isConnected() ? WiFi.RSSI() : -100;
    }
    
    /**
     * @brief Get Access Point client count
     * @return Number of connected AP clients
     */
    uint8_t getAPClientCount() const {
        return m_isAPMode ? WiFi.softAPgetStationNum() : 0;
    }
    
    /**
     * @brief Set WiFi credentials programmatically
     * @param ssid WiFi network name
     * @param password WiFi password
     * @param save Save to flash storage
     * @return true if credentials are valid
     */
    bool setCredentials(const String& ssid, const String& password, bool save = true);
    
    /**
     * @brief Clear stored WiFi credentials
     */
    void clearCredentials();
    
    /**
     * @brief Check if WiFi credentials are stored
     * @return true if valid credentials exist
     */
    bool hasCredentials() const {
        return m_credentials.isValid();
    }
    
    /**
     * @brief Enable or disable auto-reconnection
     * @param enabled Enable auto-reconnection
     */
    void setAutoReconnect(bool enabled) {
        m_autoReconnectEnabled = enabled;
    }
    
    /**
     * @brief Set connection change callback
     * @param callback Callback function
     */
    void setConnectionCallback(WiFiConnectionCallback callback) {
        m_onConnectionChange = callback;
    }
    
    /**
     * @brief Set credentials update callback
     * @param callback Callback function
     */
    void setCredentialsCallback(WiFiCredentialsCallback callback) {
        m_onCredentialsUpdated = callback;
    }
    
    /**
     * @brief Get WiFi manager status as JSON string
     * @return JSON status string
     */
    String getStatusJson() const;
    
    /**
     * @brief Get network configuration as JSON string
     * @return JSON configuration string
     */
    String getConfigJson() const;
    
    /**
     * @brief Scan for available WiFi networks
     * @return Number of networks found
     */
    int scanNetworks();
    
    /**
     * @brief Get scan results as JSON array
     * @return JSON array of available networks
     */
    String getScanResultsJson() const;
    
    /**
     * @brief Reset WiFi configuration and restart in AP mode
     */
    void resetConfiguration();
    
    /**
     * @brief Get configuration portal URL
     * @return Configuration portal URL
     */
    String getConfigPortalURL() const {
        return "http://" + getLocalIP();
    }
};

#endif // WIFI_MANAGER_H 