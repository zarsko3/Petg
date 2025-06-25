/*
 * Enhanced BLE Scanner for Camera-Enabled Beacons
 * Example code showing how to detect and decode camera beacon metadata
 * 
 * This demonstrates how the main PetCollar scanner can be enhanced
 * to recognize and display camera beacon information
 */

#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>

// Enhanced beacon info structure with camera support
struct EnhancedBeaconInfo {
  String name;
  String address;
  int rssi;
  float distance;
  unsigned long firstDetectedTime;
  unsigned long lastSeenTime;
  bool hasMetadata;
  uint8_t metadata[8];
  
  // Camera-specific information
  bool isCameraBeacon;
  uint8_t cameraStatus;      // 0=off, 1=ready, 2=streaming
  uint8_t streamClients;     // Number of active stream clients
  String beaconType;         // "Standard", "Camera", "Security", etc.
  
  EnhancedBeaconInfo() : 
    name(""), 
    address(""), 
    rssi(-100), 
    distance(0), 
    firstDetectedTime(0), 
    lastSeenTime(0), 
    hasMetadata(false),
    isCameraBeacon(false),
    cameraStatus(0),
    streamClients(0),
    beaconType("Standard") {
    memset(metadata, 0, sizeof(metadata));
  }
};

// Camera beacon metadata structure (matches ESP32-CAM firmware)
struct CameraBeaconMetadata {
  uint8_t version;          // Protocol version
  uint8_t beaconId;         // Numeric beacon ID
  uint8_t batteryLevel;     // Battery percentage
  uint8_t locationHash;     // Hash of location name
  uint8_t cameraStatus;     // Camera status: 0=off, 1=ready, 2=streaming
  uint8_t streamClients;    // Number of active stream clients
  uint16_t uptime;          // Uptime in minutes
} __attribute__((packed));

// Helper function to get camera status string
String getCameraStatusString(uint8_t status) {
  switch(status) {
    case 0: return "Offline";
    case 1: return "Ready";
    case 2: return "Streaming";
    default: return "Unknown";
  }
}

class EnhancedBLEScanner {
private:
  BLEScan* pBLEScan;
  std::vector<EnhancedBeaconInfo> activeBeacons;
  
  // Callback for BLE scan results
  class ScanCallback : public BLEAdvertisedDeviceCallbacks {
  private:
    EnhancedBLEScanner* parent;
  public:
    ScanCallback(EnhancedBLEScanner* p) : parent(p) {}
    
    void onResult(BLEAdvertisedDevice advertisedDevice) override {
      String devName = advertisedDevice.getName().c_str();
      
      // Filter for PetZone beacons only
      if (devName.length() == 0 || !devName.startsWith("PetZone")) {
        return;
      }
      
      String address = advertisedDevice.getAddress().toString().c_str();
      int rssi = advertisedDevice.getRSSI();
      
      // Check for service data (metadata)
      bool hasMetadata = false;
      uint8_t metadata[8] = {0};
      bool isCameraBeacon = false;
      uint8_t cameraStatus = 0;
      uint8_t streamClients = 0;
      String beaconType = "Standard";
      
      // Extract and decode metadata - Updated for ESP32 BLE library compatibility
      if (advertisedDevice.haveServiceData()) {
        // Try to get service data - different approaches for different library versions
        String serviceDataStr = "";
        
        // Method 1: Try getting all service data
        try {
          serviceDataStr = advertisedDevice.getServiceData();
        } catch (...) {
          // Method 2: Try getting service data by index
          try {
            serviceDataStr = advertisedDevice.getServiceData(0);
          } catch (...) {
            Serial.println("Could not retrieve service data");
          }
        }
        
        if (serviceDataStr.length() >= sizeof(CameraBeaconMetadata)) {
          hasMetadata = true;
          
          // Convert String to byte array
          for (int i = 0; i < min((int)serviceDataStr.length(), 8); i++) {
            metadata[i] = serviceDataStr.charAt(i);
          }
          
          // Decode camera beacon metadata
          if (serviceDataStr.length() >= sizeof(CameraBeaconMetadata)) {
            CameraBeaconMetadata* camData = (CameraBeaconMetadata*)serviceDataStr.c_str();
            
            if (camData->version == 3) { // Camera beacon version
              isCameraBeacon = true;
              cameraStatus = camData->cameraStatus;
              streamClients = camData->streamClients;
              
              // Determine beacon type from name and metadata
              if (devName.indexOf("Camera") >= 0) {
                beaconType = "Camera";
              } else if (devName.indexOf("Security") >= 0) {
                beaconType = "Security";
              } else if (devName.indexOf("Monitor") >= 0) {
                beaconType = "Monitor";
              } else if (isCameraBeacon) {
                beaconType = "Camera";
              }
              
              Serial.printf("📹 Camera Beacon: %s\n", devName.c_str());
              Serial.printf("   Status: %s\n", getCameraStatusString(cameraStatus).c_str());
              Serial.printf("   Clients: %d\n", streamClients);
              Serial.printf("   Type: %s\n", beaconType.c_str());
            }
          }
        }
      }
      
      // Update beacon list
      parent->updateBeacon(devName, address, rssi, hasMetadata, metadata, 
                          isCameraBeacon, cameraStatus, streamClients, beaconType);
    }
  };
  
