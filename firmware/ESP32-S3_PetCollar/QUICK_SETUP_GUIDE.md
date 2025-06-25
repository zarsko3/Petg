# ⚡ ESP32-S3 Pet Collar - Quick Setup Guide

**Get your ESP32-S3 pet collar running in 5 minutes!**

## 🚀 Prerequisites (2 minutes)

1. **Arduino IDE 2.0+** installed
2. **ESP32-S3 board** (DevKitC-1 recommended)
3. **USB-C cable** for programming

## 🔧 Arduino IDE Setup (1 minute)

### **Add ESP32-S3 Board Support**
1. **File** → **Preferences**
2. **Additional Board Manager URLs**:
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
3. **Tools** → **Board** → **Boards Manager**
4. Search **"ESP32"** → Install **"esp32 by Espressif Systems"** (3.0.0+)

### **Install Required Libraries**
**Tools** → **Manage Libraries** → Install these:
- ✅ **ArduinoJson** (by Benoit Blanchon)
- ✅ **WebSockets** (by Markus Sattler)  
- ✅ **Adafruit GFX Library**
- ✅ **Adafruit SSD1306**

## ⚙️ Board Configuration (30 seconds)

**Tools** menu settings:
```
Board: "ESP32S3 Dev Module"
USB CDC On Boot: "Enabled"
CPU Frequency: "240MHz (WiFi/BT)"
Flash Size: "8MB (64Mb)"
Partition Scheme: "8M with spiffs (3MB APP/1.5MB SPIFFS)"
Upload Speed: "921600"
USB Mode: "Hardware CDC and JTAG"
```

## 📤 Upload Firmware (1 minute)

1. **Open**: `ESP32-S3_PetCollar.ino`
2. **Connect** ESP32-S3 via USB-C
3. **Select Port**: Choose correct COM port
4. **Upload**: Click upload button (→)

### 🔄 If Upload Fails:
- Hold **BOOT** button while clicking upload
- Release when "Connecting..." appears
- Try different USB cable/port

## 📱 WiFi Setup (1 minute)

### **First Boot:**
1. **Open Serial Monitor** (115200 baud)
2. **Look for**: "WiFi Network: ESP32-S3-PetCollar-Setup"
3. **Connect phone/computer** to this network
4. **Open browser**: `http://192.168.4.1`
5. **Enter** your WiFi credentials
6. **Click Save** - device will restart and connect

### **Success Indicators:**
```
✅ ESP32-S3 Pet Collar Ready!
🌐 Web Interface: http://192.168.1.89
🔌 WebSocket: ws://192.168.1.89:8080
```

## 🌐 Access Web Dashboard

**Open browser** to the IP address shown in serial monitor
- **Real-time dashboard** with system status
- **Live WebSocket updates** every 500ms
- **BLE beacon detection** display
- **System controls** (restart, reset, etc.)

## 🔧 Hardware Connections (Optional)

### **OLED Display (128x64 SSD1306)**
```
VCC → 3.3V
GND → GND
SDA → GPIO 8
SCL → GPIO 9
```

### **Buzzer (Optional)**
```
+ → GPIO 15
- → GND
```

### **Status LEDs (Optional)**
```
WiFi LED  → GPIO 21 → 330Ω resistor → GND
BLE LED   → GPIO 47 → 330Ω resistor → GND
Power LED → GPIO 14 → 330Ω resistor → GND
```

## 📱 Basic Commands

**Serial Monitor** (115200 baud):
```
help     - Show all commands
status   - System status
wifi     - WiFi details
test     - Run system test
restart  - Restart device
reset    - Reset WiFi settings
```

## 🎯 What You Get

✅ **Modern Web Dashboard**
- Real-time system monitoring
- Battery, WiFi, BLE status
- Detected BLE beacons
- Memory and performance metrics

✅ **Advanced Features**
- WebSocket live updates
- BLE beacon scanning
- Battery monitoring
- OLED display support
- Alert system ready

✅ **ESP32-S3 Benefits**
- 512KB SRAM (vs 320KB)
- Native USB programming
- Hardware security features
- Enhanced WiFi performance
- Better power management

## 🔍 Quick Troubleshooting

**❌ Compilation errors:**
- Install all required libraries
- Use ESP32 core 3.0.0+
- Check partition scheme

**❌ Upload failed:**
- Hold BOOT button during upload
- Check USB cable and port
- Try slower upload speed (115200)

**❌ WiFi not connecting:**
- Use 2.4GHz network only
- Reset: type `reset` in serial monitor
- Check WPA2 compatibility

**❌ Display not working:**
- Verify I2C connections (GPIO 8,9)
- Check display address (0x3C)
- Set `OLED_DISPLAY_ENABLED false` in config

## 🚀 Next Steps

1. **📱 Test web interface** - Open dashboard in browser
2. **🔍 Check BLE scanning** - Look for detected beacons
3. **🔋 Monitor battery** - If connected, check voltage
4. **⚙️ Customize settings** - Edit `ESP32_S3_Config.h`
5. **🔧 Add hardware** - Connect OLED, LEDs, buzzer

## 💡 Pro Tips

- **USB-C native**: No drivers needed for programming
- **Dual core**: WiFi/BLE runs on Core 0, app on Core 1  
- **Memory optimized**: 8MB flash allows for complex features
- **Security ready**: Hardware encryption available
- **OTA capable**: Firmware updates over WiFi

---

**🎉 Your ESP32-S3 Pet Collar is now ready!**

**Dashboard**: `http://[your-device-ip]`  
**Commands**: Type `help` in Serial Monitor  
**Support**: Check main README.md for detailed info 