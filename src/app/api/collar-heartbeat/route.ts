import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Types for collar heartbeat
interface CollarHeartbeat {
  device_id: string;
  status: string;
  ip_address: string;
  signal_strength: number;
  uptime: number;
  free_heap: number;
  wifi_connected: boolean;
  timestamp: number;
}

interface CollarRegistry {
  collars: Record<string, any>;
  last_updated: string;
}

const REGISTRY_PATH = join(process.cwd(), 'public', 'collar_registry.json');

// Load existing registry
function loadRegistry(): CollarRegistry {
  if (existsSync(REGISTRY_PATH)) {
    try {
      const data = readFileSync(REGISTRY_PATH, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading collar registry:', error);
    }
  }
  
  return {
    collars: {},
    last_updated: new Date().toISOString()
  };
}

// Save registry
function saveRegistry(registry: CollarRegistry): void {
  try {
    registry.last_updated = new Date().toISOString();
    writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
  } catch (error) {
    console.error('❌ Failed to save collar registry:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const heartbeat: CollarHeartbeat = await request.json();
    
    // Validate required fields
    if (!heartbeat.device_id || !heartbeat.ip_address) {
      console.log('❌ Invalid heartbeat data - missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: device_id, ip_address' },
        { status: 400 }
      );
    }
    
    // Load existing registry
    const registry = loadRegistry();
    
    // Check if collar exists in registry
    const existingCollar = registry.collars[heartbeat.device_id];
    if (!existingCollar) {
      console.log(`⚠️ Heartbeat from unregistered collar: ${heartbeat.device_id}`);
      return NextResponse.json(
        { 
          error: 'Collar not registered',
          message: 'Please register collar first',
          action: 'register_required',
          device_id: heartbeat.device_id
        },
        { status: 404 }
      );
    }
    
    // Update collar with heartbeat data
    const now = new Date().toISOString();
    const ipChanged = existingCollar.ip_address !== heartbeat.ip_address;
    
    // Update collar entry
    existingCollar.last_heartbeat = now;
    existingCollar.last_seen = now;
    existingCollar.status = heartbeat.status;
    existingCollar.signal_strength = heartbeat.signal_strength;
    existingCollar.uptime = heartbeat.uptime;
    existingCollar.free_heap = heartbeat.free_heap;
    existingCollar.wifi_connected = heartbeat.wifi_connected;
    
    // Handle IP address changes
    if (ipChanged) {
      console.log(`🔄 Collar IP changed during heartbeat: ${heartbeat.device_id} (${existingCollar.ip_address} → ${heartbeat.ip_address})`);
      
      existingCollar.ip_address = heartbeat.ip_address;
      existingCollar.network_type = existingCollar.network_type || 'unknown';
      
      // Update endpoints with new IP
      if (existingCollar.endpoints) {
        existingCollar.endpoints.web_interface = `http://${heartbeat.ip_address}`;
        existingCollar.endpoints.websocket = `ws://${heartbeat.ip_address}:8080`;
        existingCollar.endpoints.api = `http://${heartbeat.ip_address}/data`;
      }
      
      // Add to connection history
      existingCollar.connection_history = existingCollar.connection_history || [];
      existingCollar.connection_history.push({
        timestamp: now,
        ip_address: heartbeat.ip_address,
        network_type: existingCollar.network_type,
        event: 'ip_change'
      });
      
      // Keep only last 50 connection history entries
      if (existingCollar.connection_history.length > 50) {
        existingCollar.connection_history = existingCollar.connection_history.slice(-50);
      }
    } else {
      // Regular heartbeat - just add to history if it's been a while
      existingCollar.connection_history = existingCollar.connection_history || [];
      const lastEntry = existingCollar.connection_history[existingCollar.connection_history.length - 1];
      
      // Add heartbeat entry if last entry was more than 5 minutes ago or not a heartbeat
      if (!lastEntry || 
          new Date(now).getTime() - new Date(lastEntry.timestamp).getTime() > 5 * 60 * 1000 ||
          lastEntry.event !== 'heartbeat') {
        existingCollar.connection_history.push({
          timestamp: now,
          ip_address: heartbeat.ip_address,
          network_type: existingCollar.network_type || 'unknown',
          event: 'heartbeat'
        });
        
        // Keep only last 50 entries
        if (existingCollar.connection_history.length > 50) {
          existingCollar.connection_history = existingCollar.connection_history.slice(-50);
        }
      }
    }
    
    // Save updated registry
    saveRegistry(registry);
    
    // Log heartbeat (less verbose than registration)
    const uptimeHours = Math.floor(heartbeat.uptime / 3600);
    const uptimeMinutes = Math.floor((heartbeat.uptime % 3600) / 60);
    
    console.log(`💓 Heartbeat: ${heartbeat.device_id} | IP: ${heartbeat.ip_address} | Signal: ${heartbeat.signal_strength}dBm | Uptime: ${uptimeHours}h ${uptimeMinutes}m | Heap: ${Math.round(heartbeat.free_heap / 1024)}KB`);
    
    if (ipChanged) {
      console.log(`   📍 IP address updated in registry`);
    }
    
    // Prepare response
    const response = {
      status: 'success',
      message: 'Heartbeat received',
      device_id: heartbeat.device_id,
      server_time: now,
      ip_change_detected: ipChanged,
      next_heartbeat_in: 30, // seconds
      collar_registered: true,
      
      // Optional: Send back any configuration updates or commands
      commands: [] as string[],
      config_updates: {} as Record<string, any>
    };
    
    // You could add logic here to send commands back to the collar
    // For example, if there are pending firmware updates, configuration changes, etc.
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Collar heartbeat error:', error);
    
    return NextResponse.json(
      { 
        error: 'Heartbeat processing failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint for heartbeat status (for debugging/monitoring)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device_id');
    
    const registry = loadRegistry();
    
    if (deviceId) {
      // Return specific collar heartbeat status
      const collar = registry.collars[deviceId];
      if (!collar) {
        return NextResponse.json(
          { error: 'Collar not found' },
          { status: 404 }
        );
      }
      
      const lastHeartbeat = collar.last_heartbeat ? new Date(collar.last_heartbeat) : null;
      const timeSinceLastHeartbeat = lastHeartbeat ? 
        Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000) : null;
      
      return NextResponse.json({
        device_id: deviceId,
        status: collar.status,
        last_heartbeat: collar.last_heartbeat,
        seconds_since_last_heartbeat: timeSinceLastHeartbeat,
        is_alive: timeSinceLastHeartbeat ? timeSinceLastHeartbeat < 120 : false, // Alive if heartbeat within 2 minutes
        ip_address: collar.ip_address,
        signal_strength: collar.signal_strength,
        uptime: collar.uptime,
        free_heap: collar.free_heap,
        wifi_connected: collar.wifi_connected
      });
    } else {
      // Return summary of all collar heartbeat statuses
      const now = Date.now();
      const collarStatuses = Object.entries(registry.collars).map(([id, collar]) => {
        const lastHeartbeat = collar.last_heartbeat ? new Date(collar.last_heartbeat) : null;
        const timeSinceLastHeartbeat = lastHeartbeat ? 
          Math.floor((now - lastHeartbeat.getTime()) / 1000) : null;
        
        return {
          device_id: id,
          status: collar.status,
          last_heartbeat: collar.last_heartbeat,
          seconds_since_last_heartbeat: timeSinceLastHeartbeat,
          is_alive: timeSinceLastHeartbeat ? timeSinceLastHeartbeat < 120 : false,
          ip_address: collar.ip_address,
          signal_strength: collar.signal_strength
        };
      });
      
      const aliveCount = collarStatuses.filter(c => c.is_alive).length;
      
      return NextResponse.json({
        total_collars: collarStatuses.length,
        alive_collars: aliveCount,
        dead_collars: collarStatuses.length - aliveCount,
        collars: collarStatuses,
        last_updated: registry.last_updated
      });
    }
    
  } catch (error) {
    console.error('❌ Error retrieving heartbeat status:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve heartbeat status' },
      { status: 500 }
    );
  }
} 