import { NextRequest, NextResponse } from 'next/server';

// Test alert endpoint that sends real commands to the collar via WebSocket
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { beaconId, alertMode, duration = 2000, intensity = 2000, fallback = false } = body;

    console.log(`🧪 Test Alert Request:`, {
      beaconId,
      alertMode,
      duration,
      intensity,
      fallback,
      timestamp: new Date().toISOString()
    });

    // Validate and safely handle alert mode
    if (!alertMode || typeof alertMode !== 'string') {
      return NextResponse.json({
        success: false,
        error: 'Invalid alert mode',
        message: 'Alert mode must be a valid string (buzzer, vibration, both, or none)'
      }, { status: 400 });
    }

    // Map alert modes to collar commands
    let collarCommand;
    const safeAlertMode = alertMode.toLowerCase();
    
    switch (safeAlertMode) {
      case 'buzzer':
        collarCommand = 'test_buzzer';
        break;
      case 'vibration':
        collarCommand = 'test_vibration';
        break;
      case 'both':
        collarCommand = 'test_buzzer'; // Start with buzzer, can add sequence later
        break;
      case 'none':
        return NextResponse.json({
          success: false,
          error: 'Cannot test alert when mode is None',
          message: 'Please select a valid alert mode first'
        }, { status: 400 });
      default:
        console.warn(`Unknown alert mode: ${alertMode}, defaulting to buzzer`);
        collarCommand = 'test_buzzer'; // Default to buzzer
    }

    if (fallback) {
      console.log(`🔄 HTTP Fallback mode: Test alert simulated`);
      
      // In fallback mode, we can't actually send the command but we return success
      // The frontend should handle the actual WebSocket communication
      return NextResponse.json({
        success: true,
        message: `Test ${alertMode} simulated via fallback method`,
        data: {
          beaconId,
          alertMode,
          duration,
          intensity,
          testTime: new Date().toISOString(),
          method: 'HTTP_FALLBACK',
          note: 'WebSocket failed, used fallback method'
        }
      });
    }

    console.log(`🔊 Preparing collar WebSocket command: ${collarCommand}`);

    // First, discover the collar IP via proxy
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const discoveryResponse = await fetch(`${baseUrl}/api/collar-proxy?endpoint=/api/discover`, {
      method: 'GET',
      signal: AbortSignal.timeout(8000)
    });

    if (!discoveryResponse.ok) {
      throw new Error('Could not discover collar IP - collar may be offline');
    }

    const discoveryData = await discoveryResponse.json();
    
    // Check if we got valid collar data
    if (!discoveryData.local_ip && !discoveryData.ip_address) {
      throw new Error('Collar IP not found in discovery response');
    }
    
    const collarIP = discoveryData.local_ip || discoveryData.ip_address;
    const wsUrl = discoveryData.websocket_url || `ws://${collarIP}:8080`;

    console.log(`🎯 Found collar at: ${collarIP}`);
    console.log(`📡 WebSocket URL: ${wsUrl}`);

    // Since we're on the server side, we can't create WebSocket connections directly
    // Instead, we'll use the collar-proxy to send the command via POST
    try {
      const commandResponse = await fetch(`${baseUrl}/api/collar-proxy?endpoint=/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: collarCommand
        }),
        signal: AbortSignal.timeout(5000)
      });

      if (commandResponse.ok) {
        const result = await commandResponse.json();
        console.log(`✅ Test alert sent successfully via proxy: ${collarCommand}`);
        
        return NextResponse.json({
          success: true,
          message: `Test ${alertMode} sent successfully to collar`,
          data: {
            beaconId,
            alertMode,
            duration,
            intensity,
            testTime: new Date().toISOString(),
            collarCommand,
            collarIP,
            wsUrl,
            method: 'PROXY_WEBSOCKET',
            result
          }
        });
      } else {
        throw new Error(`Collar proxy returned status ${commandResponse.status}`);
      }
    } catch (proxyError) {
      console.warn('Collar proxy failed, collar only supports WebSocket:', proxyError);
      
      // Return information for frontend to handle WebSocket connection
      return NextResponse.json({
        success: false,
        error: 'WebSocket command required',
        message: `The collar requires WebSocket communication for commands. Use the WebSocket connection in the dashboard.`,
        data: {
          collarIP,
          wsUrl,
          command: collarCommand,
          instructions: {
            connect: `new WebSocket('${wsUrl}')`,
            send: `ws.send('${JSON.stringify({command: collarCommand})}')`,
            note: 'The collar firmware only supports commands via WebSocket, not HTTP endpoints'
          }
        }
      }, { status: 501 });
    }

  } catch (error) {
    console.error('❌ Test alert error:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to send test alert',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
} 