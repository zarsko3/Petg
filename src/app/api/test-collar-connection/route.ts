import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ip = searchParams.get('ip') || '192.168.1.60'; // Default to discovered IP
  
  console.log(`🔧 Testing collar connection at IP: ${ip}`);
  
  const results = {
    ip,
    timestamp: new Date().toISOString(),
    tests: {} as any
  };
  
  // Test 1: HTTP Root endpoint
  try {
    console.log(`📡 Testing HTTP root: http://${ip}/`);
    const response = await fetch(`http://${ip}/`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    
    results.tests.http_root = {
      status: response.status,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries()),
      content: response.status === 200 ? await response.text() : 'No content'
    };
    console.log(`✅ HTTP root test completed: ${response.status}`);
  } catch (error) {
    results.tests.http_root = {
      error: error instanceof Error ? error.message : String(error)
    };
    console.log(`❌ HTTP root test failed:`, error);
  }
  
  // Test 2: HTTP /api/discover endpoint
  try {
    console.log(`📡 Testing HTTP API discover: http://${ip}/api/discover`);
    const response = await fetch(`http://${ip}/api/discover`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    const data = response.ok ? await response.json() : await response.text();
    results.tests.http_api_discover = {
      status: response.status,
      ok: response.ok,
      data
    };
    console.log(`✅ HTTP API discover test completed: ${response.status}`);
  } catch (error) {
    results.tests.http_api_discover = {
      error: error instanceof Error ? error.message : String(error)
    };
    console.log(`❌ HTTP API discover test failed:`, error);
  }
  
  // Test 3: HTTP /data endpoint
  try {
    console.log(`📡 Testing HTTP data: http://${ip}/data`);
    const response = await fetch(`http://${ip}/data`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(5000)
    });
    
    const data = response.ok ? await response.json() : await response.text();
    results.tests.http_data = {
      status: response.status,
      ok: response.ok,
      data
    };
    console.log(`✅ HTTP data test completed: ${response.status}`);
  } catch (error) {
    results.tests.http_data = {
      error: error instanceof Error ? error.message : String(error)
    };
    console.log(`❌ HTTP data test failed:`, error);
  }
  
  // Test 4: WebSocket port check (server-side can't actually open WebSocket)
  try {
    console.log(`🔗 Testing WebSocket endpoint availability: ws://${ip}:8080`);
    // We can test if the port responds to HTTP on 8080 as a proxy test
    const response = await fetch(`http://${ip}:8080/`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    results.tests.websocket_port = {
      status: response.status,
      ok: response.ok,
      note: 'HTTP test on WebSocket port (actual WebSocket test needs client-side)'
    };
    console.log(`✅ WebSocket port test completed: ${response.status}`);
  } catch (error) {
    results.tests.websocket_port = {
      error: error instanceof Error ? error.message : String(error),
      note: 'Port may be WebSocket-only (not HTTP)'
    };
    console.log(`❌ WebSocket port test failed:`, error);
  }
  
  console.log(`🎯 Collar connection test results:`, results);
  
  return NextResponse.json(results, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
} 