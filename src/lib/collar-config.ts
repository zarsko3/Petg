interface CollarConfig {
  collar_ip: string;
  websocket_url: string;
  http_url: string;
  last_discovered: string;
  status: 'connected' | 'disconnected' | 'setup';
}

const DEFAULT_CONFIG: CollarConfig = {
  collar_ip: '10.0.0.4',
  websocket_url: 'ws://10.0.0.4:8080',
  http_url: 'http://10.0.0.4',
  last_discovered: '',
  status: 'disconnected'
};

export class CollarConfigManager {
  private config: CollarConfig = DEFAULT_CONFIG;
  private listeners: Array<(config: CollarConfig) => void> = [];

  constructor() {
    this.loadConfig();
    this.startWatching();
  }

  async loadConfig(): Promise<CollarConfig> {
    try {
      // Try to load from the config file created by PowerShell script
      const response = await fetch('/collar_config.json?t=' + Date.now(), {
        cache: 'no-cache'
      });
      
      if (response.ok) {
        const config = await response.json();
        this.config = { ...DEFAULT_CONFIG, ...config };
        console.log('✅ Loaded collar configuration:', this.config);
        this.notifyListeners();
        return this.config;
      }
    } catch (error) {
      console.log('📝 No collar config found, using defaults');
    }

    // Try localStorage as fallback
    try {
      const stored = localStorage.getItem('collar_config');
      if (stored) {
        const config = JSON.parse(stored);
        this.config = { ...DEFAULT_CONFIG, ...config };
        console.log('✅ Loaded collar configuration from localStorage:', this.config);
        this.notifyListeners();
      }
    } catch (error) {
      console.log('📝 No stored config found, using defaults');
    }

    return this.config;
  }

  saveConfig(config: Partial<CollarConfig>): void {
    this.config = { ...this.config, ...config };
    
    // Save to localStorage
    localStorage.setItem('collar_config', JSON.stringify(this.config));
    
    // Notify listeners
    this.notifyListeners();
    
    console.log('💾 Saved collar configuration:', this.config);
  }

  getConfig(): CollarConfig {
    return { ...this.config };
  }

  getWebSocketUrl(): string {
    return this.config.websocket_url;
  }

  getHttpUrl(): string {
    return this.config.http_url;
  }

  updateFromDiscovery(ip: string): void {
    this.saveConfig({
      collar_ip: ip,
      websocket_url: `ws://${ip}:8080`,
      http_url: `http://${ip}`,
      last_discovered: new Date().toISOString(),
      status: 'connected'
    });
  }

  onConfigChange(listener: (config: CollarConfig) => void): () => void {
    this.listeners.push(listener);
    
    // Return unsubscribe function
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener(this.config));
  }

  private startWatching(): void {
    // Poll for config file changes (since filesystem watching isn't available in browser)
    setInterval(async () => {
      await this.loadConfig();
    }, 5000); // Check every 5 seconds
  }

  // Network discovery methods
  async discoverCollar(): Promise<string[]> {
    const foundUrls: string[] = [];
    
    // Try common IP ranges
    const baseIps = [
      '10.0.0.',
      '192.168.1.',
      '192.168.0.',
      '192.168.4.',
      '172.16.0.'
    ];

    const testRange = Array.from({ length: 50 }, (_, i) => i + 100); // Test 100-150
    
    for (const base of baseIps) {
      for (const num of testRange) {
        const ip = base + num;
        
        try {
          // Quick HTTP test
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1000);
          
          const response = await fetch(`http://${ip}`, {
            signal: controller.signal,
            mode: 'cors'
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const text = await response.text();
            if (text.includes('Pet Collar') || text.includes('PetCollar')) {
              const wsUrl = `ws://${ip}:8080`;
              foundUrls.push(wsUrl);
              console.log(`🐕 Found Pet Collar at ${ip}`);
              
              // Auto-update config with first found device
              if (foundUrls.length === 1) {
                this.updateFromDiscovery(ip);
              }
            }
          }
        } catch (error) {
          // Silent fail for network scan
        }
      }
    }

    return foundUrls;
  }

  async testConnection(websocketUrl?: string): Promise<boolean> {
    const testUrl = websocketUrl || this.getWebSocketUrl();
    
    return new Promise((resolve) => {
      try {
        const ws = new WebSocket(testUrl);
        
        const timeout = setTimeout(() => {
          ws.close();
          resolve(false);
        }, 3000);

        ws.onopen = () => {
          clearTimeout(timeout);
          ws.close();
          resolve(true);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          resolve(false);
        };
      } catch (error) {
        resolve(false);
      }
    });
  }
}

// Global instance
export const collarConfig = new CollarConfigManager(); 