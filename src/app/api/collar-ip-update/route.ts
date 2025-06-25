import { NextRequest, NextResponse } from 'next/server';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

// Types for IP update
interface CollarIPUpdate {
  device_id: string;
  ip_address: string;
  mac_address: string;
  network_type: 'static' | 'dhcp';
  gateway: string;
  subnet: string;
  wifi_ssid: string;
  signal_strength: number;
  timestamp: number;
  event_type: string;
}

interface CollarRegistry {
  collars: Record<string, any>;
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
  } catch (error) {
    console.error('❌ Failed to save collar registry:', error);
  }
}

// Update collar configuration for auto-discovery
function updateCollarConfig(deviceId: string, ipAddress: string, networkType: string): void {
  try {
    const config = {
      collar_ip: ipAddress,
      websocket_url: `ws://${ipAddress}:8080`,
      http_url: `http://${ipAddress}`,
      device_id: deviceId,
      status: 'connected',
      network_type: networkType,
      last_discovered: new Date().toISOString()
    };
    
    writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    console.log(`✅ Updated collar config for IP change: ${deviceId} → ${ipAddress}`);
  } catch (error) {
    console.error('❌ Failed to update collar config:', error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ipUpdate: CollarIPUpdate = await request.json();
    
    console.log('📍 Collar IP update request received:');
    console.log(`   Device ID: ${ipUpdate.device_id}`);
    console.log(`   New IP: ${ipUpdate.ip_address} (${ipUpdate.network_type})`);
    console.log(`   Gateway: ${ipUpdate.gateway}`);
    console.log(`   WiFi: ${ipUpdate.wifi_ssid} (${ipUpdate.signal_strength} dBm)`);
    
    // Validate required fields
    if (!ipUpdate.device_id || !ipUpdate.ip_address || !ipUpdate.mac_address) {
      console.log('❌ Invalid IP update data - missing required fields');
      return NextResponse.json(
        { error: 'Missing required fields: device_id, ip_address, mac_address' },
        { status: 400 }
      );
    }
    
    // Load existing registry
    const registry = loadRegistry();
    
    // Check if collar exists in registry
    const existingCollar = registry.collars[ipUpdate.device_id];
    if (!existingCollar) {
      console.log(`⚠️ IP update from unregistered collar: ${ipUpdate.device_id}`);
      return NextResponse.json(
        { 
          error: 'Collar not registered',
          message: 'Please register collar first before updating IP',
          action: 'register_required',
          device_id: ipUpdate.device_id
        },
        { status: 404 }
      );
    }
    
    // Store old IP for logging
    const oldIP = existingCollar.ip_address;
    const ipActuallyChanged = oldIP !== ipUpdate.ip_address;
    
    if (!ipActuallyChanged) {
      console.log(`📍 IP update received but IP unchanged: ${ipUpdate.device_id} (${ipUpdate.ip_address})`);
      return NextResponse.json({
        status: 'success',
        message: 'IP address unchanged',
        device_id: ipUpdate.device_id,
        ip_address: ipUpdate.ip_address,
        change_detected: false,
        server_time: new Date().toISOString()
      });
    }
    
    // Update collar with new IP information
    const now = new Date().toISOString();
    
    existingCollar.ip_address = ipUpdate.ip_address;
    existingCollar.network_type = ipUpdate.network_type;
    existingCollar.gateway = ipUpdate.gateway;
    existingCollar.subnet = ipUpdate.subnet;
    existingCollar.wifi_ssid = ipUpdate.wifi_ssid;
    existingCollar.signal_strength = ipUpdate.signal_strength;
    existingCollar.last_seen = now;
    existingCollar.last_ip_update = now;
    
    // Update endpoints with new IP
    if (existingCollar.endpoints) {
      existingCollar.endpoints.web_interface = `http://${ipUpdate.ip_address}`;
      existingCollar.endpoints.websocket = `ws://${ipUpdate.ip_address}:8080`;
      existingCollar.endpoints.api = `http://${ipUpdate.ip_address}/data`;
    } else {
      existingCollar.endpoints = {
        web_interface: `http://${ipUpdate.ip_address}`,
        websocket: `ws://${ipUpdate.ip_address}:8080`,
        api: `http://${ipUpdate.ip_address}/data`
      };
    }
    
    // Add to connection history
    existingCollar.connection_history = existingCollar.connection_history || [];
    existingCollar.connection_history.push({
      timestamp: now,
      ip_address: ipUpdate.ip_address,
      network_type: ipUpdate.network_type,
      event: 'ip_change',
      old_ip: oldIP,
      gateway: ipUpdate.gateway,
      wifi_ssid: ipUpdate.wifi_ssid,
      signal_strength: ipUpdate.signal_strength
    });
    
    // Keep only last 50 connection history entries
    if (existingCollar.connection_history.length > 50) {
      existingCollar.connection_history = existingCollar.connection_history.slice(-50);
    }
    
    // Save updated registry
    saveRegistry(registry);
    
    // Update collar configuration for auto-discovery
    updateCollarConfig(ipUpdate.device_id, ipUpdate.ip_address, ipUpdate.network_type);
    
    // Log the IP change
    console.log(`🔄 Collar IP updated: ${ipUpdate.device_id}`);
    console.log(`   Old IP: ${oldIP}`);
    console.log(`   New IP: ${ipUpdate.ip_address} (${ipUpdate.network_type})`);
    console.log(`   Gateway: ${ipUpdate.gateway}`);
    console.log(`   Network: ${ipUpdate.wifi_ssid} (${ipUpdate.signal_strength} dBm)`);
    
    // Prepare response
    const response = {
      status: 'success',
      message: 'IP address updated successfully',
      device_id: ipUpdate.device_id,
      old_ip: oldIP,
      new_ip: ipUpdate.ip_address,
      network_type: ipUpdate.network_type,
      change_detected: true,
      endpoints: existingCollar.endpoints,
      server_time: now,
      
      // Confirmation data
      updated_fields: {
        ip_address: ipUpdate.ip_address,
        network_type: ipUpdate.network_type,
        gateway: ipUpdate.gateway,
        subnet: ipUpdate.subnet,
        wifi_ssid: ipUpdate.wifi_ssid,
        signal_strength: ipUpdate.signal_strength
      }
    };
    
    console.log('✅ IP update processed successfully');
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('❌ Collar IP update error:', error);
    
    return NextResponse.json(
      { 
        error: 'IP update failed', 
        message: error instanceof Error ? error.message : 'Unknown error',
        status: 'error'
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve IP change history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('device_id');
    const limit = parseInt(searchParams.get('limit') || '10');
    
    const registry = loadRegistry();
    
    if (deviceId) {
      // Return IP change history for specific collar
      const collar = registry.collars[deviceId];
      if (!collar) {
        return NextResponse.json(
          { error: 'Collar not found' },
          { status: 404 }
        );
      }
      
      // Filter connection history for IP changes
      const ipChanges = (collar.connection_history || [])
        .filter((entry: any) => entry.event === 'ip_change')
        .slice(-limit)
        .reverse(); // Most recent first
      
      return NextResponse.json({
        device_id: deviceId,
        current_ip: collar.ip_address,
        network_type: collar.network_type,
        total_ip_changes: ipChanges.length,
        ip_change_history: ipChanges,
        last_ip_update: collar.last_ip_update || null
      });
      
    } else {
      // Return IP change summary for all collars
      const allIPChanges: any[] = [];
      
      Object.entries(registry.collars).forEach(([id, collar]) => {
        const ipChanges = (collar.connection_history || [])
          .filter((entry: any) => entry.event === 'ip_change')
          .slice(-5) // Last 5 changes per collar
          .map((entry: any) => ({
            ...entry,
            device_id: id
          }));
        
        allIPChanges.push(...ipChanges);
      });
      
      // Sort by timestamp, most recent first
      allIPChanges.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return NextResponse.json({
        total_collars: Object.keys(registry.collars).length,
        recent_ip_changes: allIPChanges.slice(0, limit),
        total_ip_changes: allIPChanges.length,
        last_updated: registry.last_updated
      });
    }
    
  } catch (error) {
    console.error('❌ Error retrieving IP change history:', error);
    
    return NextResponse.json(
      { error: 'Failed to retrieve IP change history' },
      { status: 500 }
    );
  }
} 