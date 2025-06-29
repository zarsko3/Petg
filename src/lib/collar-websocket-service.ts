// Persistent WebSocket service for collar connection
import { usePetgStore } from '@/lib/store';

interface CollarData {
  device_id?: string;
  timestamp?: number;
  wifi_connected?: boolean;
  battery_level?: number;
  battery_voltage?: number;
  system_state?: 'normal' | 'alert' | 'lowBattery';
  alert_active?: boolean;
  status?: string;
  uptime?: number;
  freeHeap?: number;
  wifiMode?: number;
  localIP?: string;
  
  // Beacon detection data
  beacons?: Array<{
    name: string;
    rssi: number;
    distance: number;
    address?: string;
    first_seen: number;
    last_seen: number;
  }>;
  
  // BLE scanner statistics
  scanner?: {
    ble_active: boolean;
    beacons_detected: number;
    last_scan: number;
    successful_scans?: number;
    total_scans?: number;
  };
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

class CollarWebSocketService {
  private ws: WebSocket | null = null;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private pingInterval: ReturnType<typeof setInterval> | null = null;
  private status: ConnectionStatus = 'disconnected';
  private lastError: string | null = null;
  private wsUrl: string | null = null;
  private isDestroyed = false;
  
  constructor() {
    // Delay initial connection to allow for existing connections to be detected
    setTimeout(() => {
      if (!this.isDestroyed && this.status === 'disconnected') {
        console.log('🚀 CollarService: Starting initial connection after delay...');
        this.connect();
      }
    }, 2000); // 2 second delay to avoid immediate scanning
  }

  // Get WebSocket URL directly from collar broadcasts (no discovery/scanning)
  private async fetchWebSocketUrl(): Promise<string | null> {
    try {
      console.log('🔗 CollarService: Getting WebSocket URL directly from collar...');
      
      // First check if we already have a working WebSocket URL - avoid any API calls
      if (this.wsUrl && this.status === 'connected') {
        console.log('✅ CollarService: Using existing WebSocket URL (no discovery needed)');
        return this.wsUrl;
      }
      
      // Check localStorage for cached WebSocket URL from UDP discovery
      const cachedUrl = localStorage.getItem('petg.wsUrl');
      if (cachedUrl) {
        console.log(`✅ CollarService: Using cached WebSocket URL: ${cachedUrl}`);
        return cachedUrl;
      }
      
      console.log('ℹ️ CollarService: No cached WebSocket URL found');
      return null;
      
    } catch (error) {
      console.log('ℹ️ CollarService: WebSocket not available, using HTTP polling');
      return null;
    }
  }

  // Quick check if current WebSocket is actually working
  private isWebSocketHealthy(): boolean {
    return this.ws !== null && 
           this.ws.readyState === WebSocket.OPEN && 
           this.status === 'connected';
  }

