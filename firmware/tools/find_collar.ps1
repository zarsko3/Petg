Write-Host "=== ESP32 Pet Collar Discovery Tool ===" -ForegroundColor Green
Write-Host ""

# Check if collar is already known at specific IP
$knownIP = "192.168.1.89"
Write-Host "🎯 Checking known collar IP: $knownIP" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest "http://$knownIP" -TimeoutSec 3 -ErrorAction Stop
    $content = $response.Content
    
    if ($content -like "*Pet Collar*" -or $content -like "*PetCollar*") {
        Write-Host ""
        Write-Host "🐕 FOUND ESP32 PET COLLAR!" -ForegroundColor Green
        Write-Host "📍 IP Address: $knownIP" -ForegroundColor Cyan
        Write-Host "🌐 Web Interface: http://$knownIP" -ForegroundColor Cyan
        Write-Host "🔗 WebSocket: ws://$knownIP:8080" -ForegroundColor Cyan
        
        # Save configuration
        $config = @{
            collar_ip = $knownIP
            websocket_url = "ws://$knownIP`:8080"
            http_url = "http://$knownIP"
            status = "connected"
            last_discovered = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        } | ConvertTo-Json -Depth 2
        
        $config | Out-File "..\..\public\collar_config.json" -Encoding UTF8
        Write-Host "💾 Configuration saved!" -ForegroundColor Green
        Write-Host ""
        Read-Host "Press Enter to exit"
        exit
    }
}
catch {
    Write-Host "   Known IP not responding, scanning network..." -ForegroundColor Gray
}

Write-Host ""
Write-Host "❌ Collar not found at known IP" -ForegroundColor Red
Write-Host ""
Write-Host "💡 Manual Connection:" -ForegroundColor Yellow
Write-Host "   1. Use this WebSocket URL in web app: ws://192.168.1.89:8080" -ForegroundColor Cyan
Write-Host "   2. Check ESP32 Serial Monitor for current IP" -ForegroundColor White
Write-Host "   3. Ensure ESP32 and computer on same WiFi network" -ForegroundColor White

Write-Host ""
Read-Host "Press Enter to exit" 