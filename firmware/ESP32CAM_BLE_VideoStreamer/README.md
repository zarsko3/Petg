# ESP32-CAM BLE Beacon + Video Streaming Device

## Overview

This firmware combines the existing PetZone BLE beacon functionality with live video streaming capabilities for ESP32-CAM devices. It creates a dual-purpose device that functions as both a BLE beacon for pet collar tracking and a live video streaming camera.

## Features

### BLE Beacon Features
- ✅ **Location-based BLE beacon naming** (PetZone-Location-ID format)
- ✅ **Compatible with existing PetCollar system** - detected by existing collar scanners
- ✅ **Configurable beacon settings** via serial commands
- ✅ **Enhanced metadata** with location context and video status
- ✅ **Persistent configuration** saved to flash memory
- ✅ **Real-time status updates** in BLE advertisements

### Video Streaming Features
- ✅ **Live HD video streaming** via HTTP server
- ✅ **WiFi Access Point mode** - no router required
- ✅ **Web-based camera control** interface
- ✅ **Real-time streaming status** in BLE beacon data
- ✅ **Multiple client support** with active client counting
- ✅ **Flash LED control** for low-light conditions

### Dual Operation Benefits
- 📡 **Simultaneous BLE + WiFi** operation
- 🎯 **Enhanced tracking data** - location + visual confirmation
- 🔋 **Power efficient** BLE broadcasting
- 📱 **Remote monitoring** via mobile devices
- 🏠 **Perfect for pet surveillance** and location tracking

## Hardware Requirements

- **ESP32-CAM development board** (AI-Thinker or compatible)
- **OV2640 camera module** (usually included with ESP32-CAM)
- **FTDI programmer** (for initial firmware upload)
- **5V power supply** (recommended for stable operation)
- **MicroSD card** (optional, for future photo storage features)

### Pin Configuration (AI-Thinker ESP32-CAM)
- **GPIO 4**: Flash LED (built-in)
- **GPIO 0**: Boot/Flash button (built-in)
- **Camera pins**: Pre-configured for OV2640 module

## Installation

### 1. Hardware Setup
1. Connect ESP32-CAM to FTDI programmer:
   ```
   ESP32-CAM    FTDI Programmer
   GND       -> GND
   5V        -> VCC (5V)
   U0R       -> TX
   U0T       -> RX
   GPIO 0    -> GND (for upload only)
   ```

2. Connect GPIO 0 to GND for firmware upload mode

### 2. Arduino IDE Setup
1. Install ESP32 board package in Arduino IDE
2. Select board: **"AI Thinker ESP32-CAM"**
3. Set upload speed: **115200** or lower if having issues
4. Set partition scheme: **"Huge APP (3MB No OTA)"**

### 3. Upload Firmware
1. Open `ESP32CAM_BLE_VideoStreamer.ino` in Arduino IDE
2. Compile and upload to ESP32-CAM
3. **Disconnect GPIO 0 from GND** after upload
4. Press reset button on ESP32-CAM

## Configuration

### Default Settings
- **Device Name**: PetZone-Camera-CAM01
- **Location**: Home
- **Beacon ID**: CAM01
- **WiFi AP**: ESP32-CAM-VideoBeacon
- **WiFi Password**: VideoBeacon123
- **BLE UUID**: 12345678-1234-1234-1234-123456789abc

### Serial Commands
Connect to serial monitor (115200 baud) and use these commands:

| Command | Description | Example |
|---------|-------------|---------|
| `s` | Show detailed status | `s` |
| `l [name]` | Set location name | `l Garden` |
| `i [id]` | Set beacon ID | `i CAM02` |
| `z [zone]` | Set zone name | `z Outdoor` |
| `f [func]` | Set function | `f Security` |
| `r` | Restart BLE advertising | `r` |
| `c` | Display configuration | `c` |
| `t` | Toggle flash LED | `t` |
| `h` | Show help menu | `h` |

### Example Configuration Commands
```
l Garden          # Set location to "Garden"
i CAM02          # Set beacon ID to "CAM02"
z Backyard       # Set zone to "Backyard"
f Security       # Set function to "Security"
```
Result: **PetZone-Security-CAM02** or **PetZone-Garden-Backyard-CAM02**

## Usage

### 1. BLE Beacon Operation
- Device automatically starts broadcasting as BLE beacon
- Compatible with existing PetCollar tracking system
- Beacon name follows PetZone naming convention
- Enhanced metadata includes camera status and streaming info

### 2. Video Streaming Access
1. **Connect to WiFi AP**:
   - SSID: `ESP32-CAM-VideoBeacon`
   - Password: `VideoBeacon123`

2. **Access camera interface**:
   - Main page: `http://192.168.4.1`
   - Direct stream: `http://192.168.4.1/stream`

3. **View live video** in web browser or compatible app

### 3. Flash LED Control
- **Button press**: Toggle flash LED on/off
- **Serial command**: Use `t` command
- **Automatic**: LED blinks to indicate status

## Status Indicators

