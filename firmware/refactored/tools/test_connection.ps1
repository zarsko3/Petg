# Pet Collar Connection Test Tool - Refactored
# Version 3.0.0
# Enhanced testing script with comprehensive diagnostics

param(
    [string]$IPAddress = "",
    [int]$Port = 80,
    [switch]$AutoDiscover,
    [switch]$Verbose,
    [switch]$Continuous,
    [int]$Timeout = 5000,
    [string]$LogFile = ""
)

# ==========================================
# SCRIPT CONFIGURATION
# ==========================================

$script:Config = @{
    DefaultPort = 80
    WebSocketPort = 8080
    DiscoveryPort = 1234
    Timeout = $Timeout
    MaxRetries = 3
    UserAgent = "PetCollar-TestTool/3.0"
    LogLevel = if ($Verbose) { "DEBUG" } else { "INFO" }
}

$script:TestResults = @{
    BasicConnection = $false
    WebInterface = $false
    WebSocket = $false
    API = $false
    Discovery = $false
    Performance = @{}
    Errors = @()
}

# ==========================================
# LOGGING FUNCTIONS
# ==========================================

function Write-Log {
    param(
        [string]$Message,
        [string]$Level = "INFO",
        [string]$Color = "White"
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $logEntry = "[$timestamp] [$Level] $Message"
    
    # Console output with colors
    switch ($Level) {
        "ERROR" { Write-Host $logEntry -ForegroundColor Red }
        "WARN"  { Write-Host $logEntry -ForegroundColor Yellow }
        "SUCCESS" { Write-Host $logEntry -ForegroundColor Green }
        "DEBUG" { if ($script:Config.LogLevel -eq "DEBUG") { Write-Host $logEntry -ForegroundColor Cyan } }
        default { Write-Host $logEntry -ForegroundColor $Color }
    }
    
    # File logging if specified
    if ($LogFile) {
        Add-Content -Path $LogFile -Value $logEntry
    }
}

function Write-Banner {
    $banner = @"
╔════════════════════════════════════════════════════════════╗
║               Pet Collar Connection Test v3.0              ║
║                     Refactored Edition                     ║
╚════════════════════════════════════════════════════════════╝
"@
    Write-Host $banner -ForegroundColor Cyan
    Write-Host ""
}

# ==========================================
# NETWORK DISCOVERY FUNCTIONS
# ==========================================

function Start-AutoDiscovery {
    Write-Log "🔍 Starting automatic collar discovery..." "INFO" "Cyan"
    
    $discoveries = @()
    $subnet = Get-LocalSubnet
    
    if (-not $subnet) {
        Write-Log "❌ Could not determine local subnet for discovery" "ERROR"
        return $null
    }
    
    Write-Log "📡 Scanning subnet: $subnet" "INFO"
    
    # Scan common IP ranges
    $baseIP = $subnet.Substring(0, $subnet.LastIndexOf('.'))
    
    for ($i = 100; $i -le 120; $i++) {
        $testIP = "$baseIP.$i"
        
        if (Test-CollarAtIP -IPAddress $testIP -Quick) {
            $discoveries += $testIP
            Write-Log "✅ Found collar at: $testIP" "SUCCESS"
        }
        
        # Progress indicator
        if ($i % 5 -eq 0) {
            Write-Host "." -NoNewline
        }
    }
    
    Write-Host ""
    
    if ($discoveries.Count -eq 0) {
        Write-Log "❌ No collars found during discovery" "WARN"
        return $null
    }
    
    Write-Log "🎯 Discovery complete. Found $($discoveries.Count) collar(s)" "SUCCESS"
    return $discoveries
}

function Get-LocalSubnet {
    try {
        $networkAdapter = Get-NetAdapter | Where-Object { $_.Status -eq "Up" -and $_.InterfaceDescription -notlike "*Loopback*" } | Select-Object -First 1
        if ($networkAdapter) {
            $ipConfig = Get-NetIPAddress -InterfaceIndex $networkAdapter.InterfaceIndex -AddressFamily IPv4 | Select-Object -First 1
            if ($ipConfig) {
                $ip = $ipConfig.IPAddress
                return $ip.Substring(0, $ip.LastIndexOf('.')) + ".0/24"
            }
        }
    }
    catch {
        Write-Log "⚠️ Error determining subnet: $($_.Exception.Message)" "WARN"
    }
    return $null
}

# ==========================================
# CONNECTION TEST FUNCTIONS
# ==========================================

function Test-CollarAtIP {
    param(
        [string]$IPAddress,
        [switch]$Quick
    )
    
    if ($Quick) {
        return Test-BasicConnection -IPAddress $IPAddress -Port $script:Config.DefaultPort
    }
    
    Write-Log "🧪 Testing collar at $IPAddress" "INFO" "Yellow"
    
    # Reset test results
    $script:TestResults.BasicConnection = $false
    $script:TestResults.WebInterface = $false
    $script:TestResults.WebSocket = $false
    $script:TestResults.API = $false
    $script:TestResults.Errors = @()
    
    # Test 1: Basic connectivity
    Write-Log "📡 Testing basic connectivity..." "DEBUG"
    if (Test-BasicConnection -IPAddress $IPAddress -Port $script:Config.DefaultPort) {
        $script:TestResults.BasicConnection = $true
        Write-Log "✅ Basic connection successful" "SUCCESS"
    } else {
        Write-Log "❌ Basic connection failed" "ERROR"
        return $false
    }
    
    # Test 2: Web interface
    Write-Log "🌐 Testing web interface..." "DEBUG"
    if (Test-WebInterface -IPAddress $IPAddress) {
        $script:TestResults.WebInterface = $true
        Write-Log "✅ Web interface accessible" "SUCCESS"
    } else {
        Write-Log "⚠️ Web interface test failed" "WARN"
    }
    
    # Test 3: API endpoints
    Write-Log "🔌 Testing API endpoints..." "DEBUG"
    if (Test-APIEndpoints -IPAddress $IPAddress) {
        $script:TestResults.API = $true
        Write-Log "✅ API endpoints responsive" "SUCCESS"
    } else {
        Write-Log "⚠️ API test failed" "WARN"
    }
    
    # Test 4: WebSocket connection
    Write-Log "🔗 Testing WebSocket connection..." "DEBUG"
    if (Test-WebSocketConnection -IPAddress $IPAddress) {
        $script:TestResults.WebSocket = $true
        Write-Log "✅ WebSocket connection successful" "SUCCESS"
    } else {
        Write-Log "⚠️ WebSocket test failed" "WARN"
    }
    
    # Performance tests
    Test-Performance -IPAddress $IPAddress
    
    return $true
}

function Test-BasicConnection {
    param(
        [string]$IPAddress,
        [int]$Port
    )
    
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $asyncResult = $tcpClient.BeginConnect($IPAddress, $Port, $null, $null)
        $waitHandle = $asyncResult.AsyncWaitHandle
        
        if ($waitHandle.WaitOne($script:Config.Timeout)) {
            $tcpClient.EndConnect($asyncResult)
            $tcpClient.Close()
            return $true
        } else {
            $tcpClient.Close()
            return $false
        }
    }
    catch {
        Write-Log "Connection error: $($_.Exception.Message)" "DEBUG"
        return $false
    }
}

