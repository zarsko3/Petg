#!/bin/bash
# PetCollar Firmware Build Script
# Compiles ESP32-S3 firmware and applies correct naming convention

set -e  # Exit on any error

echo "🚀 PetCollar Firmware Build System"
echo "===================================="

# Check if PlatformIO is available
if ! command -v pio &> /dev/null; then
    echo "❌ PlatformIO CLI not found!"
    echo "💡 Install with: pip install platformio"
    exit 1
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf .pio/build

# Build standard firmware
echo "🔨 Building ESP32-S3 PetCollar Firmware..."
pio run -e esp32-s3-petcollar

# Build MQTT firmware  
echo "🔨 Building ESP32-S3 MQTT Firmware..."
pio run -e esp32-s3-petcollar-mqtt

# Apply firmware naming convention
echo "📝 Applying firmware naming convention..."
python3 rename_firmware.py

echo "✅ Build completed successfully!"
echo "🎯 Firmware files created with petcollar_v*.bin naming convention"
echo "🚀 Ready for OTA deployment!"

# List generated files
echo ""
echo "📁 Generated firmware files:"
ls -la ../petcollar_v*.bin 2>/dev/null || true
find .pio/build -name "petcollar_v*.bin" -exec ls -la {} \; 2>/dev/null || true 