  // Connect to collar WebSocket
  async connect(skipDiscovery: boolean = false) {
    if (this.isDestroyed || this.status === 'connecting') {
      console.log('🔄 CollarService: Connect called but already connecting or destroyed');
      return;
    }
    
    // Quick health check - if already connected and healthy, don't reconnect
    if (this.isWebSocketHealthy()) {
      console.log('✅ CollarService: WebSocket already healthy, skipping reconnect');
      return;
    }
    
    console.log('🚀 CollarService: Starting connection process...');
    console.log(`🔍 CollarService: Previous WebSocket URL: ${this.wsUrl || 'None'}`);
    this.setStatus('connecting');
    this.lastError = null;
    
    // Update store immediately when starting connection
    this.updateStore();
    
    try {
      let url = this.wsUrl; // Try to reuse existing URL first
      
      // Only fetch new URL if we don't have one or if discovery is NOT being skipped
      if (!url || !skipDiscovery) {
        console.log(skipDiscovery ? '🔄 CollarService: Skipping discovery, using cached URL' : '🔍 CollarService: Fetching WebSocket URL from collar...');
        const newUrl = await this.fetchWebSocketUrl();
        
        if (!newUrl) {
          // If we have an existing URL, try to use it as fallback
          if (url) {
            console.log(`🔄 CollarService: Discovery failed, trying cached URL: ${url}`);
          } else {
            console.log('ℹ️ CollarService: WebSocket connection not available, relying on HTTP polling');
            this.setStatus('disconnected');
            this.lastError = 'WebSocket unavailable (using HTTP polling)';
            this.updateStore();
            return; // Exit gracefully without throwing
          }
        } else {
          url = newUrl;
        }
      }
      
      // Log IP change detection
      if (this.wsUrl && this.wsUrl !== url) {
        console.log(`🔄 CollarService: IP address changed!`);
        console.log(`   Previous: ${this.wsUrl}`);
        console.log(`   New: ${url}`);
      } else if (!this.wsUrl) {
        console.log(`🎯 CollarService: Initial connection: ${url}`);
      } else {
        console.log(`✅ CollarService: Reusing URL: ${url}`);
      }
      
      this.wsUrl = url;
      console.log(`🔗 CollarService: Attempting WebSocket connection to ${url}...`);
      
      const ws = new WebSocket(url);
      this.ws = ws;
      
      // Connection promise to handle timeout
      return new Promise<void>((resolve, reject) => {
        let isResolved = false;
        
        // Set connection timeout
        const connectionTimeout = setTimeout(() => {
          if (!isResolved && ws.readyState === WebSocket.CONNECTING) {
            isResolved = true;
            console.log('⏰ CollarService: Connection timeout - closing WebSocket');
            ws.close();
            this.setStatus('error');
            this.lastError = 'Connection timeout';
            this.updateStore();
            reject(new Error('Connection timeout'));
          }
        }, 10000); // 10 second timeout
        
        ws.onopen = () => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(connectionTimeout);
            console.log('✅ CollarService: WebSocket connected successfully');
            this.setStatus('connected');
            this.lastError = null;
            
            // Dispatch connection state to store
            if (typeof window !== 'undefined') {
              const store = usePetgStore.getState();
              store.setCollarConnected(true);
              store.setConnectionStatus('Connected');
              store.setConnectionMessage('WebSocket connected');
              store.setLastConnectionAttempt(Date.now());
            }
            
            this.updateStore();
            this.startPing();
            resolve();
          }
        };
        
        ws.onmessage = (event) => {
          try {
            const data: CollarData = JSON.parse(event.data);
            console.log('📊 CollarService: Received data:', data);
            
            // Log beacon-specific information
            if (data.beacons && data.beacons.length > 0) {
              console.log(`🔍 CollarService: Detected ${data.beacons.length} beacons:`, data.beacons);
            }
            if (data.scanner) {
              console.log(`📡 CollarService: Scanner stats:`, data.scanner);
            }
            
            // Update store with live data - this triggers switch from mock to live
            if (typeof window !== 'undefined') {
              const store = usePetgStore.getState();
              store.setLastCollarData(data);
              store.setLastDataReceived(Date.now());
            }
            
            // Update global store with latest data
            this.updateStore(data);
            
          } catch (error) {
            console.error('❌ CollarService: Error parsing message:', error);
          }
        };
        
        ws.onerror = (error) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(connectionTimeout);
            console.error('❌ CollarService: WebSocket error:', error);
            this.setStatus('error');
            this.lastError = 'WebSocket connection error';
            
            // Dispatch error state to store
            if (typeof window !== 'undefined') {
              const store = usePetgStore.getState();
              store.setCollarConnected(false);
              store.setConnectionStatus('Failed');
              store.setConnectionMessage('WebSocket error');
            }
            
            this.updateStore();
            reject(new Error('WebSocket connection error'));
          }
        };
        
