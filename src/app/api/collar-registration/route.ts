import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Types for collar registration
interface CollarRegistration {
  device_id: string;
  device_type: string;
  firmware_version: string;
  mac_address: string;
  ip_address: string;
  network_type: 'static' | 'dhcp';
  wifi_ssid: string;
  signal_strength: number;
  gateway: string;
  subnet: string;
  capabilities: {
    web_server: boolean;
    websocket: boolean;
    ble_scanning: boolean;
    real_time_tracking: boolean;
  };
  endpoints: {
    web_interface: string;
    websocket: string;
    api: string;
  };
  registration_time: number;
  status: string;
}

interface CollarRegistry {
  collars: Record<string, CollarRegistration & {
    last_seen: string;
    last_heartbeat: string;
    connection_history: Array<{
      timestamp: string;
      ip_address: string;
      network_type: string;
      event: 'registered' | 'heartbeat' | 'ip_change' | 'disconnect';
    }>;
  }>;
  last_updated: string;
}

const REGISTRY_PATH = join(process.cwd(), 'public', 'collar_registry.json');
const CONFIG_PATH = join(process.cwd(), 'public', 'collar_config.json');

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
    console.log('✅ Collar registry updated');
  } catch (error) {
    console.error('❌ Failed to save collar registry:', error);
  }
}

// Update collar configuration for auto-discovery
function updateCollarConfig(registration: CollarRegistration): void {
  try {
    const config = {
      collar_ip: registration.ip_address,
      websocket_url: registration.endpoints.websocket,
      http_url: registration.endpoints.web_interface,
      device_id: registration.device_id,
      status: 'connected',
      network_type: registration.network_type,
      last_discovered: new Date().toISOString(),
      capabilities: registration.capabilities,
      endpoints: registration.endpoints
    };
    
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`✅ Updated collar config for ${registration.device_id}`);
  } catch (error) {
    console.error('❌ Failed to update collar config:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const registration: CollarRegistration = await request.json();
    
    console.log('📡 Collar registration request received:');
    console.log(`   Device ID: ${registration.device_id}`);
    console.log(`   IP Address: ${registration.ip_address} (${registration.network_type})`);
    console.log(`   WiFi Network: ${registration.wifi_ssid}`);
    console.log(`   Signal Strength: ${registration.signal_strength} dBm`);
    console.log(`   Firmware: ${registration.firmware_version}`);
    
    // Validate required fields
    if (!registration.device_id || !registration.ip_address || !registration.mac_address) {
      console.log('❌ Invalid registration data - missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: device_id, ip_address, mac_address' },
        { status: 400 }
      );
    }
    
    // Load existing registry
    const registry = loadRegistry();
    
    // Check if this is a known collar or new registration
    const existingCollar = registry.collars[registration.device_id];
    const isNewRegistration = !existingCollar;
    const ipChanged = existingCollar && existingCollar.ip_address !== registration.ip_address;
    
    // Create or update collar entry
    const now = new Date().toISOString();
    const collarEntry = {
      ...registration,
      last_seen: now,
      last_heartbeat: now,
      connection_history: existingCollar?.connection_history || []
    };
    
    // Add connection history entry
    collarEntry.connection_history.push({
      timestamp: now,
      ip_address: registration.ip_address,
      network_type: registration.network_type,
      event: isNewRegistration ? 'registered' : (ipChanged ? 'ip_change' : 'heartbeat')
    });
    
    // Keep only last 50 connection history entries
    if (collarEntry.connection_history.length > 50) {
      collarEntry.connection_history = collarEntry.connection_history.slice(-50);
    }
    
    // Update registry
    registry.collars[registration.device_id] = collarEntry;
    saveRegistry(registry);
    
    // Update collar configuration for auto-discovery
    updateCollarConfig(registration);
    
    // Log registration status
    if (isNewRegistration) {
      console.log(`🎉 New collar registered: ${registration.device_id}`);
    } else if (ipChanged) {
      console.log(`🔄 Collar IP changed: ${registration.device_id} (${existingCollar.ip_address} → ${registration.ip_address})`);
    } else {
      console.log(`♻️ Collar re-registered: ${registration.device_id}`);
    }
    
    // Broadcast collar discovery event (if needed for real-time updates)
    // You could add WebSocket broadcasting here
    
    // Return success response
    const response = {
      status: 'success',
      message: isNewRegistration ? 'Collar registered successfully' : 'Collar updated successfully',
      device_registered: true,
      device_id: registration.device_id,
      assigned_ip: registration.ip_address,
      network_type: registration.network_type,
      endpoints: registration.endpoints,
      server_time: now,
      registration_type: isNewRegistration ? 'new' : (ipChanged ? 'ip_update' : 'refresh')
    };
    
    console.log('✅ Registration processed successfully');
    
    return NextResponse.json(response, { status: 201 });
    
  } catch (error) {
    console.error('❌ Collar registration error:', error);
    
    return NextResponse.json(
      { 
        error: 'Registration failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve registered collars
export async function GET() {
  try {
    const registry = loadRegistry();
    
    // Filter active collars (seen in last 5 minutes)
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const activeCollars = Object.entries(registry.collars)
      .filter(([_, collar]) => collar.last_seen > fiveMinutesAgo)
      .reduce((acc, [id, collar]) => {
        acc[id] = collar;
        return acc;
      }, {} as Record<string, any>);
    
    console.log(`📊 Returning ${Object.keys(activeCollars).length} active collars`);
    
    return NextResponse.json({
      active_collars: activeCollars,
      total_registered: Object.keys(registry.collars).length,
      active_count: Object.keys(activeCollars).length,
      last_updated: registry.last_updated
    });
    
  } catch (error) {
    console.error('❌ Error retrieving collar registry:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve collars' },
      { status: 500 }
    );
  }
} 