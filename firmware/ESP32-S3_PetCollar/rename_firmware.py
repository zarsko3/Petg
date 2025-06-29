#!/usr/bin/env python3
"""
Firmware Rename Script for PetCollar Build System
Renames compiled firmware.bin to petcollar_v<version>.bin format
"""

import os
import shutil
import re
from pathlib import Path

# Version extraction from source files
def extract_version_from_source():
    """Extract version from firmware source files"""
    
    # Try to find version in main .ino file
    main_ino_files = [
        "ESP32-S3_PetCollar.ino",
        "ESP32-S3_PetCollar_MQTT.ino"
    ]
    
    for ino_file in main_ino_files:
        if os.path.exists(ino_file):
            try:
                with open(ino_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                    # Look for #define FIRMWARE_VERSION "x.x.x"
                    version_match = re.search(r'#define\s+FIRMWARE_VERSION\s+"([^"]+)"', content)
                    if version_match:
                        return version_match.group(1)
                        
                    # Look for @version x.x.x
                    version_match = re.search(r'@version\s+(\d+\.\d+\.\d+)', content)
                    if version_match:
                        return version_match.group(1)
                        
            except Exception as e:
                print(f"Warning: Could not read {ino_file}: {e}")
                continue
    
    # Fallback version
    return "4.1.0"

def rename_firmware_output():
    """Rename firmware.bin to petcollar_v<version>.bin"""
    
    print("🔧 PetCollar Firmware Rename Script")
    
    # Get version from source
    version = extract_version_from_source()
    print(f"📋 Detected firmware version: {version}")
    
    # Build paths
    build_dir = Path(".pio/build")
    target_name = "petcollar_v" + version + ".bin"
    
    # Find the compiled firmware.bin in build directories
    firmware_found = False
    
    for env_dir in build_dir.glob("*"):
        if env_dir.is_dir():
            firmware_bin = env_dir / "firmware.bin"
            
            if firmware_bin.exists():
                output_path = env_dir / target_name
                
                try:
                    # Copy firmware.bin to petcollar_v<version>.bin
                    shutil.copy2(firmware_bin, output_path)
                    print(f"✅ Created: {output_path}")
                    
                    # Also create a copy in the root firmware directory for easy access
                    root_output = Path("..") / target_name
                    shutil.copy2(firmware_bin, root_output)
                    print(f"✅ Created: {root_output}")
                    
                    firmware_found = True
                    
                except Exception as e:
                    print(f"❌ Error copying firmware: {e}")
    
    if not firmware_found:
        print("⚠️  No firmware.bin found in build directories")
        print("💡 Make sure the build completed successfully")
        
        # List available files for debugging
        if build_dir.exists():
            print("\n📁 Available build files:")
            for env_dir in build_dir.glob("*"):
                if env_dir.is_dir():
                    print(f"  {env_dir.name}/")
                    for file in env_dir.glob("*.bin"):
                        print(f"    {file.name}")
    else:
        print(f"\n🎉 Firmware renamed successfully to: {target_name}")
        print("🚀 Ready for OTA deployment!")

if __name__ == "__main__":
    rename_firmware_output() 