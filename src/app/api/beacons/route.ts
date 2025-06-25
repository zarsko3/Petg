import { NextRequest, NextResponse } from 'next/server';

// Enhanced Beacon Configuration interface with Live Proximity Alerts
export interface BeaconConfiguration {
  id: string;
  name: string;
  location: string;
  zone?: string;
  macAddress?: string;
  
  // Live Alert Configuration
  alertMode: 'none' | 'buzzer' | 'vibration' | 'both';
  proximitySettings: {
    triggerDistance: number; // Distance in cm (e.g., 2, 5, 10, 20)
    alertDuration: number;   // Alert duration in milliseconds (e.g., 2000 = 2 seconds)
    alertIntensity: number;  // Alert intensity 1-5 (for buzzer volume/vibration strength)
    
    // Proximity Delay Mode (reduces false positives)
    enableProximityDelay: boolean;
    proximityDelayTime: number; // Time in milliseconds to stay within range before triggering
    cooldownPeriod: number;     // Minimum time between alerts in milliseconds
  };
  
  // Legacy fields (keeping for backward compatibility)
  proximityThreshold: number; // Maps to triggerDistance for RSSI conversion
  alertDelay: number;         // Maps to proximityDelayTime
  alertTimeout: number;       // Maps to alertDuration
  
  // Zone and positioning
  safeZone: boolean;
  boundaryAlert: boolean;
  position: { x: number; y: number };
  
  // Status and metadata
  isAutoDetected?: boolean;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
  status?: 'online' | 'offline' | 'low-battery';
  createdAt?: string;
  updatedAt?: string;
}

// In-memory storage for demo purposes
// In production, this would be stored in a database
let beaconConfigurations: BeaconConfiguration[] = [];

// Helper function to convert distance (cm) to approximate RSSI threshold
function distanceToRSSI(distanceCm: number): number {
  // Empirical formula for BLE beacon RSSI based on distance
  // RSSI ≈ -40 - 20 * log10(distance_in_meters)
  const distanceMeters = distanceCm / 100;
  const rssi = -40 - 20 * Math.log10(distanceMeters);
  return Math.max(-100, Math.min(-30, Math.round(rssi))); // Clamp to reasonable range
}

// Helper function to convert RSSI to approximate distance (cm)
function rssiToDistance(rssi: number): number {
  // Inverse of above formula
  const distanceMeters = Math.pow(10, (rssi + 40) / -20);
  return Math.max(1, Math.round(distanceMeters * 100)); // Minimum 1cm
}

// Utility function to find collar IP for syncing configurations
async function getCollarIP(): Promise<string | null> {
  try {
    // Use the collar-proxy API to get collar IP
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/collar-proxy?endpoint=/api/discover`);
    
    if (!response.ok) {
      console.warn('Failed to discover collar IP via proxy:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.local_ip || data.ip_address || null;
  } catch (error) {
    console.warn('Failed to discover collar IP:', error);
    return null;
  }
}

// Sync configuration to collar via WebSocket
async function syncToCollar(config: BeaconConfiguration): Promise<boolean> {
  try {
    const collarIP = await getCollarIP();
    if (!collarIP) {
      console.warn('⚠️ Cannot sync to collar: IP not found');
      return false;
    }

    // Send configuration to collar via WebSocket
    const ws = new WebSocket(`ws://${collarIP}:8080`);
    
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        ws.close();
        resolve(false);
      }, 3000);

      ws.onopen = () => {
        const command = {
          command: 'update_beacon_config',
          beacon_id: config.id,
          config: {
            name: config.name,
            alert_mode: config.alertMode,
            
            // New proximity-based configuration
            trigger_distance_cm: config.proximitySettings.triggerDistance,
            alert_duration_ms: config.proximitySettings.alertDuration,
            alert_intensity: config.proximitySettings.alertIntensity,
            enable_proximity_delay: config.proximitySettings.enableProximityDelay,
            proximity_delay_ms: config.proximitySettings.proximityDelayTime,
            cooldown_period_ms: config.proximitySettings.cooldownPeriod,
            
            // Legacy fields for backward compatibility
            proximity_threshold: config.proximityThreshold,
            alert_delay: config.alertDelay,
            alert_timeout: config.alertTimeout,
            
            // Zone settings
            safe_zone: config.safeZone,
            boundary_alert: config.boundaryAlert
          }
        };

        ws.send(JSON.stringify(command));
        console.log(`📡 Synced enhanced beacon config to collar: ${config.name} (${config.proximitySettings.triggerDistance}cm, ${config.alertMode})`);
      };

      ws.onmessage = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(true);
      };

      ws.onerror = () => {
        clearTimeout(timeout);
        ws.close();
        resolve(false);
      };
    });
  } catch (error) {
    console.error('Failed to sync to collar:', error);
    return false;
  }
}

