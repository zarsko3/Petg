interface RouterConfig {
  brand: string;
  model?: string;
  adminUrl: string;
  defaultCredentials: {
    username: string;
    password: string;
  };
  dhcpReservationPath: string;
  instructions: string[];
}

interface CollarNetworkInfo {
  macAddress?: string;
  currentIP?: string;
  preferredIP?: string;
  hostname?: string;
}

class RouterConfigHelper {
  private static cachedRouter: RouterConfig | null = null;
  private static lastDetectionTime: number = 0;
  private static readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  private static commonRouters: RouterConfig[] = [
    {
      brand: 'TP-Link',
      adminUrl: 'http://192.168.1.1',
      defaultCredentials: { username: 'admin', password: 'admin' },
      dhcpReservationPath: 'Advanced → Network → DHCP Server → Address Reservation',
      instructions: [
        'Open router admin panel at http://192.168.1.1',
        'Login with admin/admin (or check router label)',
        'Navigate to Advanced → Network → DHCP Server',
        'Click "Address Reservation" tab',
        'Click "Add" and enter collar MAC address',
        'Set reserved IP (e.g., 10.0.0.8)',
        'Save settings and restart router'
      ]
    },
    {
      brand: 'Netgear',
      adminUrl: 'http://192.168.1.1',
      defaultCredentials: { username: 'admin', password: 'password' },
      dhcpReservationPath: 'Dynamic DNS → LAN Setup → Address Reservation',
      instructions: [
        'Open router admin panel at http://192.168.1.1',
        'Login with admin/password',
        'Go to LAN Setup → Address Reservation',
        'Click "Add" button',
        'Enter collar MAC address and desired IP',
        'Apply settings and reboot router'
      ]
    },
    {
      brand: 'Linksys',
      adminUrl: 'http://192.168.1.1',
      defaultCredentials: { username: 'admin', password: 'admin' },
      dhcpReservationPath: 'Smart Wi-Fi Tools → DHCP Reservations',
      instructions: [
        'Access router at http://192.168.1.1',
        'Login with admin credentials',
        'Go to Smart Wi-Fi Tools → DHCP Reservations',
        'Click "Add a new DHCP Reservation"',
        'Select collar device or enter MAC manually',
        'Set static IP address',
        'Save configuration'
      ]
    },
    {
      brand: 'ASUS',
      adminUrl: 'http://192.168.1.1',
      defaultCredentials: { username: 'admin', password: 'admin' },
      dhcpReservationPath: 'LAN → DHCP Server → Manually Assigned IP',
      instructions: [
        'Open ASUS router interface at http://192.168.1.1',
        'Login with admin credentials',
        'Navigate to LAN → DHCP Server',
        'Scroll to "Manually Assigned IP around the DHCP list"',
        'Click "+" to add new reservation',
        'Enter collar MAC and desired IP',
        'Apply settings'
      ]
    },
    {
      brand: 'D-Link',
      adminUrl: 'http://192.168.0.1',
      defaultCredentials: { username: 'admin', password: '' },
      dhcpReservationPath: 'Setup → Network Settings → DHCP Reservation',
      instructions: [
        'Access router at http://192.168.0.1',
        'Login (usually admin with blank password)',
        'Go to Setup → Network Settings',
        'Click "DHCP Reservation" button',
        'Add new reservation with collar MAC',
        'Set static IP address',
        'Save/Apply settings'
      ]
    }
  ];

  // Detect router brand from network scan with caching
  static async detectRouter(): Promise<RouterConfig | null> {
    // Return cached result if still valid
    const now = Date.now();
    if (this.cachedRouter && (now - this.lastDetectionTime) < this.CACHE_DURATION) {
      return this.cachedRouter;
    }

    // Determine likely gateway based on collar IP
    const commonGateways = this.getOrderedGateways();
    
    for (const gateway of commonGateways) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 1500); // Reduced timeout
        
        const response = await fetch(`http://${gateway}`, {
          method: 'GET',
          signal: controller.signal,
          mode: 'no-cors' // Avoid CORS issues
        });
        
        clearTimeout(timeoutId);
        
        // For no-cors mode, we can't read the response, but if it doesn't throw, the gateway exists
        const detectedRouter = {
          brand: 'Generic Router',
          adminUrl: `http://${gateway}`,
          defaultCredentials: { username: 'admin', password: 'admin' },
          dhcpReservationPath: 'Network Settings → DHCP → Reservations',
          instructions: [
            `Open router admin panel at http://${gateway}`,
            'Login with admin credentials (check router label)',
            'Look for DHCP settings or LAN settings',
            'Find DHCP Reservations or Static IP section',
            'Add collar MAC address with desired IP',
            'Save and restart router'
          ]
        };

        // Cache the result
        this.cachedRouter = detectedRouter;
        this.lastDetectionTime = now;
        
