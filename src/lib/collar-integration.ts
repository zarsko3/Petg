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
  private wsUrl: string = '';
  private udpDiscoverySocket: WebSocket | null = null;
  private connection: CollarConnection = {
    ipAddress: '',
    port: 80,
    connected: false,
    lastPing: 0
  };

  // Auto-initialize with UDP broadcast discovery
  async autoInit(): Promise<void> {
    // Clear stale addresses on start
    localStorage.removeItem('petg.wsUrl');
    localStorage.removeItem('petg.ipPool');

    // Always listen to UDP broadcasts
    this.discoverCollarUDP(({ data }) => {
      try {
        const { ws } = JSON.parse(data);          // "ws://192.168.1.35:8080"
        if (ws) {
          localStorage.setItem('petg.wsUrl', ws);
          
          // Try connection with catch for retry logic
          this.connectToCollar(ws).catch(() => {
            localStorage.removeItem('petg.wsUrl');
            this.retryUntilFound();          // UDP scan every 3 s
          });
        }
      } catch (error) {
        // Ignore invalid UDP packets
      }
    });

    // Start retry logic for UDP scanning
    this.retryUntilFound();
  }

  // UDP discovery for collar broadcasts
  private discoverCollarUDP(handlePacket: (event: MessageEvent) => void): void {
    // Only connect to discovery WebSocket if NEXT_PUBLIC_DISCOVERY_WS_URL is set
    const discoveryWsUrl = process.env.NEXT_PUBLIC_DISCOVERY_WS_URL;
    if (typeof window !== 'undefined' && discoveryWsUrl) {
      try {
        const discoveryWs = new WebSocket(discoveryWsUrl);
        this.udpDiscoverySocket = discoveryWs;
        
        discoveryWs.onopen = () => {
          // Ignore connection open
        };
        
        discoveryWs.onmessage = handlePacket;
        
        discoveryWs.onerror = (error) => {
          // Ignore discovery service not available
        };
        
        discoveryWs.onclose = () => {
          // Ignore discovery service disconnected
        };
      } catch (error) {
        // Ignore connection to discovery service
      }
    }
  }

  // Retry discovery until found - UDP scan every 3 seconds
  private retryUntilFound(): void {
    const retryInterval = setInterval(() => {
      // Check if we got a connection via UDP
      if (this.wsUrl && this.connection.connected) {
        clearInterval(retryInterval);
      }
    }, 3000); // UDP scan every 3 seconds
  }

  // Discovery method - now relies only on UDP broadcasts
  async discoverCollar(): Promise<CollarConnection | null> {
    // Return null - discovery happens via UDP broadcasts
    return null;
  }

  // Connect to collar with clean fallback if cached URL is dead
  async connectToCollar(url: string): Promise<boolean> {
    try {
      // Try to open WebSocket connection
      await this.openWebSocket(url);
      
      // If we get here, connection was successful
      this.wsUrl = url;
      return true;
      
    } catch (error) {
      // connection failed – forget the stale URL and try UDP again
      localStorage.removeItem('petg.wsUrl');
      this.wsUrl = '';
      this.connection.connected = false;
      
      // Start UDP scan retry
      this.retryUntilFound();          // UDP scan every 3 s
      
      throw error; // Re-throw to allow caller to handle
    }
  }

  // Open WebSocket connection (resolves on WS "open")
  private async openWebSocket(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Handle WebSocket URL format
      if (url.startsWith('ws://')) {
        this.wsUrl = url;
        
        // Extract IP for HTTP verification first
        const match = url.match(/ws:\/\/([^:]+):/);
        if (match) {
          const ipAddress = match[1];
          this.baseUrl = `http://${ipAddress}:80`;
          
          // Test HTTP endpoint first to verify collar is available
          fetch(`${this.baseUrl}/data`, {
            method: 'GET',
            signal: AbortSignal.timeout(5000)
          })
          .then(response => {
            if (response.ok) {
              return response.json();
            }
            throw new Error(`HTTP ${response.status}`);
          })
          .then(data => {
            // HTTP connection successful, update connection info
            this.connection = {
              ipAddress,
              port: 80,
              connected: true,
              lastPing: Date.now()
            };
            
            // Store WebSocket URL
            if (typeof window !== 'undefined') {
              localStorage.setItem('petg.wsUrl', this.wsUrl);
            }
            
            resolve();
          })
          .catch(error => {
            reject(error);
          });
        } else {
          reject(new Error('Invalid WebSocket URL format'));
        }
      } else {
        // Handle IP address format - convert to WebSocket URL
        const ipAddress = url;
        // 🔒 SECURITY FIX: Use WSS when served over HTTPS to prevent mixed-content blocking
        const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        this.wsUrl = `${protocol}//${ipAddress}:8080`;
        this.baseUrl = `http://${ipAddress}:80`;
        
        // Test HTTP endpoint
        fetch(`${this.baseUrl}/data`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        })
        .then(response => {
          if (response.ok) {
            return response.json();
          }
          throw new Error(`HTTP ${response.status}`);
        })
        .then(data => {
          this.connection = {
            ipAddress,
            port: 80,
            connected: true,
            lastPing: Date.now()
          };
          
          // Store WebSocket URL
          if (typeof window !== 'undefined') {
            localStorage.setItem('petg.wsUrl', this.wsUrl);
          }
          
          resolve();
        })
        .catch(error => {
          reject(error);
        });
      }
    });
  }

  // Send zone configuration to collar
  async uploadZoneConfig(zoneConfig: CollarZoneConfig): Promise<boolean> {
    if (!this.connection.connected) {
      throw new Error('Not connected to collar. Call discoverCollar() or connectToCollar() first.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/zones/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zoneConfig)
      });

      if (response.ok) {
        const result = await response.json();
        return true;
      } else {
        const error = await response.json();
        return false;
      }
    } catch (error) {
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
      this.connection.connected = false;
      return null;
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
        return true;
      }
    } catch (error) {
      return false;
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
      this.connection.connected = false;
      return null;
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
      return null;
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
      return false;
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

  // Auto-initialize collar on mount
  React.useEffect(() => {
    const init = async () => {
      try {
        await collarIntegration.autoInit();
        setConnection(collarIntegration.getConnection());
      } catch (error) {
        // Ignore auto-init failure
      }
    };

    init();
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
    // Convert IP to WebSocket URL if needed
    const wsUrl = ipAddress.startsWith('ws://') ? ipAddress : `ws://${ipAddress}:8080`;
    const success = await collarIntegration.connectToCollar(wsUrl);
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