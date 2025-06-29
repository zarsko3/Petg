import { NextRequest, NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

// Import the BeaconConfiguration interface and utility functions from the main route
interface BeaconConfiguration {
  id: string;
  name: string;
  location: string;
  zone?: string;
  macAddress?: string;
  alertMode: 'none' | 'buzzer' | 'vibration' | 'both';
  proximitySettings: {
    triggerDistance: number;
    alertDuration: number;
    alertIntensity: number;
    enableProximityDelay: boolean;
    proximityDelayTime: number;
    cooldownPeriod: number;
  };
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

interface BatchOperation {
  type: 'update' | 'delete' | 'template';
  beaconIds: string[];
  data?: Partial<BeaconConfiguration>;
}

// Path to beacon configurations file
const BEACON_CONFIG_FILE = path.join(process.cwd(), 'data', 'beacon-configurations.json');

// Load beacon configurations from file
async function loadBeaconConfigurations(): Promise<BeaconConfiguration[]> {
  try {
    const fileContent = await fs.readFile(BEACON_CONFIG_FILE, 'utf-8');
    return JSON.parse(fileContent);
  } catch (error) {
    console.error('❌ Failed to load beacon configurations:', error);
    return [];
  }
}

// Save beacon configurations to file
async function saveBeaconConfigurations(configs: BeaconConfiguration[]): Promise<void> {
  try {
    const dataDir = path.dirname(BEACON_CONFIG_FILE);
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(BEACON_CONFIG_FILE, JSON.stringify(configs, null, 2), 'utf-8');
    console.log(`💾 Saved ${configs.length} beacon configurations to file`);
  } catch (error) {
    console.error('❌ Failed to save beacon configurations:', error);
    throw error;
  }
}

// Utility function to get collar IP for syncing configurations
async function getCollarIP(): Promise<string | null> {
  try {
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
            trigger_distance_cm: config.proximitySettings.triggerDistance,
            alert_duration_ms: config.proximitySettings.alertDuration,
            alert_intensity: config.proximitySettings.alertIntensity,
            enable_proximity_delay: config.proximitySettings.enableProximityDelay,
            proximity_delay_ms: config.proximitySettings.proximityDelayTime,
            cooldown_period_ms: config.proximitySettings.cooldownPeriod,
            safe_zone: config.safeZone,
            boundary_alert: config.boundaryAlert
          }
        };

        ws.send(JSON.stringify(command));
        console.log(`📡 Synced batch beacon config to collar: ${config.name}`);
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

// POST - Perform batch operations on beacon configurations
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const operation: BatchOperation = body;
    
    console.log(`🔄 POST /api/beacons/batch - ${operation.type} operation on ${operation.beaconIds.length} beacons`);

    if (!operation.type || !operation.beaconIds || !Array.isArray(operation.beaconIds)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid batch operation',
        message: 'Missing or invalid operation type or beacon IDs'
      }, { status: 400 });
    }

    // Load current configurations
    let configurations = await loadBeaconConfigurations();
    let updatedConfigs: BeaconConfiguration[] = [];
    let collarSyncResults: boolean[] = [];

    switch (operation.type) {
      case 'update':
        if (!operation.data) {
          return NextResponse.json({
            success: false,
            error: 'Missing update data',
            message: 'Update operation requires data field'
          }, { status: 400 });
        }

        for (const beaconId of operation.beaconIds) {
          const configIndex = configurations.findIndex(c => c.id === beaconId);
          if (configIndex !== -1) {
            const updatedConfig = {
              ...configurations[configIndex],
              ...operation.data,
              updatedAt: new Date().toISOString()
            };
            configurations[configIndex] = updatedConfig;
            updatedConfigs.push(updatedConfig);

            // Sync to collar
            const collarUpdated = await syncToCollar(updatedConfig);
            collarSyncResults.push(collarUpdated);
          }
        }
        break;

      case 'delete':
        const beforeCount = configurations.length;
        configurations = configurations.filter(c => !operation.beaconIds.includes(c.id));
        const deletedCount = beforeCount - configurations.length;
        
        // Send deletion commands to collar
        for (const beaconId of operation.beaconIds) {
          try {
            const collarIP = await getCollarIP();
            if (collarIP) {
              const ws = new WebSocket(`ws://${collarIP}:8080`);
              ws.onopen = () => {
                const command = {
                  command: 'remove_beacon_config',
                  beacon_id: beaconId
                };
                ws.send(JSON.stringify(command));
                setTimeout(() => ws.close(), 1000);
              };
            }
          } catch (error) {
            console.warn('⚠️ Failed to sync deletion to collar:', error);
          }
        }

        console.log(`✅ Batch deleted ${deletedCount} beacon configurations`);
        break;

      case 'template':
        if (!operation.data) {
          return NextResponse.json({
            success: false,
            error: 'Missing template data',
            message: 'Template operation requires data field'
          }, { status: 400 });
        }

        for (const beaconId of operation.beaconIds) {
          const configIndex = configurations.findIndex(c => c.id === beaconId);
          if (configIndex !== -1) {
            const templatedConfig = {
              ...configurations[configIndex],
              ...operation.data,
              updatedAt: new Date().toISOString()
            };
            configurations[configIndex] = templatedConfig;
            updatedConfigs.push(templatedConfig);

            // Sync to collar
            const collarUpdated = await syncToCollar(templatedConfig);
            collarSyncResults.push(collarUpdated);
          }
        }
        break;

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation type',
          message: 'Operation type must be update, delete, or template'
        }, { status: 400 });
    }

    // Save updated configurations
    await saveBeaconConfigurations(configurations);

    const successfulSyncs = collarSyncResults.filter(Boolean).length;
    
    console.log(`✅ Batch operation completed: ${operation.type} on ${operation.beaconIds.length} beacons (${successfulSyncs} synced to collar)`);

    return NextResponse.json({
      success: true,
      operation: operation.type,
      affected: operation.beaconIds.length,
      updated: updatedConfigs.length,
      collarSyncs: successfulSyncs,
      data: updatedConfigs,
      message: `Batch ${operation.type} completed successfully`
    });

  } catch (error) {
    console.error('❌ Failed to perform batch operation:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to perform batch operation',
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
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    },
  });
} 