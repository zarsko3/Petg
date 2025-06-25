# Enhanced WiFi Manager for ESP32 Pet Collar

A comprehensive WiFi management solution that provides static IP assignment, automatic server registration, and persistent server communication for ESP32-based pet collars.

## Features

🔧 **Static IP Configuration**
- Automatic network range detection via DHCP
- Configurable static IP assignment (default: .50 in detected range)
- Fallback to DHCP if static IP fails
- Persistent network configuration storage in EEPROM

🤝 **Automatic Server Integration**
- Automatic registration with application server upon connection
- Real-time IP address reporting to server
- Periodic heartbeat to maintain server connection
- Automatic re-registration after network reconnections

🌐 **Network Management**
- Enhanced WiFi connection monitoring and recovery
- Configurable connection timeouts and retry logic
- Configuration portal for WiFi setup
- Network diagnostics and status reporting

## Quick Start

### 1. Basic Implementation

```cpp
#include "enhanced_wifi_manager.h"

void setup() {
    Serial.begin(115200);
    
    // Initialize enhanced WiFi manager
    bool connected = enhancedWifiMgr.begin();
    
    if (connected) {
        Serial.println("✅ WiFi connected with server registration!");
    } else {
        Serial.println("🔧 Configuration portal started");
    }
}

void loop() {
    // Handle WiFi management and server heartbeat
    enhancedWifiMgr.loop();
    
    // Your application code here
    delay(100);
}
```

### 2. Custom Configuration

```cpp
void setup() {
    Serial.begin(115200);
    
    // Customize server URL (optional)
    enhancedWifiMgr.setServerURL("http://192.168.1.100:3000");
    
    // Enable specific static IP (optional)
    enhancedWifiMgr.enableStaticIP(
        IPAddress(192, 168, 1, 50),  // Static IP
        IPAddress(192, 168, 1, 1),   // Gateway
        IPAddress(255, 255, 255, 0)  // Subnet
    );
    
    // Initialize
    enhancedWifiMgr.begin();
}
```

## Configuration

### Static IP Settings (in `enhanced_wifi_manager.h`)

```cpp
// Static IP Configuration
#define ENABLE_STATIC_IP true           // Enable/disable static IP
#define STATIC_IP_OCTET 50             // Last octet for static IP
#define FALLBACK_TO_DHCP true          // Fallback to DHCP if static fails

// Server Communication
#define SERVER_BASE_URL "http://192.168.1.100:3000"  // Your server
#define HEARTBEAT_INTERVAL 30000       // 30 seconds between heartbeats
```

### Network Auto-Detection

The enhanced WiFi manager automatically:

1. **Detects Network Range**: Connects via DHCP to discover gateway and subnet
2. **Calculates Static IP**: Uses the detected gateway with your chosen octet
3. **Configures Static IP**: Applies the calculated IP configuration
4. **Falls Back to DHCP**: If static IP fails and fallback is enabled

Example auto-detection process:
```
🔍 Detecting network range via DHCP...
✅ Network range detected:
   DHCP IP: 192.168.1.127
   Gateway: 192.168.1.1
📍 Calculated static IP: 192.168.1.50
```

## Server Communication

### Registration Process

Upon successful WiFi connection, the collar automatically:

1. **Registers with Server**: Sends device info to `/api/collar-registration`
2. **Reports IP Address**: Notifies server of current IP via `/api/collar-ip-update`
3. **Starts Heartbeat**: Begins periodic heartbeat to `/api/collar-heartbeat`

### Registration Payload Example

```json
{
  "device_id": "PetCollar-A1B2C3D4",
  "device_type": "pet_collar",
  "firmware_version": "2.0.0-enhanced",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "ip_address": "192.168.1.50",
  "network_type": "static",
  "wifi_ssid": "MyWiFiNetwork",
  "signal_strength": -45,
  "gateway": "192.168.1.1",
  "subnet": "255.255.255.0",
  "capabilities": {
    "web_server": true,
    "websocket": true,
    "ble_scanning": true,
    "real_time_tracking": true
  },
  "endpoints": {
    "web_interface": "http://192.168.1.50",
    "websocket": "ws://192.168.1.50:8080",
    "api": "http://192.168.1.50/data"
  },
  "registration_time": 12345678,
  "status": "online"
}
```

### Heartbeat Payload Example

```json
{
  "device_id": "PetCollar-A1B2C3D4",
  "status": "online",
  "ip_address": "192.168.1.50",
  "signal_strength": -42,
  "uptime": 3600,
  "free_heap": 234567,
  "wifi_connected": true,
  "timestamp": 12345678
}
```

## API Methods

### Connection Management

```cpp
// Connection status
bool isConnected();              // WiFi connection status
bool isServerConnected();        // Server registration status
String getIP();                  // Current IP address
bool isUsingStaticIP();         // Static IP vs DHCP

// Information
String getDeviceId();           // Unique device identifier
String getSSID();               // Current WiFi network
String getLastError();          // Last error message
int getSignalStrength();        // WiFi signal strength in dBm
```

### Configuration Methods

```cpp
// Network configuration
void enableStaticIP(IPAddress ip, IPAddress gateway, IPAddress subnet);
void enableDHCP();
void setServerURL(const String& url);
void enableServerRegistration(bool enable);

// Manual operations
bool forceServerRegistration(); // Force re-registration
bool testServerConnection();    // Test server connectivity
void resetSettings();           // Reset all settings
```

### Information Display

```cpp
void displayConnectionInfo();    // Complete network information
void displayNetworkConfig();     // Static IP configuration
void displayServerStatus();      // Server connection status
void announcePresence();         // Network announcement
```