        ws.onclose = (event) => {
          if (!isResolved) {
            isResolved = true;
            clearTimeout(connectionTimeout);
          }
          
          console.log(`🔌 CollarService: WebSocket closed: ${event.code} ${event.reason || 'No reason'}`);
          this.setStatus('disconnected');
          
          // Dispatch disconnection state to store
          if (typeof window !== 'undefined') {
            const store = usePetgStore.getState();
            store.setCollarConnected(false);
            store.setConnectionStatus('Failed');
            store.setConnectionMessage(`Connection closed: ${event.reason || 'Unknown reason'}`);
          }
          
          // Update global store
          this.updateStore();
          
          // Clean up
          this.stopPing();
          this.ws = null;
          
          // Auto-reconnect after 5 seconds unless it was a clean close or service is destroyed
          if (!this.isDestroyed && event.code !== 1000) {
            console.log('🔄 CollarService: Scheduling reconnection in 5 seconds...');
            this.scheduleReconnect();
          }
        };
      });
      
    } catch (error) {
      console.error('❌ CollarService: Connection setup failed:', error);
      this.setStatus('error');
      this.lastError = error instanceof Error ? error.message : 'Connection failed';
      
      // Update global store
      this.updateStore();
      
      // Auto-reconnect after 10 seconds
      if (!this.isDestroyed) {
        console.log('🔄 CollarService: Scheduling reconnection in 10 seconds...');
        this.scheduleReconnect();
      }
      
      throw error;
    }
  }

  // Disconnect from collar
  disconnect() {
    console.log('🔌 CollarService: Manual disconnect requested');
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Manual disconnect');
    }
    
    this.stopPing();
    this.setStatus('disconnected');
    this.lastError = null;
    
    // Update global store
    this.updateStore();
  }

  // Destroy service (cleanup)
  destroy() {
    console.log('💀 CollarService: Destroying service');
    this.isDestroyed = true;
    
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.ws) {
      this.ws.close(1000, 'Service destroyed');
    }
    
    this.stopPing();
  }

  // Get current status
  getStatus(): ConnectionStatus {
    return this.status;
  }

  // Get current error
  getError(): string | null {
    return this.lastError;
  }

  // Get WebSocket URL
  getWebSocketUrl(): string | null {
    return this.wsUrl;
  }

  // Private methods
  private setStatus(status: ConnectionStatus) {
    this.status = status;
  }

  private updateStore(data?: CollarData) {
    try {
      const store = usePetgStore.getState();
      
      // Verify store methods exist
      if (!store || typeof store.setCollarConnected !== 'function') {
        console.error('❌ CollarService: Store not available or missing methods');
        return;
      }
      
      // Update connection state
      const isConnected = this.status === 'connected';
      store.setCollarConnected(isConnected);
      
      // Update connection URL
      if (this.wsUrl && typeof store.setConnectionUrl === 'function') {
        store.setConnectionUrl(this.wsUrl);
      }
      
      // Update connection status message
      let statusMessage: 'Ready' | 'Connecting' | 'Connected' | 'Failed';
      switch (this.status) {
        case 'connected':
          statusMessage = 'Connected';
          break;
        case 'connecting':
          statusMessage = 'Connecting';
          break;
        case 'error':
          statusMessage = 'Failed';
          break;
        case 'disconnected':
        default:
          statusMessage = 'Ready';
          break;
      }
      
      if (typeof store.setConnectionStatus === 'function') {
        store.setConnectionStatus(statusMessage);
      }
      if (typeof store.setConnectionMessage === 'function') {
        store.setConnectionMessage(isConnected ? 'Connected to collar' : (this.lastError || statusMessage));
      }
      
      // Update collar data if provided
      if (data && isConnected) {
        console.log('📝 CollarService: Updating store with latest collar data');
        
        // Safely store the raw collar data for components to use
        if (typeof store.setLastCollarData === 'function') {
          store.setLastCollarData(data);
        } else {
          console.error('❌ CollarService: store.setLastCollarData is not a function');
          console.log('🔍 CollarService: Available store methods:', Object.keys(store).filter(key => typeof (store as any)[key] === 'function'));
        }
        
        // You can add more specific data updates here if needed
        // For example, if you have specific store fields for battery level, etc.
      }
      
      console.log(`🏪 CollarService: Store updated - Connected: ${isConnected}, Status: ${statusMessage}`);
    } catch (error) {
      console.error('❌ CollarService: Error updating store:', error);
    }
  }

  private startPing() {
    this.pingInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000); // Ping every 30 seconds
  }

  private stopPing() {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  private scheduleReconnect() {
    if (this.isDestroyed) {
      console.log('⏹️  CollarService: Skipping reconnect - service destroyed');
      return;
    }
    
    // Clear any existing reconnect timeout
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    // Only reconnect if we're genuinely disconnected (not just a temporary issue)
    if (this.status === 'connected') {
      console.log('✅ CollarService: Already connected, skipping reconnect');
      return;
    }
    
    console.log('⏰ CollarService: Scheduling reconnection in 10 seconds...');
    this.reconnectTimeout = setTimeout(async () => {
      if (!this.isDestroyed && this.status !== 'connected' && this.status !== 'connecting') {
        console.log('🔄 CollarService: Attempting automatic reconnection (using cached URL)...');
        try {
          // Use cached URL for reconnection to avoid unnecessary discovery
          await this.connect(true); // skipDiscovery = true
        } catch (error) {
          console.error('❌ CollarService: Auto-reconnection failed:', error);
          // Will schedule another reconnect via the connect() error handling
        }
      } else {
        console.log('✅ CollarService: Connection status changed, skipping reconnect');
      }
    }, 10000); // Increased interval to reduce unnecessary attempts
  }

  // Connect to a specific IP directly (e.g., from collar broadcast)
  async connectToIP(ip: string) {
    console.log(`🎯 CollarService: Connecting directly to IP: ${ip}`);
    
    // 🔒 SECURITY FIX: Use WSS when served over HTTPS to prevent mixed-content blocking
    const protocol = typeof window !== 'undefined' && window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    this.wsUrl = `${protocol}//${ip}:8080`;
    
    console.log(`🔒 Protocol selected: ${protocol} (page served over ${typeof window !== 'undefined' ? window.location.protocol : 'unknown'})`);
    console.log(`🎯 WebSocket URL: ${this.wsUrl}`);
    
    // Disconnect current connection if any
    this.disconnect();
    
    // Small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Connect using the cached URL (skip discovery)
    return this.connect(true); // skipDiscovery = true
  }

  // Force rediscovery of collar IP (useful when switching networks)
  async forceRediscovery() {
    console.log('🔄 CollarService: Forcing IP rediscovery...');
    
    // Clear cached URL to force fresh discovery
    this.wsUrl = null;
    
    // Disconnect current connection
    this.disconnect();
    
    // Small delay to ensure cleanup
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Start fresh connection with discovery
    return this.connect(false); // skipDiscovery = false to force discovery
  }
}

// Create singleton instance
let collarService: CollarWebSocketService | null = null;

export function getCollarService(): CollarWebSocketService {
  if (!collarService) {
    collarService = new CollarWebSocketService();
  }
  return collarService;
}

export function destroyCollarService() {
  if (collarService) {
    collarService.destroy();
    collarService = null;
  }
}

export type { ConnectionStatus, CollarData }; 