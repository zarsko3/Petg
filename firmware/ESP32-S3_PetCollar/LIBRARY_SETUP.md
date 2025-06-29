# 📚 Arduino Library Setup Guide

## Required Libraries for ESP32-S3 PetCollar Firmware

### **🔧 Installation Methods**

#### **Method 1: Arduino IDE Library Manager (Recommended)**
1. Open Arduino IDE
2. Go to `Tools` → `Manage Libraries...`
3. Search and install each library below
4. Use the versions specified or newer

#### **Method 2: PlatformIO (Automatic)**
```bash
cd firmware/ESP32-S3_PetCollar
pio lib install
```

---

## **📦 Core Libraries (Required for All Variants)**

| Library | Author | Version | Purpose |
|---------|--------|---------|---------|
| **ESP32 Core** | Espressif | 3.2.0+ | ESP32-S3 hardware support |
| **WiFi** | Espressif | Built-in | WiFi connectivity |
| **WebServer** | Espressif | Built-in | HTTP server |
| **ArduinoJson** | Benoit Blanchon | 7.0.0+ | JSON parsing |
| **Adafruit GFX Library** | Adafruit | 1.11.0+ | Graphics primitives |
| **Adafruit SSD1306** | Adafruit | 2.5.0+ | OLED display driver |
| **ESP32 BLE Arduino** | Espressif | Built-in | Bluetooth Low Energy |

### **Arduino IDE Installation Commands:**
```
Search: "ArduinoJson" → Install "ArduinoJson by Benoit Blanchon"
Search: "Adafruit GFX" → Install "Adafruit GFX Library by Adafruit"  
Search: "Adafruit SSD1306" → Install "Adafruit SSD1306 by Adafruit"
```

---

## **🌐 MQTT Libraries (Additional for MQTT Variant)**

| Library | Author | Version | Purpose |
|---------|--------|---------|---------|
| **PubSubClient** | Nick O'Leary | 2.8.0+ | MQTT client |
| **WiFiClientSecure** | Espressif | Built-in | TLS/SSL support |

### **Arduino IDE Installation Commands:**
```
Search: "PubSubClient" → Install "PubSubClient by Nick O'Leary"
```

**⚠️ CRITICAL:** The MQTT firmware will NOT compile without PubSubClient!

---

## **🔍 Library Verification**

### **Check Installed Libraries:**
1. Open Arduino IDE
2. Go to `Sketch` → `Include Library` → `Manage Libraries...`
3. In the search box, type each library name
4. Verify "INSTALLED" appears next to each library

### **Library Paths:**
- **Windows:** `C:\Users\{username}\Documents\Arduino\libraries\`
- **Mac:** `~/Documents/Arduino/libraries/`
- **Linux:** `~/Arduino/libraries/`

---

## **🚨 Common Issues & Solutions**

### **Issue 1: "PubSubClient.h: No such file or directory"**
```cpp
fatal error: PubSubClient.h: No such file or directory
```
**Solution:** Install PubSubClient library via Library Manager

### **Issue 2: "Multiple libraries found for WiFi.h"**
```cpp
Multiple libraries were found for "WiFi.h"
Used: ESP32 core version
Not used: Arduino WiFi library
```
**Solution:** This is normal - ESP32 core WiFi library is correctly selected

### **Issue 3: "ArduinoJson.h version mismatch"**
**Solution:** Update to ArduinoJson v7.0.0+ (v6 has different API)

### **Issue 4: "Adafruit_SSD1306.h not found"**
**Solution:** Install both Adafruit GFX Library AND Adafruit SSD1306

---

## **📝 Quick Install Script**

### **For Windows PowerShell:**
```powershell
# Download and install missing libraries
Write-Host "📚 Installing Arduino Libraries for PetCollar..."

# Note: These commands require arduino-cli
# Install arduino-cli first: https://arduino.github.io/arduino-cli/

arduino-cli lib install "ArduinoJson@^7.0.0"
arduino-cli lib install "PubSubClient@^2.8.0"  
arduino-cli lib install "Adafruit GFX Library@^1.11.0"
arduino-cli lib install "Adafruit SSD1306@^2.5.0"

Write-Host "✅ Library installation complete!"
```

### **For Linux/Mac:**
```bash
#!/bin/bash
echo "📚 Installing Arduino Libraries for PetCollar..."

arduino-cli lib install "ArduinoJson@^7.0.0"
arduino-cli lib install "PubSubClient@^2.8.0"  
arduino-cli lib install "Adafruit GFX Library@^1.11.0"
arduino-cli lib install "Adafruit SSD1306@^2.5.0"

echo "✅ Library installation complete!"
```

---

## **🎯 Firmware Compilation Checklist**

### **Before Compiling:**
- [ ] ESP32 board package installed (v3.2.0+)
- [ ] Board selected: "ESP32S3 Dev Module" 
- [ ] All core libraries installed
- [ ] For MQTT: PubSubClient library installed
- [ ] Sketch compiles without errors

### **Compilation Success Indicators:**
```
Sketch uses XXXXX bytes (XX%) of program storage space.
Global variables use XXXXX bytes (XX%) of dynamic memory.
```

### **Upload Success Indicators:**
```
Writing at 0x00001000... (100%)
Wrote XXXXX bytes (XXXXX compressed) at 0x00001000
Hash of data verified.
Hard resetting via RTS pin...
```

---

## **🔧 Troubleshooting**

1. **Restart Arduino IDE** after installing libraries
2. **Clear cache:** Delete `%TEMP%\arduino_*` folders (Windows)
3. **Verify board selection:** ESP32S3 Dev Module
4. **Check USB driver:** Install CP2102 or CH340 driver if needed
5. **Try different USB port** if upload fails

**Still having issues?** Check the compilation error details and ensure all libraries are correctly installed. 