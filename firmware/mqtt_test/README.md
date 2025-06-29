# 🧪 MQTT Credential Test

## Purpose
This standalone sketch tests your HiveMQ Cloud credentials separately from the main pet collar firmware.

## Usage

1. **Open Arduino IDE**
2. **File → Open** → Navigate to `firmware/mqtt_test/mqtt_test.ino`
3. **Edit WiFi credentials** on line 8:
   ```cpp
   const char* password = "YOUR_ACTUAL_WIFI_PASSWORD";
   ```
4. **Select Board**: ESP32S3 Dev Module
5. **Upload** to your ESP32-S3
6. **Open Serial Monitor** (115200 baud)

## Expected Results

### ✅ Success (Credentials Work)
```
🧪 MQTT Credential Test
========================
✅ WiFi connected: 192.168.1.35
✅ Internet connectivity: OK
🔗 Testing MQTT connection to: ab14d5df...hivemq.cloud:8883
👤 Username: zarsko

🧪 Test 1: Basic connection
✅ SUCCESS: Basic MQTT connection works!
✅ Test message published
```

### ❌ Authentication Error (Bad Credentials)
```
🧪 Test 1: Basic connection
❌ FAILED: Error code 5
💡 MQTT_CONNECT_UNAUTHORIZED - Account suspended or credentials invalid
```

### ❌ Network Error
```
❌ FAILED: Error code -4
💡 MQTT_CONNECTION_TIMEOUT - Check server address
```

## Next Steps

- **If test succeeds**: Your HiveMQ credentials are correct, issue is in main firmware
- **If test fails with error 5**: Check HiveMQ Cloud account status
- **If test fails with error -4**: Check internet connectivity or try different network

## Troubleshooting

1. **Verify HiveMQ Cloud account**: https://console.hivemq.cloud/
2. **Check free tier limits**: Max connections, bandwidth
3. **Try different network**: Some corporate networks block MQTT ports
4. **Test alternative broker**: Change to `broker.hivemq.com` (public, no auth)

---
Return to main firmware: `firmware/ESP32-S3_PetCollar/ESP32-S3_PetCollar.ino` 