# ESP32-S3 Pet Collar Firmware

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