  // Convert RSSI to estimated distance
  double rssiToDistance(int rssi, int txPower = -59) {
    if (rssi == 0) {
      return -1.0;
    }
    
    double ratio = rssi * 1.0 / txPower;
    if (ratio < 1.0) {
      return pow(ratio, 10);
    } else {
      double accuracy = (0.89976) * pow(ratio, 7.7095) + 0.111;
      return accuracy;
    }
  }
  
public:
  EnhancedBLEScanner() : pBLEScan(nullptr) {}
  
  bool begin() {
    BLEDevice::init("Enhanced-Scanner");
    pBLEScan = BLEDevice::getScan();
    
    if (pBLEScan == nullptr) {
      return false;
    }
    
    pBLEScan->setAdvertisedDeviceCallbacks(new ScanCallback(this));
    pBLEScan->setActiveScan(true);
    pBLEScan->setInterval(1349);
    pBLEScan->setWindow(449);
    
    Serial.println("✅ Enhanced BLE scanner initialized");
    return true;
  }
  
  void updateBeacon(const String& name, const String& address, int rssi, 
                   bool hasMetadata, uint8_t* metadata,
                   bool isCameraBeacon, uint8_t cameraStatus, 
                   uint8_t streamClients, const String& beaconType) {
    
    // Find existing beacon or create new one
    bool found = false;
    for (auto& beacon : activeBeacons) {
      if (beacon.address == address) {
        // Update existing beacon
        beacon.name = name;
        beacon.rssi = rssi;
        beacon.distance = rssiToDistance(rssi);
        beacon.lastSeenTime = millis();
        beacon.hasMetadata = hasMetadata;
        beacon.isCameraBeacon = isCameraBeacon;
        beacon.cameraStatus = cameraStatus;
        beacon.streamClients = streamClients;
        beacon.beaconType = beaconType;
        
        if (hasMetadata) {
          memcpy(beacon.metadata, metadata, 8);
        }
        
        found = true;
        break;
      }
    }
    
    if (!found) {
      // Add new beacon
      EnhancedBeaconInfo newBeacon;
      newBeacon.name = name;
      newBeacon.address = address;
      newBeacon.rssi = rssi;
      newBeacon.distance = rssiToDistance(rssi);
      newBeacon.firstDetectedTime = millis();
      newBeacon.lastSeenTime = millis();
      newBeacon.hasMetadata = hasMetadata;
      newBeacon.isCameraBeacon = isCameraBeacon;
      newBeacon.cameraStatus = cameraStatus;
      newBeacon.streamClients = streamClients;
      newBeacon.beaconType = beaconType;
      
      if (hasMetadata) {
        memcpy(newBeacon.metadata, metadata, 8);
      }
      
      activeBeacons.push_back(newBeacon);
      
      Serial.printf("🆕 New %s beacon: %s (%s)\n", 
                    beaconType.c_str(), name.c_str(), address.c_str());
    }
  }
  
  void scan(int duration = 5) {
    if (pBLEScan) {
      Serial.printf("🔍 Scanning for %d seconds...\n", duration);
      BLEScanResults* foundDevices = pBLEScan->start(duration, false);
      Serial.printf("📊 Scan completed. Found %d devices total.\n", foundDevices->getCount());
      pBLEScan->clearResults();
    }
  }
  
