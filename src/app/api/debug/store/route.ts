import { NextResponse } from 'next/server';
import { usePetgStore } from '@/lib/store';

export async function GET() {
  try {
    // Get current store state
    const store = usePetgStore.getState();
    
    const debugInfo = {
      store: {
        isCollarConnected: store.isCollarConnected,
        connectionStatus: store.connectionStatus,
        connectionMessage: store.connectionMessage,
        connectionUrl: store.collarConnectionUrl,
        lastDataReceived: store.lastDataReceived,
        lastConnectionAttempt: store.lastConnectionAttempt,
        hasCollarData: !!store.lastCollarData,
        collarDataKeys: store.lastCollarData ? Object.keys(store.lastCollarData) : []
      },
      timestamp: Date.now()
    };
    
    return NextResponse.json(debugInfo);
  } catch (error) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { error: 'Failed to get store state', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
} 