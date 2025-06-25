# ESP32-CAM Camera-Only Device

**Simplified ESP32-CAM firmware for PetZone integration - Camera streaming without BLE**

## 🎯 Overview

This is a lightweight version of the ESP32-CAM firmware that focuses solely on video streaming, removing BLE functionality to fit within memory constraints. Perfect for adding visual monitoring to your PetZone tracking system.

## ✨ Features

- **Live Video Streaming** - HTTP-based MJPEG stream
- **WiFi Access Point** - No router required
- **Web Interface** - Built-in viewer with controls
- **Serial Configuration** - Easy setup via commands
- **Flash LED Control** - Button and web control
- **Status Indicators** - LED patterns for different states
- **Memory Optimized** - Compiles successfully on ESP32-CAM

## 🔧 Arduino IDE Setup

### Board Settings:
```
Board: "ESP32 Wrover Module" or "ESP-CAM"
Partition Scheme: "Huge APP (3MB No OTA/1MB SPIFFS)"
CPU Frequency: "240MHz (WiFi/BT)"
Flash Mode: "QIO"
Flash Frequency: "80MHz"
Flash Size: "4MB (32Mb)"
Core Debug Level: "None"
```

### Required Libraries:
- ESP32 Camera (built-in)
- WiFi (built-in)
- Preferences (built-in)

## 📋 Hardware Setup

### ESP32-CAM Connections:
- **Power**: 5V (minimum 500mA recommended)
- **Programming**: Connect GPIO0 to GND during upload
- **Flash LED**: GPIO4 (built-in)
- **Button**: GPIO15 (optional - for flash control)
- **Status LED**: GPIO33 (optional)

### Upload Process:
1. Connect GPIO0 to GND
2. Power on ESP32-CAM
3. Upload firmware
4. Disconnect GPIO0 from GND
5. Reset/power cycle

## 🚀 Quick Start

### 1. Upload Firmware
- Open `ESP32CAM_CameraOnly.ino` in Arduino IDE
- Select correct board settings (above)
- Upload to ESP32-CAM

### 2. Connect to Camera
- Look for WiFi network: `ESP32-CAM-VideoStream`
- Password: `petzone123`
- Open browser to: `http://192.168.4.1`

### 3. Configure Device
Open Serial Monitor (115200 baud) and use commands:
```
SET_NAME:PetZone-Camera-Kitchen
SET_LOCATION:Kitchen
SET_WIFI_SSID:MyCamera
SHOW_CONFIG
```

## 📱 Web Interface

Access the camera at `http://192.168.4.1` to see:
- **Live Video Stream** - Real-time MJPEG feed
- **Device Status** - Name, location, active viewers
- **Flash Control** - Toggle LED on/off
- **Auto-refresh** - Viewer count updates every 5 seconds

## ⚙️ Configuration Commands

| Command | Description | Example |
|---------|-------------|---------|
| `SET_NAME:<name>` | Set device name | `SET_NAME:PetZone-Camera-Kitchen` |
| `SET_LOCATION:<loc>` | Set location | `SET_LOCATION:Kitchen` |
| `SET_WIFI_SSID:<ssid>` | Set WiFi network name | `SET_WIFI_SSID:KitchenCam` |
| `SET_WIFI_PASS:<pass>` | Set WiFi password | `SET_WIFI_PASS:mypassword` |
| `SHOW_CONFIG` | Display current settings | |
| `FLASH_ON/FLASH_OFF` | Control flash LED | |
| `RESTART` | Restart device | |
| `HELP` | Show all commands | |

## 🔍 Status LED Indicators

- **Fast Blink (200ms)** - WiFi not connected
- **Slow Blink (1000ms)** - Connected, no viewers
- **Solid On** - Actively streaming to viewers
- **Rapid Blink** - Camera initialization error

## 🔗 Integration with PetZone System

### Dashboard Integration
While this camera doesn't broadcast BLE beacons, you can integrate it with your dashboard:

1. **Manual Entry**: Add camera locations to your beacon management
2. **Network Discovery**: Scan for ESP32-CAM WiFi networks
3. **Status Monitoring**: Use the `/status` API endpoint

### API Endpoints
- `GET /` - Web interface
- `GET /stream` - MJPEG video stream
- `GET /flash` - Toggle flash LED
- `GET /status` - JSON status data

### Example Status Response:
```json
{
  "activeClients": 2,
  "deviceName": "PetZone-Camera-Kitchen",
  "location": "Kitchen",
  "flashState": false,
  "uptime": 123456,
  "freeHeap": 234567
}
```

## 🔋 Power Requirements

- **Minimum**: 5V @ 300mA (idle)
- **Streaming**: 5V @ 500-800mA
- **Recommended**: 5V @ 1A power supply
- **Battery**: High-capacity power bank (10,000mAh+)

## 🛠️ Troubleshooting

### Compilation Issues:
- Use "Huge APP" partition scheme
- Ensure ESP32 board package is updated
- Close other Arduino IDE instances

### Camera Not Working:
- Check power supply (minimum 5V @ 500mA)
- Verify camera module connection
- Try different frame size settings

### WiFi Issues:
- Reset device and reconfigure
- Check for WiFi interference
- Use different channel/SSID

### Memory Issues:
- This version is optimized for memory
- Avoid adding additional libraries
- Use minimal frame sizes if needed

## 📊 Performance Tips

### Optimize Streaming:
- Lower frame size for better performance
- Adjust JPEG quality (10-15 recommended)
- Limit concurrent viewers (2-3 max)

### Network Optimization:
- Use 2.4GHz WiFi only
- Position camera for good signal strength
- Avoid interference from other devices

## 🔄 Default Configuration

```
Device Name: PetZone-Camera-CAM01
Location: Living Room
WiFi SSID: ESP32-CAM-VideoStream
WiFi Password: petzone123
Stream Port: 80
Flash Enabled: Yes
```

## 📝 Notes

- **No BLE**: This version doesn't broadcast beacons
- **Standalone**: Works independently of main tracking system
- **Lightweight**: Optimized for ESP32-CAM memory constraints
- **Expandable**: Can be enhanced with additional features as needed

## 🆘 Support

For issues or questions:
1. Check troubleshooting section above
2. Verify hardware connections
3. Test with minimal configuration
4. Check serial output for error messages

---

**🐾 PetZone ESP32-CAM Camera Device - Keeping an eye on your pets!** 