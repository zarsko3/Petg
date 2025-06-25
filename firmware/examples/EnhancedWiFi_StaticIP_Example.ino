/*
 * Enhanced WiFi Manager Example - Static IP & Server Integration
 * 
 * This example demonstrates:
 * 1. Static IP assignment with automatic network detection
 * 2. Automatic server registration and IP reporting
 * 3. Automatic handshake with server upon connection
 * 4. Periodic heartbeat to maintain server connection
 * 5. Fallback to DHCP if static IP fails
 * 
 * Features:
 * - Auto-detects network range via DHCP, then switches to static IP
 * - Reports IP address to your application server automatically
 * - Maintains persistent connection with server heartbeats
 * - Handles WiFi reconnections gracefully
 * - Configurable server endpoints and timeouts
 * 
 * Configuration:
 * - Update SERVER_BASE_URL in enhanced_wifi_manager.h to your server
 * - Modify STATIC_IP_OCTET to desired last octet (default: 50)
 * - Set your WiFi credentials via web portal or serial commands
 */

#include "enhanced_wifi_manager.h"

// Optional: Override default server URL at runtime
const char* CUSTOM_SERVER_URL = "http://192.168.1.100:3000";  // Your app server

void setup() {
    Serial.begin(115200);
    delay(2000);  // Give time for serial monitor
    
    Serial.println("🚀 Enhanced WiFi Manager Demo");
    Serial.println("=====================================");
    Serial.println("✅ ESP32 booted successfully!");
    
    // Optional: Customize server URL if different from default
    if (strlen(CUSTOM_SERVER_URL) > 0) {
        enhancedWifiMgr.setServerURL(CUSTOM_SERVER_URL);
        Serial.printf("🔗 Custom server URL set: %s\n", CUSTOM_SERVER_URL);
    }
    
    // Optional: Enable specific static IP (otherwise auto-detected)
    // enhancedWifiMgr.enableStaticIP(IPAddress(192, 168, 1, 50), 
    //                                IPAddress(192, 168, 1, 1), 
    //                                IPAddress(255, 255, 255, 0));
    
    // Initialize enhanced WiFi manager
    Serial.println("🌐 Starting enhanced WiFi manager...");
    bool connected = enhancedWifiMgr.begin();
    
    if (connected) {
        Serial.println("🎉 WiFi connected successfully!");
        displayConnectionStatus();
    } else {
        Serial.println("⚙️ WiFi configuration portal started");
        Serial.println("📱 Connect to 'PetCollar-XXXXXX' AP to configure WiFi");
    }
    
    Serial.println("\n🔄 Entering main loop...");
    Serial.println("Monitor serial output for connection status and server communication");
}

void loop() {
    // Call WiFi manager loop (handles connection monitoring and server heartbeat)
    enhancedWifiMgr.loop();
    
    // Display status information every 30 seconds
    static unsigned long lastStatusUpdate = 0;
    if (millis() - lastStatusUpdate > 30000) {
        displayConnectionStatus();
        lastStatusUpdate = millis();
    }
    
    // Handle serial commands for testing
    handleSerialCommands();
    
    // Your application code goes here
    // - BLE scanning
    // - Sensor readings  
    // - Web server handling
    // - etc.
    
    delay(100);  // Small delay to prevent watchdog issues
}

// Display current connection status
void displayConnectionStatus() {
    Serial.println("\n📊 === CONNECTION STATUS ===");
    Serial.printf("🌐 WiFi: %s\n", enhancedWifiMgr.isConnected() ? "Connected" : "Disconnected");
    
    if (enhancedWifiMgr.isConnected()) {
        Serial.printf("📡 SSID: %s\n", WiFi.SSID().c_str());
        Serial.printf("📍 IP Address: %s (%s)\n", 
                     enhancedWifiMgr.getIP().c_str(),
                     enhancedWifiMgr.isUsingStaticIP() ? "Static" : "DHCP");
        Serial.printf("🔗 Gateway: %s\n", WiFi.gatewayIP().toString().c_str());
        Serial.printf("📶 Signal: %d dBm\n", WiFi.RSSI());
        Serial.printf("🏷️  Device ID: %s\n", enhancedWifiMgr.getDeviceId().c_str());
        
        // Server status
        Serial.printf("🔗 Server: %s\n", enhancedWifiMgr.isServerConnected() ? "Connected" : "Disconnected");
        if (enhancedWifiMgr.getLastServerContact() > 0) {
            Serial.printf("💓 Last Contact: %lu seconds ago\n", 
                         (millis() - enhancedWifiMgr.getLastServerContact()) / 1000);
        }
        
        Serial.println("🌐 Available endpoints:");
        Serial.printf("   • Web Interface: http://%s\n", enhancedWifiMgr.getIP().c_str());
        Serial.printf("   • WebSocket: ws://%s:8080\n", enhancedWifiMgr.getIP().c_str());
        Serial.printf("   • API: http://%s/data\n", enhancedWifiMgr.getIP().c_str());
    }
    
    if (!enhancedWifiMgr.getLastError().isEmpty()) {
        Serial.printf("❌ Last Error: %s\n", enhancedWifiMgr.getLastError().c_str());
    }
    
    Serial.printf("⏱️  Uptime: %lu seconds\n", millis() / 1000);
    Serial.println("=============================\n");
}

