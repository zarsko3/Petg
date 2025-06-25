# 🔧 WiFi Setup Troubleshooting Guide

## 📋 Quick Checklist

If your PETg collar isn't connecting to WiFi after entering credentials, follow these steps:

### ✅ **Step 1: Verify Setup Process**
1. **Connect to Setup Network**: Look for "PetCollar-Setup" WiFi network (no password)
2. **Open Setup Page**: Go to `http://192.168.4.1` in your browser
3. **Select Network**: Choose your home WiFi from the scan results
4. **Enter Password**: Type your WiFi password carefully (case-sensitive)
5. **Submit**: Click "Connect" and wait for the status page

### ✅ **Step 2: Check OLED Display**
Your collar's OLED display shows the current status:

- **"WiFi Setup Mode"** = Ready for configuration
- **"Connecting to WiFi"** = Attempting connection (wait 30+ seconds)
- **"Connected to WiFi"** = Success! Setup complete
- **"Connection Failed"** = Need to troubleshoot

### ✅ **Step 3: Monitor Serial Output** (Advanced)
Connect to Serial Monitor (115200 baud) and look for:

```
✅ WiFi Connection Successful!
📊 Network Information:
   SSID: YourNetwork
   IP Address: 192.168.1.100
   Signal Strength: -45 dBm
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📱 PAIRING URL: ws://192.168.1.100:8080
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

## 🚨 **Common Issues & Solutions**

### **Issue 1: Status 6 (WL_DISCONNECTED) - MOST COMMON**

**Symptoms:**
```
🔄 Still connecting... Status: 6 (28.8s elapsed)
❌ WiFi connection failed - Status: 6
   Error: Disconnected
