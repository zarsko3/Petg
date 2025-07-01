# Collar Network Scanner
# Scans the local network to find the ESP32 collar

Write-Host "🔍 Scanning network for PETg collar..." -ForegroundColor Cyan

# Get current network range
$networkAdapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.InterfaceDescription -like "*Wi-Fi*" }
$ipConfig = Get-NetIPConfiguration | Where-Object { $_.InterfaceIndex -eq $networkAdapter.InterfaceIndex }
$currentIP = $ipConfig.IPv4Address.IPAddress
$subnet = $currentIP -replace '\.\d+$', ''

Write-Host "📡 Current IP: $currentIP" -ForegroundColor Green
Write-Host "🌐 Scanning subnet: $subnet.1-254" -ForegroundColor Yellow

$found = @()

# Scan common ESP32 ports and endpoints
$testPorts = @(80)
$testEndpoints = @("/data", "/", "/api/status")

for ($i = 1; $i -le 254; $i++) {
    $testIP = "$subnet.$i"
    
    # Skip current machine and router
    if ($testIP -eq $currentIP -or $testIP -eq "$subnet.1") {
        continue
    }
    
    # Quick ping test first
    $ping = Test-Connection -ComputerName $testIP -Count 1 -Quiet -TimeoutSeconds 1
    
    if ($ping) {
        Write-Host "📍 Found device at $testIP - testing web server..." -ForegroundColor Green
        
        foreach ($port in $testPorts) {
            foreach ($endpoint in $testEndpoints) {
                try {
                    $url = "http://${testIP}:${port}${endpoint}"
                    $response = Invoke-WebRequest -Uri $url -TimeoutSec 3 -ErrorAction Stop
                    
                    # Check if response looks like collar data
                    $content = $response.Content
                    if ($content -match "batteryLevel|wifiConnected|beacons|uptime") {
                        Write-Host "🎯 COLLAR FOUND!" -ForegroundColor Magenta
                        Write-Host "   URL: $url" -ForegroundColor White
                        Write-Host "   Status: $($response.StatusCode)" -ForegroundColor White
                        
                        $found += @{
                            IP = $testIP
                            Port = $port
                            Endpoint = $endpoint
                            URL = $url
                        }
                        
                        # Show some collar data
                        try {
                            $data = $content | ConvertFrom-Json
                            Write-Host "   Battery: $($data.batteryLevel)%" -ForegroundColor Cyan
                            Write-Host "   WiFi: $($data.wifiConnected)" -ForegroundColor Cyan
                            Write-Host "   Uptime: $($data.uptime)s" -ForegroundColor Cyan
                            if ($data.beacons) {
                                Write-Host "   Beacons: $($data.beacons.Count)" -ForegroundColor Cyan
                            }
                        } catch {
                            Write-Host "   Raw response length: $($content.Length) chars" -ForegroundColor Cyan
                        }
                    }
                } catch {
                    # Silently continue
                }
            }
        }
    }
}

if ($found.Count -eq 0) {
    Write-Host "❌ No collar found on network" -ForegroundColor Red
    Write-Host "💡 Try these steps:" -ForegroundColor Yellow
    Write-Host "   1. Power cycle the collar" -ForegroundColor White
    Write-Host "   2. Check if 'PetCollar-Setup' WiFi network appears" -ForegroundColor White
    Write-Host "   3. Connect to setup network and reconfigure WiFi" -ForegroundColor White
} else {
    Write-Host "✅ Scan complete! Found $($found.Count) collar(s)" -ForegroundColor Green
    Write-Host "🔗 Test connection with:" -ForegroundColor Yellow
    foreach ($device in $found) {
        Write-Host "   curl.exe -s ""$($device.URL)""" -ForegroundColor White
    }
} 