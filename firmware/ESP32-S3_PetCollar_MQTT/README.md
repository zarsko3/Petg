# ESP32-S3 Pet Collar - MQTT Cloud Version

## 🌟 **MQTT Cloud Integration**
This firmware version uses **MQTT over TLS** to connect directly to HiveMQ Cloud, eliminating the need for local WebSocket tunneling.

## 📋 **Features**
- **Cloud-First Architecture** - Direct connection to HiveMQ Cloud
- **TLS/SSL Security** - Encrypted communication
- **Real-time Telemetry** - Battery, WiFi, BLE status
- **Remote Commands** - Buzzer control, system management
- **Automatic Reconnection** - Robust connection handling
- **Status Publishing** - System state reporting

## 🔧 **Configuration Required**

### 1. WiFi Credentials
```cpp
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. MQTT Cloud Settings  
```cpp
const char* mqtt_server = "your-hivemq-cluster.hivemq.cloud";
const int mqtt_port = 8883; // TLS port
const char* mqtt_user = "your-username";
const char* mqtt_password = "your-password";
```

### 3. Device Configuration
```cpp
const char* COLLAR_ID = "collar_001";
```

## 🚀 **Setup Instructions**

1. **Open in Arduino IDE**
   - Open `ESP32-S3_PetCollar_MQTT.ino` 
   - Make sure only this .ino file is in the directory

2. **Install Libraries** (if not already installed)
   - PubSubClient v2.8+
   - ArduinoJson v7.0+
   - Adafruit GFX Library
   - Adafruit SSD1306

3. **Configure Settings**
   - Update WiFi credentials
   - Add your HiveMQ Cloud details
   - Set unique collar ID

4. **Upload to ESP32-S3**

## 📡 **MQTT Topics**

### Published by Collar:
- `pet-collar/collar_001/status` - System status
- `pet-collar/collar_001/telemetry` - Sensor data
- `pet-collar/collar_001/heartbeat` - Keep-alive
- `pet-collar/collar_001/alert` - Emergency alerts

### Subscribed by Collar:
- `pet-collar/collar_001/command` - Remote commands
- `pet-collar/collar_001/config` - Configuration updates

## 🆚 **vs WebSocket Version**
| Feature | MQTT Version | WebSocket Version |
|---------|-------------|-------------------|
| **Connection** | Direct to cloud | Requires tunneling |
| **Security** | Built-in TLS | Manual SSL setup |
| **Scalability** | Multi-device ready | Single connection |
| **Offline Handling** | Automatic | Manual reconnect |
| **Setup Complexity** | Simple cloud config | Complex networking |

## 🎯 **Recommended For**
- **Production deployments**
- **Multiple collar management**
- **Remote monitoring setups**
- **Cloud-based applications**

The WebSocket version in `../ESP32-S3_PetCollar/` is better for local development and direct IP connections. 