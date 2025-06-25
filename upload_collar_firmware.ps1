# PowerShell script to upload collar firmware with CORS fixes
# Make sure Arduino CLI is installed and ESP32 board is configured

param(
    [string]$Port = "AUTO",
    [string]$Board = "esp32:esp32:esp32"
)

Write-Host "ESP32 Collar Firmware Upload with CORS Fix" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green

# Check if Arduino CLI is available
if (-not (Get-Command "arduino-cli" -ErrorAction SilentlyContinue)) {
    Write-Host "Arduino CLI not found. Please install it first." -ForegroundColor Red
    Write-Host "Download from: https://arduino.github.io/arduino-cli/latest/installation/" -ForegroundColor Yellow
    exit 1
}

# Auto-detect ESP32 port if not specified
if ($Port -eq "AUTO") {
    Write-Host "Auto-detecting ESP32 port..." -ForegroundColor Yellow
    $boards = arduino-cli board list --format json | ConvertFrom-Json
    $esp32Port = $boards | Where-Object { $_.boards -and $_.boards[0].name -like "*ESP32*" } | Select-Object -First 1 -ExpandProperty port
    
    if ($esp32Port) {
        $Port = $esp32Port.address
        Write-Host "Found ESP32 on port: $Port" -ForegroundColor Green
    } else {
        Write-Host "No ESP32 detected. Please specify port manually." -ForegroundColor Red
        Write-Host "Usage: .\upload_collar_firmware.ps1 -Port COM3" -ForegroundColor Yellow
        exit 1
    }
}

# Check if firmware directory exists
$firmwarePath = "firmware\MainCollar"
if (-not (Test-Path $firmwarePath)) {
    Write-Host "Firmware directory not found: $firmwarePath" -ForegroundColor Red
    exit 1
}

Write-Host "Firmware path: $firmwarePath" -ForegroundColor Cyan
Write-Host "Upload port: $Port" -ForegroundColor Cyan
Write-Host "Board type: $Board" -ForegroundColor Cyan

# Compile and upload
Write-Host ""
Write-Host "Compiling and uploading firmware..." -ForegroundColor Yellow

try {
    # Compile and upload in one command
    arduino-cli compile --upload -p $Port --fqbn $Board $firmwarePath
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "Firmware uploaded successfully!" -ForegroundColor Green
        Write-Host "Please wait for ESP32 to restart..." -ForegroundColor Yellow
        Start-Sleep -Seconds 3
        
        Write-Host ""
        Write-Host "The collar should now support CORS requests from your web app!" -ForegroundColor Green
        Write-Host "Test the connection at: http://192.168.1.89/data" -ForegroundColor Cyan
        Write-Host "If IP changed, check Serial Monitor for new IP address" -ForegroundColor Yellow
    } else {
        Write-Host ""
        Write-Host "Upload failed! Check connections and try again." -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host ""
    Write-Host "Error during upload: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Upload completed! Your collar now supports CORS." -ForegroundColor Green 