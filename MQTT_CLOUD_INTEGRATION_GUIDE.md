# 🌐 MQTT Cloud Integration Guide

## Overview

This guide covers the complete MQTT integration using **HiveMQ Cloud** as the message broker, eliminating the need for complex WebSocket tunneling solutions. The system provides real-time communication between ESP32 collars and the web application through a secure, scalable cloud infrastructure.

## 🏗️ Architecture

```
ESP32 Collars ──TLS──► HiveMQ Cloud ◄──WSS── Web Application
                          ↓
              (Message Broker & Router)
```

### **Benefits over WebSocket Tunneling:**
- ✅ **No tunneling complexity** - Direct cloud connection
- ✅ **Automatic SSL/TLS** - Built-in security  
- ✅ **Scalable messaging** - Pub/Sub architecture
- ✅ **Offline detection** - Last Will & Testament
- ✅ **Quality of Service** - Message delivery guarantees
- ✅ **Multi-device support** - Easy collar management

---

## 🔧 Setup Instructions

### **1. Environment Variables**

Create or update your `.env.local` file:

```bash
# MQTT Configuration for HiveMQ Cloud
NEXT_PUBLIC_MQTT_HOST=ab1d45df84884fd68d24d7d25cc78f2f.s1.eu.hivemq.cloud
NEXT_PUBLIC_MQTT_PORT=8884
NEXT_PUBLIC_MQTT_USER=zarsko
NEXT_PUBLIC_MQTT_PASS=089430732zG
```

### **2. Install Dependencies**

The required MQTT client library has already been installed:

```bash
npm install mqtt @types/mqtt
```

### **3. Test MQTT Connection**

Visit the test interface at: `http://localhost:3000/debug/mqtt-test`

This page provides:
- 🌐 **Connection Status** - Real-time MQTT broker connection
- 📡 **Online Collars** - List of connected devices with telemetry
- 🎮 **Command Testing** - Send buzz/LED commands to collars
- 🔍 **Debug Information** - Raw MQTT state and message logs

---

## 🔌 Web Application Integration

### **Basic Usage**

```typescript
import { useMQTT } from '@/hooks/useMQTT';

function CollarControlPanel() {
  const mqtt = useMQTT();
  
  // Check connection status
  if (!mqtt.state.isConnected) {
    return <div>Connecting to MQTT...</div>;
  }
  
  // Get online collars
  const onlineCollars = mqtt.getOnlineCollars();
  
  // Send commands
  const handleBuzzTest = async () => {
    await mqtt.sendBuzzCommand('001', 500, 'single');
  };
  
  return (
    <div>
      <p>Online Collars: {onlineCollars.length}</p>
      <button onClick={handleBuzzTest}>Test Buzzer</button>
    </div>
  );
}
```

### **Available Methods**

```typescript
// Connection state
mqtt.state.isConnected          // Boolean
mqtt.state.collars              // Record<string, CollarState>
mqtt.state.totalMessagesReceived  // Number

// Commands
mqtt.sendBuzzCommand(collarId, duration, pattern)
mqtt.sendLEDCommand(collarId, mode, color, duration)

// Utilities
mqtt.getCollarState(collarId)
mqtt.getOnlineCollars()
mqtt.getCollarTelemetry(collarId)

// Connection management
mqtt.reconnect()
mqtt.disconnect()
```

---

## 📱 ESP32 Firmware Setup

### **1. Upload Firmware**

Use the provided firmware: `firmware/ESP32_MQTT_Collar.ino`

### **2. Required Libraries**

Install these Arduino libraries:
- **WiFi** (built-in)
- **WiFiClientSecure** (built-in)  
- **PubSubClient** by Nick O'Leary
- **ArduinoJson** by Benoit Blanchon
- **ESP32 BLE Arduino** (built-in)

### **3. Configuration**

Update these constants in the firmware:

```cpp
// Wi-Fi Configuration
const char* WIFI_SSID = "YourWiFiNetwork";
const char* WIFI_PASSWORD = "YourWiFiPassword";

// Device Configuration  
const char* DEVICE_ID = "001";  // Unique for each collar
const char* DEVICE_NAME = "COLLAR-001";

// Hardware Pins (adjust for your board)
const int BUZZER_PIN = 4;
const int LED_PIN = 2;
const int BATTERY_PIN = A0;
```

### **4. Serial Monitor Output**

When functioning correctly, you'll see:

```
🚀 ESP32-S3 Pet Collar Starting...
✅ Hardware initialized
🌐 Connecting to WiFi: YourWiFiNetwork
✅ WiFi connected! IP: 192.168.1.35
🔵 Initializing BLE...
✅ BLE initialized
🌐 Connecting to MQTT...
✅ MQTT connected!
📡 Subscribed to command topics for device 001
🎯 Setup complete! Collar is operational.
```

---

## 📊 MQTT Topic Structure

### **Topic Hierarchy**

```
collar/
├── {DEVICE_ID}/
│   ├── status          # Online/offline status
│   ├── telemetry       # Battery, sensors, beacons
│   └── command/
│       ├── buzz        # Buzzer activation
│       ├── led         # LED control
│       └── settings    # Configuration updates
└── web/
    └── status          # Web client status
```

### **Message Examples**

**Status Message:**
```json
{
  "device_id": "001",
  "status": "online",
  "timestamp": 1641024000000,
  "ip_address": "192.168.1.35"
}
```

