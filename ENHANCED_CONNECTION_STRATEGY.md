# Enhanced Collar Connection Strategy

## Overview

This document describes the implementation of the enhanced collar connection strategy that provides instant, hands-free reconnection when the collar switches networks and includes fallback options for remote access.

## 🚀 Implementation Status

- ✅ **Fast Wi-Fi Re-association** (Firmware)
- ✅ **Zero-config LAN Discovery** (mDNS + UDP)
- ✅ **App-side Multi-stage Connection Logic**
- 🔄 **Cloud Relay** (Future implementation)

---

## 1. Fast Wi-Fi Re-association (Firmware)

### Features Implemented

#### **Network Storage (NVS)**
- Saves up to **3 networks** in ESP32 non-volatile storage
- Stores: SSID, password, channel, BSSID, RSSI, last connection time
- Automatic network prioritization based on last successful connection

#### **Fast Connection Process**
- **Boot time**: Active scan limited to 3-4 channels for <2s connection
- **Channel-specific scanning**: Uses stored channel info for instant connection
- **BSSID targeting**: Connects to specific access points for faster association
- **30-second timeout**: Automatically starts Setup AP if no known networks found

#### **Setup Mode**
- **Soft AP Name**: `PETG-SETUP-XXXX` (where XXXX = MAC suffix)
- **Password**: `12345678`
- **Setup URL**: `http://192.168.4.1`
- **Captive portal**: Automatic WiFi configuration interface

### Firmware Architecture

```cpp
class FastWiFiManager {
  // Manages up to 3 saved networks
  SavedWiFiNetwork savedNetworks[3];
  
  // Fast connection methods
  void performFastScan();          // <2s channel-specific scan
  bool connectToNetwork();         // BSSID + channel optimization
  void startSetupMode();           // Auto-AP after timeout
}
```

### Usage

```cpp
// In setup()
if (!wifiManager.begin()) {
  // Fallback to old method
}

// In loop()
wifiManager.loop();  // Handles monitoring and setup timeout
```

---

## 2. Zero-config LAN Discovery

### mDNS Service Discovery

#### **Primary Service**: `_petg-ws._tcp.local:8080`
- **Hostname**: `petg-collar-XXXX.local` (consistent format)
- **WebSocket URL**: `ws://petg-collar-XXXX.local:8080`
- **Service attributes**: Device type, version, IP, MAC, type="collar"

#### **HTTP Service**: `http._tcp.local:80`
- **Discovery endpoint**: `/api/discover`
- **Service attributes**: WebSocket port, API path

### Enhanced UDP Broadcasting

#### **Broadcast Interval**: Every 10 seconds to `255.255.255.255:47808`

#### **Enhanced Message Format**:
```json
{
  "device_type": "ESP32-S3_PetCollar",
  "device_name": "ESP32-S3-PetCollar-Advanced",
  "ip_address": "192.168.1.35",
  "mdns_hostname": "petg-collar-1234.local",
  "websocket_url": "ws://192.168.1.35:8080",
  "mdns_websocket_url": "ws://petg-collar-1234.local:8080",
  "firmware_version": "3.0.0",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "wifi_ssid": "HomeNetwork",
  "signal_strength": -45,
  "uptime": 12345,
  "battery_percent": 85,
  "timestamp": 1234567890
}
```

---

## 3. App-side Connection Logic

### Multi-stage Discovery Strategy

```typescript
async connect(): Promise<CollarConnectionResult> {
  // 1. Try mDNS Discovery (fastest, zero-config)
  try {
    return await tryMDNSConnection(); // ws://petg-collar.local:8080
  } catch {}

  // 2. Try UDP Cache (recent broadcast data)
  try {
    return await tryUDPCacheConnection(); // Cached IP + mDNS fallback
  } catch {}

  // 3. Try Cloud Relay (future)
  try {
    return await tryCloudConnection(); // Remote access
  } catch {}

  // All strategies failed
  return { success: false, method: 'manual', error: '...' };
}
```

