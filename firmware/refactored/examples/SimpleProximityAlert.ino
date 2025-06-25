/**
 * @file SimpleProximityAlert.ino
 * @brief Simple Proximity Alert Example
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * This is a simplified example showing how to use the refactored
 * Pet Collar components for basic proximity detection and alerts.
 * 
 * This example demonstrates:
 * - Basic BLE beacon scanning
 * - Simple proximity detection
 * - Alert triggering
 * - Serial output for debugging
 * 
 * Hardware Requirements:
 * - ESP32-S3 or ESP32 development board
 * - Buzzer connected to pin 15
 * - Optional: Vibration motor on pin 16
 * 
 * Usage:
 * 1. Upload this firmware to your ESP32
 * 2. Open Serial Monitor at 115200 baud
 * 3. Place a BLE beacon (or another device broadcasting as "Pet*") nearby
 * 4. Observe proximity detection and alerts
 */

// ==========================================
// INCLUDES
// ==========================================

#include <Arduino.h>
#include <BLEDevice.h>
#include <BLEUtils.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

// Include our refactored components
#include "../common/include/PetCollarConfig.h"
#include "../common/include/Utils.h"
#include "../common/include/BeaconManager.h"
#include "../common/include/AlertManager.h"

// ==========================================
// GLOBAL OBJECTS
// ==========================================

BeaconManager beaconManager;
AlertManager alertManager;
BLEScan* pBLEScan = nullptr;

// Simple state tracking
unsigned long lastScan = 0;
unsigned long lastStatusUpdate = 0;
bool systemReady = false;

// ==========================================
// BLE SCAN CALLBACK
// ==========================================

/**
 * @brief Simple BLE scan callback
 * 
 * This callback is triggered whenever a BLE device is detected.
 * We filter for devices that start with "Pet" and process them.
 */
class SimpleBLECallback : public BLEAdvertisedDeviceCallbacks {
public:
    void onResult(BLEAdvertisedDevice advertisedDevice) override {
        // Get device information
        String deviceName = advertisedDevice.getName().c_str();
        String deviceAddress = advertisedDevice.getAddress().toString().c_str();
        int rssi = advertisedDevice.getRSSI();
        
        // Filter for pet-related devices
        if (deviceName.length() == 0 || !deviceName.startsWith("Pet")) {
            return; // Skip non-pet devices
        }
        
        // Update beacon manager
        beaconManager.updateBeacon(deviceName, deviceAddress, rssi);
        
        // Check for proximity (close distance)
        int distance = rssiToDistance(rssi);
        
        Serial.printf("Found: %s (RSSI: %d, Distance: %dcm)\n", 
                     deviceName.c_str(), rssi, distance);
        
        // Trigger alert if very close (less than 10cm and strong signal)
        if (rssi > -50 && distance < 10) {
            Serial.println("⚠️  PROXIMITY ALERT - Very close!");
            
            // Start a simple alert (buzzer for 2 seconds)
            alertManager.startAlert(ALERT_BUZZER, 2000, 128, "Proximity: " + deviceName);
        }
        // Warn if moderately close
        else if (rssi > -70 && distance < 50) {
            Serial.printf("📍 Device nearby: %s (%dcm)\n", deviceName.c_str(), distance);
        }
    }
};

SimpleBLECallback* scanCallback = nullptr;

// ==========================================
// SETUP FUNCTION
// ==========================================

