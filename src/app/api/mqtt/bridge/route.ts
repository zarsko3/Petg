import { NextRequest, NextResponse } from 'next/server';

// SSE connection for real-time MQTT data
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topics = searchParams.get('topics')?.split(',') || ['pet-collar/+/+'];
  
  console.log('🌐 Starting MQTT SSE bridge for topics:', topics);
  
  // Create Server-Sent Events stream
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const data = `data: ${JSON.stringify({
        type: 'connection',
        status: 'connecting',
        timestamp: new Date().toISOString()
      })}\n\n`;
      
      controller.enqueue(encoder.encode(data));
      
      // Setup MQTT connection (simplified for now)
      // In production, you'd use the mqtt npm package here
      const mockMqttData = () => {
        const mockData = {
          type: 'message',
          topic: 'pet-collar/001/status',
          payload: {
            deviceId: '001',
            status: 'online',
            battery: 85,
            rssi: -45,
            timestamp: new Date().toISOString()
          }
        };
        
        const sseData = `data: ${JSON.stringify(mockData)}\n\n`;
        controller.enqueue(encoder.encode(sseData));
      };
      
      // Send mock data every 5 seconds
      const interval = setInterval(mockMqttData, 5000);
      
      // Cleanup on disconnect
      request.signal.addEventListener('abort', () => {
        clearInterval(interval);
        controller.close();
        console.log('🔌 MQTT SSE bridge disconnected');
      });
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET',
      'Access-Control-Allow-Headers': 'Cache-Control',
    },
  });
}

// Handle MQTT command publishing
export async function POST(request: NextRequest) {
  try {
    const { topic, payload } = await request.json();
    
    console.log('📤 Publishing MQTT command:', { topic, payload });
    
    // In production, connect to HiveMQ and publish the message
    // For now, return success
    
    return NextResponse.json({
      success: true,
      message: 'Command published successfully',
      topic,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ MQTT publish error:', error);
    return NextResponse.json(
      { error: 'Failed to publish command' },
      { status: 500 }
    );
  }
} 