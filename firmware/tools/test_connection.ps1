Write-Host "=== ESP32 Pet Collar Connection Test ===" -ForegroundColor Green
Write-Host ""

$collarIP = "192.168.1.89"
$httpUrl = "http://$collarIP"
$wsUrl = "ws://$collarIP:8080"

Write-Host "🎯 Testing collar at IP: $collarIP" -ForegroundColor Yellow
Write-Host ""

# Test 1: HTTP Connection
Write-Host "📡 Test 1: HTTP Connection" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest $httpUrl -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ HTTP OK - Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   📄 Response length: $($response.Content.Length) chars" -ForegroundColor White
    
    if ($response.Content -like "*Pet Collar*" -or $response.Content -like "*PetCollar*") {
        Write-Host "   🐕 Pet Collar identified!" -ForegroundColor Green
    }
}
catch {
    Write-Host "   ❌ HTTP Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: WebSocket Test (simulate connection)
Write-Host "🔗 Test 2: WebSocket Port Check" -ForegroundColor Cyan
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connectTask = $tcpClient.ConnectAsync($collarIP, 8080)
    $timeout = 3000
    
    if ($connectTask.Wait($timeout)) {
        Write-Host "   ✅ WebSocket port 8080 is open" -ForegroundColor Green
        $tcpClient.Close()
    } else {
        Write-Host "   ❌ WebSocket port 8080 timeout" -ForegroundColor Red
    }
}
catch {
    Write-Host "   ❌ WebSocket port 8080 unreachable: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: JSON API Test
Write-Host "📊 Test 3: JSON API" -ForegroundColor Cyan
try {
    $jsonResponse = Invoke-RestMethod "$httpUrl/data" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ JSON API OK" -ForegroundColor Green
    Write-Host "   🏷️  Device ID: $($jsonResponse.device_id)" -ForegroundColor White
    Write-Host "   📶 WiFi Status: $($jsonResponse.wifi_connected)" -ForegroundColor White
    Write-Host "   🚨 Alert Status: $($jsonResponse.alert_active)" -ForegroundColor White
}
catch {
    Write-Host "   ❌ JSON API Failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Command Test
Write-Host "🎮 Test 4: Command Interface" -ForegroundColor Cyan
try {
    $commandBody = @{ command = "test_connection" } | ConvertTo-Json
    $commandResponse = Invoke-RestMethod "$httpUrl/command" -Method POST -Body $commandBody -ContentType "application/json" -TimeoutSec 5 -ErrorAction Stop
    Write-Host "   ✅ Command interface OK" -ForegroundColor Green
    Write-Host "   📝 Response: $($commandResponse.message)" -ForegroundColor White
}
catch {
    Write-Host "   ❌ Command interface failed: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== Test Summary ===" -ForegroundColor Yellow
Write-Host "🌐 HTTP URL: $httpUrl" -ForegroundColor Cyan
Write-Host "🔗 WebSocket URL: $wsUrl" -ForegroundColor Cyan
Write-Host "📱 Use these URLs in your web app" -ForegroundColor White

Write-Host ""
Write-Host "💡 Next Steps:" -ForegroundColor Yellow
Write-Host "   1. Copy WebSocket URL: $wsUrl" -ForegroundColor White
Write-Host "   2. Paste into web app connection field" -ForegroundColor White
Write-Host "   3. Click 'Connect' to establish WebSocket connection" -ForegroundColor White

Write-Host ""
Read-Host "Press Enter to exit" 