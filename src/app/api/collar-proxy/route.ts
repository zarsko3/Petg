import { NextRequest, NextResponse } from 'next/server';
import * as dgram from 'dgram';
import { readFileSync } from 'fs';
import path from 'path';
import { WebSocketServer } from 'ws';

// Comprehensive IP range discovery for collar detection
const COMMON_IP_RANGES = [
  // Extended home networks (192.168.x.x)
  ...Array.from({length: 50}, (_, i) => `192.168.1.${i + 1}`),   // 192.168.1.1-50
  ...Array.from({length: 50}, (_, i) => `192.168.0.${i + 1}`),   // 192.168.0.1-50
  ...Array.from({length: 30}, (_, i) => `192.168.2.${i + 1}`),   // 192.168.2.1-30
  ...Array.from({length: 30}, (_, i) => `192.168.3.${i + 1}`),   // 192.168.3.1-30
  ...Array.from({length: 30}, (_, i) => `192.168.4.${i + 1}`),   // 192.168.4.1-30 (AP mode)
  ...Array.from({length: 30}, (_, i) => `192.168.5.${i + 1}`),   // 192.168.5.1-30
  
  // Office/corporate networks (10.x.x.x)
  ...Array.from({length: 50}, (_, i) => `10.0.0.${i + 1}`),      // 10.0.0.1-50
  ...Array.from({length: 30}, (_, i) => `10.0.1.${i + 1}`),      // 10.0.1.1-30
  ...Array.from({length: 30}, (_, i) => `10.1.1.${i + 1}`),      // 10.1.1.1-30
  
  // Private networks (172.16.x.x)
  ...Array.from({length: 30}, (_, i) => `172.16.0.${i + 1}`),    // 172.16.0.1-30
  ...Array.from({length: 30}, (_, i) => `172.16.1.${i + 1}`),    // 172.16.1.1-30
  
  // Common router gateway IPs (for device scanning)
  '192.168.1.1', '192.168.0.1', '192.168.2.1', '10.0.0.1', '172.16.0.1'
];

// Cache for discovered collar IP with connection state tracking
let cachedCollarIP: string | null = null;
let lastDiscoveryTime = 0;
let lastVerificationTime = 0;
let connectionVerified = false;
const CACHE_DURATION = 300000; // 5 minutes cache (avoid scanning)
const VERIFICATION_INTERVAL = 30000; // Verify every 30 seconds when connected

// UDP listening for collar broadcasts
const DISCOVERY_PORT = 47808;
let udpServer: dgram.Socket | null = null;
let lastCollarBroadcast = 0;

// WebSocket server for broadcasting discovery events
let wsServer: WebSocketServer | null = null;
const WS_PORT = 3001;

// WebSocket server disabled - using MQTT cloud connectivity instead
function initWebSocketServer() {
  console.log('🌐 WebSocket discovery server disabled - using MQTT cloud connectivity');
  // Discovery WebSocket server is replaced by MQTT-over-WSS for cloud connectivity
  return;
}

// Broadcast discovery event to all connected clients
function broadcastCollarDiscovered(collarInfo: any) {
  if (!wsServer) {
    initWebSocketServer();
    return;
  }
  
  const message = JSON.stringify({
    type: 'COLLAR_DISCOVERED',
    data: collarInfo,
    timestamp: Date.now()
  });
  
  console.log(`📢 Proxy: Broadcasting collar discovery: ${collarInfo.ip_address} (${collarInfo.mdns_hostname})`);
  
  wsServer.clients.forEach((client) => {
    if (client.readyState === 1) { // WebSocket.OPEN
      try {
        client.send(message);
        console.log('📡 Proxy: Sent COLLAR_DISCOVERED to client');
      } catch (error) {
        console.error('❌ Proxy: Failed to send to client:', error);
      }
    }
  });
}

