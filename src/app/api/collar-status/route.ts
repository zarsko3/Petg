import { NextRequest, NextResponse } from 'next/server';

const KNOWN_COLLAR_IP = '192.168.1.23';

// Import the cache variables (we'll need to expose them)
// Note: In a real implementation, we'd properly export these from collar-proxy
let connectionCacheInfo = {
  cachedCollarIP: null as string | null,
  lastDiscoveryTime: 0,
  lastVerificationTime: 0,
  connectionVerified: false,
  lastRequestTime: 0,
  requestCount: 0
};

// Simple direct collar status check
export async function GET(request: NextRequest) {
  try {
    console.log('📡 CollarStatus: Querying collar directly...');
    
    const response = await fetch(`http://${KNOWN_COLLAR_IP}/api/data`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      
      if (data.localIP && data.wifiConnected !== undefined) {
        console.log(`✅ CollarStatus: Collar confirmed its IP as: ${data.localIP}`);
        console.log(`📊 CollarStatus: WiFi Connected: ${data.wifiConnected}`);
        console.log(`🔋 CollarStatus: Battery Level: ${data.batteryLevel}%`);
        
        const websocketUrl = `ws://${data.localIP}:8080`;
        
        return NextResponse.json({
          status: 'connected',
          ip: data.localIP,
          websocket_url: websocketUrl,
          battery_level: data.batteryLevel,
          wifi_connected: data.wifiConnected,
          uptime: data.uptime,
          free_heap: data.freeHeap,
          wifi_mode: data.wifiMode,
          timestamp: Date.now()
        });
      } else {
        return NextResponse.json({
          status: 'error',
          message: 'Invalid response from collar',
          timestamp: Date.now()
        }, { status: 422 });
      }
    } else {
      return NextResponse.json({
        status: 'disconnected',
        message: `HTTP ${response.status}: ${response.statusText}`,
        timestamp: Date.now()
      }, { status: response.status });
    }
    
  } catch (error) {
    console.error('❌ CollarStatus: Error querying collar:', error);
    
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
      timestamp: Date.now()
    }, { status: 503 });
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

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    
    if (action === 'test_connection') {
      // Try to reach the collar directly if we have a cached IP
      if (connectionCacheInfo.cachedCollarIP) {
        try {
          const response = await fetch(`http://${connectionCacheInfo.cachedCollarIP}/api/discover`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000)
          });
          
          if (response.ok) {
            const data = await response.json();
            return NextResponse.json({
              success: true,
              ip: connectionCacheInfo.cachedCollarIP,
              response_data: data,
              message: 'Collar is responsive'
            });
          }
        } catch (error) {
          return NextResponse.json({
            success: false,
            ip: connectionCacheInfo.cachedCollarIP,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Collar not responding'
          });
        }
      }
      
      return NextResponse.json({
        success: false,
        message: 'No cached collar IP available'
      });
    }
    
    return NextResponse.json({
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error) {
    return NextResponse.json({
      error: 'Invalid request',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 400 });
  }
} 