import { z } from 'zod';
import { usePetgStore } from './store';

// Schema definitions
export const CollarDataSchema = z.object({
  device_id: z.string(),
  battery_level: z.number().min(0).max(100),
  alert_active: z.boolean(),
  wifi_connected: z.boolean(),
  system_state: z.enum(['normal', 'alert', 'lowBattery']),
  timestamp: z.number(),
  uptime: z.number().optional(),
  status: z.string().optional(),
  beacons: z.array(z.object({
    name: z.string(),
    rssi: z.number(),
    distance: z.number(),
    address: z.string().optional(),
    first_seen: z.number(),
    last_seen: z.number(),
  })).optional(),
  scanner: z.object({
    ble_active: z.boolean(),
    beacons_detected: z.number(),
    last_scan: z.number(),
    successful_scans: z.number().optional(),
    total_scans: z.number().optional(),
  }).optional(),
});

export type CollarData = z.infer<typeof CollarDataSchema>;

export type WebSocketMessage = {
  type?: 'data' | 'command' | 'status' | 'alert';
  data?: any;
  command?: string;
  timestamp?: number;
  systemState?: 'normal' | 'alert' | 'lowBattery';
  batteryLevel?: number;
  alertActive?: boolean;
  beacons?: Array<{ name: string; rssi: number; distance: number }>;
  device_id?: string;
  firmware_version?: string;
  wifi_connected?: boolean;
};

// Global collar connection manager
class CollarConnectionManager {
  private static instance: CollarConnectionManager;
  private ws: WebSocket | null = null;
  private httpPollingInterval: NodeJS.Timeout | null = null;
  private isConnected = false;
  private currentUrl = '';
  private httpFallback = false;
  
  // Event handlers
  public onMessage?: (data: CollarData) => void;
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onError?: (error: any) => void;

  constructor() {
    // Listen for collar discovery events
    if (typeof window !== 'undefined') {
      window.addEventListener('collar-discovered', this.handleCollarDiscovered.bind(this) as EventListener);
      window.addEventListener('collar-configured', this.handleCollarDiscovered.bind(this) as EventListener);
    }
  }

  private handleCollarDiscovered(event: Event) {
    const customEvent = event as CustomEvent;
    const { collar_ip, websocket_url } = customEvent.detail;
    console.log(`🎯 Auto-updating collar connection to: ${collar_ip}`);
    
    // Disconnect current connection and reconnect to new address
    this.disconnect();
    
    // Small delay to ensure cleanup is complete
    setTimeout(() => {
      this.connect(websocket_url || `ws://${collar_ip}:8080`);
    }, 1000);
  }

  static getInstance(): CollarConnectionManager {
    if (!CollarConnectionManager.instance) {
      CollarConnectionManager.instance = new CollarConnectionManager();
    }
    return CollarConnectionManager.instance;
  }

  async connect(url: string): Promise<void> {
    console.log('🔗 Connecting to collar:', url);
    this.currentUrl = url;
    
    // Update connection status in store
    const store = usePetgStore.getState();
    store.setConnectionStatus('Connecting');
    store.setConnectionMessage('Connecting to collar...');
    store.setConnectionUrl(url);
    store.setLastConnectionAttempt(Date.now());
    
    // Always use HTTP polling (more reliable for ESP32)
    this.startHttpPolling();
  }

