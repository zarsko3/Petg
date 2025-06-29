@echo off
echo ======================================
echo ESP32-S3 Pet Collar MQTT Libraries
echo Installing required Arduino libraries...
echo ======================================

echo.
echo Installing PubSubClient library...
arduino-cli lib install "PubSubClient@2.8"

echo.
echo Installing ArduinoJson library...
arduino-cli lib install "ArduinoJson@7.0.4"

echo.
echo Installing Adafruit GFX Library...
arduino-cli lib install "Adafruit GFX Library@1.11.5"

echo.
echo Installing Adafruit SSD1306 library...
arduino-cli lib install "Adafruit SSD1306@2.5.7"

echo.
echo ======================================
echo Library installation complete!
echo ======================================
echo.
echo You can now compile and upload the firmware:
echo 1. Open Arduino IDE
echo 2. Open ESP32-S3_PetCollar_MQTT.ino
echo 3. Edit config.h with your settings
echo 4. Select Board: ESP32S3 Dev Module
echo 5. Upload to your collar
echo.
pause 