## Serial Commands

The example sketch includes interactive serial commands:

- `status` - Show current connection status
- `register` - Force server re-registration
- `test` - Test server connection
- `info` - Display detailed network information
- `reset` - Reset WiFi settings
- `server <url>` - Set custom server URL
- `static <ip> <gateway> <subnet>` - Configure static IP
- `help` - Show available commands

Example:
```
status
register
server http://192.168.1.200:3000
static 192.168.1.75 192.168.1.1 255.255.255.0
```

## Server Setup

### Required API Endpoints

Create these Next.js API routes in your application:

1. **`/api/collar-registration`** - Handle collar registration
2. **`/api/collar-heartbeat`** - Handle periodic heartbeats  
3. **`/api/collar-ip-update`** - Handle IP address changes

The provided server-side code creates a collar registry that tracks:
- Device registration and capabilities
- IP address changes and network information
- Connection history and heartbeat status
- Real-time collar availability

### Registry Files

The server maintains two files:
- `public/collar_registry.json` - Complete collar database
- `public/collar_config.json` - Current active collar configuration

## Network Configuration Examples

### Example 1: Home Network (192.168.1.x)
```cpp
enhancedWifiMgr.enableStaticIP(
    IPAddress(192, 168, 1, 50),    // Collar IP
    IPAddress(192, 168, 1, 1),     // Router gateway
    IPAddress(255, 255, 255, 0)    // Subnet mask
);
```

### Example 2: Business Network (10.0.0.x)
```cpp
enhancedWifiMgr.enableStaticIP(
    IPAddress(10, 0, 0, 50),       // Collar IP
    IPAddress(10, 0, 0, 1),        // Gateway
    IPAddress(255, 255, 255, 0)    // Subnet mask
);
```

### Example 3: Auto-Detection (Recommended)
```cpp
// Let the system auto-detect and use octet 50
// No manual configuration needed - just call begin()
enhancedWifiMgr.begin();
```

## Troubleshooting

### Static IP Connection Issues

1. **IP Conflict**: Choose a different octet (modify `STATIC_IP_OCTET`)
2. **Wrong Gateway**: Check your router's actual gateway IP
3. **DHCP Range Conflict**: Ensure static IP is outside DHCP range

### Server Communication Issues

1. **Server URL**: Verify the server URL is accessible from ESP32
2. **Firewall**: Ensure server ports (typically 3000) are open
3. **CORS**: Server should accept requests from ESP32 IP

### Network Discovery Problems

1. **DHCP Disabled**: Auto-detection requires DHCP for initial discovery
2. **Network Timeout**: Increase `WIFI_CONNECTION_TIMEOUT` if needed
3. **Portal Access**: Connect to `PetCollar-XXXXXX` AP for manual configuration

## Expected Serial Output

```
🚀 Enhanced WiFi Manager starting...
🏷️  Device ID: PetCollar-A1B2C3D4
💾 Found saved WiFi credentials
📡 Saved Network: MyWiFiNetwork
🔧 Static IP configuration found
🔄 Connection attempt 1/3...
🔗 Attempting static IP connection...
🔧 Configuring static IP...
   IP: 192.168.1.50
   Gateway: 192.168.1.1
   Subnet: 255.255.255.0
   DNS1: 8.8.8.8
   DNS2: 8.8.4.4
✅ Static IP configured successfully
....
✅ Static IP connection successful!
═══════════════════════════════════
    🐕 Enhanced PetCollar Network
═══════════════════════════════════
📡 Network: MyWiFiNetwork
🌐 IP Address: 192.168.1.50 (Static)
🔗 Gateway: 192.168.1.1
🔍 Subnet: 255.255.255.0
📶 Signal: -45 dBm
🏷️  Device ID: PetCollar-A1B2C3D4
📱 MAC: AA:BB:CC:DD:EE:FF
───────────────────────────────────
🌐 Web Interface: http://192.168.1.50
🔌 WebSocket: ws://192.168.1.50:8080
📊 API: http://192.168.1.50/data
───────────────────────────────────
🔗 Server: http://192.168.1.100:3000
📡 Registered: Yes
💓 Last Contact: 2 ms ago
═══════════════════════════════════
🤝 Initiating server handshake...
📤 Registering with server: http://192.168.1.100:3000/api/collar-registration
✅ Registration request successful
✅ Server registration successful
✅ IP address reported to server
✅ Initial heartbeat sent
🎉 Complete server handshake successful!
📢 Announcing collar presence on network...
✅ Collar is registered and ready for remote management!
```

## Integration with Existing Code

To integrate with your existing collar firmware:

1. **Replace WiFi Manager**: Substitute existing WiFi code with enhanced manager
2. **Update Includes**: Include the enhanced WiFi manager headers
3. **Modify Loop**: Add `enhancedWifiMgr.loop()` to your main loop
4. **Server Integration**: Update your server with the new API endpoints

The enhanced WiFi manager is designed to be a drop-in replacement that adds significant networking capabilities while maintaining compatibility with existing collar functionality.

## Dependencies

- ESP32 Arduino Core
- WiFiManager library
- ArduinoJson library
- Standard ESP32 libraries (WiFi, EEPROM, HTTPClient)

## Benefits

✅ **Reliable Static IP**: No more changing IP addresses after router restarts
✅ **Automatic Discovery**: Your app always knows where to find the collar
✅ **Server Integration**: Real-time collar status and connectivity monitoring
✅ **Network Resilience**: Automatic reconnection and recovery
✅ **Configuration Persistence**: Settings survive power cycles and resets
✅ **Comprehensive Logging**: Detailed network and server communication logs 