// Start UDP listener for collar announcements
function startCollarListener() {
  if (udpServer) return; // Already started
  
  // Initialize WebSocket server first
  initWebSocketServer();
  
  console.log(`🔊 Proxy: Starting UDP listener on port ${DISCOVERY_PORT} for collar announcements...`);
  
  udpServer = dgram.createSocket('udp4');
  
  udpServer.on('message', (message, remote) => {
    try {
      const data = JSON.parse(message.toString());
      
      // Check if this is a collar announcement
      if (data.device_type === 'ESP32-S3_PetCollar' && data.ip_address) {
        console.log(`📡 Proxy: Received collar announcement from ${data.ip_address}`);
        console.log(`   Device: ${data.device_name}`);
        console.log(`   WebSocket: ${data.websocket_url}`);
        console.log(`   Uptime: ${data.uptime}s`);
        console.log(`   Battery: ${data.battery_percent}%`);
        
        // Cache the collar IP
        const previousIP = cachedCollarIP;
        cachedCollarIP = data.ip_address;
        lastDiscoveryTime = Date.now();
        lastCollarBroadcast = Date.now();
        
        console.log(`✅ Proxy: Collar IP cached from broadcast: ${cachedCollarIP}`);
        
        // Only broadcast if this is a new discovery or IP change
        if (previousIP !== cachedCollarIP && cachedCollarIP) {
          broadcastCollarDiscovered(data);
        }
      }
    } catch (error) {
      // Ignore non-JSON messages or invalid data
    }
  });
  
  udpServer.on('error', (error) => {
    console.error('❌ Proxy: UDP listener error:', error.message);
  });
  
  udpServer.on('listening', () => {
    const address = udpServer?.address();
    console.log(`✅ Proxy: UDP listener started on ${JSON.stringify(address)}`);
    console.log(`🔊 Proxy: Waiting for collar announcements...`);
  });
  
  try {
    udpServer.bind(DISCOVERY_PORT, '0.0.0.0'); // Listen on all interfaces
    console.log(`🔊 Proxy: UDP server bound to 0.0.0.0:${DISCOVERY_PORT} (all interfaces)`);
  } catch (error) {
    console.error(`❌ Proxy: Failed to bind UDP port ${DISCOVERY_PORT}:`, error);
  }
}

// Check if we recently received a collar broadcast
function hasRecentCollarBroadcast(): boolean {
  return cachedCollarIP !== null && (Date.now() - lastCollarBroadcast) < 30000; // 30 seconds
}

// Smart discovery using common gateway + DHCP patterns
async function discoverCollarViaSmartScan(): Promise<string | null> {
  console.log('🔍 Proxy: Starting smart collar discovery...');
  
  // Get likely collar IPs based on common patterns
  const smartIPs = [
    // Common router-assigned ranges (most likely first)
    ...Array.from({length: 20}, (_, i) => `192.168.1.${100 + i}`),  // Common DHCP range
    ...Array.from({length: 20}, (_, i) => `192.168.0.${100 + i}`),  // Alt DHCP range
    ...Array.from({length: 10}, (_, i) => `10.0.0.${100 + i}`),     // Corporate DHCP
    
    // Router admin ranges (less likely but possible)
    ...Array.from({length: 10}, (_, i) => `192.168.1.${10 + i}`),
    ...Array.from({length: 10}, (_, i) => `192.168.0.${10 + i}`),
    
    // Static IP ranges commonly used for IoT
    ...Array.from({length: 10}, (_, i) => `192.168.1.${200 + i}`),
    ...Array.from({length: 10}, (_, i) => `192.168.0.${200 + i}`),
  ];
  
  console.log(`🎯 Proxy: Testing ${smartIPs.length} high-probability IPs first...`);
  
  // Test in small batches for faster results
  const batchSize = 10;
  for (let i = 0; i < smartIPs.length; i += batchSize) {
    const batch = smartIPs.slice(i, i + batchSize);
    
    const promises = batch.map(async (ip) => {
      const isCollar = await testCollarAtIP(ip);
      return isCollar ? ip : null;
    });
    
    const results = await Promise.all(promises);
    const foundIP = results.find(ip => ip !== null);
    
    if (foundIP) {
      console.log(`✅ Proxy: Smart discovery found collar at ${foundIP}!`);
      return foundIP;
    }
    
    // Quick progress update
    if (i % 30 === 0) {
      console.log(`⏱️ Proxy: Smart scan progress ${i + batch.length}/${smartIPs.length}`);
    }
  }
  
  console.log('❌ Proxy: Smart discovery failed, trying comprehensive scan...');
  return null;
}

