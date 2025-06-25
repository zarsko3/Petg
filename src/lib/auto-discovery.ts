interface CollarDiscoveryResult {
  ip: string;
  websocketUrl: string;
  httpUrl: string;
  deviceInfo?: any;
  responseTime: number;
}

class AutoCollarDiscovery {
  private static instance: AutoCollarDiscovery;
  private discoveryInterval: NodeJS.Timeout | null = null;
  private lastKnownIP: string = '';
  private onIPChanged?: (newIP: string, oldIP: string) => void;

  static getInstance(): AutoCollarDiscovery {
    if (!AutoCollarDiscovery.instance) {
      AutoCollarDiscovery.instance = new AutoCollarDiscovery();
    }
    return AutoCollarDiscovery.instance;
  }

  // Start automatic discovery that runs every 30 seconds
  startAutoDiscovery(onIPChanged?: (newIP: string, oldIP: string) => void): void {
    this.onIPChanged = onIPChanged;
    
    console.log('🔍 Starting automatic collar discovery...');
    
    // Initial discovery
    this.performDiscovery();
    
    // Set up periodic discovery
    this.discoveryInterval = setInterval(() => {
      this.performDiscovery();
    }, 30000); // Check every 30 seconds
  }

  stopAutoDiscovery(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
      console.log('🛑 Stopped automatic collar discovery');
    }
  }

  private async performDiscovery(): Promise<void> {
    try {
      const results = await this.scanForCollar();
      
      if (results.length > 0) {
        const bestResult = results[0]; // Take the fastest responding one
        
        if (bestResult.ip !== this.lastKnownIP) {
          console.log(`🎯 Collar IP changed: ${this.lastKnownIP} → ${bestResult.ip}`);
          
          const oldIP = this.lastKnownIP;
          this.lastKnownIP = bestResult.ip;
          
          // Update configuration files automatically
          await this.updateConfiguration(bestResult.ip, oldIP);
          
          // Notify callback
          if (this.onIPChanged && oldIP) {
            this.onIPChanged(bestResult.ip, oldIP);
          }
        } else {
          console.log(`✅ Collar still at ${bestResult.ip} (${bestResult.responseTime}ms)`);
        }
      } else {
        console.log('❌ No collar found in network scan');
      }
    } catch (error) {
      console.log('🔍 Discovery error:', error);
    }
  }

  async scanForCollar(): Promise<CollarDiscoveryResult[]> {
    const results: CollarDiscoveryResult[] = [];
    
    // Get current network range from browser (if possible)
    const networkRanges = await this.getNetworkRanges();
    
    // Scan multiple IP ranges in parallel
    const scanPromises = networkRanges.map(range => this.scanRange(range));
    const rangeResults = await Promise.all(scanPromises);
    
    // Flatten results and sort by response time
    rangeResults.forEach(rangeResult => {
      results.push(...rangeResult);
    });
    
    return results.sort((a, b) => a.responseTime - b.responseTime);
  }

  private async getNetworkRanges(): Promise<string[]> {
    // Try to detect current network from successful connections
    const commonRanges = [
      '10.0.0.',      // Current network
      '192.168.1.',   // Common home network
      '192.168.0.',   // Common router default
      '192.168.4.',   // ESP32 AP mode
      '172.16.0.'     // Private network
    ];

    // Add dynamic detection based on current page URL or previous connections
    try {
      const stored = localStorage.getItem('collar_last_network');
      if (stored) {
        const lastNetwork = JSON.parse(stored);
        if (lastNetwork.prefix && !commonRanges.includes(lastNetwork.prefix)) {
          commonRanges.unshift(lastNetwork.prefix);
        }
      }
    } catch (error) {
      // Ignore localStorage errors
    }

    return commonRanges;
  }

  private async scanRange(networkPrefix: string): Promise<CollarDiscoveryResult[]> {
    const results: CollarDiscoveryResult[] = [];
    const scanPromises: Promise<CollarDiscoveryResult | null>[] = [];
    
    // Scan IPs 1-50 in the range (most common for DHCP)
    for (let i = 1; i <= 50; i++) {
      const ip = networkPrefix + i;
      scanPromises.push(this.testCollarIP(ip));
    }
    
    // Wait for all scans to complete
    const scanResults = await Promise.all(scanPromises);
    
    // Filter out null results
    scanResults.forEach(result => {
      if (result) {
        results.push(result);
      }
    });
    
    return results;
  }

  private async testCollarIP(ip: string): Promise<CollarDiscoveryResult | null> {
    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(`http://${ip}/data`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        mode: 'cors',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        const responseTime = Date.now() - startTime;
        
        // Verify this is actually a pet collar by checking response structure
        if (this.isCollarResponse(data)) {
          console.log(`🐕 Found collar at ${ip} (${responseTime}ms)`);
          
          // Store successful network for future scans
          const networkPrefix = ip.substring(0, ip.lastIndexOf('.') + 1);
          localStorage.setItem('collar_last_network', JSON.stringify({
            prefix: networkPrefix,
            timestamp: Date.now()
          }));
          
          return {
            ip,
            websocketUrl: `ws://${ip}:8080`,
            httpUrl: `http://${ip}`,
            deviceInfo: data,
            responseTime
          };
        }
      }
    } catch (error) {
      // Silent fail for network scanning
    }
    
    return null;
  }

  private isCollarResponse(data: any): boolean {
    // Check if response looks like a pet collar
    return (
      data &&
      (data.device_id || data.battery_level !== undefined || data.system_state || data.alert_active !== undefined)
    );
  }

  private async updateConfiguration(newIP: string, oldIP: string): Promise<void> {
    try {
      // Update the public config file
      const newConfig = {
        collar_ip: newIP,
        websocket_url: `ws://${newIP}:8080`,
        http_url: `http://${newIP}`,
        status: 'connected',
        last_discovered: new Date().toISOString()
      };
      
      // Store in localStorage for immediate use
      localStorage.setItem('collar_config', JSON.stringify(newConfig));
      
      console.log(`💾 Updated collar configuration: ${oldIP} → ${newIP}`);
      
      // Trigger a page reload to apply new configuration
      if (oldIP && window.location.reload) {
        console.log('🔄 Reloading page to apply new IP configuration...');
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
      
    } catch (error) {
      console.error('❌ Failed to update configuration:', error);
    }
  }

  // Manual discovery method
  async findCollar(): Promise<CollarDiscoveryResult[]> {
    console.log('🔍 Manual collar discovery started...');
    return await this.scanForCollar();
  }

  getCurrentIP(): string {
    return this.lastKnownIP;
  }
}

// Export singleton instance
export const autoDiscovery = AutoCollarDiscovery.getInstance();

// React hook for auto-discovery
export function useAutoDiscovery() {
  return {
    startAutoDiscovery: (onIPChanged?: (newIP: string, oldIP: string) => void) => 
      autoDiscovery.startAutoDiscovery(onIPChanged),
    stopAutoDiscovery: () => autoDiscovery.stopAutoDiscovery(),
    findCollar: () => autoDiscovery.findCollar(),
    getCurrentIP: () => autoDiscovery.getCurrentIP()
  };
} 