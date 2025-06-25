#ifndef MICRO_SYSTEM_STATE_H
#define MICRO_SYSTEM_STATE_H

#include <Arduino.h>
#include "micro_config.h"
#include "micro_beacon_manager.h"

// System state structure
struct SystemState {
  // Device information
  String deviceId;
  String firmwareVersion;
  String hardwareVersion;
  unsigned long uptime;
  
  // WiFi state
  bool wifiConnected;
  String localIP;
  String wifiSSID;
  int wifiSignalStrength;
  
  // BLE state
  bool bleActive;
  int beaconsDetected;
  std::vector<Beacon> beacons;
  unsigned long lastBLEScan;
  
  // Battery state
  int batteryPercentage;
  float batteryVoltage;
  bool isLowBattery;
  bool isCharging;
  
  // System state
  bool isInitialized;
  bool isScanning;
  bool isAlertActive;
  bool isInSafeZone;
  bool systemError;
  String lastError;
  
  // Storage state
  bool storageHealthy;
  
  // Memory state
  int freeHeap;
  int totalHeap;
  
  // Component states
  bool webSocketActive;
  bool displayActive;
  
  // Timing
  unsigned long lastUpdateTime;
  unsigned long lastAlertTime;
  unsigned long lastBatteryCheck;
  
  // Location
  float rssi;
  float distance;
  String currentZone;
  
  SystemState() : 
    deviceId("PETCOLLAR-" + String((uint32_t)ESP.getEfuseMac(), HEX)),
    firmwareVersion("1.0.0"),
    hardwareVersion("ESP32-S3"),
    uptime(0),
    wifiConnected(false),
    wifiSignalStrength(0),
    bleActive(false),
    beaconsDetected(0),
    batteryPercentage(100),
    batteryVoltage(0.0),
    isLowBattery(false),
    isCharging(false),
    isInitialized(false),
    isScanning(false),
    isAlertActive(false),
    isInSafeZone(true),
    systemError(false),
    storageHealthy(true),
    freeHeap(0),
    totalHeap(0),
    webSocketActive(false),
    displayActive(false),
    lastUpdateTime(0),
    lastAlertTime(0),
    lastBatteryCheck(0),
    rssi(0),
    distance(0.0),
    currentZone(""),
    lastBLEScan(0) {}
};

// Triangulation state structure
struct TriangulationState {
  bool positionValid;
  float positionX;
  float positionY;
  float confidence;
  unsigned long lastUpdateTime;
  std::vector<std::pair<float, float>> positionHistory;
  
  TriangulationState() :
    positionValid(false),
    positionX(0.0),
    positionY(0.0),
    confidence(0.0),
    lastUpdateTime(0) {}
};

#endif // MICRO_SYSTEM_STATE_H 