// Test if a specific IP is the collar device
async function testCollarAtIP(ip: string): Promise<boolean> {
  try {
    // Try multiple endpoints for better compatibility
    const endpoints = ['/api/discover', '/api/status', '/data'];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔍 Testing ${ip}${endpoint}...`);
        const response = await fetch(`http://${ip}${endpoint}`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(1500) // 1.5 second timeout per endpoint
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Check for ESP32-S3 collar identification
          const isCollar = (
            data.device_type === 'ESP32-S3_PetCollar' ||
            data.device === 'ESP32-S3-PetCollar-Advanced' ||
            (data.device && data.device.includes('PetCollar')) ||
            (data.hardware && data.hardware.includes('ESP32-S3'))
          );
          
          if (isCollar) {
            console.log(`✅ Collar identified at ${ip}${endpoint}:`, {
              device: data.device,
              device_type: data.device_type,
              hardware: data.hardware,
              version: data.version
            });
            return true;
          } else {
            console.log(`📱 Device at ${ip}${endpoint} is not collar:`, {
              device: data.device || 'undefined',
              device_type: data.device_type || 'undefined'
            });
          }
        } else {
          console.log(`❌ ${ip}${endpoint} returned ${response.status}: ${response.statusText}`);
        }
      } catch (endpointError) {
        console.log(`❌ ${ip}${endpoint} failed:`, endpointError instanceof Error ? endpointError.message : 'Unknown error');
        continue;
      }
    }
  } catch (error) {
    console.log(`❌ Overall test failed for ${ip}:`, error instanceof Error ? error.message : 'Unknown error');
  }
  return false;
}

// Improved caching logic with connection state
function hasValidConnection(): boolean {
  const now = Date.now();
  return (
    cachedCollarIP !== null &&
    connectionVerified &&
    (now - lastVerificationTime) < VERIFICATION_INTERVAL &&
    (now - lastDiscoveryTime) < CACHE_DURATION
  );
}

// Quick connection verification (lightweight check)
async function verifyConnection(ip: string): Promise<boolean> {
  try {
    const response = await fetch(`http://${ip}/api/discover`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(2000)
    });
    
    if (response.ok) {
      const data = await response.json();
      const isCollar = (
        data.device_type === 'ESP32-S3_PetCollar' ||
        data.device === 'ESP32-S3-PetCollar-Advanced' ||
        (data.device && data.device.includes('PetCollar'))
      );
      
      if (isCollar) {
        lastVerificationTime = Date.now();
        connectionVerified = true;
        console.log(`✅ Proxy: Connection verified with collar at ${ip}`);
        return true;
      }
    }
  } catch (error) {
    console.log(`⚠️ Proxy: Connection verification failed for ${ip}:`, error instanceof Error ? error.message : 'Unknown');
  }
  
  connectionVerified = false;
  return false;
}

// Add function to read manual collar configuration
function getManualCollarConfig(): { collar_ip?: string } | null {
  try {
    const configPath = path.join(process.cwd(), 'public', 'collar_config.json');
    const configData = readFileSync(configPath, 'utf8');
    return JSON.parse(configData);
  } catch (error) {
    return null;
  }
}

