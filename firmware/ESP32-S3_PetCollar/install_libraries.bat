@echo off
rem Arduino Library Installation Script for PetCollar Firmware
rem Installs required libraries for ESP32-S3 PetCollar (including MQTT variant)

echo 📚 PetCollar Arduino Library Installer
echo ========================================

rem Check if arduino-cli is available
where arduino-cli >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ arduino-cli not found!
    echo.
    echo 💡 Please install libraries manually via Arduino IDE:
    echo    1. Open Arduino IDE
    echo    2. Go to Tools ^> Manage Libraries...
    echo    3. Install these libraries:
    echo       - PubSubClient by Nick O'Leary
    echo       - ArduinoJson by Benoit Blanchon ^(v7.0.0+^)
    echo       - Adafruit GFX Library by Adafruit
    echo       - Adafruit SSD1306 by Adafruit
    echo.
    echo 🔧 Or install arduino-cli from: https://arduino.github.io/arduino-cli/
    pause
    exit /b 1
)

echo ✅ arduino-cli found, installing libraries...

rem Install required libraries
echo 📦 Installing ArduinoJson...
arduino-cli lib install "ArduinoJson@^7.0.0"

echo 📦 Installing PubSubClient (MQTT)...
arduino-cli lib install "PubSubClient@^2.8.0"

echo 📦 Installing Adafruit GFX Library...
arduino-cli lib install "Adafruit GFX Library@^1.11.0"

echo 📦 Installing Adafruit SSD1306...
arduino-cli lib install "Adafruit SSD1306@^2.5.0"

if %ERRORLEVEL% neq 0 (
    echo ❌ Some libraries failed to install!
    echo 💡 Try installing manually via Arduino IDE Library Manager
    pause
    exit /b 1
)

echo.
echo ✅ All libraries installed successfully!
echo 🎯 You can now compile the PetCollar firmware variants:
echo    - ESP32-S3_PetCollar.ino (Standard WebSocket)
echo    - ESP32-S3_PetCollar_MQTT.ino (MQTT Cloud)
echo.
echo 🚀 Ready to build firmware!
pause 