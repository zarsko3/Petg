@echo off
rem PetCollar Firmware Build Script
rem Compiles ESP32-S3 firmware and applies correct naming convention

echo 🚀 PetCollar Firmware Build System
echo ====================================

rem Check if PlatformIO is available
where pio >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ❌ PlatformIO CLI not found!
    echo 💡 Install with: pip install platformio
    exit /b 1
)

rem Clean previous builds
echo 🧹 Cleaning previous builds...
if exist .pio\build rmdir /s /q .pio\build

rem Build standard firmware
echo 🔨 Building ESP32-S3 PetCollar Firmware...
pio run -e esp32-s3-petcollar

if %ERRORLEVEL% neq 0 (
    echo ❌ Standard firmware build failed!
    exit /b 1
)

rem Build MQTT firmware  
echo 🔨 Building ESP32-S3 MQTT Firmware...
pio run -e esp32-s3-petcollar-mqtt

if %ERRORLEVEL% neq 0 (
    echo ❌ MQTT firmware build failed!
    exit /b 1
)

rem Apply firmware naming convention
echo 📝 Applying firmware naming convention...
python rename_firmware.py

if %ERRORLEVEL% neq 0 (
    echo ❌ Firmware renaming failed!
    exit /b 1
)

echo ✅ Build completed successfully!
echo 🎯 Firmware files created with petcollar_v*.bin naming convention
echo 🚀 Ready for OTA deployment!

rem List generated files
echo.
echo 📁 Generated firmware files:
dir /b ..\petcollar_v*.bin 2>nul
dir /b .pio\build\*\petcollar_v*.bin 2>nul

pause 