function Test-WebInterface {
    param([string]$IPAddress)
    
    try {
        $uri = "http://$IPAddress"
        $response = Invoke-WebRequest -Uri $uri -TimeoutSec ($script:Config.Timeout / 1000) -UseBasicParsing -ErrorAction Stop
        
        if ($response.StatusCode -eq 200) {
            $contentLength = $response.Content.Length
            Write-Log "📄 Web interface loaded ($contentLength bytes)" "DEBUG"
            return $true
        }
    }
    catch {
        $script:TestResults.Errors += "Web Interface: $($_.Exception.Message)"
        Write-Log "Web interface error: $($_.Exception.Message)" "DEBUG"
    }
    
    return $false
}

function Test-APIEndpoints {
    param([string]$IPAddress)
    
    $endpoints = @(
        "/api/status",
        "/api/collar-status", 
        "/api/beacons",
        "/api/location"
    )
    
    $successCount = 0
    
    foreach ($endpoint in $endpoints) {
        try {
            $uri = "http://$IPAddress$endpoint"
            $response = Invoke-WebRequest -Uri $uri -TimeoutSec ($script:Config.Timeout / 1000) -UseBasicParsing -ErrorAction Stop
            
            if ($response.StatusCode -eq 200) {
                $successCount++
                Write-Log "✅ $endpoint - OK" "DEBUG"
            }
        }
        catch {
            Write-Log "❌ $endpoint - Failed: $($_.Exception.Message)" "DEBUG"
            $script:TestResults.Errors += "API $endpoint`: $($_.Exception.Message)"
        }
    }
    
    Write-Log "📊 API endpoints: $successCount/$($endpoints.Count) successful" "DEBUG"
    return ($successCount -gt 0)
}