// Handle serial commands for testing
void handleSerialCommands() {
    if (Serial.available()) {
        String command = Serial.readStringUntil('\n');
        command.trim();
        
        if (command.equalsIgnoreCase("status")) {
            displayConnectionStatus();
            
        } else if (command.equalsIgnoreCase("register")) {
            Serial.println("🔄 Forcing server re-registration...");
            bool success = enhancedWifiMgr.forceServerRegistration();
            Serial.printf("%s Server registration %s\n", 
                         success ? "✅" : "❌",
                         success ? "successful" : "failed");
            
        } else if (command.equalsIgnoreCase("test")) {
            Serial.println("🧪 Testing server connection...");
            bool success = enhancedWifiMgr.testServerConnection();
            Serial.printf("%s Server connection test %s\n",
                         success ? "✅" : "❌", 
                         success ? "passed" : "failed");
            
        } else if (command.equalsIgnoreCase("info")) {
            enhancedWifiMgr.displayConnectionInfo();
            
        } else if (command.equalsIgnoreCase("reset")) {
            Serial.println("🔄 Resetting WiFi settings...");
            enhancedWifiMgr.resetSettings();
            
        } else if (command.startsWith("server ")) {
            String url = command.substring(7);
            enhancedWifiMgr.setServerURL(url);
            Serial.printf("✅ Server URL updated to: %s\n", url.c_str());
            
        } else if (command.startsWith("static ")) {
            // Parse static IP command: static 192.168.1.50 192.168.1.1 255.255.255.0
            int space1 = command.indexOf(' ', 7);
            int space2 = command.indexOf(' ', space1 + 1);
            
            if (space1 > 0 && space2 > 0) {
                String ipStr = command.substring(7, space1);
                String gatewayStr = command.substring(space1 + 1, space2);
                String subnetStr = command.substring(space2 + 1);
                
                IPAddress ip, gateway, subnet;
                if (ip.fromString(ipStr) && gateway.fromString(gatewayStr) && subnet.fromString(subnetStr)) {
                    enhancedWifiMgr.enableStaticIP(ip, gateway, subnet);
                    Serial.printf("✅ Static IP configured: %s\n", ipStr.c_str());
                } else {
                    Serial.println("❌ Invalid IP address format");
                }
            } else {
                Serial.println("❌ Usage: static <ip> <gateway> <subnet>");
                Serial.println("   Example: static 192.168.1.50 192.168.1.1 255.255.255.0");
            }
            
        } else if (command.equalsIgnoreCase("help")) {
            Serial.println("\n📋 Available Commands:");
            Serial.println("   status   - Show current connection status");
            Serial.println("   register - Force server re-registration");
            Serial.println("   test     - Test server connection");
            Serial.println("   info     - Display detailed network info");
            Serial.println("   reset    - Reset WiFi settings");
            Serial.println("   server <url> - Set custom server URL");
            Serial.println("   static <ip> <gateway> <subnet> - Configure static IP");
            Serial.println("   help     - Show this help message");
            Serial.println();
            
        } else if (command.length() > 0) {
            Serial.printf("❓ Unknown command: %s\n", command.c_str());
            Serial.println("Type 'help' for available commands");
        }
    }
}

/*
 * Expected Serial Output Example:
 * 
 * 🚀 Enhanced WiFi Manager starting...
 * 🏷️  Device ID: PetCollar-A1B2C3D4
 * 💾 Found saved WiFi credentials
 * 📡 Saved Network: MyWiFiNetwork
 * 🔧 Static IP configuration found
 * 🔄 Connection attempt 1/3...
 * 🔗 Attempting static IP connection...
 * 🔧 Configuring static IP...
 *    IP: 192.168.1.50
 *    Gateway: 192.168.1.1
 *    Subnet: 255.255.255.0
 *    DNS1: 8.8.8.8
 *    DNS2: 8.8.4.4
 * ✅ Static IP configured successfully
 * ....
 * ✅ Static IP connection successful!
 * ═══════════════════════════════════
 *     🐕 Enhanced PetCollar Network
 * ═══════════════════════════════════
 * 📡 Network: MyWiFiNetwork
 * 🌐 IP Address: 192.168.1.50 (Static)
 * 🔗 Gateway: 192.168.1.1
 * 🔍 Subnet: 255.255.255.0
 * 📶 Signal: -45 dBm
 * 🏷️  Device ID: PetCollar-A1B2C3D4
 * 📱 MAC: AA:BB:CC:DD:EE:FF
 * ───────────────────────────────────
 * 🌐 Web Interface: http://192.168.1.50
 * 🔌 WebSocket: ws://192.168.1.50:8080
 * 📊 API: http://192.168.1.50/data
 * ───────────────────────────────────
 * 🔗 Server: http://192.168.1.100:3000
 * 📡 Registered: Yes
 * 💓 Last Contact: 2 ms ago
 * ═══════════════════════════════════
 * 🤝 Initiating server handshake...
 * 🤝 Starting server handshake...
 * 📤 Registering with server: http://192.168.1.100:3000/api/collar-registration
 * ✅ Registration request successful
 * 📥 Server response: {"status":"success","device_registered":true}
 * ✅ Server registration successful
 * ✅ IP address reported to server  
 * ✅ Initial heartbeat sent
 * 🎉 Complete server handshake successful!
 * 📢 Announcing collar presence on network...
 * ✅ Collar is registered and ready for remote management!
 * ✅ Successfully connected to saved network!
 * 🎉 WiFi connected successfully!
 */ 