### LED Blink Patterns
- **Fast blink (200ms)**: Video streaming active
- **Medium blink (500ms)**: Configuration changed
- **Normal blink (1000ms)**: Ready and idle
- **Slow blink (2000ms)**: Camera initialization failed

### BLE Metadata Information
The device broadcasts enhanced metadata in BLE advertisements:
- **Version**: Protocol version (3 for camera beacons)
- **Beacon ID**: Numeric identifier
- **Battery Level**: Power status (%)
- **Location Hash**: Unique location identifier
- **Camera Status**: 0=Off, 1=Ready, 2=Streaming
- **Stream Clients**: Number of active video clients
- **Uptime**: Device uptime in minutes

## Integration with Existing System

### PetCollar Compatibility
This device is fully compatible with your existing PetCollar tracking system:

1. **Same BLE UUID**: Uses identical service UUID as existing beacons
2. **Compatible naming**: Follows PetZone-Location-ID format
3. **Enhanced metadata**: Provides additional camera status information
4. **Triangulation support**: Works with existing positioning algorithms

### Dashboard Integration
The ESP32-CAM beacons will appear in your dashboard alongside regular beacons:
- **Beacon list**: Shows up as camera-enabled beacon
- **Enhanced info**: Camera status and streaming indicators
- **Position tracking**: Normal triangulation-based positioning
- **Visual confirmation**: Option to view live video feed

## Troubleshooting

### Common Issues

#### 1. Camera Initialization Failed
- **Symptoms**: LED slow blink, "Camera init failed" in serial
- **Solutions**:
  - Ensure 5V power supply (not 3.3V)
  - Check camera ribbon cable connection
  - Try different ESP32-CAM board
  - Verify camera module compatibility

#### 2. WiFi Connection Issues
- **Symptoms**: Cannot connect to WiFi AP
- **Solutions**:
  - Check SSID/password in code
  - Reset ESP32-CAM and try again
  - Ensure device is in AP mode (not trying to connect to router)

#### 3. BLE Not Detected
- **Symptoms**: PetCollar doesn't detect beacon
- **Solutions**:
  - Check BLE advertising is active (`s` command)
  - Restart BLE advertising (`r` command)
  - Verify BLE UUID matches existing system
  - Check power supply stability

#### 4. Video Stream Issues
- **Symptoms**: No video or poor quality
- **Solutions**:
  - Check camera initialization status
  - Try lower resolution in camera settings
  - Ensure stable 5V power supply
  - Reduce video quality settings

### Serial Debug Output
Monitor serial output (115200 baud) for detailed status information:
```
✅ ESP32-CAM BLE Beacon + Video Stream is ready!
✅ BLE Beacon broadcasting for PetCollar detection
✅ Video stream available via WiFi
✅ WiFi AP started: ESP32-CAM-VideoBeacon
✅ Video stream: http://192.168.4.1/stream
```

## Advanced Configuration

### Custom WiFi Settings
Modify these constants in the code:
```cpp
const char* ssid = "ESP32-CAM-VideoBeacon";
const char* password = "VideoBeacon123";
```

### Camera Quality Settings
Adjust in `initializeCamera()` function:
```cpp
config.frame_size = FRAMESIZE_SVGA;  // Adjust resolution
config.jpeg_quality = 12;           // Adjust quality (10=best, 63=worst)
```

### BLE Advertising Interval
Modify beacon broadcast frequency:
```cpp
#define ADVERTISE_INTERVAL 100  // Milliseconds between advertisements
```

## Power Management

### Power Requirements
- **Minimum**: 5V @ 300mA (idle)
- **Streaming**: 5V @ 500-800mA (active video)
- **Recommended**: 5V @ 1A power supply

### Battery Operation
For battery-powered operation:
1. Use high-capacity power bank (10,000mAh+)
2. Consider sleep modes for extended operation
3. Monitor voltage levels for low-battery warnings

## Future Enhancements

### Planned Features
- [ ] **Motion detection** with photo capture
- [ ] **MicroSD card** photo storage
- [ ] **MQTT integration** for remote monitoring
- [ ] **Battery voltage monitoring** with auto-shutdown
- [ ] **Time-lapse recording** capabilities
- [ ] **Two-way audio** communication
- [ ] **Night vision mode** with IR LED control

### Integration Possibilities
- **Home Assistant** integration via MQTT
- **Mobile app** for remote viewing
- **Cloud storage** for captured media
- **AI-powered** pet behavior analysis

## Support

### Documentation
- See main project README for system overview
- Check `firmware/BeaconDevice_Clean/` for regular beacon reference
- Review `src/components/map/` for dashboard integration

### Getting Help
1. Check serial monitor output for error messages
2. Verify hardware connections and power supply
3. Test with known working ESP32-CAM board
4. Compare with working beacon configuration

### Contributing
This firmware is part of the larger PetCollar tracking system. Contributions welcome for:
- Power optimization improvements
- Additional camera features
- Dashboard integration enhancements
- Mobile app connectivity

---

**Note**: This device provides both BLE beacon functionality and video streaming simultaneously. The BLE beacon ensures compatibility with your existing pet tracking system while adding valuable visual monitoring capabilities. 