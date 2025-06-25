/**
 * @file ESP32_S3_WiFiManager.h
 * @brief Legacy ESP32-S3 WiFi Manager - Backward Compatibility
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Legacy WiFi management interface for backward compatibility.
 * Redirects to the refactored WiFiManager.h for actual implementation.
 */

#ifndef ESP32_S3_WIFIMANAGER_H
#define ESP32_S3_WIFIMANAGER_H

#include "WiFiManager.h"
#include "ESP32_S3_Config.h"

// ==========================================
// LEGACY WIFI STRUCTURES
// ==========================================

typedef struct {
  String ssid;
  String password;
  String ip;
  String gateway;
  String subnet;
  int rssi;
  bool connected;
  uint32_t connectionTime;
  uint32_t lastReconnect;
} ESP32_S3_WiFiStatus;

typedef struct {
  String apSSID;
  String apPassword;
  String apIP;
  uint8_t channel;
  bool hidden;
  uint8_t maxConnections;
  bool active;
} ESP32_S3_APConfig;

typedef struct {
  bool autoConnect;
  bool autoReconnect;
  uint32_t connectionTimeout;
  uint32_t reconnectInterval;
  uint8_t maxRetries;
  bool enableStaticIP;
  String staticIP;
  String staticGateway;
  String staticSubnet;
} ESP32_S3_WiFiConfig;

// ==========================================
// LEGACY WIFI FUNCTIONS
// ==========================================

#ifdef __cplusplus
extern "C" {
#endif

/**
 * @brief Initialize ESP32-S3 WiFi manager (legacy)
 * @return true if successful
 */
bool ESP32_S3_WiFi_init(void);

/**
 * @brief Connect to WiFi network (legacy)
 * @param ssid network SSID
 * @param password network password
 * @return true if connected
 */
bool ESP32_S3_WiFi_connect(const char* ssid, const char* password);

/**
 * @brief Disconnect from WiFi (legacy)
 */
void ESP32_S3_WiFi_disconnect(void);

/**
 * @brief Check WiFi connection status (legacy)
 * @return true if connected
 */
bool ESP32_S3_WiFi_isConnected(void);

/**
 * @brief Get WiFi RSSI (legacy)
 * @return signal strength
 */
int ESP32_S3_WiFi_getRSSI(void);

/**
 * @brief Get WiFi IP address (legacy)
 * @return IP address string
 */
String ESP32_S3_WiFi_getIP(void);

/**
 * @brief Start Access Point (legacy)
 * @param ssid AP SSID
 * @param password AP password
 * @return true if started
 */
bool ESP32_S3_WiFi_startAP(const char* ssid, const char* password);

/**
 * @brief Stop Access Point (legacy)
 */
void ESP32_S3_WiFi_stopAP(void);

/**
 * @brief Check if AP is active (legacy)
 * @return true if AP is active
 */
bool ESP32_S3_WiFi_isAPActive(void);

/**
 * @brief Get AP client count (legacy)
 * @return number of connected clients
 */
uint8_t ESP32_S3_WiFi_getAPClientCount(void);

/**
 * @brief Scan for networks (legacy)
 * @return number of networks found
 */
int ESP32_S3_WiFi_scanNetworks(void);

/**
 * @brief Get scanned network SSID (legacy)
 * @param index network index
 * @return SSID string
 */
String ESP32_S3_WiFi_getScannedSSID(int index);

/**
 * @brief Get scanned network RSSI (legacy)
 * @param index network index
 * @return signal strength
 */
int ESP32_S3_WiFi_getScannedRSSI(int index);

/**
 * @brief Set static IP configuration (legacy)
 * @param ip static IP address
 * @param gateway gateway address
 * @param subnet subnet mask
 * @return true if successful
 */
bool ESP32_S3_WiFi_setStaticIP(const char* ip, const char* gateway, const char* subnet);

/**
 * @brief Enable DHCP (legacy)
 */
void ESP32_S3_WiFi_enableDHCP(void);

/**
 * @brief Get WiFi status structure (legacy)
 * @return WiFi status
 */
ESP32_S3_WiFiStatus ESP32_S3_WiFi_getStatus(void);

/**
 * @brief Get AP configuration (legacy)
 * @return AP configuration
 */
ESP32_S3_APConfig ESP32_S3_WiFi_getAPConfig(void);

/**
 * @brief Set WiFi configuration (legacy)
 * @param config WiFi configuration
 */
void ESP32_S3_WiFi_setConfig(ESP32_S3_WiFiConfig config);

/**
 * @brief Get WiFi configuration (legacy)
 * @return WiFi configuration
 */
ESP32_S3_WiFiConfig ESP32_S3_WiFi_getConfig(void);

/**
 * @brief Reset WiFi settings (legacy)
 */
void ESP32_S3_WiFi_reset(void);

/**
 * @brief Start WiFi manager web server (legacy)
 * @return true if started
 */
bool ESP32_S3_WiFi_startManager(void);

/**
 * @brief Stop WiFi manager web server (legacy)
 */
void ESP32_S3_WiFi_stopManager(void);

/**
 * @brief Handle WiFi manager (legacy - call in loop)
 */
void ESP32_S3_WiFi_handleManager(void);

#ifdef __cplusplus
}
#endif

