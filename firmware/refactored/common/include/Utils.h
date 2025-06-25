/**
 * @file Utils.h
 * @brief Common Utility Functions for Pet Collar System
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * This header contains utility functions that are commonly used across
 * different components of the pet collar system.
 * 
 * Features:
 * - RSSI to distance conversion algorithms
 * - String manipulation utilities
 * - Time and date formatting
 * - Network helper functions
 * - Mathematical utilities
 */

#ifndef UTILS_H
#define UTILS_H

#include <Arduino.h>
#include <WiFi.h>
#include <math.h>
#include "PetCollarConfig.h"

// ==========================================
// DISTANCE CALCULATION UTILITIES
// ==========================================

/**
 * @brief Convert RSSI value to estimated distance in centimeters
 * @param rssi The received signal strength indicator value
 * @return Estimated distance in centimeters
 * 
 * Uses empirical formula based on free space path loss model
 * Formula: distance = 10^((Tx_Power - RSSI) / (10 * n))
 * Where Tx_Power is assumed to be -40dBm and n=2 for free space
 */
inline int rssiToDistance(int rssi) {
    if (rssi == 0) return 999; // No signal
    
    // Clamp RSSI to reasonable range to avoid overflow
    rssi = constrain(rssi, -100, -20);
    
    // Convert to distance using logarithmic formula
    float distanceMeters = pow(10.0, (rssi + 40.0) / -20.0);
    
    // Convert to centimeters and ensure minimum of 1cm
    int distanceCm = max(1, (int)round(distanceMeters * 100));
    
    // Cap maximum distance to avoid unrealistic values
    return min(distanceCm, 2000); // Max 20 meters
}

/**
 * @brief Convert distance in centimeters to estimated RSSI
 * @param distanceCm Distance in centimeters
 * @return Estimated RSSI value
 * 
 * Inverse of rssiToDistance function
 */
inline int distanceToRssi(int distanceCm) {
    if (distanceCm <= 0) return -20; // Very close
    
    float distanceMeters = distanceCm / 100.0;
    int rssi = -40 - (20 * log10(distanceMeters));
    
    return constrain(rssi, -100, -20);
}

// ==========================================
// STRING UTILITIES
// ==========================================

/**
 * @brief Extract location name from beacon name
 * @param beaconName Full beacon name (e.g., "PetZone-Home-01")
 * @return Location string (e.g., "Home")
 */
inline String extractLocation(const String& beaconName) {
    if (!beaconName.startsWith("PetZone-")) {
        return "Unknown";
    }
    
    int firstDash = beaconName.indexOf('-', 8);
    int secondDash = beaconName.indexOf('-', firstDash + 1);
    
    if (secondDash > 0) {
        return beaconName.substring(8, secondDash);
    } else if (firstDash > 0) {
        return beaconName.substring(8, firstDash);
    }
    
    return "Unknown";
}

/**
 * @brief Extract beacon ID from beacon name
 * @param beaconName Full beacon name (e.g., "PetZone-Home-01")
 * @return Beacon ID string (e.g., "01")
 */
inline String extractBeaconId(const String& beaconName) {
    int lastDash = beaconName.lastIndexOf('-');
    if (lastDash > 0 && lastDash < beaconName.length() - 1) {
        return beaconName.substring(lastDash + 1);
    }
    return "00";
}

/**
 * @brief Extract zone from hierarchical beacon name
 * @param beaconName Full beacon name (e.g., "PetZone-Home-Living-01")
 * @return Zone string (e.g., "Living") or empty string if not hierarchical
 */
inline String extractZone(const String& beaconName) {
    if (!beaconName.startsWith("PetZone-")) {
        return "";
    }
    
    int firstDash = beaconName.indexOf('-', 8);
    int secondDash = beaconName.indexOf('-', firstDash + 1);
    int thirdDash = beaconName.indexOf('-', secondDash + 1);
    
    if (thirdDash > 0) {
        return beaconName.substring(secondDash + 1, thirdDash);
    }
    
    return "";
}

/**
 * @brief Generate a random alphanumeric string
 * @param length Length of the string to generate
 * @return Random string
 */
inline String generateRandomString(int length) {
    const char charset[] = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    String result = "";
    
    for (int i = 0; i < length; i++) {
        result += charset[random(0, sizeof(charset) - 1)];
    }
    
    return result;
}

// ==========================================
// NETWORK UTILITIES
// ==========================================

/**
 * @brief Get WiFi signal strength as percentage
 * @return Signal strength percentage (0-100)
 */
inline int getWiFiSignalStrength() {
    if (WiFi.status() != WL_CONNECTED) {
        return 0;
    }
    
    int rssi = WiFi.RSSI();
    
    // Convert RSSI to percentage
    // -30 dBm = 100%, -90 dBm = 0%
    int percentage = map(rssi, -90, -30, 0, 100);
    return constrain(percentage, 0, 100);
}