// GET - Retrieve all beacon configurations
export async function GET(request: NextRequest) {
  try {
    console.log('📋 GET /api/beacons - Retrieving all configurations');

    return NextResponse.json({
      success: true,
      data: beaconConfigurations,
      count: beaconConfigurations.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Failed to retrieve beacon configurations:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to retrieve beacon configurations',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// POST - Create new beacon configuration
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('➕ POST /api/beacons - Creating new configuration:', body.name);

    // Validate required fields
    if (!body.name || !body.location) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
        message: 'Name and location are required'
      }, { status: 400 });
    }

    // Check for duplicate names
    const existingConfig = beaconConfigurations.find(config => 
      config.name === body.name || 
      (body.macAddress && config.macAddress === body.macAddress)
    );

    if (existingConfig) {
      return NextResponse.json({
        success: false,
        error: 'Duplicate configuration',
        message: 'A beacon with this name or MAC address already exists'
      }, { status: 409 });
    }

    // Create new configuration
    const newConfig: BeaconConfiguration = {
      id: body.id || `beacon-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: body.name,
      location: body.location,
      zone: body.zone || '',
      macAddress: body.macAddress || '',
      alertMode: body.alertMode || 'buzzer',
      
      // New proximity settings with smart defaults
      proximitySettings: body.proximitySettings || {
        triggerDistance: 5,        // Default 5cm trigger distance
        alertDuration: 2000,       // Default 2 second alert duration
        alertIntensity: 3,         // Default medium intensity (1-5 scale)
        enableProximityDelay: false, // Default disabled for immediate alerts
        proximityDelayTime: 0,     // No delay by default
        cooldownPeriod: 3000       // 3 second cooldown between alerts
      },
      
      // Legacy fields for backward compatibility
      proximityThreshold: body.proximityThreshold || -65,
      alertDelay: body.alertDelay || 3000,
      alertTimeout: body.alertTimeout || 10000,
      
      safeZone: body.safeZone || false,
      boundaryAlert: body.boundaryAlert || false,
      position: body.position || { x: 50, y: 50 },
      isAutoDetected: body.isAutoDetected || false,
      lastSeen: body.lastSeen,
      batteryLevel: body.batteryLevel,
      signalStrength: body.signalStrength,
      status: body.status || 'offline',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Add to storage
    beaconConfigurations.push(newConfig);

    // Attempt to sync to collar
    const collarUpdated = await syncToCollar(newConfig);

    console.log(`✅ Created beacon configuration: ${newConfig.name} (collar sync: ${collarUpdated})`);

    return NextResponse.json({
      success: true,
      data: newConfig,
      collarUpdated,
      message: `Beacon configuration created${collarUpdated ? ' and synced to collar' : ''}`
    });
  } catch (error) {
    console.error('❌ Failed to create beacon configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create beacon configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT - Update existing beacon configuration
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('✏️ PUT /api/beacons - Updating configuration:', body.id);

    if (!body.id) {
      return NextResponse.json({
        success: false,
        error: 'Missing ID',
        message: 'Beacon ID is required for updates'
      }, { status: 400 });
    }

    const configIndex = beaconConfigurations.findIndex(config => config.id === body.id);
    
    if (configIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found',
        message: 'No beacon configuration found with the provided ID'
      }, { status: 404 });
    }

    // Update configuration
    const updatedConfig: BeaconConfiguration = {
      ...beaconConfigurations[configIndex],
      ...body,
      updatedAt: new Date().toISOString()
    };

    beaconConfigurations[configIndex] = updatedConfig;

    // Attempt to sync to collar
    const collarUpdated = await syncToCollar(updatedConfig);

    console.log(`✅ Updated beacon configuration: ${updatedConfig.name} (collar sync: ${collarUpdated})`);

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      collarUpdated,
      message: `Beacon configuration updated${collarUpdated ? ' and synced to collar' : ''}`
    });
  } catch (error) {
    console.error('❌ Failed to update beacon configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update beacon configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Remove beacon configuration
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    console.log('🗑️ DELETE /api/beacons - Removing configuration:', id);

    if (!id) {
      return NextResponse.json({
        success: false,
        error: 'Missing ID',
        message: 'Beacon ID is required for deletion'
      }, { status: 400 });
    }

    const configIndex = beaconConfigurations.findIndex(config => config.id === id);
    
    if (configIndex === -1) {
      return NextResponse.json({
        success: false,
        error: 'Configuration not found',
        message: 'No beacon configuration found with the provided ID'
      }, { status: 404 });
    }

    // Get config before deletion for logging
    const deletedConfig = beaconConfigurations[configIndex];

    // Remove from storage
    beaconConfigurations.splice(configIndex, 1);

    // Send deletion command to collar
    try {
      const collarIP = await getCollarIP();
      if (collarIP) {
        const ws = new WebSocket(`ws://${collarIP}:8080`);
        ws.onopen = () => {
          const command = {
            command: 'remove_beacon_config',
            beacon_id: id
          };
          ws.send(JSON.stringify(command));
          setTimeout(() => ws.close(), 1000);
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to sync deletion to collar:', error);
    }

    console.log(`✅ Deleted beacon configuration: ${deletedConfig.name}`);

    return NextResponse.json({
      success: true,
      message: 'Beacon configuration deleted successfully',
      deletedConfig: deletedConfig.name
    });
  } catch (error) {
    console.error('❌ Failed to delete beacon configuration:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete beacon configuration',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// OPTIONS - Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  });
} 