function Test-WebSocketConnection {
    param([string]$IPAddress)
    
    # Note: PowerShell WebSocket testing is complex
    # This is a simplified check for WebSocket upgrade capability
    try {
        $headers = @{
            "Upgrade" = "websocket"
            "Connection" = "Upgrade"
            "Sec-WebSocket-Key" = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("test"))
            "Sec-WebSocket-Version" = "13"
        }
        
        $uri = "http://$IPAddress`:$($script:Config.WebSocketPort)"
        $response = Invoke-WebRequest -Uri $uri -Headers $headers -TimeoutSec ($script:Config.Timeout / 1000) -UseBasicParsing -ErrorAction Stop
        
        return ($response.StatusCode -eq 101)
    }
    catch {
        $script:TestResults.Errors += "WebSocket: $($_.Exception.Message)"
        Write-Log "WebSocket test error: $($_.Exception.Message)" "DEBUG"
        return $false
    }
}

function Test-Performance {
    param([string]$IPAddress)
    
    Write-Log "⚡ Running performance tests..." "DEBUG"
    
    # Latency test
    $latencyResults = @()
    for ($i = 0; $i -lt 5; $i++) {
        $start = Get-Date
        $result = Test-BasicConnection -IPAddress $IPAddress -Port $script:Config.DefaultPort
        $end = Get-Date
        
        if ($result) {
            $latency = ($end - $start).TotalMilliseconds
            $latencyResults += $latency
        }
    }
    
    if ($latencyResults.Count -gt 0) {
        $avgLatency = ($latencyResults | Measure-Object -Average).Average
        $script:TestResults.Performance.AverageLatency = [math]::Round($avgLatency, 2)
        Write-Log "📈 Average latency: $($script:TestResults.Performance.AverageLatency)ms" "DEBUG"
    }
    
    # Throughput test (simple)
    try {
        $start = Get-Date
        $response = Invoke-WebRequest -Uri "http://$IPAddress/api/status" -TimeoutSec ($script:Config.Timeout / 1000) -UseBasicParsing -ErrorAction Stop
        $end = Get-Date
        
        $duration = ($end - $start).TotalSeconds
        $throughput = $response.Content.Length / $duration
        $script:TestResults.Performance.Throughput = [math]::Round($throughput, 2)
        Write-Log "🚀 Throughput: $($script:TestResults.Performance.Throughput) bytes/sec" "DEBUG"
    }
    catch {
        Write-Log "Throughput test failed: $($_.Exception.Message)" "DEBUG"
    }
}

# ==========================================
# REPORTING FUNCTIONS
# ==========================================

