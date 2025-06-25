# Arduino Library Installation Guide

## Method 1: Arduino IDE Library Manager (Recommended)

### Step-by-Step Installation:

1. **Open Arduino IDE**
2. **Go to Tools → Manage Libraries...**
3. **Install Required Libraries:**

#### Install ESPAsyncWebServer:
- Search: `ESPAsyncWebServer`
- Install: **"ESP Async WebServer"** by **lacamera**
- Version: Latest stable

#### Install AsyncTCP:
- Search: `AsyncTCP` 
- Install: **"AsyncTCP"** by **dvarrel**
- Version: Latest stable

### Alternative Installation via GitHub:

If Library Manager doesn't work, manually install:

```bash
# Download from GitHub:
# 1. ESPAsyncWebServer: https://github.com/lacamera/ESPAsyncWebServer
# 2. AsyncTCP: https://github.com/dvarrel/AsyncTCP

# Extract to Arduino libraries folder:
# Windows: Documents/Arduino/libraries/
# Mac: ~/Documents/Arduino/libraries/
# Linux: ~/Arduino/libraries/
```

## Method 2: Use Simplified Firmware (No Dependencies)

**✅ Recommended for Quick Setup**

Use `firmware/SimpleProximityFirmware.ino` which only requires built-in ESP32 libraries:

- ✅ WiFi (built-in)
- ✅ WebServer (built-in) 
- ✅ WebSocketsServer (built-in)
- ✅ ArduinoJson (built-in)
- ✅ BLE libraries (built-in)

## After Installation:

1. **Restart Arduino IDE**
2. **Select ESP32-S3 board**
3. **Compile firmware** 
4. **Upload to collar**

## Verification:

Your Arduino IDE should show these libraries in **Sketch → Include Library**:
- ✅ ESPAsyncWebServer
- ✅ AsyncTCP

## Troubleshooting:

**Library not found after installation:**
- Restart Arduino IDE completely
- Check Arduino/libraries folder for extracted files
- Verify ESP32 board package is installed

**Compilation errors:**
- Use SimpleProximityFirmware.ino (no external dependencies)
- Update ESP32 board package to latest version 