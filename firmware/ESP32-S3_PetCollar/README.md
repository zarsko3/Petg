# ESP32-S3 Pet Collar - WebSocket Local Version

## 🌟 **Local WebSocket Integration**
This firmware version uses **WebSocket connections** to communicate directly with your local web application, ideal for local development and direct IP connections.

## 📋 **Features**
- **Direct WebSocket Connection** - Connects to local web server
- **Real-time Communication** - Instant bidirectional messaging
- **Local Network Focus** - Works on your LAN without cloud dependency
- **Simple Setup** - No cloud account needed
- **Development Friendly** - Easy debugging and testing

## 🆚 **Two Firmware Options Available**

### 🔗 **This Version: WebSocket (Local)**
- **Best for**: Local development, testing, direct connections
- **Connection**: WebSocket to local web server (ws://192.168.x.x:8080)
- **Setup**: Configure WiFi + local server IP
- **Pros**: Simple, fast, no cloud dependency
- **Cons**: Requires tunneling for remote access

### ☁️ **Alternative: MQTT Cloud Version**
- **Location**: `../ESP32-S3_PetCollar_MQTT/`
- **Best for**: Production, remote monitoring, multiple collars
- **Connection**: MQTT over TLS to HiveMQ Cloud
- **Setup**: Configure WiFi + cloud credentials
- **Pros**: Cloud-native, scalable, remote access
- **Cons**: Requires cloud account

## 🔧 **Configuration**

### 1. WiFi Settings
Edit in `ESP32-S3_PetCollar.ino`:
```cpp
const char* ssid = "YOUR_WIFI_NAME";
const char* password = "YOUR_WIFI_PASSWORD";
```

### 2. WebSocket Server
The collar will discover and connect to WebSocket servers on port 8080 automatically, or you can configure a specific IP.

## 🚀 **Setup Instructions**

1. **Open in Arduino IDE**
   - Open `ESP32-S3_PetCollar.ino`
   - Ensure no other .ino files are in this directory

2. **Install Required Libraries**
   - ArduinoJson v7.0+
   - Adafruit GFX Library
   - Adafruit SSD1306
   - WebSockets Library

3. **Configure WiFi**
   - Update WiFi credentials in the code

4. **Upload to ESP32-S3**

5. **Start Web Application**
   - Run your Next.js web app with WebSocket server
   - Collar will auto-discover and connect

## 🔌 **Connection Flow**
```
ESP32 Collar → WiFi → Local Network → Web App (WebSocket Server)
```

## 🎯 **Choose Your Version**

| Use Case | Recommended Version |
|----------|-------------------|
| **Local Development** | This WebSocket version |
| **Testing & Debugging** | This WebSocket version |  
| **Production Deployment** | MQTT Cloud version |
| **Remote Monitoring** | MQTT Cloud version |
| **Multiple Collars** | MQTT Cloud version |

## 📁 **Directory Structure**
```
firmware/
├── ESP32-S3_PetCollar/          ← This WebSocket version
│   ├── ESP32-S3_PetCollar.ino
│   └── include/...
└── ESP32-S3_PetCollar_MQTT/     ← MQTT Cloud version
    ├── ESP32-S3_PetCollar_MQTT.ino
    └── config.h
```

Both versions are complete, standalone firmware - choose the one that fits your needs!

## 📁 **File Structure**

```
ESP32-S3_PetCollar/
├── ESP32-S3_PetCollar.ino        # 🎯 MAIN FIRMWARE (Complete Implementation)
├── ESP32-S3_PetCollar_Simple.ino # 🔧 BACKUP (Simplified Version)
├── include/                       # 📋 Configuration & Icon Libraries
│   ├── ESP32_S3_Config.h         # Hardware & system configuration  
│   ├── display_icons.h           # OLED display icons & graphics
│   ├── ESP32_S3_WiFiManager.h    # Advanced WiFi management
│   └── micro_*.h                 # Modular system components
├── COMPLETE_FIRMWARE_GUIDE.md    # 📖 Complete setup & usage guide
└── README.md                     # 📄 This file
```

## 🚀 **Quick Start**

### **For Complete Implementation (Recommended):**
1. Open `ESP32-S3_PetCollar.ino` in Arduino IDE
2. Install required libraries (see guide below)
3. Upload to ESP32-S3 board

### **For Simplified Version (Fallback):**
1. Open `ESP32-S3_PetCollar_Simple.ino` 
2. Fewer dependencies, no display support
3. Basic proximity alerts only

## 📚 **Required Libraries**

Install these in Arduino IDE (Tools → Manage Libraries):
- **ArduinoJson** (by Benoit Blanchon)
- **WebSockets** (by Markus Sattler)
- **Adafruit GFX Library**
- **Adafruit SSD1306**
- **ESP32 Arduino Core** (3.0.0+)

## ⚙️ **Board Configuration**

```
Tools Settings:
├── Board: "ESP32S3 Dev Module" 
├── USB CDC On Boot: "Enabled"
├── CPU Frequency: "240MHz (WiFi/BT)"
├── Flash Size: "8MB (64Mb)" 
├── Partition Scheme: "8M with spiffs"
└── Upload Speed: "921600"
```

## 🔌 **Hardware Connections**

### **OLED Display (Required for main firmware):**
- VCC → 3.3V
- GND → GND
- SDA → GPIO 8
- SCL → GPIO 9

### **Optional Components:**
- Buzzer → GPIO 15
- Vibration Motor → GPIO 16  
- Status LEDs → GPIO 21, 47, 14
- Battery Monitor → GPIO 4

## 🌐 **WiFi Setup**

**First Boot:** Device creates setup network
- SSID: `ESP32-S3-PetCollar-Setup`
- Password: `12345678`
- Configure at: `http://192.168.4.1`

**Subsequent Boots:** Automatically connects to saved network

## 📖 **Complete Documentation**

For detailed setup, troubleshooting, and advanced features:
👉 **[COMPLETE_FIRMWARE_GUIDE.md](COMPLETE_FIRMWARE_GUIDE.md)**

## 🎯 **Version Differences**

| Feature | Main Firmware | Simple Firmware |
|---------|---------------|-----------------|
| OLED Display | ✅ Full UI | ❌ None |
| WiFi Setup | ✅ Captive Portal | ❌ Hardcoded |
| Battery Monitor | ✅ Real-time | ❌ None |
| Status LEDs | ✅ Multiple | ✅ Basic |
| Alert System | ✅ Advanced | ✅ Basic |
| WebSocket API | ✅ Complete | ✅ Basic |
| Dependencies | More Libraries | Minimal |

**Recommendation:** Use main firmware (`ESP32-S3_PetCollar.ino`) for full features.
Use simple firmware only if you encounter library or hardware issues.

---

**🚀 Ready to upload and test your ESP32-S3 Pet Collar!** 