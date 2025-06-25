# 🔗 ESP32-S3 Pet Collar WebSocket Connection Guide

## ✅ What We Fixed

### 1. **Missing Utility Functions** (Frontend Issue)
- **Problem**: Web interface couldn't import `formatDuration`, `getActivityLevelText`, `getBatteryColor` from utils
- **Solution**: Added all missing utility functions to `src/lib/utils.ts`
- **Status**: ✅ **FIXED**

### 2. **WebSocket Event Handler Missing** (Firmware Issue)  
- **Problem**: ESP32-S3 firmware wasn't properly handling WebSocket connections
- **Solution**: Added `webSocket.onEvent(webSocketEvent)` to initialization
- **Status**: ✅ **FIXED**

### 3. **Enhanced WebSocket Data Format** (Compatibility Issue)
- **Problem**: WebSocket data wasn't comprehensive enough for web interface
- **Solution**: Enhanced `sendWebSocketUpdate()` with complete collar data
- **Status**: ✅ **FIXED**

### 4. **IP Discovery & Testing** (Connection Issue)
- **Problem**: Web interface couldn't properly test and connect to collar IPs
- **Solution**: Improved IP testing logic with HTTP pre-validation
- **Status**: ✅ **FIXED**

### 5. **Periodic Data Broadcasting** (Real-time Updates)
- **Problem**: Web interface only got data when manually requested
- **Solution**: Added automatic 5-second WebSocket data broadcasts
- **Status**: ✅ **FIXED**

---

## 🧪 Testing Instructions

### Step 1: Upload Firmware to ESP32-S3
1. Open Arduino IDE
2. Load `firmware/ESP32-S3_PetCollar/ESP32-S3_PetCollar.ino`
3. Set board to "ESP32S3 Dev Module"
4. Upload firmware
5. Open Serial Monitor (115200 baud)

### Step 2: Find Your Collar's IP Address
After successful upload, the Serial Monitor will show:
```
========================================
🌐 WEB INTERFACE CONNECTION INFO
========================================
📱 WebSocket URL: ws://192.168.1.100:8080
🌐 Web Dashboard: http://192.168.1.100
📋 Copy the WebSocket URL above into your web interface
========================================
```

**Copy this WebSocket URL!** You'll need it for testing.

### Step 3: Test WebSocket Connection (Standalone)
1. Open the test file: `test-websocket-connection.html` in your browser
2. Enter your collar's WebSocket URL (from Step 2)
3. Click **Connect**
4. You should see:
   - Status: "Connected" (green)
   - Real-time data updates every 5 seconds
   - Device info and battery status

### Step 4: Test Web Interface Integration
1. Start your Next.js development server:
   ```bash
   npm run dev
   ```
2. Go to Settings page: `http://localhost:3000/settings`
3. In the "Collar Connection" section:
   - Enter your WebSocket URL
   - Click **"Test IP"** (should show ✅ response)
   - Click **"Connect"**
4. Navigate to Dashboard: `http://localhost:3000`
5. Verify you see real collar data instead of demo data

---

## 🔧 Troubleshooting

### Problem: "Cannot find collar on network"

**Possible Causes:**
1. **WiFi Issue**: ESP32-S3 and computer on different networks
2. **IP Changed**: Router assigned new IP to collar
3. **Firewall**: Windows/Mac firewall blocking connection

**Solutions:**
1. **Check WiFi**: Ensure both devices on same WiFi network
2. **Find Current IP**: Check Serial Monitor for latest IP
3. **Disable Firewall**: Temporarily disable to test
4. **Use Discovery**: Click "Find Collar" button in web interface

### Problem: "WebSocket connection failed"

**Possible Causes:**
1. **Wrong Port**: Using wrong port number
2. **HTTP/HTTPS Mix**: Mixed secure/insecure connections
3. **Browser Cache**: Old connection data cached