// ==========================================
// LEGACY WIFI MACROS
// ==========================================

#define ESP32_S3_WIFI_INIT()              ESP32_S3_WiFi_init()
#define ESP32_S3_WIFI_CONNECT(s,p)        ESP32_S3_WiFi_connect(s,p)
#define ESP32_S3_WIFI_DISCONNECT()        ESP32_S3_WiFi_disconnect()
#define ESP32_S3_WIFI_CONNECTED()         ESP32_S3_WiFi_isConnected()
#define ESP32_S3_WIFI_RSSI()              ESP32_S3_WiFi_getRSSI()
#define ESP32_S3_WIFI_IP()                ESP32_S3_WiFi_getIP()
#define ESP32_S3_WIFI_START_AP(s,p)       ESP32_S3_WiFi_startAP(s,p)
#define ESP32_S3_WIFI_STOP_AP()           ESP32_S3_WiFi_stopAP()
#define ESP32_S3_WIFI_AP_ACTIVE()         ESP32_S3_WiFi_isAPActive()
#define ESP32_S3_WIFI_SCAN()              ESP32_S3_WiFi_scanNetworks()
#define ESP32_S3_WIFI_RESET()             ESP32_S3_WiFi_reset()

// ==========================================
// LEGACY COMPATIBILITY WRAPPER CLASS
// ==========================================

#ifdef __cplusplus

/**
 * @brief Legacy ESP32-S3 WiFi Manager Class
 * 
 * Provides backward compatibility interface that wraps
 * the new WiFiManager implementation.
 */
class ESP32_S3_WiFiManager {
private:
  WiFiManager* wifiManager;
  ESP32_S3_WiFiStatus status;
  ESP32_S3_APConfig apConfig;
  ESP32_S3_WiFiConfig config;
  
public:
  /**
   * @brief Constructor
   */
  ESP32_S3_WiFiManager();
  
  /**
   * @brief Destructor
   */
  ~ESP32_S3_WiFiManager();
  
  /**
   * @brief Initialize WiFi manager
   * @return true if successful
   */
  bool begin();
  
  /**
   * @brief Connect to WiFi network
   * @param ssid network SSID
   * @param password network password
   * @return true if connected
   */
  bool connect(const String& ssid, const String& password);
  
  /**
   * @brief Disconnect from WiFi
   */
  void disconnect();
  
  /**
   * @brief Check if connected
   * @return true if connected
   */
  bool isConnected();
  
  /**
   * @brief Get signal strength
   * @return RSSI value
   */
  int getRSSI();
  
  /**
   * @brief Get IP address
   * @return IP address string
   */
  String getIP();
  
  /**
   * @brief Start access point
   * @param ssid AP SSID
   * @param password AP password
   * @return true if started
   */
  bool startAP(const String& ssid, const String& password);
  
  /**
   * @brief Stop access point
   */
  void stopAP();
  
  /**
   * @brief Check if AP is active
   * @return true if active
   */
  bool isAPActive();
  
  /**
   * @brief Get AP client count
   * @return number of clients
   */
  uint8_t getAPClientCount();
  
  /**
   * @brief Scan for networks
   * @return number of networks found
   */
  int scanNetworks();
  