function Show-TestResults {
    param([string]$IPAddress)
    
    Write-Host ""
    Write-Log "📋 Test Results Summary for $IPAddress" "INFO" "Magenta"
    Write-Host "═══════════════════════════════════════" -ForegroundColor Magenta
    
    # Basic connectivity
    $status = if ($script:TestResults.BasicConnection) { "✅ PASS" } else { "❌ FAIL" }
    Write-Host "Basic Connection:    $status"
    
    # Web interface
    $status = if ($script:TestResults.WebInterface) { "✅ PASS" } else { "❌ FAIL" }
    Write-Host "Web Interface:       $status"
    
    # API endpoints
    $status = if ($script:TestResults.API) { "✅ PASS" } else { "❌ FAIL" }
    Write-Host "API Endpoints:       $status"
    
    # WebSocket
    $status = if ($script:TestResults.WebSocket) { "✅ PASS" } else { "❌ FAIL" }
    Write-Host "WebSocket:           $status"
    
    # Performance metrics
    if ($script:TestResults.Performance.AverageLatency) {
        Write-Host "Average Latency:     $($script:TestResults.Performance.AverageLatency)ms"
    }
    
    if ($script:TestResults.Performance.Throughput) {
        Write-Host "Throughput:          $($script:TestResults.Performance.Throughput) bytes/sec"
    }
    
    # Overall status
    $overallStatus = $script:TestResults.BasicConnection -and $script:TestResults.WebInterface
    $statusText = if ($overallStatus) { "✅ OPERATIONAL" } else { "❌ ISSUES DETECTED" }
    $color = if ($overallStatus) { "Green" } else { "Red" }
    
    Write-Host ""
    Write-Host "Overall Status:      $statusText" -ForegroundColor $color
    
    # Show errors if any
    if ($script:TestResults.Errors.Count -gt 0) {
        Write-Host ""
        Write-Host "⚠️ Errors Detected:" -ForegroundColor Yellow
        foreach ($error in $script:TestResults.Errors) {
            Write-Host "   • $error" -ForegroundColor Yellow
        }
    }
    
    Write-Host "═══════════════════════════════════════" -ForegroundColor Magenta
}

function Export-TestResults {
    param(
        [string]$IPAddress,
        [string]$OutputPath
    )
    
    $timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
    $filename = if ($OutputPath) { $OutputPath } else { "collar_test_$timestamp.json" }
    
    $report = @{
        Timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        IPAddress = $IPAddress
        TestResults = $script:TestResults
        Configuration = $script:Config
    }
    
    $report | ConvertTo-Json -Depth 10 | Out-File -FilePath $filename -Encoding UTF8
    Write-Log "📄 Test results exported to: $filename" "SUCCESS"
}

# ==========================================
# MAIN EXECUTION
# ==========================================

function Main {
    Write-Banner
    
    # Validate parameters
    if (-not $IPAddress -and -not $AutoDiscover) {
        Write-Log "❌ Please specify an IP address or use -AutoDiscover" "ERROR"
        Write-Log "💡 Usage: .\test_connection.ps1 -IPAddress 192.168.1.100" "INFO"
        Write-Log "💡        .\test_connection.ps1 -AutoDiscover" "INFO"
        return
    }
    
    $targetIPs = @()
    
    if ($AutoDiscover) {
        $discovered = Start-AutoDiscovery
        if ($discovered) {
            $targetIPs = $discovered
        } else {
            Write-Log "❌ No collars discovered" "ERROR"
            return
        }
    } else {
        $targetIPs = @($IPAddress)
    }
    
    do {
        foreach ($ip in $targetIPs) {
            Write-Log "🎯 Testing collar at $ip" "INFO" "Green"
            
            if (Test-CollarAtIP -IPAddress $ip) {
                Show-TestResults -IPAddress $ip
                
                # Export results if requested
                if ($LogFile) {
                    $exportPath = $LogFile.Replace('.log', '_results.json')
                    Export-TestResults -IPAddress $ip -OutputPath $exportPath
                }
            } else {
                Write-Log "❌ Failed to connect to collar at $ip" "ERROR"
            }
            
            if ($targetIPs.Count -gt 1) {
                Write-Host ""
                Start-Sleep -Seconds 2
            }
        }
        
        if ($Continuous) {
            Write-Log "⏳ Waiting 30 seconds before next test cycle..." "INFO"
            Start-Sleep -Seconds 30
        }
        
    } while ($Continuous)
}

# Execute main function
Main