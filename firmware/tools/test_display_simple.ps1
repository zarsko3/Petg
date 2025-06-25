Write-Host "=== ESP32 Display Test ===" -ForegroundColor Green
Write-Host ""

$collarIP = "192.168.1.89"
$httpUrl = "http://$collarIP"

Write-Host "Testing ESP32 Display Functions..." -ForegroundColor Yellow
Write-Host "IP: $collarIP" -ForegroundColor Cyan
Write-Host ""

# Test 1: Alert Start
Write-Host "Test 1: Alert Start (check display for ALERT message)" -ForegroundColor Red
try {
    $alertBody = "{`"command`":`"alert_start`"}"
    $response = Invoke-RestMethod "$httpUrl/command" -Method POST -Body $alertBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "   SUCCESS: Alert command sent" -ForegroundColor Green
    Write-Host "   Display should show: ALERT!" -ForegroundColor White
    Start-Sleep -Seconds 3
}
catch {
    Write-Host "   ERROR: Failed to send alert command: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Alert Stop
Write-Host "Test 2: Alert Stop (check display for stop message)" -ForegroundColor Green
try {
    $stopBody = "{`"command`":`"alert_stop`"}"
    $response = Invoke-RestMethod "$httpUrl/command" -Method POST -Body $stopBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "   SUCCESS: Stop command sent" -ForegroundColor Green
    Write-Host "   Display should show: Alert Stopped" -ForegroundColor White
    Start-Sleep -Seconds 3
}
catch {
    Write-Host "   ERROR: Failed to send stop command: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Buzzer Test
Write-Host "Test 3: Buzzer Test" -ForegroundColor Cyan
try {
    $buzzerBody = "{`"command`":`"test_buzzer`"}"
    $response = Invoke-RestMethod "$httpUrl/command" -Method POST -Body $buzzerBody -ContentType "application/json" -TimeoutSec 5
    Write-Host "   SUCCESS: Buzzer command sent" -ForegroundColor Green
    Write-Host "   Should hear buzzer beeps" -ForegroundColor White
}
catch {
    Write-Host "   ERROR: Failed to send buzzer command: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Status Check
Write-Host "Current Status:" -ForegroundColor Yellow
try {
    $status = Invoke-RestMethod "$httpUrl/data" -TimeoutSec 5
    Write-Host "   Device ID: $($status.device_id)" -ForegroundColor White
    Write-Host "   WiFi: $($status.wifi_connected)" -ForegroundColor White
    Write-Host "   Alert: $($status.alert_active)" -ForegroundColor White
    Write-Host "   Uptime: $($status.uptime) seconds" -ForegroundColor White
}
catch {
    Write-Host "   ERROR: Failed to get status" -ForegroundColor Red
}

Write-Host ""
Write-Host "Expected Display Layout (128x32):" -ForegroundColor Yellow
Write-Host "+-----------------+" -ForegroundColor Cyan
Write-Host "| Collar OK       |" -ForegroundColor Cyan
Write-Host "| WiFi: 89        |" -ForegroundColor Cyan
Write-Host "| Up: 5m          |" -ForegroundColor Cyan
Write-Host "| HTTP:80 WS:8080 |" -ForegroundColor Cyan
Write-Host "+-----------------+" -ForegroundColor Cyan

Write-Host ""
Write-Host "Troubleshooting:" -ForegroundColor Yellow
Write-Host "   * No display? Check I2C connections (SDA=21, SCL=22)" -ForegroundColor White
Write-Host "   * Wrong info? Display updates every 2 seconds" -ForegroundColor White
Write-Host "   * Blank screen? Check power and I2C address (0x3C vs 0x3D)" -ForegroundColor White

Write-Host ""
Read-Host "Press Enter to exit" 