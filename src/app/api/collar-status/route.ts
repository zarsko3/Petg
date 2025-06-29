import { NextRequest, NextResponse } from 'next/server';

// 🔧 FIXED: Dynamic collar discovery instead of hardcoded IP
async function findCollarIP(): Promise<string | null> {
  try {
    // Try to use collar-proxy discovery logic
    const response = await fetch('/api/collar-proxy?endpoint=/api/discover', {
      signal: AbortSignal.timeout(3000)
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.local_ip || data.ip_address || null;
    }
  } catch (error) {
    console.log('📡 CollarStatus: Discovery failed, no active collar found');
  }
  
  return null;
}

// 🔧 FIXED: Improved collar status check with proper error handling
export async function GET(request: NextRequest) {
  try {
    console.log('📡 CollarStatus: Discovering active collar...');
    
    // Find collar dynamically instead of using hardcoded IP
    const collarIP = await findCollarIP();
    
    if (!collarIP) {
      // Return success with disconnected status instead of 503 error
      return NextResponse.json({
        status: 'disconnected',
        message: 'No active collar found',
        discovery_attempted: true,
        timestamp: Date.now()
      }, { 
        status: 200, // 🔧 FIXED: Return 200 instead of 503
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
    console.log(`📡 CollarStatus: Found collar at ${collarIP}, checking status...`);
    
    const response = await fetch(`http://${collarIP}/api/data`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    if (response.ok) {
      const data = await response.json();
      
      // 🔒 SECURITY FIX: Use WSS when served over HTTPS
      const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const websocketUrl = `${protocol}//${data.localIP || collarIP}:8080`;
      
      console.log(`✅ CollarStatus: Collar confirmed at: ${data.localIP || collarIP}`);
      console.log(`📊 CollarStatus: WiFi Connected: ${data.wifiConnected}`);
      console.log(`🔋 CollarStatus: Battery Level: ${data.batteryLevel || data.battery_level}%`);
      
      return NextResponse.json({
        status: 'connected',
        ip: data.localIP || collarIP,
        websocket_url: websocketUrl,
        battery_level: data.batteryLevel || data.battery_level || 0,
        wifi_connected: data.wifiConnected || data.wifi_connected || false,
        uptime: data.uptime || 0,
        free_heap: data.freeHeap || data.free_heap || 0,
        wifi_mode: data.wifiMode || data.wifi_mode || 0,
        device_id: data.device_id || 'Unknown',
        firmware_version: data.firmware_version || 'Unknown',
        timestamp: Date.now()
      }, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
    } else {
      // Return success with error status instead of HTTP error code
      return NextResponse.json({
        status: 'error',
        message: `Collar at ${collarIP} responded with ${response.status}: ${response.statusText}`,
        ip: collarIP,
        timestamp: Date.now()
      }, { 
        status: 200, // 🔧 FIXED: Return 200 instead of HTTP error code
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-cache'
        }
      });
    }
    
  } catch (error) {
    console.error('❌ CollarStatus: Error checking collar:', error);
    
    // Return success with error status instead of 503
    return NextResponse.json({
      status: 'error',
      message: error instanceof Error ? error.message : 'Connection failed',
      discovery_attempted: true,
      timestamp: Date.now()
    }, { 
      status: 200, // 🔧 FIXED: Return 200 instead of 503
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache'
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

export async function POST(request: Request) {
  try {
    const { action } = await request.json();
    
    if (action === 'test_connection') {
      // 🔧 FIXED: Use dynamic collar discovery instead of cached IP
      const collarIP = await findCollarIP();
      
      if (collarIP) {
        try {
          const response = await fetch(`http://${collarIP}/api/discover`, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(3000)
          });
          
          if (response.ok) {
            const data = await response.json();
            return NextResponse.json({
              success: true,
              ip: collarIP,
              response_data: data,
              message: 'Collar is responsive'
            });
          }
        } catch (error) {
          return NextResponse.json({
            success: false,
            ip: collarIP,
            error: error instanceof Error ? error.message : 'Unknown error',
            message: 'Collar not responding'
          });
        }
      }
      
      return NextResponse.json({
        success: false,
        message: 'No active collar found'
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