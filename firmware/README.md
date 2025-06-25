# ESP32 Pet Collar Firmware

This directory contains the complete ESP32 firmware for the Pet Collar tracking system.

## 📁 Structure

```
firmware/
├── MainCollar/                  # Main feature-rich firmware
│   ├── MainCollar.ino          # Complete firmware with all features
│   └── modules/                # ESP32 modules
├── MainCollar_Advanced/         # 🆕 ADVANCED firmware (BLE + OLED)
│   ├── MainCollar_Advanced.ino # Full advanced features (✅ READY!)
│   └── micro_*.h              # Modular architecture
│       ├── micro_web_integration.h     # Web server & WebSocket
│       ├── micro_ble_scanner.h         # Bluetooth scanning
│       ├── micro_settings_manager.h    # WiFi & settings
│       ├── micro_alert_manager.h       # Buzzer & vibration
│       ├── micro_battery_manager.h     # Battery monitoring
│       ├── micro_display_manager.*     # OLED display
│       ├── micro_ota_manager.h         # Over-the-air updates
│       ├── micro_triangulator.h        # Position calculation
│       ├── micro_config.h              # Configuration
│       └── modules.h                   # Module includes
├── SimpleCollar/                # Simplified backup firmware
│   └── SimpleCollar.ino        # Basic working version
└── tools/                      # Discovery & setup tools
    └── find_collar.ps1         # PowerShell discovery script
```

## 🚀 Quick Start

### 🆕 **1. Upload Advanced Firmware (NEWEST! Recommended)**
1. Open **Arduino IDE**
2. Open `MainCollar_Advanced/MainCollar_Advanced.ino`
3. Select **ESP32 Dev Module** board
4. Select your COM port
5. Click **Upload** ⬆️
6. **Features**: BLE Scanner + OLED Display + Full tracking

### 2. Upload Main Firmware (Alternative)
1. Open **Arduino IDE**
2. Open `MainCollar/MainCollar.ino`
3. Select **ESP32 Dev Module** board
4. Select your COM port
5. Click **Upload** ⬆️

### 2. Alternative: Simple Firmware
If you want a basic version:
1. Open `SimpleCollar/SimpleCollar.ino`
2. Upload the same way

### 3. WiFi Setup
- **First Boot**: ESP32 creates "PetCollar-Setup" network
- Connect to it (no password)
- Visit **http://192.168.4.1**
- Configure your home WiFi
- ESP32 restarts and connects

### 4. Find Your Collar
- Run: `tools/find_collar.ps1`
- Automatically discovers and configures web app

## 📡 Beacon Setup (NEW!)

**You'll need separate beacon devices for triangulation:**

### Quick Beacon Setup:
1. **Navigate to beacon folder**: `firmware/BeaconDevice/`
2. **Read Quick Start**: `QUICK_START_Hebrew.md` (Hebrew) or `README.md` (English)
3. **Upload to ESP32**: Change `BEACON_ID` for each device (1, 2, 3, etc.)
4. **Place beacons**: Different rooms, 5-15m apart

### Automated Beacon Upload:
```powershell
# Windows PowerShell - uploads to multiple devices automatically
cd firmware/BeaconDevice
.\upload_multiple_beacons.ps1 -NumBeacons 3
```

### Manual Beacon Upload:
1. Open `BeaconDevice/BeaconDevice.ino` in Arduino IDE
2. Change: `#define BEACON_ID 1` (use 2, 3, 4 for other beacons)
3. Upload to ESP32
4. Repeat for each beacon with different ID

**Result:** Collar will detect beacons as `PetZone-01`, `PetZone-02`, etc.

## 🔧 Serial Commands

Connect Serial Monitor (115200 baud) and use:

```
wifi_status    - Check WiFi connection
wifi_scan      - Scan available networks
reset_wifi     - Clear WiFi settings
setup_mode     - Enter setup mode
alert_start    - Test buzzer/vibration
alert_stop     - Stop alert
battery_check  - Check battery level
restart        - Restart ESP32
help          - Show all commands
```

## 📡 Network Configuration

- **Normal Mode**: Connects to your home WiFi
- **Setup Mode**: Creates AP at 192.168.4.1
- **Web Interface**: Port 80 (HTTP)
- **WebSocket**: Port 8080
- **Timeout**: 5 minutes in setup mode

## 🔋 Hardware Requirements

- **ESP32 Development Board**
- **Buzzer** (Pin 25)
- **Button** (Pin 0 - built-in)
- **LED** (Pin 2 - built-in)
- **OLED Display** (I2C, optional)
- **Battery** (3.7V LiPo recommended)

## 🔍 Troubleshooting

### WiFi Issues
- Check Serial Monitor for connection details
- Use `reset_wifi` command to clear settings
- Look for "PetCollar-Setup" network

### Upload Issues
- Ensure correct board and port selected
- Press and hold BOOT button during upload
- Check cable connection

### Compilation Errors
- **IMPORTANT**: Only open one firmware version at a time
- `MainCollar.ino` - Full featured version
- `SimpleCollar.ino` - Basic version
- Don't have both open simultaneously

### Web App Connection
- Run discovery script: `tools/find_collar.ps1`
- Check IP address in Serial Monitor
- Ensure ESP32 and computer on same network

## 📈 Features

### 🆕 MainCollar_Advanced (Latest Version - ✅ READY!)
- ✅ **BLE Scanner**: מוצא משדרים אוטומטית
- ✅ **OLED Display**: מסך מידע מתחלף
- ✅ **Triangulation**: חישוב מיקום משולש  
- ✅ **WebSocket**: עדכונים בזמן אמת
- ✅ **Battery Monitoring**: ניטור בטרייה מתקדם
- ✅ **Alert System**: התראות חכמות
- ✅ **Modular Design**: ארכיטקטורה מודולרית
- ✅ **JSON API**: ממשק נתונים מפורט

### MainCollar (Original Full Version)
- ✅ **WiFi Setup**: Automatic captive portal
- ✅ **WebSocket**: Real-time communication
- ✅ **BLE Scanning**: Beacon detection
- ✅ **Alert System**: Buzzer + vibration
- ✅ **Battery Monitor**: Voltage tracking
- ✅ **OTA Updates**: Wireless firmware updates
- ✅ **Position Tracking**: Triangulation support
- ✅ **Web Interface**: Built-in control panel

### SimpleCollar (Basic Version)
- ✅ **WiFi Connection**: Basic connectivity
- ✅ **WebSocket**: Real-time communication
- ✅ **Alert System**: Buzzer control
- ✅ **Serial Commands**: Debug interface
- ✅ **Web Interface**: Simple control panel

## 🏗️ Development

### Choosing Firmware Version
- **MainCollar**: Use for production with all features
- **SimpleCollar**: Use for testing or minimal setup

### Building
1. Install ESP32 Arduino Core
2. Install required libraries (ArduinoJson, Preferences)
3. Select ESP32 Dev Module board
4. Open **only one** firmware version
5. Compile and upload

For detailed web app integration, see the main project README. 