**Telemetry Message:**
```json
{
  "device_id": "001",
  "timestamp": 1641024000000,
  "battery_level": 85,
  "battery_voltage": 3.8,
  "wifi_connected": true,
  "system_state": "normal",
  "alert_active": false,
  "uptime": 3600000,
  "beacons": [
    {
      "name": "Room_Beacon_01",
      "rssi": -45,
      "distance": 2.1,
      "first_seen": 1641023000000,
      "last_seen": 1641024000000
    }
  ],
  "scanner": {
    "ble_active": true,
    "beacons_detected": 1,
    "successful_scans": 45,
    "total_scans": 47
  }
}
```

**Buzzer Command:**
```json
{
  "duration_ms": 500,
  "pattern": "double"
}
```

**LED Command:**  
```json
{
  "mode": "blink",
  "color": "red", 
  "duration_ms": 2000
}
```

---

## 🔒 Security Configuration

### **Production TLS Setup**

For production deployment, replace `setInsecure()` in the ESP32 firmware:

```cpp
// Replace this line:
wifiClient.setInsecure();

// With proper certificate validation:
const char* root_ca = \
"-----BEGIN CERTIFICATE-----\n" \
"MIIH0zCCBrug...\n" \    // ISRG Root X1 certificate
"-----END CERTIFICATE-----\n";

wifiClient.setCACert(root_ca);
```

### **HiveMQ Cloud Security**

- ✅ **TLS 1.2+** encryption for all connections
- ✅ **Username/password** authentication
- ✅ **Client certificates** (optional, for enhanced security)
- ✅ **IP whitelisting** (optional, in HiveMQ cloud console)

---

## 🚀 Deployment Checklist

### **Web Application:**
- [ ] Environment variables configured
- [ ] MQTT client library installed  
- [ ] Test page accessible (`/debug/mqtt-test`)
- [ ] Connection successful to HiveMQ cloud

### **ESP32 Firmware:**
- [ ] Arduino libraries installed
- [ ] WiFi credentials configured
- [ ] Device ID unique for each collar
- [ ] Hardware pins configured correctly
- [ ] Serial monitor shows successful connection
- [ ] MQTT messages publishing (visible in test page)

### **HiveMQ Cloud:**
- [ ] Account active and credentials valid
- [ ] Client connections showing in dashboard
- [ ] Message statistics incrementing
- [ ] No connection errors in logs

---

## 🔍 Troubleshooting

### **Common Issues:**

**1. MQTT Connection Failed (ESP32)**
```
❌ MQTT connection failed, rc=-2
```
**Solution:** Check WiFi connection, MQTT credentials, and HiveMQ cloud status

**2. Web Client Not Connecting**
```
❌ MQTT: Connection error: WebSocket connection failed
```
**Solution:** Verify environment variables and HiveMQ WebSocket URL

**3. No Telemetry Data**
```
Online Collars: 0
```
**Solution:** Check ESP32 serial monitor for errors, verify topic subscription

**4. Commands Not Working**
```
⚠️ MQTT: Not connected, cannot send buzz command
```
**Solution:** Ensure MQTT connection is established before sending commands

### **Debug Steps:**

1. **Check Web Console** - Open browser dev tools for MQTT connection logs
2. **Monitor ESP32 Serial** - Watch for connection and message logs
3. **Test Page** - Use `/debug/mqtt-test` for real-time diagnostics
4. **HiveMQ Dashboard** - Check client connections and message statistics

---

## 📈 Performance & Scaling

### **Current Limits:**
- **Devices:** 100 simultaneous collar connections
- **Messages:** 10,000 messages/month (HiveMQ free tier)
- **Bandwidth:** 10 GB/month

### **Scaling Options:**
- **HiveMQ Professional** - Higher limits and SLA
- **AWS IoT Core** - Alternative MQTT broker
- **Self-hosted** - EMQX or Mosquitto MQTT broker

### **Battery Optimization:**
- **Telemetry Interval:** 30 seconds (configurable)
- **BLE Scanning:** 1 minute intervals
- **Connection Keep-Alive:** 60 seconds
- **Deep Sleep:** Implement for extended battery life

---

## 🆚 Comparison: MQTT vs WebSocket Tunneling

| Aspect | MQTT Cloud | WebSocket Tunnel |
|--------|-----------|------------------|
| **Setup Complexity** | ⭐⭐ Simple | ⭐⭐⭐⭐⭐ Complex |
| **Network Requirements** | Internet only | Router config + tunnel |
| **Security** | Built-in TLS | Manual certificate setup |
| **Reliability** | High (cloud SLA) | Variable (tunnel dependent) |
| **Scalability** | Excellent | Limited by tunnel capacity |
| **Maintenance** | Minimal | High (tunnel monitoring) |
| **Cost** | $0-20/month | Variable (tunnel service) |

**Recommendation:** MQTT cloud integration is the superior solution for production deployments.

---

## 📝 Next Steps

1. **Test the integration** using `/debug/mqtt-test`
2. **Upload ESP32 firmware** with your configuration
3. **Verify real-time communication** between collar and web app
4. **Integrate MQTT hooks** into your existing components
5. **Deploy to production** with proper TLS certificates

The MQTT integration provides a robust, scalable foundation for real-time collar communication without the complexity of network tunneling. 