  void printBeacons() {
    Serial.println("\n═══════════════════════════════════");
    Serial.println("        DETECTED BEACONS");
    Serial.println("═══════════════════════════════════");
    
    if (activeBeacons.empty()) {
      Serial.println("No PetZone beacons detected.");
      return;
    }
    
    for (const auto& beacon : activeBeacons) {
      Serial.printf("📍 %s\n", beacon.name.c_str());
      Serial.printf("   Address: %s\n", beacon.address.c_str());
      Serial.printf("   RSSI: %d dBm\n", beacon.rssi);
      Serial.printf("   Distance: %.1f m\n", beacon.distance);
      Serial.printf("   Type: %s\n", beacon.beaconType.c_str());
      
      if (beacon.isCameraBeacon) {
        Serial.printf("   📹 Camera Status: %s\n", getCameraStatusString(beacon.cameraStatus).c_str());
        Serial.printf("   👥 Stream Clients: %d\n", beacon.streamClients);
        
        // Generate hypothetical video stream URL
        String ipAddress = generateVideoURL(beacon.address);
        if (ipAddress.length() > 0) {
          Serial.printf("   🎥 Stream URL: http://%s/stream\n", ipAddress.c_str());
        }
      }
      
      Serial.printf("   ⏰ Last seen: %lu ms ago\n", millis() - beacon.lastSeenTime);
      Serial.println("   ─────────────────────────────────");
    }
    
    Serial.println("═══════════════════════════════════\n");
  }
  
  // Helper function to generate video URL from beacon info
  // In a real implementation, this would need to be configured
  // or discovered through additional beacon metadata
  String generateVideoURL(const String& address) {
    // This is a simplified example - in reality you'd need
    // to either store the IP mapping or have the beacon
    // advertise its IP address in the metadata
    
    // For demonstration: assume last part of MAC becomes IP
    int lastColon = address.lastIndexOf(':');
    if (lastColon > 0) {
      String lastByte = address.substring(lastColon + 1);
      int decimal = strtol(lastByte.c_str(), NULL, 16);
      return "192.168.4.1"; // ESP32-CAM default AP IP
    }
    return "";
  }
  
  void removeExpiredBeacons(unsigned long timeout = 30000) {
    unsigned long currentTime = millis();
    
    for (auto it = activeBeacons.begin(); it != activeBeacons.end(); ) {
      if (currentTime - it->lastSeenTime > timeout) {
        Serial.printf("🗑️ Removing expired beacon: %s\n", it->name.c_str());
        it = activeBeacons.erase(it);
      } else {
        ++it;
      }
    }
  }
  
  const std::vector<EnhancedBeaconInfo>& getBeacons() const {
    return activeBeacons;
  }
  
  int getCameraBeaconCount() const {
    int count = 0;
    for (const auto& beacon : activeBeacons) {
      if (beacon.isCameraBeacon) count++;
    }
    return count;
  }
  
  int getStreamingBeaconCount() const {
    int count = 0;
    for (const auto& beacon : activeBeacons) {
      if (beacon.isCameraBeacon && beacon.cameraStatus == 2) count++;
    }
    return count;
  }
};

// Example usage function
void demonstrateEnhancedScanning() {
  EnhancedBLEScanner scanner;
  
  if (!scanner.begin()) {
    Serial.println("❌ Failed to initialize enhanced scanner");
    return;
  }
  
  // Continuous scanning example
  for (int i = 0; i < 5; i++) {
    scanner.scan(10); // Scan for 10 seconds
    scanner.removeExpiredBeacons();
    scanner.printBeacons();
    
    Serial.printf("📊 Total beacons: %d\n", scanner.getBeacons().size());
    Serial.printf("📹 Camera beacons: %d\n", scanner.getCameraBeaconCount());
    Serial.printf("🎥 Streaming beacons: %d\n", scanner.getStreamingBeaconCount());
    
    delay(5000); // Wait 5 seconds between scans
  }
}

/*
 * Integration Notes for Main Dashboard:
 * 
 * 1. Update BeaconInfo structure to include camera fields
 * 2. Modify BLE scanner callback to decode camera metadata
 * 3. Add camera status indicators to web interface
 * 4. Include video stream links for camera beacons
 * 5. Add filtering options for beacon types
 * 6. Update position filter to handle camera beacon metadata
 * 
 * Example dashboard enhancements:
 * - Camera icon next to camera beacons in beacon list
 * - "View Stream" button for active camera beacons  
 * - Status indicators (Ready/Streaming/Offline)
 * - Stream client count display
 * - Camera-specific settings and controls
 */ 