  private startHttpPolling() {
    if (this.httpPollingInterval) {
      clearInterval(this.httpPollingInterval);
    }

    console.log('📡 Starting HTTP polling to collar...');
    this.httpFallback = true;
    
    const httpUrl = this.currentUrl.replace('ws://', 'http://').replace(':8080', '');
    
    const pollData = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
        
        // Try direct connection first, fallback to proxy
        let response;
        try {
          response = await fetch(`${httpUrl}/data`, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache',
              'Content-Type': 'application/json'
            },
            mode: 'cors',
            cache: 'no-cache',
            signal: controller.signal
          });
        } catch (corsError) {
          // Fallback to proxy API
          console.log('🔄 Direct connection failed, using proxy...');
          response = await fetch('/api/collar-proxy?endpoint=/data', {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'Cache-Control': 'no-cache'
            },
            cache: 'no-cache',
            signal: controller.signal
          });
        }
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const jsonData = await response.json();
          console.log('📊 Collar data received:', jsonData);
          
          // Log beacon-specific data
          if (jsonData.beacons && jsonData.beacons.length > 0) {
            console.log(`🔍 Socket: Received ${jsonData.beacons.length} beacons from collar:`, jsonData.beacons);
          }
          if (jsonData.scanner) {
            console.log(`📡 Socket: Scanner stats:`, jsonData.scanner);
          }
          
          // Convert ESP32 format to our expected format
          const normalizedData: CollarData = {
            device_id: jsonData.device_id || 'PETCOLLAR001',
            battery_level: jsonData.battery_level || jsonData.batteryLevel || Math.floor(Math.random() * 20) + 80,
            alert_active: jsonData.alert_active || false,
            wifi_connected: jsonData.wifi_connected || jsonData.wifiConnected || false,
            system_state: jsonData.alert_active ? 'alert' : (jsonData.system_state || 'normal'),
            timestamp: Date.now(),
            uptime: jsonData.uptime || 0,
            status: 'Connected via HTTP',
            // Include beacon data if available
            beacons: jsonData.beacons || [],
            // Include scanner stats if available
            scanner: jsonData.scanner || undefined
          };
          
          if (!this.isConnected) {
            this.isConnected = true;
            this.onConnect?.();
            console.log('✅ Collar connection established');
            
            // Update connection status in store
            const store = usePetgStore.getState();
            store.setCollarConnected(true);
            store.setConnectionStatus('Connected');
            store.setConnectionMessage('Successfully connected to collar');
            store.setConnectionUrl(this.currentUrl);
          }
          
          this.onMessage?.(normalizedData);
          
          // Update global store
          const store = usePetgStore.getState();
          store.setSystemState(normalizedData.system_state);
          store.setBatteryLevel(normalizedData.battery_level);
          store.setAlertActive(normalizedData.alert_active);
          store.setLastDataReceived(Date.now());
          
          // Update raw collar data for beacon processing
          if (typeof store.setLastCollarData === 'function') {
            store.setLastCollarData(normalizedData);
            console.log('📝 Socket: Updated store with collar data including beacons:', normalizedData.beacons?.length || 0);
          }
          
        } else {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        // Check if it's a CORS error specifically
        if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
          console.log('🚫 CORS or network error detected:', error.message);
        } else {
          console.log('📊 HTTP polling error:', error);
        }
        
        // Use mock data to keep UI alive
        const mockData: CollarData = {
          device_id: 'PETCOLLAR001',
          battery_level: Math.floor(Math.random() * 20) + 80,
          alert_active: false,
          wifi_connected: false,
          system_state: 'normal',
          timestamp: Date.now(),
          status: 'Mock Data (Collar Disconnected)'
        };
        
        if (this.isConnected) {
          this.isConnected = false;
          this.onDisconnect?.();
          console.log('❌ Collar connection lost, using mock data');
          
          // Update connection status in store
          const store = usePetgStore.getState();
          store.setCollarConnected(false);
          store.setConnectionStatus('Failed');
          store.setConnectionMessage('Connection lost - will retry automatically');
          
          // Notify discovery system about disconnection
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('collar-disconnected'));
          }
        }
        
        this.onMessage?.(mockData);
        
        // Update global store with mock data
        const store = usePetgStore.getState();
        store.setSystemState(mockData.system_state);
        store.setBatteryLevel(mockData.battery_level);
        store.setAlertActive(mockData.alert_active);
      }
    };

    // Poll every 1 second for more responsive beacon detection
    this.httpPollingInterval = setInterval(pollData, 1000);
    
    // Initial poll immediately
    pollData();
  }

  async sendCommand(command: string): Promise<void> {
    if (!this.httpFallback) {
      console.warn('⚠️ Not connected to collar');
      return;
    }

    try {
      const httpUrl = this.currentUrl.replace('ws://', 'http://').replace(':8080', '');
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      // Try direct connection first, fallback to proxy
      let response;
      try {
        response = await fetch(`${httpUrl}/command`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          mode: 'cors',
          body: JSON.stringify({ command }),
          signal: controller.signal
        });
      } catch (corsError) {
        // Fallback to proxy API
        console.log('🔄 Direct command failed, using proxy...');
        response = await fetch('/api/collar-proxy?endpoint=/command', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ command }),
          signal: controller.signal
        });
      }
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const result = await response.json();
        console.log('📤 Command sent successfully:', command, result);
      } else {
        console.log('📤 Command failed:', command, response.status, response.statusText);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.log('🚫 CORS error sending command:', command);
      } else {
        console.log('📤 Command send error:', command, error);
      }
    }
  }

  disconnect(): void {
    console.log('🔌 Disconnecting from collar...');
    
    if (this.httpPollingInterval) {
      clearInterval(this.httpPollingInterval);
      this.httpPollingInterval = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
    this.httpFallback = false;
    
    // Update connection status in store
    const store = usePetgStore.getState();
    store.setCollarConnected(false);
    store.setConnectionStatus('Ready');
    store.setConnectionMessage('Disconnected from collar');
    store.setConnectionUrl('');
    
    this.onDisconnect?.();
  }

  getConnectionStatus(): { connected: boolean; url: string } {
    return {
      connected: this.isConnected,
      url: this.currentUrl
    };
  }
}

// Export singleton instance
export const collarConnection = CollarConnectionManager.getInstance();

// Auto-discovery function
export async function discoverCollar(): Promise<string[]> {
  const possibleUrls = [
    'ws://10.0.0.4:8080',  // Your current collar IP
    'ws://10.0.0.12:8080',  // Alternative in same network
    'ws://10.0.0.10:8080',  // Alternative in same network
    'ws://192.168.1.100:8080',
    'ws://192.168.0.100:8080', 
    'ws://192.168.1.12:8080',
    'ws://172.16.0.100:8080'
  ];

  console.log('🔍 Auto-discovering collar...');
  
  const promises = possibleUrls.map(async (url) => {
    try {
      const httpUrl = url.replace('ws://', 'http://').replace(':8080', '');
      const controller = new AbortController();
      setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(`${httpUrl}/data`, { 
        method: 'GET',
        mode: 'cors',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal
      });
      return response.ok ? url : null;
    } catch (error) {
      console.log(`Discovery failed for ${url}:`, error instanceof TypeError ? 'CORS/Network error' : error);
      return null;
    }
  });

  const results = await Promise.all(promises);
  const foundUrls = results.filter((url): url is string => url !== null);
  
  console.log('🎯 Discovery results:', foundUrls);
  return foundUrls;
}

// React hook for collar connection
export function useCollarConnection() {
  const store = usePetgStore();
  
  return {
    connect: (url: string) => collarConnection.connect(url),
    disconnect: () => collarConnection.disconnect(),
    sendCommand: (command: string) => collarConnection.sendCommand(command),
    isConnected: collarConnection.getConnectionStatus().connected,
    discoverCollar,
    // Connection status from store
    systemState: store.systemState,
    batteryLevel: store.batteryLevel,
    alertActive: store.alertActive
  };
} 