```

**This is the most common ESP32 WiFi issue!** Here's how to fix it:

#### **🔧 Solution A: Network Band (2.4GHz vs 5GHz)**
- **ESP32 ONLY supports 2.4GHz networks**
- Many modern routers broadcast on both 2.4GHz and 5GHz
- **Check your router settings:**
  1. Look for "WiFi Band" or "Wireless Mode" settings
  2. Ensure 2.4GHz is enabled
  3. Some routers have separate network names (e.g., "MyWiFi_2.4G" and "MyWiFi_5G")
  4. **Connect to the 2.4GHz network specifically**

#### **🔧 Solution B: Signal Strength**
- **Move closer to your router** during setup
- Ideal signal: better than -70dBm
- **Use debug command**: `wifisignal` to check signal strength
- **Test with phone**: Can you connect from the same location?

#### **🔧 Solution C: Router Compatibility**
- **Try different security modes** (WPA2 is most compatible)
- **Disable WPA3** if enabled (ESP32 doesn't support WPA3)
- **Check MAC filtering** - add ESP32's MAC if enabled
- **Restart your router** if multiple devices having issues

#### **🔧 Solution D: Power and Interference**
- **Use USB power** during setup (not battery)
- **Avoid interference** from other 2.4GHz devices (microwaves, baby monitors)
- **Try different time of day** when network is less congested

---

### **Issue 2: Status 1 (WL_NO_SSID_AVAIL)**

**Symptoms:**
```
❌ SSID not found - Network may be:
• Out of range
• Using 5GHz (ESP32 only supports 2.4GHz)
• Hidden network
```

**Solutions:**
1. **Check network name spelling** (case-sensitive)
2. **Verify 2.4GHz availability** 
3. **Move closer to router**
4. **Unhide network** temporarily if hidden

---

### **Issue 3: Status 4 (WL_CONNECT_FAILED)**

**Symptoms:**
```
❌ Authentication failed - Check:
• WiFi password is correct
• Network security type compatibility
```

**Solutions:**
1. **Double-check password** (case-sensitive)
2. **Try without special characters** in password
3. **Check security type** (WPA2-PSK recommended)
4. **Temporarily use open network** to test

---

## 🛠️ **Advanced Troubleshooting**

### **Debug Commands** (Serial Monitor)
Use these commands to diagnose issues:

```
wifitest    - Run comprehensive connectivity test
wifiinfo    - Show detailed WiFi diagnostics
forceap     - Force setup mode if stuck
wifireset   - Clear credentials and restart
fulltest    - Complete system test
```

### **Router Configuration Tips**

1. **Enable 2.4GHz WiFi**: Collar doesn't support 5GHz
2. **DHCP Reservation**: Reserve IP for stable connection
3. **Disable AP Isolation**: Allows collar to communicate with app
4. **Check Guest Network**: Some guest networks block device communication

### **Network Requirements**
- **Frequency**: 2.4GHz WiFi (not 5GHz)
- **Security**: WPA2 or WPA3 (Open networks also supported)
- **Protocols**: 802.11 b/g/n
- **Features**: DHCP must be enabled

---

## 🛠️ **Enhanced Diagnostics**

### **Serial Monitor Commands**
Connect to ESP32 serial monitor (115200 baud) and use these commands:

```
wifitest     - Complete WiFi diagnostic
wifisignal   - Check signal strength
wifiretry    - Retry connection manually
wifireset    - Clear saved credentials
status       - Show full system status
```

### **Signal Strength Guide**
- **Better than -50dBm**: Excellent
- **-50 to -60dBm**: Good
- **-60 to -70dBm**: Fair
- **-70 to -80dBm**: Poor (may cause disconnections)
- **Worse than -80dBm**: Very Poor (likely to fail)

### **Enhanced Connection Process**
The new firmware includes:
- **Automatic retry for WL_DISCONNECTED**
- **Signal strength monitoring**
- **Power optimization** (19.5dBm max power)
- **WiFi sleep disabled** for stability
- **Detailed error diagnostics**

---

## 📱 **Step-by-Step Troubleshooting**

### **Step 1: Basic Checks**
1. Open serial monitor in Arduino IDE (115200 baud)
2. Type `status` and press Enter
3. Note current WiFi mode and connection status
4. Type `wifitest` for comprehensive diagnostics

### **Step 2: Network Analysis**
1. Type `wifisignal` to check signal strength
2. If weak signal (<-70dBm), move closer to router
3. Verify your network appears in scan results
4. Confirm it's a 2.4GHz network

### **Step 3: Fresh Start**
1. Type `wifireset` to clear old credentials
2. Power cycle the collar (unplug and reconnect)
3. Look for "PetCollar-Setup" network
4. Try setup process again with new approach

### **Step 4: Router Settings**
1. **Check 2.4GHz is enabled**
2. **Try WPA2-PSK security** (not WPA3)
3. **Disable MAC filtering** temporarily
4. **Consider guest network** as test

### **Step 5: Advanced Debugging**
If still failing:
1. Note exact error messages from serial monitor
2. Try connecting other ESP32 devices to same network
3. Test with phone hotspot (2.4GHz)
4. Consider router firmware update

---

## 🎯 **Success Indicators**

You'll know it's working when you see:
```
✅ WiFi Connection Successful!
📊 Network Information:
   SSID: YourNetwork
   IP Address: 192.168.1.XXX
   Signal Strength: -XX dBm
🔌 WebSocket URL for Pairing:
   • ws://192.168.1.XXX:8080
```

The OLED display will show:
- Connected WiFi network name
- Local IP address
- Signal strength indicator

---

## 📞 **Still Need Help?**

If these steps don't resolve your issue:

1. **Capture full serial output** during connection attempt
2. **Note your router model and settings**
3. **Try with a different network** (mobile hotspot)
4. **Check ESP32 board and antenna connection**

The enhanced firmware now provides much more detailed diagnostics to help identify exactly what's causing connection failures.

---

## 🚀 **Firmware Enhancements**

Latest version includes:
- **WL_DISCONNECTED automatic retry**
- **Enhanced signal strength monitoring**
- **2.4GHz band verification**
- **Power optimization for better range**
- **Detailed connection failure analysis**
- **Real-time diagnostics via serial commands**

**🐾 Your collar should connect reliably with these improvements!** 