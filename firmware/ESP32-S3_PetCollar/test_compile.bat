@echo off
echo Testing ESP32-S3 Pet Collar Compilation...

REM Try different arduino commands
arduino --verify --board esp32:esp32:esp32s3 ESP32-S3_PetCollar.ino 2>&1
if %ERRORLEVEL% EQU 0 (
    echo SUCCESS: Compilation completed successfully!
) else (
    echo FAILED: Compilation failed with errors
)

pause 