  /**
   * @brief Get scanned SSID
   * @param index network index
   * @return SSID string
   */
  String getScannedSSID(int index);
  
  /**
   * @brief Get scanned RSSI
   * @param index network index
   * @return signal strength
   */
  int getScannedRSSI(int index);
  
  /**
   * @brief Set static IP
   * @param ip IP address
   * @param gateway gateway address
   * @param subnet subnet mask
   * @return true if successful
   */
  bool setStaticIP(const String& ip, const String& gateway, const String& subnet);
  
  /**
   * @brief Enable DHCP
   */
  void enableDHCP();
  
  /**
   * @brief Get status
   * @return WiFi status structure
   */
  ESP32_S3_WiFiStatus getStatus();
  
  /**
   * @brief Get AP configuration
   * @return AP configuration
   */
  ESP32_S3_APConfig getAPConfig();
  
  /**
   * @brief Set configuration
   * @param cfg WiFi configuration
   */
  void setConfig(const ESP32_S3_WiFiConfig& cfg);
  
  /**
   * @brief Get configuration
   * @return WiFi configuration
   */
  ESP32_S3_WiFiConfig getConfig();
  
  /**
   * @brief Reset settings
   */
  void reset();
  
  /**
   * @brief Update (call in loop)
   */
  void update();
  
  /**
   * @brief Start captive portal manager
   * @return true if started
   */
  bool startManager();
  
  /**
   * @brief Stop captive portal manager
   */
  void stopManager();
  
  /**
   * @brief Handle manager requests
   */
  void handleManager();
};

#endif // __cplusplus

// ==========================================
// LEGACY CONSTANTS
// ==========================================

#define ESP32_S3_WIFI_MODE_OFF            0
#define ESP32_S3_WIFI_MODE_STA            1
#define ESP32_S3_WIFI_MODE_AP             2
#define ESP32_S3_WIFI_MODE_APSTA          3

#define ESP32_S3_WIFI_AUTH_OPEN           0
#define ESP32_S3_WIFI_AUTH_WEP            1
#define ESP32_S3_WIFI_AUTH_WPA_PSK        2
#define ESP32_S3_WIFI_AUTH_WPA2_PSK       3
#define ESP32_S3_WIFI_AUTH_WPA_WPA2_PSK   4
#define ESP32_S3_WIFI_AUTH_WPA2_ENTERPRISE 5
#define ESP32_S3_WIFI_AUTH_WPA3_PSK       6

#define ESP32_S3_WIFI_POWER_19_5dBm       78
#define ESP32_S3_WIFI_POWER_19dBm         76
#define ESP32_S3_WIFI_POWER_18_5dBm       74
#define ESP32_S3_WIFI_POWER_17dBm         68
#define ESP32_S3_WIFI_POWER_15dBm         60
#define ESP32_S3_WIFI_POWER_13dBm         52
#define ESP32_S3_WIFI_POWER_11dBm         44
#define ESP32_S3_WIFI_POWER_8_5dBm        34
#define ESP32_S3_WIFI_POWER_7dBm          28
#define ESP32_S3_WIFI_POWER_5dBm          20
#define ESP32_S3_WIFI_POWER_2dBm          8
#define ESP32_S3_WIFI_POWER_MINUS_1dBm    -4

// Status constants
#define ESP32_S3_WIFI_IDLE_STATUS         0
#define ESP32_S3_WIFI_NO_SSID_AVAIL       1
#define ESP32_S3_WIFI_SCAN_COMPLETED      2
#define ESP32_S3_WIFI_CONNECTED           3
#define ESP32_S3_WIFI_CONNECT_FAILED      4
#define ESP32_S3_WIFI_CONNECTION_LOST     5
#define ESP32_S3_WIFI_DISCONNECTED        6

// Default values
#define ESP32_S3_WIFI_DEFAULT_TIMEOUT     10000
#define ESP32_S3_WIFI_DEFAULT_RETRIES     3
#define ESP32_S3_WIFI_DEFAULT_CHANNEL     1
#define ESP32_S3_WIFI_DEFAULT_MAX_CONN    4

// Deprecation warning
#ifdef __cplusplus
#pragma message("ESP32_S3_WiFiManager.h is deprecated. Please use WiFiManager.h for new development.")
#endif

#endif // ESP32_S3_WIFIMANAGER_H 