### Enhanced CollarConnectionResult

```typescript
interface CollarConnectionResult {
  success: boolean;
  url?: string;                    // Final WebSocket URL
  method: 'mdns' | 'udp-cache' | 'cloud' | 'manual';
  ip?: string;                     // Direct IP (if used)
  hostname?: string;               // mDNS hostname (if used)
  latency?: number;                // Connection time in ms
  error?: string;                  // Error message if failed
}
```

### Connection Priority Logic

1. **mDNS First**: `ws://petg-collar.local:8080` (5s timeout)
2. **UDP Cache**: If recent broadcast available (<30s)
   - Try mDNS URL from broadcast first
   - Fallback to direct IP WebSocket
3. **Cloud Relay**: Future implementation for remote access

---

## 4. Benefits & Features

### ⚡ **Instant Reconnection**
- **<2 second** connection on boot with known networks
- **Channel-specific** scanning eliminates full WiFi scan delays
- **BSSID targeting** connects to specific access points

### 🔄 **Seamless Network Switching**
- Automatic detection of network changes
- **3-network memory** supports home/office/mobile hotspot
- **Prioritized reconnection** based on last successful connection

### 🌐 **Zero-configuration Discovery**
- **mDNS**: Works immediately without IP knowledge
- **UDP broadcasting**: Provides real-time status updates
- **Fallback chain**: Multiple discovery methods ensure connection

### 📱 **Enhanced User Experience**
- **Setup AP**: Automatic captive portal when needed
- **Connection feedback**: Real-time latency and method reporting
- **Debug interface**: Full visibility into connection process

---

## 5. Testing & Debug

### Debug Interface
Access the debug page at `/debug/enhanced-connection` to:
- Test all connection strategies
- View UDP cache status
- Monitor connection history
- See real-time collar information

### Test Connection Flow

```typescript
// Test the enhanced connection
const result = await enhancedCollarConnection.connect();

if (result.success) {
  console.log(`Connected via ${result.method} in ${result.latency}ms`);
  console.log(`WebSocket URL: ${result.url}`);
} else {
  console.log(`Connection failed: ${result.error}`);
}
```

---

## 6. Files Modified/Created

### Firmware (Refactored Structure)
- `firmware/refactored/ESP32-S3_PetCollar/include/WiFiManager.h` - Enhanced with fast WiFi features
- `firmware/refactored/ESP32-S3_PetCollar/ESP32-S3_PetCollar.ino` - Updated for enhanced connection

### App-side
- `src/lib/enhanced-collar-connection.ts` - Multi-stage connection service
- `src/app/debug/enhanced-connection/page.tsx` - Debug interface
- `src/app/api/collar-proxy/route.ts` - Updated for enhanced broadcasting

---

## 7. Next Steps (Cloud Relay)

Future implementation will add:

### MQTT WebSocket Relay
- **Broker**: HiveMQ Cloud or similar lightweight service
- **Topics**: `collar/<deviceId>/presence` and `collar/<deviceId>/data`
- **Usage**: When both mDNS and UDP cache fail (off home network)

### App Integration
```typescript
// Future cloud relay implementation
private async tryCloudConnection(): Promise<CollarConnectionResult> {
  const mqttUrl = `wss://cloud-broker.hivemq.com/collar/${deviceId}`;
  // Connect via MQTT WebSocket for remote access
}
```

---

## 8. Summary

The enhanced connection strategy provides:

1. **Sub-2-second** reconnection with fast WiFi re-association
2. **Zero-config** discovery using mDNS (`petg-collar.local`)
3. **Real-time** fallback via UDP broadcasts every 10 seconds
4. **Robust** multi-stage connection with latency reporting
5. **Setup mode** for new network configuration

This implementation ensures the collar maintains connectivity across network changes while providing multiple discovery methods for reliable connection establishment. 