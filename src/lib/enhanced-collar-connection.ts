/**
 * Enhanced Collar Connection Service
 * 
 * Implements the multi-stage connection strategy:
 * 1. mDNS discovery (ws://petg-collar.local:8080)
 * 2. Cached IP from UDP broadcast
 * 3. Cloud relay (future implementation)
 */

export interface CollarConnectionResult {
  success: boolean;
  url?: string;
  method: 'mdns' | 'udp-cache' | 'cloud' | 'manual';
  ip?: string;
  hostname?: string;
  latency?: number;
  error?: string;
}

export interface CollarInfo {
  device_type: string;
  device_name: string;
  ip_address: string;
  mdns_hostname?: string;
  websocket_url: string;
  mdns_websocket_url?: string;
  firmware_version: string;
  mac_address: string;
  wifi_ssid: string;
  signal_strength: number;
  uptime: number;
  battery_percent: number;
  timestamp: number;
}

class EnhancedCollarConnection {
  private static instance: EnhancedCollarConnection;
  private cachedCollarInfo: CollarInfo | null = null;
  private lastUDPUpdate: number = 0;
  private udpCacheValidMs = 30000; // 30 seconds
  private connectionListeners: Array<(result: CollarConnectionResult) => void> = [];
  
  static getInstance(): EnhancedCollarConnection {
    if (!EnhancedCollarConnection.instance) {
      EnhancedCollarConnection.instance = new EnhancedCollarConnection();
    }
    return EnhancedCollarConnection.instance;
  }

  /**
   * Main connection method - tries all strategies in order
   */
  async connect(): Promise<CollarConnectionResult> {
    const startTime = Date.now();
    const hostname = 'petg-collar.local';
    const wsUrl = `ws://${hostname}:8080`;
    
    // Strategy 1: mDNS Discovery
    try {
      const mdnsResult = await this.tryMDNSConnection();
      if (mdnsResult.success) {
        this.notifyListeners(mdnsResult);
        return mdnsResult;
      }
    } catch (error) {
      // Strategy 2: UDP Cache
      try {
        const udpResult = await this.tryUDPCacheConnection();
        if (udpResult.success) {
          this.notifyListeners(udpResult);
          return udpResult;
        }
      } catch (error) {
        // Strategy 3: Cloud Relay (future implementation)
        try {
          const cloudResult = await this.tryCloudConnection();
          if (cloudResult.success) {
            this.notifyListeners(cloudResult);
            return cloudResult;
          }
        } catch (error) {
          // All strategies failed
          const failResult: CollarConnectionResult = {
            success: false,
            method: 'manual',
            error: 'All connection strategies failed. Please check collar is powered on and connected to WiFi.'
          };
          
          this.notifyListeners(failResult);
          return failResult;
        }
      }
    }

    // Fallback in case all try/catch blocks fail unexpectedly
    return {
      success: false,
      method: 'manual',
      error: 'Unknown error occurred in collar connection.'
    };
  }

  /**
   * Strategy 1: mDNS Discovery
   * Try to connect using petg-collar.local hostname
   */
  private async tryMDNSConnection(): Promise<CollarConnectionResult> {
    const startTime = Date.now();
    const hostname = 'petg-collar.local';
    const wsUrl = `ws://${hostname}:8080`;
    
    try {
      // Test WebSocket connection directly
      const testResult = await this.testWebSocketConnection(wsUrl, 5000);
      
      if (testResult) {
        const latency = Date.now() - startTime;
        
        return {
          success: true,
          url: wsUrl,
          method: 'mdns',
          hostname: hostname,
          latency: latency
        };
      }
    } catch (error) {
      // console.log(`❌ mDNS connection failed:`, error);
    }

    throw new Error('mDNS connection failed');
  }