// Dynamically discover collar's current IP address
async function discoverCollarIP(): Promise<string | null> {
  // Start UDP listener if not already running
  startCollarListener();
  
  // Step 1: Check if we have a valid, verified connection
  if (hasValidConnection()) {
    console.log(`🔗 Proxy: Using verified collar connection: ${cachedCollarIP} (no scan needed)`);
    return cachedCollarIP;
  }
  
  // Step 2: Check if we have a recent collar broadcast
  if (hasRecentCollarBroadcast()) {
    console.log(`📡 Proxy: Using collar IP from recent broadcast: ${cachedCollarIP}`);
    
    // Verify the connection quickly
    if (cachedCollarIP && await verifyConnection(cachedCollarIP)) {
      return cachedCollarIP;
    }
  }
  
  // Step 3: Try cached IP with verification (but no broadcast)
  if (cachedCollarIP && (Date.now() - lastDiscoveryTime) < CACHE_DURATION) {
    console.log(`🔄 Proxy: Verifying cached collar IP: ${cachedCollarIP}`);
    
    if (await verifyConnection(cachedCollarIP)) {
      return cachedCollarIP;
    } else {
      console.log(`❌ Proxy: Cached IP ${cachedCollarIP} no longer valid, discovering...`);
      cachedCollarIP = null;
      connectionVerified = false;
    }
  }

  console.log('🚀 Proxy: No recent collar broadcast, starting active discovery...');
  const startTime = Date.now();
  
  // Step 3: Wait briefly for a collar broadcast
  console.log('⏱️ Proxy: Waiting 3 seconds for collar announcement...');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  if (hasRecentCollarBroadcast()) {
    const discoveryTime = Date.now() - startTime;
    console.log(`📡 Proxy: Collar found via broadcast during wait! IP: ${cachedCollarIP} (${discoveryTime}ms)`);
    return cachedCollarIP;
  }
  
  // Step 4: Fall back to smart discovery (targets most likely IPs)
  try {
    const smartIP = await discoverCollarViaSmartScan();
    if (smartIP) {
      const discoveryTime = Date.now() - startTime;
      console.log(`🎯 Proxy: Smart discovery successful! Found collar at ${smartIP} (${discoveryTime}ms)`);
      
      // Cache the result and mark as verified
      cachedCollarIP = smartIP;
      lastDiscoveryTime = Date.now();
      lastVerificationTime = Date.now();
      connectionVerified = true;
      return smartIP;
    }
  } catch (error) {
    console.log('❌ Proxy: Smart discovery failed, falling back to comprehensive scanning');
  }
  
  // Step 2: Fall back to IP range scanning if mDNS fails
  console.log(`🔍 Proxy: Falling back to IP scanning across ${COMMON_IP_RANGES.length} addresses...`);
  
  // Test IPs in parallel batches for faster discovery
  const batchSize = 8;  // Increased batch size for faster scanning
  let totalTested = 0;
  
  for (let i = 0; i < COMMON_IP_RANGES.length; i += batchSize) {
    const batch = COMMON_IP_RANGES.slice(i, i + batchSize);
    totalTested += batch.length;
    
    console.log(`🔄 Proxy: Testing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(COMMON_IP_RANGES.length/batchSize)} - IPs ${batch[0]} to ${batch[batch.length-1]} (${totalTested}/${COMMON_IP_RANGES.length})`);
    
    const promises = batch.map(async (ip) => {
      const isCollar = await testCollarAtIP(ip);
      // Log any responsive devices for debugging
      if (!isCollar) {
        try {
          const quickTest = await fetch(`http://${ip}`, {
            method: 'GET',
            signal: AbortSignal.timeout(500)
          });
          if (quickTest.ok) {
            console.log(`📱 Proxy: Found device at ${ip} (not collar)`);
          }
        } catch {
          // Silent - expected for non-responsive IPs
        }
      }
      return isCollar ? ip : null;
    });
    
    const results = await Promise.all(promises);
    const foundIP = results.find(ip => ip !== null);
    
    if (foundIP) {
      const discoveryTime = Date.now() - startTime;
      console.log(`✅ Proxy: Collar discovered at ${foundIP} after testing ${totalTested} IPs (${discoveryTime}ms)`);
      
      // Cache the result and mark as verified
      cachedCollarIP = foundIP;
      lastDiscoveryTime = Date.now();
      lastVerificationTime = Date.now();
      connectionVerified = true;
      
      return foundIP;
    }
    
    // Progress update every few batches
    if ((i / batchSize) % 5 === 0) {
      const elapsed = Date.now() - startTime;
      console.log(`⏱️ Proxy: Progress ${totalTested}/${COMMON_IP_RANGES.length} IPs tested (${elapsed}ms elapsed)`);
    }
  }
  
  const discoveryTime = Date.now() - startTime;
  console.log(`❌ Proxy: No collar found after scanning ${COMMON_IP_RANGES.length} IPs in ${discoveryTime}ms`);
  console.log(`🔍 Proxy: Scanned IP ranges:`);
  console.log(`   192.168.1.1-50, 192.168.0.1-50`);
  console.log(`   192.168.2.1-30, 192.168.3.1-30, 192.168.4.1-30, 192.168.5.1-30`);
  console.log(`   10.0.0.1-50, 10.0.1.1-30, 10.1.1.1-30`);
  console.log(`   172.16.0.1-30, 172.16.1.1-30`);
  
  return null;
}