void setup() {
    // Initialize serial communication
    Serial.begin(115200);
    delay(1000);
    
    Serial.println("========================================");
    Serial.println("  Simple Proximity Alert Example");
    Serial.println("  Pet Collar System v3.0");
    Serial.println("========================================");
    
    // Initialize alert manager
    Serial.println("Initializing alert system...");
    if (!alertManager.begin()) {
        Serial.println("❌ Failed to initialize alert manager!");
        while(1) delay(1000);
    }
    Serial.println("✅ Alert system ready");
    
    // Initialize beacon manager
    Serial.println("Initializing beacon manager...");
    if (!beaconManager.begin()) {
        Serial.println("❌ Failed to initialize beacon manager!");
        while(1) delay(1000);
    }
    Serial.println("✅ Beacon manager ready");
    
    // Initialize BLE
    Serial.println("Initializing BLE scanner...");
    try {
        BLEDevice::init("");
        
        // Create scan object
        pBLEScan = BLEDevice::getScan();
        if (!pBLEScan) {
            Serial.println("❌ Failed to create BLE scan object!");
            while(1) delay(1000);
        }
        
        // Set up scan callback
        scanCallback = new SimpleBLECallback();
        pBLEScan->setAdvertisedDeviceCallbacks(scanCallback);
        
        // Configure scan parameters for responsive detection
        pBLEScan->setActiveScan(true);
        pBLEScan->setInterval(100);  // Fast scanning for demo
        pBLEScan->setWindow(99);
        
        Serial.println("✅ BLE scanner ready");
        
    } catch (const std::exception& e) {
        Serial.printf("❌ BLE initialization failed: %s\n", e.what());
        while(1) delay(1000);
    }
    
    // Test the alert system
    Serial.println("Testing alert system...");
    alertManager.startAlert(ALERT_BUZZER, 500, 64, "Startup Test");
    delay(1000);
    
    systemReady = true;
    
    Serial.println("========================================");
    Serial.println("🚀 System Ready!");
    Serial.println("Looking for BLE devices starting with 'Pet'...");
    Serial.println("Place a pet collar or beacon nearby to test.");
    Serial.println("========================================");
}

// ==========================================
// MAIN LOOP
// ==========================================

void loop() {
    unsigned long currentTime = millis();
    
    // Update managers
    if (systemReady) {
        beaconManager.update();
        alertManager.update();
    }
    
    // Perform BLE scan every 5 seconds
    if (currentTime - lastScan > 5000) {
        if (pBLEScan && systemReady) {
            Serial.println("🔍 Scanning for BLE devices...");
            
            try {
                // Start scan for 3 seconds
                BLEScanResults foundDevices = pBLEScan->start(3, false);
                
                Serial.printf("Scan complete. Found %d devices total.\n", 
                             foundDevices.getCount());
                
                // Clear results to free memory
                pBLEScan->clearResults();
                
            } catch (const std::exception& e) {
                Serial.printf("❌ Scan failed: %s\n", e.what());
            }
        }
        
        lastScan = currentTime;
    }
    
    // Print status every 30 seconds
    if (currentTime - lastStatusUpdate > 30000) {
        Serial.println("\n--- Status Update ---");
        Serial.printf("Uptime: %s\n", formatUptime(currentTime).c_str());
        Serial.printf("Active Beacons: %d\n", beaconManager.getActiveBeaconCount());
        Serial.printf("Total Detections: %d\n", beaconManager.getBeaconCount());
        Serial.printf("Free Heap: %d bytes (%d%%)\n", 
                     getFreeHeap(), getFreeHeapPercentage());
        
        if (alertManager.isAlertActive()) {
            Serial.println("Alert Status: 🔔 ACTIVE");
        } else if (alertManager.isInCooldown()) {
            Serial.printf("Alert Status: ⏳ Cooldown (%lums remaining)\n", 
                         alertManager.getRemainingCooldown());
        } else {
            Serial.println("Alert Status: ✅ Ready");
        }
        
        Serial.println("--------------------\n");
        
        lastStatusUpdate = currentTime;
    }
    
    // Small delay to prevent watchdog issues
    delay(100);
}

// ==========================================
// HELPER FUNCTIONS
// ==========================================

/**
 * @brief Print detected beacon information
 * This is called automatically by the beacon manager
 */
void printBeaconInfo() {
    const auto& beacons = beaconManager.getAllBeacons();
    
    if (beacons.empty()) {
        Serial.println("No beacons detected.");
        return;
    }
    
    Serial.println("\n--- Detected Beacons ---");
    for (const auto& beacon : beacons) {
        if (beacon.isActive && !beacon.isExpired()) {
            Serial.printf("📍 %s\n", beacon.fullName.c_str());
            Serial.printf("   Location: %s, ID: %s\n", 
                         beacon.location.c_str(), beacon.beaconId.c_str());
            Serial.printf("   RSSI: %d dBm, Distance: %.1f cm\n", 
                         beacon.rssi, beacon.distance);
            Serial.printf("   Last seen: %lu ms ago\n", beacon.getAge());
            Serial.println();
        }
    }
    Serial.println("------------------------\n");
} 