/**
 * @file BuzzerTest_Refactored.ino
 * @brief Comprehensive Buzzer and Alert System Test - Refactored
 * @author PetCollar Development Team
 * @version 3.0.0
 * 
 * Enhanced buzzer test program for validating alert system functionality.
 * Tests all alert patterns, volume levels, and PWM configurations.
 * Includes interactive serial commands and comprehensive diagnostics.
 */

#include "../common/include/PetCollarConfig.h"
#include "../common/include/AlertManager.h"
#include "../common/include/SystemStateManager.h"
#include "../common/include/Utils.h"

// ==========================================
// GLOBAL VARIABLES
// ==========================================

AlertManager alertManager;
SystemStateManager systemState;

// Test configuration
bool testRunning = false;
int currentTestIndex = 0;
unsigned long lastTestTime = 0;
const unsigned long TEST_INTERVAL = 3000; // 3 seconds between tests

// Test patterns
struct TestPattern {
  String name;
  AlertType type;
  AlertPriority priority;
  int duration;
  String description;
};

TestPattern testPatterns[] = {
  {"Proximity Alert", ALERT_TYPE_PROXIMITY, ALERT_PRIORITY_MEDIUM, 2000, "Standard proximity warning"},
  {"Zone Exit Alert", ALERT_TYPE_ZONE_EXIT, ALERT_PRIORITY_HIGH, 3000, "Pet left safe zone"},
  {"Low Battery", ALERT_TYPE_LOW_BATTERY, ALERT_PRIORITY_LOW, 1500, "Battery level warning"},
  {"System Error", ALERT_TYPE_SYSTEM_ERROR, ALERT_PRIORITY_HIGH, 2500, "System malfunction alert"},
  {"Emergency", ALERT_TYPE_EMERGENCY, ALERT_PRIORITY_CRITICAL, 5000, "Critical emergency alert"},
  {"Test Pattern", ALERT_TYPE_CUSTOM, ALERT_PRIORITY_MEDIUM, 2000, "Custom test pattern"}
};

const int NUM_TEST_PATTERNS = sizeof(testPatterns) / sizeof(TestPattern);

// ==========================================
// SETUP FUNCTION
// ==========================================

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  printBanner();
  
  // Initialize system components
  if (!systemState.begin()) {
    Serial.println("❌ Failed to initialize system state manager");
    return;
  }
  
  if (!alertManager.begin()) {
    Serial.println("❌ Failed to initialize alert manager");
    return;
  }
  
  // Configure alert manager callbacks
  setupAlertCallbacks();
  
  // Perform initial hardware tests
  performHardwareTests();
  
  // Display menu
  printMainMenu();
  
  Serial.println("\n🔧 Buzzer Test System Ready!");
  Serial.println("💡 Type 'help' for available commands");
}

// ==========================================
// MAIN LOOP
// ==========================================

void loop() {
  // Update system components
  alertManager.update();
  systemState.update();
  
  // Handle serial commands
  handleSerialCommands();
  
  // Run automatic tests if enabled
  if (testRunning) {
    runAutomaticTests();
  }
  
  delay(50); // Small delay for stability
}

// ==========================================
// INITIALIZATION FUNCTIONS
// ==========================================

/**
 * @brief Print startup banner
 */
void printBanner() {
  Serial.println("╔════════════════════════════════════════╗");
  Serial.println("║       PetCollar Buzzer Test v3.0       ║");
  Serial.println("║          Refactored Edition            ║");
  Serial.println("╚════════════════════════════════════════╝");
  Serial.println();
}

/**
 * @brief Setup alert manager callbacks
 */
void setupAlertCallbacks() {
  alertManager.onAlertStart([](AlertType type, AlertPriority priority) {
    Serial.printf("🔊 Alert Started: Type=%d, Priority=%d\n", (int)type, (int)priority);
  });
  
  alertManager.onAlertEnd([](AlertType type) {
    Serial.printf("🔇 Alert Ended: Type=%d\n", (int)type);
  });
  
  alertManager.onError([](const String& error) {
    Serial.printf("⚠️ Alert Error: %s\n", error.c_str());
  });
}