// Get collar's current IP with automatic discovery
async function getCollarIP(): Promise<string> {
  try {
    // Start UDP listener to receive collar broadcasts (non-blocking)
    startCollarListener();
    
    // 1. Use cached IP from recent collar broadcasts (preferred method)
    if (hasRecentCollarBroadcast()) {
      console.log(`✅ Proxy: Using collar IP from broadcast: ${cachedCollarIP} (no discovery needed)`);
      return cachedCollarIP!;
    }
    
    // 2. Try cached IP with quick verification (if not too old)
    if (cachedCollarIP && (Date.now() - lastDiscoveryTime) < CACHE_DURATION) {
      console.log(`🔄 Proxy: Quick verification of cached IP: ${cachedCollarIP}`);
      
      try {
        const response = await fetch(`http://${cachedCollarIP}/api/discover`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(2000)
        });
        
        if (response.ok) {
          const data = await response.json();
          
          // Verify this is still our collar
          const isCollar = (
            data.device_type === 'ESP32-S3_PetCollar' ||
            data.device === 'ESP32-S3-PetCollar-Advanced' ||
            (data.device && data.device.includes('PetCollar'))
          );
          
          if (isCollar) {
            console.log(`✅ Proxy: Cached IP verified: ${cachedCollarIP}`);
            lastVerificationTime = Date.now();
            connectionVerified = true;
            return cachedCollarIP;
          }
        }
 
        console.log(`⚠️ Proxy: Cached IP verification failed, trying manual config...`);
      } catch (verifyError) {
        console.log(`⚠️ Proxy: Cached IP verification failed, trying manual config...`);
      }
    }
    
    // 3. Try manual configuration from collar_config.json
    const manualConfig = getManualCollarConfig();
    if (manualConfig?.collar_ip) {
      console.log(`🔧 Proxy: Trying manual IP from config: ${manualConfig.collar_ip}`);
      
      try {
        const isCollar = await testCollarAtIP(manualConfig.collar_ip);
        if (isCollar) {
          console.log(`✅ Proxy: Manual IP verified: ${manualConfig.collar_ip}`);
          cachedCollarIP = manualConfig.collar_ip;
          lastDiscoveryTime = Date.now();
          connectionVerified = true;
          return manualConfig.collar_ip;
        }
      } catch (manualError) {
        console.log(`⚠️ Proxy: Manual IP verification failed: ${manualError}`);
      }
    }
    
    // 4. Wait briefly for collar broadcast before falling back to discovery
    console.log('⏱️ Proxy: Waiting 3 seconds for collar broadcast...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    if (hasRecentCollarBroadcast()) {
      console.log(`📡 Proxy: Collar found via broadcast after wait: ${cachedCollarIP}`);
      return cachedCollarIP!;
    }
    
    // 5. No more automatic scanning - return error for manual configuration
    console.log('❌ Proxy: No collar broadcast received and no cached IP available');
    console.log('💡 Proxy: Please configure collar IP manually in the dashboard');
    throw new Error('Collar IP not available - please configure manually in settings');
    
  } catch (error) {
    console.error(`❌ Proxy: Could not get collar IP:`, error instanceof Error ? error.message : 'Unknown error');
    throw new Error('Could not locate collar on network');
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || '/data';
    const force = searchParams.get('force') === 'true'; // Force rediscovery
    const manualIP = searchParams.get('ip'); // Manual IP override for debugging
    
    // Manual IP override for testing
    if (manualIP) {
      console.log(`🔧 Proxy: Using manual IP override: ${manualIP}`);
      
      // Test if the manual IP is actually a collar
      const isCollar = await testCollarAtIP(manualIP);
      if (!isCollar) {
        console.log(`❌ Proxy: Manual IP ${manualIP} is not a collar device`);
        return NextResponse.json({
          error: 'Manual IP is not a collar device',
          tested_ip: manualIP,
          timestamp: Date.now(),
          troubleshooting: {
            steps: [
              '1. Check if the collar is powered on and WiFi connected',
              '2. Look at the collar\'s OLED display for the current IP address',
              '3. Ensure collar and computer are on the same WiFi network',
              '4. Try the collar discovery tool in Settings → Advanced Connection'
            ],
            common_ips: ['10.0.0.8', '192.168.1.100', '192.168.0.100', '192.168.4.1'],
            note: 'If collar shows 192.168.4.1, it\'s in AP mode - connect to "PetCollar-Setup" WiFi first'
          }
        }, { status: 400 });
      }
      
      // Use manual IP
      cachedCollarIP = manualIP;
      lastDiscoveryTime = Date.now();
      
      const response = await fetch(`http://${manualIP}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        throw new Error(`Manual collar at ${manualIP} responded with ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    // Clear cache if force discovery is requested
    if (force) {
      console.log('🔄 Proxy: Force rediscovery requested - clearing cache');
      cachedCollarIP = null;
      lastDiscoveryTime = 0;
    }

    try {
      const collarIP = await getCollarIP();
      console.log(`📡 Proxy: Attempting to fetch data from collar at ${collarIP}${endpoint}`);
      
      const response = await fetch(`http://${collarIP}${endpoint}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        cache: 'no-cache',
        signal: AbortSignal.timeout(5000)
      });
      
      if (!response.ok) {
        console.log(`❌ Proxy: Collar fetch failed - HTTP ${response.status}: ${response.statusText}`);
        throw new Error(`Collar responded with ${response.status}: ${response.statusText}`);
      }
      
      console.log(`✅ Proxy: Successfully fetched data from collar (${response.status})`);
      const data = await response.json();
      
      return NextResponse.json(data, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
          'Cache-Control': 'no-cache'
        }
      });
    } catch (collarError) {
      // Enhanced error handling with troubleshooting information
      const errorMessage = collarError instanceof Error ? collarError.message : 'Unknown error';
      console.error('❌ Proxy error:', errorMessage);
      
      let troubleshootingSteps = [];
      let possibleCauses = [];
      
      if (errorMessage.includes('Could not locate collar')) {
        troubleshootingSteps = [
          '1. Check the collar\'s OLED display for the current IP address',
          '2. Go to Settings → Advanced Connection Settings',
          '3. Use "Auto-Discover" or manually enter the collar IP',
          '4. Ensure collar and computer are on the same WiFi network'
        ];
        possibleCauses = [
          'Collar IP address has changed',
          'Collar is offline or not connected to WiFi',
          'Network connectivity issue',
          'Collar is in setup mode (AP mode)'
        ];
      } else if (errorMessage.includes('timeout')) {
        troubleshootingSteps = [
          '1. Check if collar is powered on',
          '2. Verify WiFi connection on collar display',
          '3. Try refreshing the page',
          '4. Restart the collar if needed'
        ];
        possibleCauses = [
          'Collar is not responding',
          'Network congestion',
          'Collar is busy or overloaded'
        ];
      } else {
        troubleshootingSteps = [
          '1. Check collar status on OLED display',
          '2. Use Settings → Advanced Connection → Auto-Discover',
          '3. Manually configure collar IP if known',
          '4. Check collar firmware logs if accessible'
        ];
        possibleCauses = [
          'Network configuration issue',
          'Collar firmware problem',
          'HTTP endpoint not responding'
        ];
      }
      
      // Return error response with helpful troubleshooting information
      return NextResponse.json({
        error: 'Could not connect to collar',
        message: errorMessage,
        timestamp: Date.now(),
        troubleshooting: {
          possible_causes: possibleCauses,
          steps: troubleshootingSteps,
          quick_fixes: [
            'Check collar OLED display for IP address',
            'Use Auto-Discover in Settings',
            'Ensure same WiFi network'
          ],
          common_ips: ['10.0.0.8', '192.168.1.100', '192.168.0.100', '192.168.4.1'],
          advanced_help: 'If collar shows 192.168.4.1, it\'s in AP mode - connect to "PetCollar-Setup" WiFi and configure at http://192.168.4.1'
        }
      }, {
        status: 503,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Proxy general error:', error);
    
    // Return error response
    return NextResponse.json({
      error: 'Proxy service error',
      message: error instanceof Error ? error.message : 'Unknown error',
      timestamp: Date.now()
    }, {
      status: 500,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const collarIP = await getCollarIP();
    const body = await request.json();
    const { searchParams } = new URL(request.url);
    const endpoint = searchParams.get('endpoint') || '/command';
    
    const response = await fetch(`http://${collarIP}${endpoint}`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000)
    });
    
    let data;
    try {
      data = response.ok ? await response.json() : { 
        success: false, 
        message: `HTTP ${response.status}`,
        timestamp: Date.now()
      };
    } catch (parseError) {
      const textResponse = await response.text();
      data = {
        success: response.ok,
        message: textResponse || `HTTP ${response.status}`,
        timestamp: Date.now()
      };
    }
    
    return NextResponse.json(data, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
    
  } catch (error) {
    console.error('❌ POST proxy error:', error);
    
    return NextResponse.json({
      success: false,
      message: 'Could not send command to collar',
      error: error instanceof Error ? error.message : String(error),
      timestamp: Date.now()
    }, {
      status: 503,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
} 