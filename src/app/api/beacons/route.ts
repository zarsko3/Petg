import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

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

// Legacy beacon configuration interface (for migration)
interface LegacyBeaconConfiguration {
  id: string;
  name: string;
  location: string;
  zone?: string;
  macAddress?: string;
  alertMode: 'none' | 'buzzer' | 'vibration' | 'both';
  proximityThreshold: number;
  alertDelay: number;
  alertTimeout: number;
  safeZone: boolean;
  boundaryAlert: boolean;
  position: { x: number; y: number };
  isAutoDetected?: boolean;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
  status?: 'online' | 'offline' | 'low-battery';
  createdAt?: string;
  updatedAt?: string;
}

// Path to beacon configurations file
const BEACON_CONFIG_FILE = path.join(process.cwd(), 'data', 'beacon-configurations.json');

// Migration function to convert legacy configurations
function migrateLegacyConfiguration(legacy: LegacyBeaconConfiguration): BeaconConfiguration {
  console.log(`🔄 Migrating legacy beacon configuration: ${legacy.name}`);
  
  // Convert RSSI threshold to distance (approximate)
  const triggerDistance = Math.max(2, Math.min(20, rssiToDistance(legacy.proximityThreshold)));
  
  return {
    ...legacy,
    proximitySettings: {
      triggerDistance: triggerDistance,
      alertDuration: legacy.alertTimeout || 2000,
      alertIntensity: 3, // Default medium intensity
      enableProximityDelay: legacy.alertDelay > 0,
      proximityDelayTime: legacy.alertDelay || 0,
      cooldownPeriod: 3000 // Default 3 second cooldown
    },
    // Keep legacy fields for backward compatibility
    proximityThreshold: legacy.proximityThreshold,
    alertDelay: legacy.alertDelay,
    alertTimeout: legacy.alertTimeout,
    updatedAt: new Date().toISOString()
  };
}

// Check if configuration needs migration
function needsMigration(config: any): config is LegacyBeaconConfiguration {
  return config && typeof config === 'object' && !config.proximitySettings;
}

// Load beacon configurations from file with automatic migration
async function loadBeaconConfigurations(): Promise<BeaconConfiguration[]> {
  try {
    const fileContent = await fs.readFile(BEACON_CONFIG_FILE, 'utf-8');
    const configs = JSON.parse(fileContent);
    
    let migrationPerformed = false;
    const migratedConfigs = configs.map((config: any) => {
      if (needsMigration(config)) {
        migrationPerformed = true;
        return migrateLegacyConfiguration(config);
      }
      return config as BeaconConfiguration;
    });
    
    // If migration was performed, save the updated configurations
    if (migrationPerformed) {
      console.log(`✅ Migration completed for ${migratedConfigs.length} beacon configurations`);
      await saveBeaconConfigurations(migratedConfigs);
    }
    
    return migratedConfigs;
  } catch (error) {
    if ((error as any).code === 'ENOENT') {
      console.log('📁 No existing beacon configurations file found, starting with empty array');
      return [];
    }
    console.error('❌ Failed to load beacon configurations:', error);
    return [];
  }
}

// Save beacon configurations to file
async function saveBeaconConfigurations(configs: BeaconConfiguration[]): Promise<void> {
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(BEACON_CONFIG_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    
    // Save configurations with pretty formatting
    await fs.writeFile(BEACON_CONFIG_FILE, JSON.stringify(configs, null, 2), 'utf-8');
    console.log(`💾 Saved ${configs.length} beacon configurations to file`);
  } catch (error) {
    console.error('❌ Failed to save beacon configurations:', error);
    throw error;
  }
}

// In-memory storage for demo purposes
// This will be loaded from file on startup
let beaconConfigurations: BeaconConfiguration[] = [];

// Initialize configurations from file
let isInitialized = false;
async function initializeConfigurations() {
  if (!isInitialized) {
    beaconConfigurations = await loadBeaconConfigurations();
    isInitialized = true;
  }
}

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

// In-memory store for beacon detections (in production, use a database)
interface BeaconDetection {
  id: string;
  name: string;
  rssi: number;
  distance: number;
  address?: string;
  collarId: string;
  timestamp: number;
  batteryLevel?: number;
  location?: {
    x: number;
    y: number;
    room?: string;
  };
}

interface BeaconSummary {
  id: string;
  name: string;
  lastSeen: number;
  detectionCount: number;
  averageRSSI: number;
  averageDistance: number;
  detectingCollars: string[];
  location?: {
    x: number;
    y: number;
    room?: string;
  };
}

// Global store (in production, replace with Redis or database)
const beaconDetections: BeaconDetection[] = [];
const MAX_DETECTIONS = 1000; // Keep last 1000 detections

// Helper function to calculate distance from RSSI
function calculateDistance(rssi: number): number {
  if (rssi === 0) return -1;
  
  const ratio = rssi / -59; // -59 dBm at 1 meter
  if (ratio < 1.0) {
    return Math.pow(ratio, 10);
  } else {
    const accuracy = (0.89976) * Math.pow(ratio, 7.7095) + 0.111;
    return accuracy;
  }
}