  /**
   * Strategy 2: UDP Cache
   * Use cached collar info from UDP broadcasts
   */
  private async tryUDPCacheConnection(): Promise<CollarConnectionResult> {
    // Check if we have recent UDP data
    if (!this.hasRecentUDPData()) {
      // Wait briefly for UDP update
      await this.waitForUDPUpdate(3000);
      
      if (!this.hasRecentUDPData()) {
        throw new Error('No recent UDP data available');
      }
    }

    const collarInfo = this.cachedCollarInfo!;
    const startTime = Date.now();

    // Try mDNS URL first if available
    if (collarInfo.mdns_websocket_url) {
      try {
        const testResult = await this.testWebSocketConnection(collarInfo.mdns_websocket_url, 3000);
        if (testResult) {
          const latency = Date.now() - startTime;
          
          return {
            success: true,
            url: collarInfo.mdns_websocket_url,
            method: 'udp-cache',
            ip: collarInfo.ip_address,
            hostname: collarInfo.mdns_hostname,
            latency: latency
          };
        }
      } catch (error) {
        // console.log('⚠️ mDNS URL from UDP failed, trying direct IP...');
      }
    }

    // Fallback to direct IP WebSocket
    try {
      const testResult = await this.testWebSocketConnection(collarInfo.websocket_url, 3000);
      if (testResult) {
        const latency = Date.now() - startTime;
        
        return {
          success: true,
          url: collarInfo.websocket_url,
          method: 'udp-cache',
          ip: collarInfo.ip_address,
          latency: latency
        };
      }
    } catch (error) {
      // console.log(`❌ UDP cache connection failed:`, error);
    }

    throw new Error('UDP cache connection failed');
  }

  /**
   * Strategy 3: Cloud Relay (Future Implementation)
   */
  private async tryCloudConnection(): Promise<CollarConnectionResult> {
    throw new Error('Cloud relay not implemented');
  }

  /**
   * Test if a WebSocket URL is reachable
   */
  private async testWebSocketConnection(url: string, timeoutMs: number): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(false);
      }, timeoutMs);

      try {
        const ws = new WebSocket(url);
        
        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };
        
        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
        
        ws.onclose = () => {
          clearTimeout(timeout);
        };
      } catch (error) {
        clearTimeout(timeout);
        resolve(false);
      }
    });
  }

  /**
   * Update collar info from UDP broadcast
   */
  updateFromUDP(collarInfo: CollarInfo): void {
    this.cachedCollarInfo = collarInfo;
    this.lastUDPUpdate = Date.now();
  }

  /**
   * Check if we have recent UDP data
   */
  private hasRecentUDPData(): boolean {
    return this.cachedCollarInfo !== null && 
           (Date.now() - this.lastUDPUpdate) < this.udpCacheValidMs;
  }

  /**
   * Wait for UDP update
   */
  private async waitForUDPUpdate(timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const startTime = Date.now();
      const initialUpdateTime = this.lastUDPUpdate;

      const checkForUpdate = () => {
        if (this.lastUDPUpdate > initialUpdateTime) {
          resolve();
        } else if (Date.now() - startTime >= timeoutMs) {
          resolve(); // Timeout, continue anyway
        } else {
          setTimeout(checkForUpdate, 100);
        }
      };

      checkForUpdate();
    });
  }

  /**
   * Get current cached collar info
   */
  getCachedInfo(): CollarInfo | null {
    if (this.hasRecentUDPData()) {
      return this.cachedCollarInfo;
    }
    return null;
  }

  /**
   * Add connection listener
   */
  addConnectionListener(listener: (result: CollarConnectionResult) => void): void {
    this.connectionListeners.push(listener);
  }

  /**
   * Remove connection listener
   */
  removeConnectionListener(listener: (result: CollarConnectionResult) => void): void {
    const index = this.connectionListeners.indexOf(listener);
    if (index > -1) {
      this.connectionListeners.splice(index, 1);
    }
  }

  /**
   * Notify all listeners
   */
  private notifyListeners(result: CollarConnectionResult): void {
    this.connectionListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        // console.error('Error in connection listener:', error);
      }
    });
  }

  /**
   * Force reconnection with fresh discovery
   */
  async forceReconnect(): Promise<CollarConnectionResult> {
    // Clear cache to force fresh discovery
    this.cachedCollarInfo = null;
    this.lastUDPUpdate = 0;
    
    return this.connect();
  }
}

// Export singleton instance
export const enhancedCollarConnection = EnhancedCollarConnection.getInstance();

// React hook for enhanced collar connection
export function useEnhancedCollarConnection() {
  return {
    connect: () => enhancedCollarConnection.connect(),
    forceReconnect: () => enhancedCollarConnection.forceReconnect(),
    getCachedInfo: () => enhancedCollarConnection.getCachedInfo(),
    updateFromUDP: (info: CollarInfo) => enhancedCollarConnection.updateFromUDP(info),
    addListener: (listener: (result: CollarConnectionResult) => void) => 
      enhancedCollarConnection.addConnectionListener(listener),
    removeListener: (listener: (result: CollarConnectionResult) => void) => 
      enhancedCollarConnection.removeConnectionListener(listener)
  };
} 