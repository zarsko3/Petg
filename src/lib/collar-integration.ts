// Collar Integration Module
// Connects the web app's zone drawing system to the collar firmware

import React from 'react';

export interface CollarZoneConfig {
  zones: Array<{
    id: string;
    name: string;
    points: Array<{ x: number; y: number }>;
    color: string;
    isComplete: boolean;
  }>;
}

export interface CollarZoneStatus {
  activeCount: number;
  currentStates: number;
  inAnyZone: boolean;
  positionValid: boolean;
  lastUpdate: number;
  currentZones: string[];
  recentTransitions: Array<{
    zoneId: string;
    zoneName: string;
    entered: boolean;
    timestamp: number;
    x: number;
    y: number;
  }>;
}

export interface CollarConnection {
  ipAddress: string;
  port: number;
  connected: boolean;
  lastPing: number;
}

class CollarIntegration {
  private baseUrl: string = '';
  private connection: CollarConnection = {
    ipAddress: '',
    port: 80,
    connected: false,
    lastPing: 0
  };

  // Auto-discover collar on local network
  async discoverCollar(): Promise<CollarConnection | null> {
    const commonIPs = [
      '192.168.1.100', '192.168.1.101', '192.168.1.102',
      '192.168.4.1',   // AP mode
      '10.0.0.100', '10.0.0.101'
    ];

    for (const ip of commonIPs) {
      try {
        const response = await fetch(`http://${ip}/data`, {
          method: 'GET',
          signal: AbortSignal.timeout(2000)
        });

        if (response.ok) {
          const data = await response.json();
          if (data.device_id && data.device_id.includes('PETCOLLAR')) {
            this.connection = {
              ipAddress: ip,
              port: 80,
              connected: true,
              lastPing: Date.now()
            };
            this.baseUrl = `http://${ip}`;
            console.log(`🐕 Found Pet Collar at ${ip}`);
            return this.connection;
          }
        }
      } catch (error) {
        // Continue searching
      }
    }

    console.log('❌ No Pet Collar found on local network');
    return null;
  }

  // Connect to collar with specific IP
  async connectToCollar(ipAddress: string, port: number = 80): Promise<boolean> {
    try {
      this.baseUrl = `http://${ipAddress}:${port}`;
      
      const response = await fetch(`${this.baseUrl}/data`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        const data = await response.json();
        this.connection = {
          ipAddress,
          port,
          connected: true,
          lastPing: Date.now()
        };
        console.log(`✅ Connected to Pet Collar at ${ipAddress}:${port}`);
        console.log(`📱 Device: ${data.device_id} (${data.firmware_version})`);
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to connect to collar:', error);
    }

    this.connection.connected = false;
    return false;
  }

  // Send zone configuration to collar
  async uploadZoneConfig(zoneConfig: CollarZoneConfig): Promise<boolean> {
    if (!this.connection.connected) {
      throw new Error('Not connected to collar. Call discoverCollar() or connectToCollar() first.');
    }

    try {
      console.log(`📤 Uploading ${zoneConfig.zones.length} zones to collar...`);
      
      const response = await fetch(`${this.baseUrl}/zones/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zoneConfig)
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`✅ Zone configuration uploaded successfully`);
        console.log(`📍 ${result.count} zones loaded on collar`);
        return true;
      } else {
        const error = await response.json();
        console.error('❌ Failed to upload zone config:', error.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Network error uploading zones:', error);
      return false;
    }
  }

  // Get current zone status from collar
  async getZoneStatus(): Promise<CollarZoneStatus | null> {
    if (!this.connection.connected) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/zones/status`);
      
      if (response.ok) {
        const status = await response.json();
        this.connection.lastPing = Date.now();
        return status;
      }
    } catch (error) {
      console.error('❌ Failed to get zone status:', error);
      this.connection.connected = false;
    }

    return null;
  }

  // Clear all zones on collar
  async clearAllZones(): Promise<boolean> {
    if (!this.connection.connected) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/zones/clear`, {
        method: 'POST'
      });

      if (response.ok) {
        console.log('🗑️ All zones cleared on collar');
        return true;
      }
    } catch (error) {
      console.error('❌ Failed to clear zones:', error);
    }

    return false;
  }

  // Get collar system data
  async getCollarData(): Promise<any> {
    if (!this.connection.connected) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/data`);
      
      if (response.ok) {
        const data = await response.json();
        this.connection.lastPing = Date.now();
        return data;
      }
    } catch (error) {
      console.error('❌ Failed to get collar data:', error);
      this.connection.connected = false;
    }

