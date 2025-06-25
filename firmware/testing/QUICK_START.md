# 🚀 Quick Start - Buzzer Testing

## Immediate Steps for Fresh ESP32

### 1. Hardware Setup (2 minutes)
```
ESP32 Pin 25  ──────► Buzzer Positive (+)
ESP32 GND     ──────► Buzzer Negative (-)
```

### 2. Upload Test Firmware (3 minutes)
1. Open Arduino IDE
2. Load: `firmware/testing/buzzer-test/BuzzerTest_Simple.ino`
3. Select your ESP32 board
4. Upload firmware
5. Open Serial Monitor (115200 baud)

### 3. Run Tests (5 minutes)
The firmware will automatically run:
- ✅ Digital pulse test (should hear clicks)
- ✅ PWM frequency test (should hear tones)
- ✅ Frequency sweep (should hear rising tone)

### 4. Interactive Testing
After automatic tests, try these commands:
```
test          # Quick 2kHz test
freq 1000     # Test 1000Hz specifically
freq 2000     # Test 2000Hz specifically
freq 3000     # Test 3000Hz specifically
sweep         # Run frequency sweep again
help          # Show all commands
```

### 5. Document Results (5 minutes)
Fill out: `firmware/testing/buzzer-test/test-results.md`
- Note which frequencies worked
- Record volume levels
- Identify the best frequency

## Expected Output
```
🚨 Pet Collar - Simple Buzzer Test
==================================
Buzzer Pin: 25
Test Duration: 500 ms per frequency

Starting buzzer tests in 3 seconds...
🔧 Test 1: Digital On/Off (should produce clicks)
   Sending 10 digital pulses...
.......... Done!

🔧 Test 2: PWM Frequencies (should produce tones)
   Testing 500 Hz... Done
   Testing 1000 Hz... Done
   Testing 1500 Hz... Done
   Testing 2000 Hz... Done
   Testing 2500 Hz... Done
   Testing 3000 Hz... Done
   Testing 4000 Hz... Done
   Testing 5000 Hz... Done

🔧 Test 3: Frequency Sweep (should produce rising tone)
   Sweeping 500Hz to 5000Hz...
   Sweep complete!

✅ All tests complete!
```

## Troubleshooting

### No Sound at All
1. Check wiring connections
2. Verify buzzer polarity
3. Try different buzzer if available
4. Check ESP32 power supply

### Some Frequencies Work, Others Don't
- **Normal behavior** - buzzers are often frequency-specific
- Note which frequencies work best
- Use the best frequency for production

### Only Clicks, No Tones
- Buzzer might be active type (needs DC, not PWM)
- Try different frequencies
- Check if buzzer needs external driver

## Next Steps
Once you have test results:
1. Fill out `test-results.md`
2. Follow `INTEGRATION_PLAN.md`
3. Update production firmware with working settings

## Time Estimate
- **Total testing time**: ~15 minutes
- **Documentation**: ~5 minutes
- **Integration**: ~10 minutes 