        return detectedRouter;
        
      } catch (error) {
        // Continue trying other gateways
      }
    }
    
    // Cache null result to prevent repeated failed attempts
    this.cachedRouter = null;
    this.lastDetectionTime = now;
    
    return null;
  }

  // Get ordered list of gateways based on collar IP
  private static getOrderedGateways(): string[] {
    // Try to determine the most likely gateway based on collar IP pattern
    const collarIP = '10.0.0.8'; // Known collar IP
    
    if (collarIP.startsWith('10.0.0.')) {
      return ['10.0.0.1', '192.168.1.1', '192.168.0.1', '192.168.1.254'];
    } else if (collarIP.startsWith('192.168.1.')) {
      return ['192.168.1.1', '192.168.1.254', '10.0.0.1', '192.168.0.1'];
    } else if (collarIP.startsWith('192.168.0.')) {
      return ['192.168.0.1', '192.168.1.1', '10.0.0.1', '192.168.1.254'];
    } else {
      return ['192.168.1.1', '192.168.0.1', '10.0.0.1', '192.168.1.254'];
    }
  }

  // Get collar network information with timeout
  static async getCollarNetworkInfo(collarIP: string): Promise<CollarNetworkInfo | null> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`http://${collarIP}/network-info`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        return {
          macAddress: data.mac_address,
          currentIP: data.ip_address,
          hostname: data.hostname || 'PetCollar'
        };
      }
    } catch (error) {
      // Return basic info if network-info endpoint doesn't exist
      return {
        currentIP: collarIP,
        hostname: 'PetCollar',
        macAddress: undefined // Will be shown as "Check collar device"
      };
    }
  }

  // Generate step-by-step instructions
  static generateInstructions(
    routerConfig: RouterConfig, 
    collarInfo: CollarNetworkInfo,
    preferredIP: string = '10.0.0.8'
  ): string[] {
    const instructions = [
      '🔧 **Setting up Static IP for Pet Collar**',
      '',
      `📍 **Current Collar Info:**`,
      `   • IP Address: ${collarInfo.currentIP || 'Unknown'}`,
      `   • MAC Address: ${collarInfo.macAddress || 'Check collar device'}`,
      `   • Hostname: ${collarInfo.hostname || 'PetCollar'}`,
      '',
      `🌐 **Router Configuration (${routerConfig.brand}):**`,
      ...routerConfig.instructions.map(step => `   ${step}`),
      '',
      `⚙️ **Recommended Settings:**`,
      `   • Static IP: ${preferredIP}`,
      `   • MAC Address: ${collarInfo.macAddress || '[Get from collar device]'}`,
      `   • Hostname: ${collarInfo.hostname || 'PetCollar'}`,
      '',
      `✅ **After Setup:**`,
      `   • Restart the collar device`,
      `   • Wait 2-3 minutes for network reconnection`,
      `   • Test connection in the app`,
      `   • The collar should now always use ${preferredIP}`
    ];
    
    return instructions;
  }

  // Check if IP is available on network with timeout
  static async checkIPAvailability(ip: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1000); // 1 second timeout
      
      const response = await fetch(`http://${ip}`, {
        method: 'GET',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // If we get any response, IP is in use
      return false;
    } catch (error) {
      // If request fails, IP is likely available
      return true;
    }
  }

  // Suggest available IP in range
  static async suggestAvailableIP(baseNetwork: string = '10.0.0.'): Promise<string> {
    // Try common static IP ranges
    const candidates = [8, 10, 12, 15, 20, 25, 30, 50, 100];
    
    for (const num of candidates) {
      const ip = baseNetwork + num;
      const available = await this.checkIPAvailability(ip);
      
      if (available) {
        return ip;
      }
    }
    
    // Fallback to random number if all common ones are taken
    const randomNum = Math.floor(Math.random() * 200) + 50;
    return baseNetwork + randomNum;
  }

  // Generate router-specific configuration export
  static generateConfigExport(collarInfo: CollarNetworkInfo, staticIP: string): string {
    const config = {
      device_name: collarInfo.hostname || 'PetCollar',
      mac_address: collarInfo.macAddress,
      static_ip: staticIP,
      subnet_mask: '255.255.255.0',
      gateway: staticIP.substring(0, staticIP.lastIndexOf('.')) + '.1',
      dns_primary: '8.8.8.8',
      dns_secondary: '8.8.4.4',
      created: new Date().toISOString()
    };
    
    return JSON.stringify(config, null, 2);
  }

  // Clear cache (for manual refresh)
  static clearCache(): void {
    this.cachedRouter = null;
    this.lastDetectionTime = 0;
  }
}

// React hook for router configuration
export function useRouterConfig() {
  return {
    detectRouter: () => RouterConfigHelper.detectRouter(),
    getCollarNetworkInfo: (ip: string) => RouterConfigHelper.getCollarNetworkInfo(ip),
    generateInstructions: (router: RouterConfig, collar: CollarNetworkInfo, ip?: string) => 
      RouterConfigHelper.generateInstructions(router, collar, ip),
    checkIPAvailability: (ip: string) => RouterConfigHelper.checkIPAvailability(ip),
    suggestAvailableIP: (baseNetwork?: string) => RouterConfigHelper.suggestAvailableIP(baseNetwork),
    generateConfigExport: (collar: CollarNetworkInfo, ip: string) => 
      RouterConfigHelper.generateConfigExport(collar, ip),
    clearCache: () => RouterConfigHelper.clearCache()
  };
}

export { RouterConfigHelper };
export type { RouterConfig, CollarNetworkInfo }; 