/**
 * @brief Perform initial hardware tests
 */
void performHardwareTests() {
  Serial.println("🔍 Performing Hardware Tests...");
  Serial.println("─────────────────────────────");
  
  // Test GPIO initialization
  Serial.print("📌 GPIO Configuration: ");
  #ifdef BUZZER_PIN
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("✅ OK");
  #else
  Serial.println("❌ BUZZER_PIN not defined");
  #endif
  
  #ifdef VIBRATION_PIN
  Serial.print("📳 Vibration Motor: ");
  pinMode(VIBRATION_PIN, OUTPUT);
  digitalWrite(VIBRATION_PIN, LOW);
  Serial.println("✅ OK");
  #else
  Serial.println("⚠️ VIBRATION_PIN not defined");
  #endif
  
  // Test PWM functionality
  Serial.print("🎵 PWM Test: ");
  #ifdef BUZZER_PIN
  // Test basic PWM output
  ledcSetup(0, 1000, 8); // Channel 0, 1kHz, 8-bit resolution
  ledcAttachPin(BUZZER_PIN, 0);
  ledcWrite(0, 128); // 50% duty cycle
  delay(200);
  ledcWrite(0, 0); // Turn off
  Serial.println("✅ OK");
  #else
  Serial.println("❌ Failed - No buzzer pin");
  #endif
  
  // Test system state
  Serial.print("📊 System State: ");
  if (systemState.isHealthy()) {
    Serial.println("✅ Healthy");
  } else {
    Serial.println("⚠️ Warning - " + systemState.getCompactStatus());
  }
  
  Serial.println("─────────────────────────────");
  Serial.println("✅ Hardware Tests Complete\n");
}

// ==========================================
// MENU FUNCTIONS
// ==========================================

/**
 * @brief Print main menu
 */
void printMainMenu() {
  Serial.println("📋 Available Commands:");
  Serial.println("─────────────────────");
  Serial.println("  test <pattern>  - Test specific pattern (1-6)");
  Serial.println("  auto           - Run automatic test sequence");
  Serial.println("  stop           - Stop current test");
  Serial.println("  volume <0-100> - Set alert volume");
  Serial.println("  freq <hz>      - Test specific frequency");
  Serial.println("  patterns       - List all test patterns");
  Serial.println("  status         - Show system status");
  Serial.println("  stats          - Show alert statistics");
  Serial.println("  reset          - Reset alert system");
  Serial.println("  help           - Show this menu");
  Serial.println("─────────────────────");
}

// ==========================================
// COMMAND HANDLING
// ==========================================

/**
 * @brief Handle serial commands
 */
void handleSerialCommands() {
  if (!Serial.available()) return;
  
  String command = Serial.readStringUntil('\n');
  command.trim();
  command.toLowerCase();
  
  if (command == "help") {
    printMainMenu();
  } else if (command == "auto") {
    startAutomaticTests();
  } else if (command == "stop") {
    stopAllTests();
  } else if (command == "patterns") {
    listTestPatterns();
  } else if (command == "status") {
    showSystemStatus();
  } else if (command == "stats") {
    showAlertStatistics();
  } else if (command == "reset") {
    resetAlertSystem();
  } else if (command.startsWith("test ")) {
    int pattern = command.substring(5).toInt();
    runSingleTest(pattern);
  } else if (command.startsWith("volume ")) {
    int volume = command.substring(7).toInt();
    setVolume(volume);
  } else if (command.startsWith("freq ")) {
    int frequency = command.substring(5).toInt();
    testFrequency(frequency);
  } else if (command.length() > 0) {
    Serial.println("❌ Unknown command. Type 'help' for available commands.");
  }
}

// ==========================================
// TEST FUNCTIONS
// ==========================================