    return null;
  }

  // Send command to collar
  async sendCommand(command: string): Promise<string | null> {
    if (!this.connection.connected) {
      return null;
    }

    try {
      const response = await fetch(`${this.baseUrl}/command`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ command })
      });

      if (response.ok) {
        const result = await response.json();
        return result.message;
      }
    } catch (error) {
      console.error('❌ Failed to send command:', error);
    }

    return null;
  }

  // Get connection status
  getConnection(): CollarConnection {
    return { ...this.connection };
  }

  // Check if collar is connected
  isConnected(): boolean {
    return this.connection.connected;
  }

  // Ping collar to check connection
  async ping(): Promise<boolean> {
    if (!this.connection.connected) {
      return false;
    }

    try {
      const response = await fetch(`${this.baseUrl}/data`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000)
      });

      if (response.ok) {
        this.connection.lastPing = Date.now();
        return true;
      }
    } catch (error) {
      this.connection.connected = false;
    }

    return false;
  }

  // Convert DrawnZone[] to CollarZoneConfig
  static convertDrawnZonesToCollarConfig(drawnZones: any[]): CollarZoneConfig {
    return {
      zones: drawnZones.map(zone => ({
        id: zone.id,
        name: zone.name,
        points: zone.points.map((point: any) => ({
          x: point.x,
          y: point.y
        })),
        color: zone.color,
        isComplete: zone.isComplete
      }))
    };
  }
}

// Create singleton instance
export const collarIntegration = new CollarIntegration();

// React hook for collar integration
export function useCollarIntegration() {
  const [connection, setConnection] = React.useState<CollarConnection>({
    ipAddress: '',
    port: 80,
    connected: false,
    lastPing: 0
  });

  const [zoneStatus, setZoneStatus] = React.useState<CollarZoneStatus | null>(null);
  const [collarData, setCollarData] = React.useState<any>(null);

  // Auto-discover collar on mount
  React.useEffect(() => {
    const discover = async () => {
      const found = await collarIntegration.discoverCollar();
      if (found) {
        setConnection(found);
      }
    };

    discover();
  }, []);

  // Poll collar status every 5 seconds
  React.useEffect(() => {
    if (!connection.connected) return;

    const interval = setInterval(async () => {
      const status = await collarIntegration.getZoneStatus();
      const data = await collarIntegration.getCollarData();
      
      setZoneStatus(status);
      setCollarData(data);
      setConnection(collarIntegration.getConnection());
    }, 5000);

    return () => clearInterval(interval);
  }, [connection.connected]);

  const uploadZones = async (drawnZones: any[]) => {
    const config = CollarIntegration.convertDrawnZonesToCollarConfig(drawnZones);
    return await collarIntegration.uploadZoneConfig(config);
  };

  const connectToCollar = async (ipAddress: string, port?: number) => {
    const success = await collarIntegration.connectToCollar(ipAddress, port);
    setConnection(collarIntegration.getConnection());
    return success;
  };

  const sendCommand = async (command: string) => {
    return await collarIntegration.sendCommand(command);
  };

  return {
    connection,
    zoneStatus,
    collarData,
    uploadZones,
    connectToCollar,
    sendCommand,
    clearAllZones: () => collarIntegration.clearAllZones(),
    ping: () => collarIntegration.ping()
  };
}

export default CollarIntegration; 