// GET: Fetch current beacon detections
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get('format') || 'summary';
    const collarId = searchParams.get('collar');
    const limit = parseInt(searchParams.get('limit') || '50');
    const maxAge = parseInt(searchParams.get('maxAge') || '300000'); // 5 minutes default
    
    const now = Date.now();
    
    // Filter recent detections
    const recentDetections = beaconDetections.filter(detection => 
      now - detection.timestamp < maxAge &&
      (!collarId || detection.collarId === collarId)
    );
    
    if (format === 'raw') {
      // Return raw detection data
      return NextResponse.json({
        success: true,
        data: recentDetections.slice(-limit),
        total: recentDetections.length,
        timestamp: now
      });
    }
    
    // Return summarized beacon data (default)
    const beaconSummary = new Map<string, BeaconSummary>();
    
    recentDetections.forEach(detection => {
      const beaconId = detection.address || detection.id;
      
      if (!beaconSummary.has(beaconId)) {
        beaconSummary.set(beaconId, {
          id: beaconId,
          name: detection.name,
          lastSeen: detection.timestamp,
          detectionCount: 0,
          averageRSSI: 0,
          averageDistance: 0,
          detectingCollars: [],
          location: detection.location
        });
      }
      
      const summary = beaconSummary.get(beaconId)!;
      summary.detectionCount++;
      summary.lastSeen = Math.max(summary.lastSeen, detection.timestamp);
      
      // Calculate running averages
      summary.averageRSSI = (summary.averageRSSI * (summary.detectionCount - 1) + detection.rssi) / summary.detectionCount;
      summary.averageDistance = (summary.averageDistance * (summary.detectionCount - 1) + detection.distance) / summary.detectionCount;
      
      // Track unique collars
      if (!summary.detectingCollars.includes(detection.collarId)) {
        summary.detectingCollars.push(detection.collarId);
      }
    });
    
    const beacons = Array.from(beaconSummary.values())
      .sort((a, b) => b.lastSeen - a.lastSeen)
      .slice(0, limit);
    
    return NextResponse.json({
      success: true,
      data: beacons,
      total: beacons.length,
      activeBeacons: beacons.filter(b => now - b.lastSeen < 60000).length, // Active in last minute
      timestamp: now,
      metadata: {
        totalDetections: recentDetections.length,
        uniqueBeacons: beaconSummary.size,
        dataMaxAge: maxAge
      }
    });
    
  } catch (error) {
    console.error('❌ Beacon API GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch beacon data',
        timestamp: Date.now() 
      },
      { status: 500 }
    );
  }
}

// POST: Receive beacon detections from collars
export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const timestamp = Date.now();
    
    console.log('📡 Received beacon data from collar:', data);
    
    // Handle single detection or batch
    const detections = Array.isArray(data.beacons) ? data.beacons : [data];
    
    for (const detection of detections) {
      // Validate required fields
      if (!detection.name && !detection.address) {
        console.warn('⚠️ Skipping beacon without name or address:', detection);
        continue;
      }
      
      const beaconDetection: BeaconDetection = {
        id: detection.id || detection.address || detection.name,
        name: detection.name || 'Unknown Beacon',
        rssi: detection.rssi || 0,
        distance: detection.distance || calculateDistance(detection.rssi || 0),
        address: detection.address,
        collarId: data.collarId || data.device_id || 'unknown',
        timestamp: detection.timestamp || timestamp,
        batteryLevel: data.battery_level,
        location: detection.location || data.location
      };
      
      // Add to store
      beaconDetections.push(beaconDetection);
      
      console.log(`📍 Beacon detected: ${beaconDetection.name} (${beaconDetection.rssi}dBm, ${beaconDetection.distance.toFixed(1)}m) by collar ${beaconDetection.collarId}`);
    }
    
    // Cleanup old detections
    if (beaconDetections.length > MAX_DETECTIONS) {
      const toRemove = beaconDetections.length - MAX_DETECTIONS;
      beaconDetections.splice(0, toRemove);
      console.log(`🧹 Cleaned up ${toRemove} old beacon detections`);
    }
    
    return NextResponse.json({
      success: true,
      message: 'Beacon detections processed successfully',
      processed: detections.length,
      total: beaconDetections.length,
      timestamp: timestamp
    });
    
  } catch (error) {
    console.error('❌ Beacon API POST error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to process beacon detections',
        timestamp: Date.now() 
      },
      { status: 500 }
    );
  }
}

// DELETE: Clear beacon data (for testing)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const olderThan = parseInt(searchParams.get('olderThan') || '0');
    
    if (olderThan > 0) {
      const cutoff = Date.now() - olderThan;
      const originalLength = beaconDetections.length;
      beaconDetections.splice(0, beaconDetections.findIndex(d => d.timestamp > cutoff));
      const removed = originalLength - beaconDetections.length;
      
      return NextResponse.json({
        success: true,
        message: `Removed ${removed} beacon detections older than ${olderThan}ms`,
        remaining: beaconDetections.length
      });
    } else {
      // Clear all
      const removed = beaconDetections.length;
      beaconDetections.length = 0;
      
      return NextResponse.json({
        success: true,
        message: `Cleared all ${removed} beacon detections`
      });
    }
    
  } catch (error) {
    console.error('❌ Beacon API DELETE error:', error);
    return NextResponse.json(
      { error: 'Failed to clear beacon data' },
      { status: 500 }
    );
  }
}

// POST - Create new beacon configuration
export async function POST_BEACON_CONFIG(request: NextRequest) {
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

    // Initialize configurations from file first
    await initializeConfigurations();

    // Add to storage
    beaconConfigurations.push(newConfig);

    // Save to file
    await saveBeaconConfigurations(beaconConfigurations);

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

    // Initialize configurations from file first
    await initializeConfigurations();

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

    // Save to file
    await saveBeaconConfigurations(beaconConfigurations);

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
export async function DELETE_BEACON_CONFIG(request: NextRequest) {
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

    // Initialize configurations from file first
    await initializeConfigurations();

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

    // Save to file
    await saveBeaconConfigurations(beaconConfigurations);

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