/**
 * @brief Start automatic test sequence
 */
void startAutomaticTests() {
  Serial.println("🔄 Starting Automatic Test Sequence...");
  testRunning = true;
  currentTestIndex = 0;
  lastTestTime = 0;
}

/**
 * @brief Stop all tests
 */
void stopAllTests() {
  Serial.println("⏹️ Stopping All Tests...");
  testRunning = false;
  alertManager.stopAlert();
  currentTestIndex = 0;
}

/**
 * @brief Run automatic tests
 */
void runAutomaticTests() {
  unsigned long currentTime = millis();
  
  if (currentTime - lastTestTime >= TEST_INTERVAL) {
    if (currentTestIndex < NUM_TEST_PATTERNS) {
      runTestPattern(currentTestIndex);
      currentTestIndex++;
      lastTestTime = currentTime;
    } else {
      // All tests completed
      testRunning = false;
      currentTestIndex = 0;
      Serial.println("✅ Automatic Test Sequence Complete!");
      showTestSummary();
    }
  }
}

/**
 * @brief Run a single test pattern
 */
void runSingleTest(int patternIndex) {
  if (patternIndex < 1 || patternIndex > NUM_TEST_PATTERNS) {
    Serial.printf("❌ Invalid pattern number. Use 1-%d\n", NUM_TEST_PATTERNS);
    return;
  }
  
  runTestPattern(patternIndex - 1);
}

/**
 * @brief Run specific test pattern
 */
void runTestPattern(int index) {
  if (index < 0 || index >= NUM_TEST_PATTERNS) return;
  
  TestPattern& pattern = testPatterns[index];
  
  Serial.printf("🧪 Testing: %s\n", pattern.name.c_str());
  Serial.printf("   Description: %s\n", pattern.description.c_str());
  Serial.printf("   Duration: %dms\n", pattern.duration);
  
  // Create alert configuration
  AlertConfig config;
  config.type = pattern.type;
  config.priority = pattern.priority;
  config.duration = pattern.duration;
  config.buzzerEnabled = true;
  
  #ifdef VIBRATION_PIN
  config.vibrationEnabled = true;
  #endif
  
  // Start the alert
  bool success = alertManager.triggerAlert(config);
  
  if (success) {
    Serial.println("   Status: ✅ Started");
  } else {
    Serial.println("   Status: ❌ Failed to start");
  }
  
  Serial.println();
}

/**
 * @brief List all test patterns
 */
void listTestPatterns() {
  Serial.println("📝 Available Test Patterns:");
  Serial.println("─────────────────────────────");
  
  for (int i = 0; i < NUM_TEST_PATTERNS; i++) {
    TestPattern& pattern = testPatterns[i];
    Serial.printf("  %d. %s\n", i + 1, pattern.name.c_str());
    Serial.printf("     %s\n", pattern.description.c_str());
    Serial.printf("     Priority: %d, Duration: %dms\n\n", 
                  (int)pattern.priority, pattern.duration);
  }
}

/**
 * @brief Test specific frequency
 */
void testFrequency(int frequency) {
  if (frequency < 20 || frequency > 20000) {
    Serial.println("❌ Frequency must be between 20-20000 Hz");
    return;
  }
  
  Serial.printf("🎵 Testing frequency: %d Hz\n", frequency);
  
  #ifdef BUZZER_PIN
  // Generate tone for 2 seconds
  ledcSetup(0, frequency, 8);
  ledcAttachPin(BUZZER_PIN, 0);
  ledcWrite(0, 128); // 50% duty cycle
  
  delay(2000);
  
  ledcWrite(0, 0); // Turn off
  Serial.println("✅ Frequency test complete");
  #else
  Serial.println("❌ No buzzer pin configured");
  #endif
}

/**
 * @brief Set alert volume
 */
