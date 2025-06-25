import { NextResponse } from 'next/server';

interface CollarDiscoveryResult {
  success: boolean;
  collar_ip?: string;
  websocket_url?: string;
  http_url?: string;
  discovered_ips?: string[];
  message?: string;
  timestamp?: string;
}

// Enhanced IP ranges with prioritized common addresses
const DISCOVERY_IP_RANGES = [
  // Priority 1: User's current network (10.0.0.x) - most likely
  ...Array.from({length: 30}, (_, i) => `10.0.0.${i + 1}`),
  
  // Priority 2: Common home networks (192.168.1.x)
  ...Array.from({length: 30}, (_, i) => `192.168.1.${i + 1}`),
  
  // Priority 3: Alternative home networks (192.168.0.x)
  ...Array.from({length: 30}, (_, i) => `192.168.0.${i + 1}`),
  
  // Priority 4: Office networks (172.16.0.x)
  ...Array.from({length: 20}, (_, i) => `172.16.0.${i + 1}`),
  
  // Priority 5: Alternative office networks (172.16.1.x)
  ...Array.from({length: 20}, (_, i) => `172.16.1.${i + 1}`),
];

// Test if an IP hosts the collar device
async function testCollarAtIP(ip: string, timeout: number = 2000): Promise<boolean> {
  try {
    const response = await fetch(`http://${ip}/api/discover`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(timeout)
    });

    if (response.ok) {
      const data = await response.json();
      // Verify this is actually a collar device
      return data.device_type === 'ESP32-S3_PetCollar' && data.local_ip;
    }
  } catch (error) {
    // Ignore connection errors - expected for non-collar IPs
  }
  
  return false;
}

export async function GET() {
  try {
    console.log('🔍 Starting enhanced collar auto-discovery...');
    
    // Add CORS headers for cross-origin requests
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    
    const startTime = Date.now();
    const discoveredIPs: string[] = [];
    
    // Test IPs in parallel batches for faster discovery
    const batchSize = 8; // Increased batch size for faster scanning
    let foundCollar: string | null = null;
    
    console.log(`🚀 Testing ${DISCOVERY_IP_RANGES.length} IP addresses in batches of ${batchSize}...`);
    
    for (let i = 0; i < DISCOVERY_IP_RANGES.length && !foundCollar; i += batchSize) {
      const batch = DISCOVERY_IP_RANGES.slice(i, i + batchSize);
      console.log(`📡 Testing batch ${Math.floor(i/batchSize) + 1}: ${batch[0]} - ${batch[batch.length-1]}`);
      
      const promises = batch.map(async (ip) => {
        if (await testCollarAtIP(ip, 2000)) { // 2 second timeout per IP
          return ip;
        }
        return null;
      });
      
      const results = await Promise.all(promises);
      foundCollar = results.find(ip => ip !== null) || null;
      
      // Collect all IPs that responded (even if not collars)
      results.forEach(ip => {
        if (ip) discoveredIPs.push(ip);
      });
      
      // Early exit if found
      if (foundCollar) break;
    }
    
    const endTime = Date.now();
    const scanTime = (endTime - startTime) / 1000;
    
    if (foundCollar) {
      const result: CollarDiscoveryResult = {
        success: true,
        collar_ip: foundCollar,
        websocket_url: `ws://${foundCollar}:8080`,
        http_url: `http://${foundCollar}`,
        discovered_ips: discoveredIPs,
        message: `Collar found at ${foundCollar} (scan took ${scanTime.toFixed(1)}s)`,
        timestamp: new Date().toISOString()
      };
      
      console.log(`🎯 Collar discovery successful: ${foundCollar} in ${scanTime.toFixed(1)}s`);
      return NextResponse.json(result, { headers });
    } else {
      const result: CollarDiscoveryResult = {
        success: false,
        discovered_ips: discoveredIPs,
        message: `No collar found after scanning ${DISCOVERY_IP_RANGES.length} IPs (${scanTime.toFixed(1)}s)`,
        timestamp: new Date().toISOString()
      };
      
      console.log(`❌ No collar found after scanning ${DISCOVERY_IP_RANGES.length} IPs in ${scanTime.toFixed(1)}s`);
      return NextResponse.json(result, { headers });
    }
    
  } catch (error) {
    console.error('❌ Collar discovery error:', error);
    
    return NextResponse.json({
      success: false,
      message: `Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { ip } = await request.json();
    
    if (!ip) {
      return NextResponse.json({
        success: false,
        message: 'IP address is required'
      }, { status: 400 });
    }

    console.log(`🎯 Testing specific IP: ${ip}`);
    const isCollar = await testCollarAtIP(ip, 5000); // Longer timeout for manual test
    
    if (isCollar) {
      return NextResponse.json({
        success: true,
        collar_ip: ip,
        websocket_url: `ws://${ip}:8080`,
        http_url: `http://${ip}`,
        message: `Collar confirmed at ${ip}`,
        timestamp: new Date().toISOString()
      });
    } else {
      return NextResponse.json({
        success: false,
        message: `No collar found at ${ip}`,
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('❌ Collar discovery error:', error);
    
    return NextResponse.json({
      success: false,
      message: `Discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
} 