/**
 * @brief Get WiFi signal quality description
 * @return String description of signal quality
 */
inline String getWiFiSignalQuality() {
    int strength = getWiFiSignalStrength();
    
    if (strength >= 80) return "Excellent";
    if (strength >= 60) return "Good";
    if (strength >= 40) return "Fair";
    if (strength >= 20) return "Poor";
    return "No Signal";
}

/**
 * @brief Get local IP address as string
 * @return IP address string or "0.0.0.0" if not connected
 */
inline String getLocalIPAddress() {
    if (WiFi.status() != WL_CONNECTED) {
        return "0.0.0.0";
    }
    return WiFi.localIP().toString();
}

/**
 * @brief Check if IP address is valid
 * @param ip IP address string to validate
 * @return true if valid, false otherwise
 */
inline bool isValidIPAddress(const String& ip) {
    IPAddress addr;
    return addr.fromString(ip);
}

// ==========================================
// TIME UTILITIES
// ==========================================

/**
 * @brief Format uptime as human-readable string
 * @param uptimeMs Uptime in milliseconds
 * @return Formatted string (e.g., "2d 3h 45m")
 */
inline String formatUptime(unsigned long uptimeMs) {
    unsigned long seconds = uptimeMs / 1000;
    unsigned long minutes = seconds / 60;
    unsigned long hours = minutes / 60;
    unsigned long days = hours / 24;
    
    String result = "";
    
    if (days > 0) {
        result += String(days) + "d ";
    }
    if (hours % 24 > 0) {
        result += String(hours % 24) + "h ";
    }
    if (minutes % 60 > 0) {
        result += String(minutes % 60) + "m";
    }
    
    if (result.length() == 0) {
        result = String(seconds % 60) + "s";
    }
    
    return result;
}

/**
 * @brief Get current timestamp as string
 * @return Timestamp string
 */
inline String getCurrentTimestamp() {
    return String(millis());
}

// ==========================================
// MATHEMATICAL UTILITIES
// ==========================================

/**
 * @brief Map a value from one range to another with floating point precision
 * @param value Value to map
 * @param fromLow Source range minimum
 * @param fromHigh Source range maximum
 * @param toLow Target range minimum
 * @param toHigh Target range maximum
 * @return Mapped value
 */
inline float mapFloat(float value, float fromLow, float fromHigh, float toLow, float toHigh) {
    return toLow + (value - fromLow) * (toHigh - toLow) / (fromHigh - fromLow);
}

/**
 * @brief Calculate moving average
 * @param newValue New value to add
 * @param currentAverage Current average value
 * @param sampleCount Number of samples in the average
 * @return Updated average
 */
inline float updateMovingAverage(float newValue, float currentAverage, int sampleCount) {
    if (sampleCount <= 1) {
        return newValue;
    }
    
    return currentAverage + (newValue - currentAverage) / sampleCount;
}

/**
 * @brief Apply exponential smoothing filter
 * @param newValue New raw value
 * @param currentValue Current filtered value
 * @param alpha Smoothing factor (0.0 - 1.0)
 * @return Filtered value
 */
inline float exponentialSmoothing(float newValue, float currentValue, float alpha) {
    alpha = constrain(alpha, 0.0, 1.0);
    return alpha * newValue + (1.0 - alpha) * currentValue;
}

// ==========================================
// MEMORY UTILITIES
// ==========================================

/**
 * @brief Get free heap memory in bytes
 * @return Free heap size in bytes
 */
inline size_t getFreeHeap() {
    return ESP.getFreeHeap();
}

/**
 * @brief Get free heap memory as percentage
 * @return Free heap percentage (0-100)
 */
inline int getFreeHeapPercentage() {
    size_t totalHeap = ESP.getHeapSize();
    size_t freeHeap = ESP.getFreeHeap();
    
    if (totalHeap == 0) return 0;
    
    return (freeHeap * 100) / totalHeap;
}

/**
 * @brief Check if heap memory is low
 * @return true if heap is below warning threshold
 */
inline bool isHeapLow() {
    return getFreeHeap() < RESERVED_HEAP_SIZE;
}

// ==========================================
// VALIDATION UTILITIES
// ==========================================

/**
 * @brief Validate RSSI value
 * @param rssi RSSI value to validate
 * @return true if valid, false otherwise
 */
inline bool isValidRSSI(int rssi) {
    return (rssi >= -100 && rssi <= 0);
}

/**
 * @brief Validate WiFi SSID
 * @param ssid SSID string to validate
 * @return true if valid, false otherwise
 */
inline bool isValidSSID(const String& ssid) {
    return (ssid.length() > 0 && ssid.length() <= MAX_SSID_LENGTH);
}

/**
 * @brief Validate WiFi password
 * @param password Password string to validate
 * @return true if valid, false otherwise
 */
inline bool isValidPassword(const String& password) {
    return (password.length() >= 8 && password.length() <= MAX_PASSWORD_LENGTH);
}

#endif // UTILS_H 