**Solutions:**
1. **Verify URL Format**: Must be `ws://IP_ADDRESS:8080` (not `wss://`)
2. **Clear Browser Cache**: Hard refresh (Ctrl+Shift+R)
3. **Try Different Browser**: Test in Chrome, Firefox, Edge
4. **Check Port 8080**: Ensure port 8080 is not blocked

### Problem: "Connection drops frequently"

**Possible Causes:**
1. **WiFi Signal Weak**: Poor signal strength
2. **Power Management**: ESP32-S3 entering sleep mode
3. **Router Issues**: Router dropping idle connections

**Solutions:**
1. **Check Signal Strength**: Move closer to router for testing
2. **Disable Sleep**: Check power management settings
3. **Use Static IP**: Configure router for static IP assignment

### Problem: "Data not updating in web interface"

**Possible Causes:**
1. **Frontend Not Connected**: Web interface not properly connected
2. **Data Format Mismatch**: WebSocket data format incompatible
3. **JavaScript Errors**: Console errors preventing updates

**Solutions:**
1. **Check Browser Console**: Look for JavaScript errors (F12)
2. **Verify Connection Status**: Check connection indicator
3. **Test with Standalone**: Use `test-websocket-connection.html` first

---

## 📊 Expected WebSocket Data Format

Your collar should broadcast data like this every 5 seconds:

```json
{
  "device_id": "PetCollar-S3",
  "firmware_version": "3.0.0-ESP32-S3", 
  "hardware_version": "ESP32-S3",
  "uptime": 12345,
  "timestamp": 1234567890,
  "wifi_connected": true,
  "local_ip": "192.168.1.100",
  "wifi_ssid": "YourWiFiNetwork",
  "signal_strength": -45,
  "ble_active": true,
  "beacons_detected": 2,
  "battery_level": 75,
  "battery_percentage": 75,
  "battery_voltage": 3.85,
  "activity_level": 65,
  "status": "active",
  "position": {
    "x": 1.23,
    "y": 4.56, 
    "valid": true,
    "confidence": 0.85
  },
  "alerts": {
    "active": false,
    "type": 0
  },
  "beacons": [
    {
      "name": "TestBeacon_1",
      "rssi": -65,
      "distance": 2.5
    }
  ],
  "daily_stats": {
    "active_time": 120,
    "rest_time": 240,
    "sleep_time": 60
  }
}
```

---

## 🚀 Quick Start Checklist

- [ ] **Upload Firmware**: ESP32-S3 programmed with latest code
- [ ] **Check Serial Output**: Verify WiFi connection and IP address
- [ ] **Test Standalone**: Use `test-websocket-connection.html` to verify WebSocket works
- [ ] **Configure Web Interface**: Enter correct WebSocket URL in settings
- [ ] **Verify Real-time Updates**: Check dashboard shows live data, not demo data
- [ ] **Test Commands**: Try buzzer test, vibration test from interface

---

## 🎯 Success Indicators

✅ **Firmware Working**:
- Serial Monitor shows clear WiFi connection info
- IP address displayed with WebSocket URL
- No compilation or runtime errors

✅ **WebSocket Working**: 
- Standalone test shows "Connected" status
- Real-time data updates every 5 seconds
- Commands (test, refresh) work properly

✅ **Web Interface Working**:
- Settings page shows "Connected" status
- Dashboard displays real collar data (not demo)
- Connection persists across page navigation
- Battery, WiFi, activity data all updating

---

## 💡 Pro Tips

1. **Bookmark the IP**: Once you find the working WebSocket URL, bookmark it
2. **Static IP Setup**: Use the "Advanced Network Settings" to configure static IP
3. **Monitor Serial Output**: Keep Serial Monitor open during testing for debugging
4. **Test Different Networks**: If having issues, try connecting both devices to phone hotspot
5. **Regular Updates**: Collar broadcasts data every 5 seconds automatically

---

If you're still having issues after following this guide, please share:
1. Serial Monitor output from ESP32-S3
2. Browser console errors (F12 → Console)
3. Network setup details (router model, WiFi network) 