void setVolume(int volume) {
  if (volume < 0 || volume > 100) {
    Serial.println("❌ Volume must be between 0-100");
    return;
  }
  
  alertManager.setVolume(volume);
  Serial.printf("🔊 Volume set to: %d%%\n", volume);
  
  // Test the new volume with a short beep
  AlertConfig config;
  config.type = ALERT_TYPE_CUSTOM;
  config.priority = ALERT_PRIORITY_LOW;
  config.duration = 500;
  config.buzzerEnabled = true;
  
  alertManager.triggerAlert(config);
}

// ==========================================
// STATUS AND STATISTICS
// ==========================================

/**
 * @brief Show system status
 */
void showSystemStatus() {
  Serial.println("📊 System Status:");
  Serial.println("─────────────────");
  
  // System state information
  const auto& deviceInfo = systemState.getDeviceInfo();
  const auto& batteryStatus = systemState.getBatteryStatus();
  const auto& memoryStatus = systemState.getMemoryStatus();
  
  Serial.printf("Device ID: %s\n", deviceInfo.deviceId.c_str());
  Serial.printf("Firmware: %s\n", deviceInfo.firmwareVersion.c_str());
  Serial.printf("Uptime: %lu seconds\n", systemState.getUptime());
  
  Serial.printf("Battery: %d%% (%.2fV)\n", 
                batteryStatus.percentage, batteryStatus.voltage);
  
  Serial.printf("Memory: %d KB free / %d KB total\n", 
                memoryStatus.freeHeap / 1024, memoryStatus.totalHeap / 1024);
  
  Serial.printf("System State: %s\n", 
                systemState.isHealthy() ? "Healthy" : "Warning");
  
  // Alert manager status
  Serial.println("\n🔊 Alert Manager:");
  Serial.printf("Current Volume: %d%%\n", alertManager.getCurrentVolume());
  Serial.printf("Active Alerts: %d\n", alertManager.getActiveAlertCount());
  Serial.printf("Alert Queue: %d\n", alertManager.getQueueSize());
  
  Serial.println("─────────────────");
}

/**
 * @brief Show alert statistics
 */
void showAlertStatistics() {
  String stats = alertManager.getStatistics();
  
  Serial.println("📈 Alert Statistics:");
  Serial.println("─────────────────");
  Serial.println(stats);
  Serial.println("─────────────────");
}

/**
 * @brief Show test summary
 */
void showTestSummary() {
  Serial.println("📋 Test Summary:");
  Serial.println("─────────────────");
  Serial.printf("Total Patterns Tested: %d\n", NUM_TEST_PATTERNS);
  Serial.printf("Test Duration: ~%d seconds\n", (NUM_TEST_PATTERNS * TEST_INTERVAL) / 1000);
  
  // Show alert statistics after tests
  showAlertStatistics();
}

/**
 * @brief Reset alert system
 */
void resetAlertSystem() {
  Serial.println("🔄 Resetting Alert System...");
  
  alertManager.stopAlert();
  alertManager.clearQueue();
  
  delay(500);
  
  Serial.println("✅ Alert system reset complete");
}

// ==========================================
// ERROR HANDLING
// ==========================================

/**
 * @brief Handle system errors
 */
void handleSystemError(const String& error) {
  Serial.printf("🚨 System Error: %s\n", error.c_str());
  
  // Log error to system state
  systemState.reportError(error);
  
  // Stop any running tests
  if (testRunning) {
    stopAllTests();
  }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * @brief Print memory usage
 */
void printMemoryUsage() {
  Serial.printf("🧠 Memory Usage: %d KB free, %d KB used\n", 
                ESP.getFreeHeap() / 1024, 
                (ESP.getHeapSize() - ESP.getFreeHeap()) / 1024);
}

/**
 * @brief Validate hardware configuration
 */
bool validateHardware() {
  #ifndef BUZZER_PIN
  Serial.println("❌ Error: BUZZER_PIN not defined in configuration");
  return false;
  #endif
  
  // Add more hardware validation as needed
  return true;
} 