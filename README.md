# 🐕 ESP32 Pet Collar Tracking System

> **Professional IoT solution for pet tracking using ESP32 with Enhanced WiFi Manager, static IP assignment, automatic server registration, and real-time monitoring.**

## 📋 Table of Contents

1. [Overview](#overview)
2. [Key Features](#key-features)
3. [Quick Start](#quick-start)
4. [Hardware Requirements](#hardware-requirements)
5. [Installation Guide](#installation-guide)
6. [Configuration](#configuration)
7. [Usage](#usage)
8. [API Documentation](#api-documentation)
9. [Troubleshooting](#troubleshooting)
10. [Development](#development)
11. [License](#license)

## 🎯 Overview

The ESP32 Pet Collar Tracking System is a complete IoT solution featuring:

- **ESP32-based collar** with BLE beacon detection and triangulation
- **Enhanced WiFi Manager** with static IP assignment and automatic server registration
- **Real-time web dashboard** built with Next.js
- **WebSocket communication** for live data streaming
- **Professional-grade firmware** with comprehensive testing framework

### Project Structure

```
pet-collar-system/
├── firmware/
│   ├── MainCollar_Advanced/        # 🏭 Production firmware (Enhanced WiFi Manager)
│   ├── testing/                    # 🧪 Hardware testing & validation
│   └── tools/                      # Setup and discovery utilities
├── src/                            # 🌐 Next.js web application
├── docs/                           # 📖 Documentation
└── public/                         # Static assets
```

## ✨ Key Features

### ESP32 Collar Firmware
- **🌐 Enhanced WiFi Manager** - Static IP assignment, server registration, heartbeat system
- **📡 BLE Beacon Scanning** - Detect and track Bluetooth beacons with enhanced naming
- **📍 Position Triangulation** - Calculate location using 3+ beacons
- **🚨 Alert System** - Buzzer and vibration alerts
- **🔋 Battery Monitoring** - Track battery voltage and level
- **📺 OLED Display** - Real-time status information
- **🔧 Serial Commands** - Comprehensive testing and configuration interface
- **💓 Heartbeat System** - 30-second heartbeats to maintain server connection

### Web Application
- **📊 Real-time Dashboard** - Live collar status and tracking
- **🗺️ Interactive Floorplan** - Visual position tracking
- **⚡ WebSocket Communication** - Real-time bidirectional data
- **🎛️ Control Interface** - Remote alert triggers and settings
- **📱 Responsive Design** - Works on desktop and mobile
- **🌙 Dark/Light Themes** - Modern UI with theme switching

### Network Features
- **🔒 Static IP Assignment** - Consistent IP addresses (192.168.1.50 by default)
- **🤝 Automatic Server Registration** - No manual configuration required
- **💓 Connection Health Monitoring** - Automatic reconnection and recovery
- **🔍 Network Discovery** - Auto-detect collar on network

## 🚀 Quick Start

### 1. Hardware Setup

**Required Components:**
- ESP32 Development Board
- Optional: OLED Display (SSD1306, I2C)
- Optional: Buzzer, Vibration Motor

**Connections:**
```
OLED Display (if used):
├── VCC → 3.3V
├── GND → GND  
├── SDA → GPIO 21
└── SCL → GPIO 22

Optional Components:
├── Buzzer → GPIO 25
├── Vibration → GPIO 26
└── Button → GPIO 0 (built-in BOOT)
```

### 2. Flash ESP32 Collar Firmware

```bash
# 1. Install Arduino IDE with ESP32 support
# 2. Install required libraries (see Installation Guide below)
# 3. Open firmware/MainCollar_Advanced/MainCollar_Advanced.ino
# 4. Select Board: "ESP32 Dev Module"
# 5. Upload firmware
```

### 3. Configure WiFi and Server

**Option A: WiFi Setup Portal**
```bash
# 1. Connect to "PetCollar-XXXX" WiFi network
# 2. Visit http://192.168.4.1 in browser
# 3. Configure your WiFi credentials
# 4. Collar will automatically get static IP (192.168.1.50)
```

**Option B: Change Server URL**
```cpp
// In MainCollar_Advanced.ino, line ~168:
enhancedWiFiManager.setServerURL("http://YOUR_SERVER_IP:3000");
```

### 4. Start Web Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Access dashboard at http://localhost:3000
```

### 5. Verify Connection

**Serial Monitor Commands:**
```bash
status           # Show complete system status
test             # Run comprehensive system test  
register         # Test server registration
heartbeat        # Test server heartbeat
wifi_info        # Show WiFi connection details
help             # Show all available commands
```

## 🔧 Hardware Requirements

### ESP32 Collar Device
| Component | Specification | Pin | Required |
|-----------|---------------|-----|----------|
| ESP32 Dev Board | ESP32-WROOM-32 | - | ✅ Yes |
| OLED Display | SSD1306 128x64 I2C | SDA: 21, SCL: 22 | 🔸 Optional |
| Buzzer | Passive/Active | GPIO 25 | 🔸 Optional |
| Vibration Motor | 3V | GPIO 26 | 🔸 Optional |
| Battery | 3.7V LiPo | VIN/GND | 🔸 Optional |
| Button | Tactile Switch | GPIO 0 (built-in) | ✅ Built-in |
| LED | Status Indicator | GPIO 2 (built-in) | ✅ Built-in |

### ESP32 Beacon Devices (Optional)
- **ESP32 boards** programmed as BLE beacons
- **Naming convention:** `PetZone-Location-ID` (e.g., `PetZone-Home-01`)
- **Power source:** USB or battery pack
- **Placement:** 3+ beacons for triangulation

## 📦 Installation Guide

### Required Arduino Libraries

Install via Arduino Library Manager (Tools → Manage Libraries):

```bash
✅ WiFiManager by tzapu (v2.0.17+)
✅ ArduinoJson by Benoit Blanchon (v7.x)  
✅ WebSockets by Markus Sattler (v2.6.x)
✅ Adafruit SSD1306 (v2.5.x)           # For OLED display
✅ Adafruit GFX Library (v1.12.x)      # Graphics dependency
```

### ESP32 Board Settings

```bash
Board: "ESP32 Dev Module"
Upload Speed: "921600"  
CPU Frequency: "240MHz (WiFi/BT)"
Flash Frequency: "80MHz"
Flash Mode: "QIO"
Flash Size: "4MB (32Mb)"
Partition Scheme: "Default 4MB with spiffs"
Core Debug Level: "None"
PSRAM: "Disabled"
```

### Web Application Setup

```bash
# Node.js 18+ required
npm install              # Install dependencies
npm run dev             # Development server
npm run build           # Production build
npm run start           # Production server
```

## ⚙️ Configuration

### Server URL Configuration

**Method 1: In Code (Before Upload)**
```cpp
// In setup() function, around line 168:
enhancedWiFiManager.setServerURL("http://192.168.1.100:3000");
```

**Method 2: Serial Commands (After Upload)**
```bash
set_server http://192.168.1.200:3000
register
```

### Network Configuration

The Enhanced WiFi Manager automatically:
1. **Detects network range** via DHCP
2. **Configures static IP** (default: 192.168.1.50)
3. **Registers with server** automatically
4. **Maintains heartbeat** every 30 seconds
5. **Handles reconnection** if WiFi drops

### Beacon Configuration

For optimal tracking, configure beacons with enhanced naming:
```bash
PetZone-Home-01         # Living room beacon
PetZone-Home-02         # Kitchen beacon  
PetZone-Garden-01       # Garden beacon
PetZone-Safe-01         # Safe zone beacon
```

## 🎮 Usage

### Web Interface Access

- **Main Dashboard:** `http://192.168.1.50/`
- **System Test:** `http://192.168.1.50/test`
- **Debug Info:** `http://192.168.1.50/debug`
- **Network Info:** `http://192.168.1.50/network-info`

### Serial Commands Reference

| Command | Description | Example |
|---------|-------------|---------|
| `status` | Complete system status | Shows all system information |
| `test` | Comprehensive system test | Tests all components |
| `wifi_info` | WiFi connection details | Shows IP, signal strength |
| `register` | Test server registration | Registers with configured server |
| `heartbeat` | Test server heartbeat | Sends heartbeat to server |
| `static_ip_status` | Check static IP config | Shows IP configuration |
| `network_config` | Show network settings | Network configuration details |
| `wifi_reset` | Reset WiFi and restart | Clears stored WiFi credentials |
| `set_server <url>` | Change server URL | `set_server http://192.168.1.100:3000` |
| `help` | Show all commands | Complete command reference |

### Expected Startup Output

```bash
🐕 Pet Collar - Enhanced System
=================================
🔧 Initializing system modules...
📺 Display Manager... ✅
🔋 Battery Manager... ✅
📡 BLE Scanner... ✅
🚨 Alert Manager... ✅
📐 Triangulator... ✅
🗺️ Zone Manager... ✅
🌐 Enhanced WiFi Manager... ✅
✅ WiFi connection established
📍 IP Address: 192.168.1.50
📋 Attempting server registration...
✅ Server registration successful
💓 Heartbeat sent to server
🚀 System initialization complete!
```

## 🔌 API Documentation

### WebSocket Events

**Client → Server:**
```javascript
// Command structure
{
  "type": "command",
  "command": "alert_start|alert_stop|ble_restart",
  "data": {}
}
```

**Server → Client:**
```javascript
// Real-time data structure
{
  "type": "data",
  "device_id": "string",
  "timestamp": number,
  "battery": {"level": number, "voltage": number},
  "position": {"x": number, "y": number, "confidence": number},
  "beacons": [{"name": "string", "rssi": number, "distance": number}],
  "status": {"wifi": boolean, "ble": boolean, "alert": boolean}
}
```

### HTTP Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Main dashboard |
| `/data` | GET | JSON system data |
| `/debug` | GET | Debug information |
| `/test` | GET | System test page |
| `/command` | POST | Send commands |
| `/network-info` | GET | Network configuration |

### Server Communication

**Registration Payload:**
```json
{
  "device_id": "string",
  "ip_address": "string", 
  "mac_address": "string",
  "firmware_version": "string",
  "capabilities": ["ble", "display", "alerts"],
  "wifi_rssi": number,
  "battery_level": number
}
```

## 🔧 Troubleshooting

### Common Issues & Solutions

#### ❌ WiFi Connection Failed
```bash
# Solutions:
1. Use serial command: wifi_reset
2. Check password in setup portal  
3. Ensure 2.4GHz network (ESP32 doesn't support 5GHz)
4. Check WiFi status: wifi_info
```

#### ❌ Server Registration Failed
```bash
# Solutions:
1. Check server URL: server_url
2. Test connectivity: ping [server-ip]
3. Verify server is running on configured port
4. Manual registration: register
```

#### ❌ No Beacons Found
```bash
# Solutions:
1. Check beacon names start with "PetZone"
2. Verify beacons are powered and broadcasting
3. Restart BLE scanner: ble_restart  
4. Check debug info: visit /debug page
```

#### ❌ Compilation Errors
```bash
# Solutions:
1. Verify all libraries installed (see Installation Guide)
2. Select correct ESP32 board settings
3. Check Arduino IDE ESP32 core version
4. Clear Arduino cache and retry
```

#### ❌ Upload Failed
```bash
# Solutions:
1. Hold BOOT button during upload
2. Try different upload speed (115200)
3. Check USB cable and port
4. Reset ESP32 (press EN button)
```

### Debug Information

**Serial Monitor Setup:**
- Baud Rate: `115200`
- Line Ending: `Both NL & CR`

**Key Debug Commands:**
```bash
status          # Complete system overview
test            # Automated system test
wifi_info       # Network diagnostics  
help            # All available commands
```

### Status Indicators

**LED Patterns:**
- **Solid ON:** WiFi connected, system operational
- **Slow Blink:** WiFi setup mode active
- **Fast Blink:** BLE scanning active
- **OFF:** System error or powered down

**OLED Display:**
- **"PETg":** Normal operation, WiFi connected
- **"WiFi Setup":** Configuration portal active
- **"Booting...":** System initialization
- **Alert messages:** Various system states

## 👨‍💻 Development

### Development Workflow

1. **Testing Phase** → `firmware/testing/` → Test on ESP32 → Document results
2. **Integration Phase** → Proven code → `firmware/MainCollar_Advanced/` → Validate
3. **Deployment Phase** → Production firmware → Upload to collar → Web testing

### Code Organization

```bash
firmware/MainCollar_Advanced/      # 🏭 Production firmware
├── MainCollar_Advanced.ino        # Main firmware file
├── enhanced_wifi_manager.h/.cpp   # Enhanced WiFi management  
├── micro_config.h                 # Configuration settings
├── micro_ble_scanner.h            # BLE functionality
├── micro_display_manager.h/.cpp   # Display management
├── micro_alert_manager.h          # Alert system
├── micro_battery_manager.h        # Battery monitoring
├── micro_web_integration.h        # Web server integration
└── [other modules]                # Additional functionality

firmware/testing/                  # 🧪 Testing & validation
├── README.md                      # Testing overview
├── buzzer-test/                   # Component-specific tests
├── ble-test/                      # BLE testing
└── integration-test/              # Multi-component tests
```

### Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/new-feature`
3. Test thoroughly in `firmware/testing/`
4. Document changes and results
5. Integrate proven code to production
6. Submit pull request

### Building & Testing

**Firmware Testing:**
```bash
# Navigate to testing directory
cd firmware/testing/

# Upload component tests to fresh ESP32
# Document results in test-results.md

# Only integrate proven, tested code
```

**Web Application:**
```bash
npm run dev          # Development server
npm run build        # Production build  
npm run test         # Run tests
npm run lint         # Code linting
```

## 🌐 Network Architecture

```
[ESP32 Collar] ←→ WiFi ←→ [Router] ←→ [Web App]
     ↓                                    ↑
WebSocket (Port 8080)              HTTP (Port 3000)
HTTP Server (Port 80)
Static IP: 192.168.1.50
Auto Registration + Heartbeat
```

## 📄 License

This project is open source under the MIT License. See LICENSE file for details.

## 🔗 Quick Links

- **Live Dashboard:** `http://192.168.1.50/` (when collar connected)
- **Setup Portal:** `http://192.168.4.1` (setup mode)
- **Web App:** `http://localhost:3000` (development)
- **Documentation:** `/docs/` directory
- **Testing:** `/firmware/testing/` directory

## 🎯 System Status

### ✅ Production Ready
- [x] Enhanced WiFi Manager with static IP
- [x] Automatic server registration & heartbeat
- [x] Comprehensive web interface
- [x] Professional testing framework
- [x] Complete documentation

### 🔄 Active Development  
- [ ] Advanced zone management
- [ ] Mobile app integration
- [ ] Cloud connectivity
- [ ] Multi-collar support

---

**Made with ❤️ for professional pet safety and modern IoT development**

*For detailed technical documentation, see individual files in `/docs/` and `/firmware/` directories.* 