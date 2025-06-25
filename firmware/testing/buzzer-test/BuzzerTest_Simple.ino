/*
 * Simple Buzzer Test - Pet Collar Project
 * 
 * UPLOAD THIS TO A FRESH ESP32 DEVICE FOR TESTING
 * 
 * This test validates basic buzzer functionality with different frequencies
 * and PWM methods to identify what works with your specific buzzer hardware.
 * 
 * Hardware Setup:
 * - Buzzer positive wire -> ESP32 Pin 25
 * - Buzzer negative wire -> ESP32 GND
 * 
 * Serial Monitor: 115200 baud
 */

#define BUZZER_PIN 25
#define TEST_DURATION 500  // Duration for each test in milliseconds

void setup() {
  Serial.begin(115200);
  delay(2000);  // Give time to open serial monitor
  
  Serial.println("🚨 Pet Collar - Simple Buzzer Test");
  Serial.println("==================================");
  Serial.printf("Buzzer Pin: %d\n", BUZZER_PIN);
  Serial.printf("Test Duration: %d ms per frequency\n", TEST_DURATION);
  Serial.println();
  
  // Initialize pin
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  
  Serial.println("Starting buzzer tests in 3 seconds...");
  delay(3000);
  
  runAllTests();
  
  Serial.println("\n✅ All tests complete!");
  Serial.println("📝 Results Summary:");
  Serial.println("   - If you heard sounds: Hardware is working");
  Serial.println("   - If no sounds: Check wiring or try different buzzer");
  Serial.println("   - Note which frequencies worked best");
  Serial.println("\n💡 Commands available in loop:");
  Serial.println("   'test' - Quick 2kHz test");
  Serial.println("   'freq XXXX' - Test specific frequency");
  Serial.println("   'sweep' - Frequency sweep");
  Serial.println("   'help' - Show commands");
}

void runAllTests() {
  Serial.println("🔧 Test 1: Digital On/Off (should produce clicks)");
  testDigitalPulses();
  
  delay(1000);
  
  Serial.println("\n🔧 Test 2: PWM Frequencies (should produce tones)");
  testPWMFrequencies();
  
  delay(1000);
  
  Serial.println("\n🔧 Test 3: Frequency Sweep (should produce rising tone)");
  testFrequencySweep();
}

void testDigitalPulses() {
  Serial.println("   Sending 10 digital pulses...");
  
  for (int i = 0; i < 10; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(50);
    digitalWrite(BUZZER_PIN, LOW);
    delay(50);
    Serial.print(".");
  }
  Serial.println(" Done!");
}

void testPWMFrequencies() {
  // Test frequencies that work well with most buzzers
  int frequencies[] = {500, 1000, 1500, 2000, 2500, 3000, 4000, 5000};
  int numFreqs = sizeof(frequencies) / sizeof(frequencies[0]);
  
  for (int i = 0; i < numFreqs; i++) {
    int freq = frequencies[i];
    Serial.printf("   Testing %d Hz... ", freq);
    
    // Use old ESP32 API for maximum compatibility
    ledcSetup(0, freq, 8);  // Channel 0, frequency, 8-bit resolution
    ledcAttachPin(BUZZER_PIN, 0);
    
    // 50% duty cycle
    ledcWrite(0, 128);
    delay(TEST_DURATION);
    
    // Turn off
    ledcWrite(0, 0);
    delay(200);
    
    Serial.println("Done");
  }
  
  // Cleanup
  ledcDetachPin(BUZZER_PIN);
  digitalWrite(BUZZER_PIN, LOW);
}

void testFrequencySweep() {
  Serial.println("   Sweeping 500Hz to 5000Hz...");
  
  // Setup PWM
  ledcSetup(0, 500, 8);
  ledcAttachPin(BUZZER_PIN, 0);
  
  // Sweep frequencies
  for (int freq = 500; freq <= 5000; freq += 100) {
    ledcSetup(0, freq, 8);
    ledcWrite(0, 128);  // 50% duty cycle
    delay(30);  // Short duration for each step
  }
  
  // Turn off
  ledcWrite(0, 0);
  ledcDetachPin(BUZZER_PIN);
  digitalWrite(BUZZER_PIN, LOW);
  
  Serial.println("   Sweep complete!");
}

void loop() {
  // Interactive command mode
  if (Serial.available()) {
    String command = Serial.readStringUntil('\n');
    command.trim();
    command.toLowerCase();
    
    if (command == "test") {
      Serial.println("🔊 Quick test at 2000Hz...");
      quickTest(2000);
      
    } else if (command.startsWith("freq ")) {
      int freq = command.substring(5).toInt();
      if (freq >= 100 && freq <= 20000) {
        Serial.printf("🎵 Testing %d Hz...\n", freq);
        quickTest(freq);
      } else {
        Serial.println("❌ Frequency must be between 100-20000 Hz");
      }
      
    } else if (command == "sweep") {
      Serial.println("🌊 Running frequency sweep...");
      testFrequencySweep();
      
    } else if (command == "help") {
      Serial.println("Available commands:");
      Serial.println("  test       - Quick 2kHz test");
      Serial.println("  freq XXXX  - Test specific frequency (100-20000 Hz)");
      Serial.println("  sweep      - Frequency sweep test");
      Serial.println("  help       - Show this help");
      
    } else if (command.length() > 0) {
      Serial.println("❌ Unknown command. Type 'help' for available commands.");
    }
  }
  
  delay(100);
}

void quickTest(int frequency) {
  // Simple test function for interactive use
  ledcSetup(0, frequency, 8);
  ledcAttachPin(BUZZER_PIN, 0);
  ledcWrite(0, 128);
  delay(1000);
  ledcWrite(0, 0);
  ledcDetachPin(BUZZER_PIN);
  digitalWrite(BUZZER_PIN, LOW);
  Serial.println("✅ Test complete");
} 