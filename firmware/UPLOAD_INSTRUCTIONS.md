# 🚀 ESP32 Upload Instructions

## ⚠️ IMPORTANT: Compilation Fix Applied

The compilation errors have been **fixed** by separating the firmware versions into different folders.

## 📁 Firmware Structure (Fixed)

```
firmware/
├── MainCollar/          # 🎯 MAIN VERSION (Recommended)
│   ├── MainCollar.ino   # ← Upload this for full features
│   └── modules/         # All modules included
├── SimpleCollar/        # 🔧 BASIC VERSION (Backup)
│   └── SimpleCollar.ino # ← Upload this for simple version
└── tools/               # Discovery tools
    └── find_collar.ps1  # Auto-discovery script
```

## 📚 Required Libraries

Install these libraries in Arduino IDE (**Tools** → **Manage Libraries**):
- `ArduinoJson` by Benoit Blanchon
- `Adafruit GFX Library` by Adafruit  
- `Adafruit SSD1306` by Adafruit (for OLED display)

## 🔌 Hardware Connections

### OLED Display (SSD1306 128x64)
- **VCC** → 3.3V or 5V
- **GND** → Ground
- **SDA** → GPIO 21 (default I2C data)
- **SCL** → GPIO 22 (default I2C clock)

### Other Components
- **LED** → GPIO 2 (built-in)
- **Button** → GPIO 0 (built-in)
- **Buzzer** → GPIO 25 (optional)

## 🎯 Step-by-Step Upload

### **Option 1: Main Firmware (Recommended)**

1. **Open Arduino IDE**
2. **File** → **Open** → Navigate to:
   ```
   firmware/MainCollar/MainCollar.ino
   ```
3. **Tools** → **Board** → **ESP32 Dev Module**
4. **Tools** → **Port** → Select your ESP32 port
5. **Upload** ⬆️ (Ctrl+U)

### **Option 2: Simple Firmware (If issues)**

1. **Open Arduino IDE**
2. **File** → **Open** → Navigate to:
   ```
   firmware/SimpleCollar/SimpleCollar.ino
   ```
3. **Tools** → **Board** → **ESP32 Dev Module**
4. **Tools** → **Port** → Select your ESP32 port
5. **Upload** ⬆️ (Ctrl+U)

## ✅ After Upload

1. **Open Serial Monitor** (115200 baud)
2. **Wait for WiFi setup** or check for "PetCollar-Setup" network
3. **Run discovery**: `PowerShell -ExecutionPolicy Bypass -File firmware/tools/find_collar.ps1`

## 🔧 Troubleshooting

### **Still Getting Compilation Errors?**
- ✅ Make sure **only ONE** .ino file is open
- ✅ Close Arduino IDE completely
- ✅ Open **only** `MainCollar.ino` OR `SimpleCollar.ino`
- ✅ **Never** open both at the same time

### **Upload Issues?**
- Hold **BOOT** button during upload
- Check cable connection
- Verify correct COM port selected

### **WiFi Issues?**
- Look for "PetCollar-Setup" WiFi network
- Connect and visit http://192.168.4.1
- Use serial commands: `wifi_status`, `reset_wifi`

### **Display Issues?**
- Check I2C connections (SDA=21, SCL=22)
- Try different I2C address: Change `0x3C` to `0x3D` in code
- Verify power supply to display (3.3V or 5V)
- In Serial Monitor, look for "Display initialized" message

## 🎉 Success!

Once uploaded, your ESP32 will:
- ✅ Create setup network (first boot)
- ✅ Connect to your WiFi
- ✅ Be discoverable by the web app
- ✅ Ready for remote control

**The compilation errors are now fixed!** 🎉 