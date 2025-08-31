/**
 * 🌐 MQTT Client for HiveMQ Cloud Integration
 * 
 * This provides a cloud-based message broker solution that eliminates
 * the need for WebSocket tunneling from private networks.
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { MQTT_TOPICS, GUEST_DEVICE_ID } from './constants';

// Check if MQTT environment variables are available
const hasMqttConfig = () => {
  const requiredMqttVars = [
    'NEXT_PUBLIC_MQTT_HOST',
    'NEXT_PUBLIC_MQTT_PORT',
    'NEXT_PUBLIC_MQTT_USER',
    'NEXT_PUBLIC_MQTT_PASS'
  ];
  
  return requiredMqttVars.every(key => process.env[key]);
};

// MQTT connection configuration (only created if env vars are available)
const getMqttConfig = (): IClientOptions => {
  if (!hasMqttConfig()) {
    throw new Error('Missing required MQTT environment variables. Please check your .env.local file.');
  }
  
  return {
    host: process.env.NEXT_PUBLIC_MQTT_HOST as string,
    port: parseInt(process.env.NEXT_PUBLIC_MQTT_PORT as string),
    protocol: 'wss', // WebSocket Secure for browser clients
    username: process.env.NEXT_PUBLIC_MQTT_USER as string,
    password: process.env.NEXT_PUBLIC_MQTT_PASS as string,
    connectTimeout: 4000,
    clean: true,
    clientId: `web-client-${Math.random().toString(16).substr(2, 8)}`,
    // Last Will & Testament for web client
    will: {
      topic: 'web/status',
      payload: 'offline',
      qos: 1,
      retain: true
    }
  };
};

// Type definitions for MQTT messages
export interface CollarTelemetryData {
  device_id: string;
  timestamp: number;
  battery_level: number;
  battery_voltage?: number;
  wifi_connected: boolean;
  system_state: 'normal' | 'alert' | 'lowBattery';
  alert_active: boolean;
  uptime: number;
  freeHeap?: number;
  localIP?: string;
  
  // Location data (if GPS available)
  location?: {
    latitude: number;
    longitude: number;
    accuracy: number;
  };
  
  // BLE beacon detection
  beacons?: Array<{
    name: string;
    rssi: number;
    distance: number;
    address?: string;
    first_seen: number;
    last_seen: number;
  }>;
  
  // Scanner statistics
  scanner?: {
    ble_active: boolean;
    beacons_detected: number;
    last_scan: number;
    successful_scans?: number;
    total_scans?: number;
  };
}

export interface CollarStatusData {
  device_id: string;
  status: 'online' | 'offline';
  timestamp: number;
  ip_address?: string;
}

export interface CollarCommandBuzz {
  duration_ms: number;
  pattern?: 'single' | 'double' | 'triple';
}

export interface CollarCommandLED {
  mode: 'on' | 'off' | 'blink' | 'pulse';
  color?: 'red' | 'green' | 'blue' | 'white';
  duration_ms?: number;
}

// MQTT Client Manager Class
export class CollarMQTTClient {
  private client: MqttClient | null = null;
  private isConnected = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  
  // Event handlers
  public onCollarTelemetry?: (collarId: string, data: CollarTelemetryData) => void;
  public onCollarStatus?: (collarId: string, data: CollarStatusData) => void;
  public onConnect?: () => void;
  public onDisconnect?: () => void;
  public onError?: (error: Error) => void;
  public onCollarBeaconDetection?: (collarId: string, beacon: {
    device_id: string;
    timestamp: number;
    beacon_name: string;
    rssi: number;
    distance: number;
    confidence: number;
    address?: string;
  }) => void;

  constructor() {
    // Only connect if MQTT configuration is available
    if (hasMqttConfig()) {
      this.connect();
    }
  }

  private connect() {
    try {
      const config = getMqttConfig();
      this.client = mqtt.connect(config.protocol + '://' + config.host + ':' + config.port + '/mqtt', config);
      
      this.client.on('connect', () => {
        this.isConnected = true;
        
        // Subscribe to collar topics
        this.subscribeToCollarTopics();
        
        // Publish web client online status
        const config = getMqttConfig();
        this.client?.publish(MQTT_TOPICS.WEB_STATUS, JSON.stringify({
          status: 'online',
          timestamp: Date.now(),
          client_id: config.clientId
        }), { qos: 1, retain: true });
        
        this.onConnect?.();
      });
      
      this.client.on('message', (topic: string, message: Buffer) => {
        this.handleMessage(topic, message);
      });
      
      this.client.on('error', (error: Error) => {
        this.isConnected = false;
        this.onError?.(error);
        this.scheduleReconnect();
      });
      
      this.client.on('close', () => {
        this.isConnected = false;
        this.onDisconnect?.();
        this.scheduleReconnect();
      });
      
      this.client.on('offline', () => {
        this.isConnected = false;
      });
      
    } catch (error) {
      this.scheduleReconnect();
    }
  }

  private subscribeToCollarTopics() {
    if (!this.client || !this.isConnected) return;
    
    // Subscribe to all collar topics with wildcards
    const topics = [
      'pet-collar/+/status',      // Any collar's status
      'pet-collar/+/telemetry',   // Any collar's telemetry
      'pet-collar/+/zones',       // Any collar's zones
      'pet-collar/+/location',    // Any collar's location
      'pet-collar/+/beacon-detection', // Any collar's beacon data
      'pet-collar/+/alert'        // Any collar's alerts
    ];
    
    topics.forEach(topic => {
      this.client?.subscribe(topic, { qos: 1 }, (error: Error | null) => {
        if (error) {
          console.error('MQTT subscribe error:', error);
        }
      });
    });
  }

  private handleMessage(topic: string, message: Buffer) {
    try {
      const messageStr = message.toString();
      
      // Parse collar ID from topic (e.g., "pet-collar/001/telemetry" → "001")
      const collarIdMatch = topic.match(/^pet-collar\/([^\/]+)\//);
      if (!collarIdMatch) {
        return;
      }
      
      const collarId = collarIdMatch[1];
      
      // Handle different message types
      if (topic.includes('/telemetry')) {
        const data: CollarTelemetryData = JSON.parse(messageStr);
        // Handle both guest mode and PetCollar-001
        if (data.device_id === '001' || data.device_id === 'ESP32_PET_COLLAR' || data.device_id === 'PetCollar-001') {
          console.log('📡 Received telemetry from collar:', data);
          this.onCollarTelemetry?.(collarId, data);
        }
      } else if (topic.includes('/status')) {
        const data: CollarStatusData = JSON.parse(messageStr);
        // Handle both guest mode and PetCollar-001
        if (data.device_id === '001' || data.device_id === 'ESP32_PET_COLLAR' || data.device_id === 'PetCollar-001') {
          console.log('📡 Received status from collar:', data);
          this.onCollarStatus?.(collarId, data);
        }
      } else if (topic.includes('/zones')) {
        // Zone updates handled by separate component
      } else if (topic.includes('/location')) {
        // Location updates handled by separate component
      } else if (topic.includes('/beacon-detection')) {
        // Parse beacon detection data
        const beaconData = JSON.parse(messageStr);
        
        // Validate required fields
        if (beaconData.beacon_name && beaconData.rssi !== undefined) {
          // For guest mode, override device_id if it matches the pattern
          if (beaconData.device_id === '001' || beaconData.device_id === 'ESP32_PET_COLLAR') {
            beaconData.device_id = GUEST_DEVICE_ID;
          }
          
          // Call the beacon detection handler
          const processedBeacon = {
            device_id: beaconData.device_id || collarId,
            timestamp: beaconData.timestamp || Date.now(),
            beacon_name: beaconData.beacon_name,
            rssi: beaconData.rssi,
            distance: beaconData.distance || 0,
            confidence: beaconData.confidence || 0.5,
            address: beaconData.address
          };
          
          this.onCollarBeaconDetection?.(collarId, processedBeacon);
        }
      } else if (topic.includes('/alert')) {
        // Alert handling in separate component
      }
      
    } catch (error) {
      console.error('MQTT message handling error:', error);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, 5000);
  }

  // Public methods for sending commands
  public sendBuzzCommand(collarId: string, command: CollarCommandBuzz): boolean {
    if (!this.client || !this.isConnected) {
      return false;
    }
    
    const topic = MQTT_TOPICS.COLLAR_COMMAND_BUZZ(collarId);
    const payload = JSON.stringify(command);
    
    this.client.publish(topic, payload, { qos: 1 }, (error?: Error) => {
      if (error) {
        console.error('MQTT publish error:', error);
      }
    });
    
    return true;
  }

  public sendLEDCommand(collarId: string, command: CollarCommandLED): boolean {
    if (!this.client || !this.isConnected) {
      return false;
    }
    
    const topic = MQTT_TOPICS.COLLAR_COMMAND_LED(collarId);
    const payload = JSON.stringify(command);
    
    this.client.publish(topic, payload, { qos: 1 }, (error) => {
      if (error) {
        console.error('MQTT publish error:', error);
      }
    });
    
    return true;
  }

  // Generic publish method for beacon config and test alerts
  public async publish(topic: string, payload: string, options?: { qos?: 0 | 1 | 2; retain?: boolean }): Promise<boolean> {
    return new Promise((resolve) => {
      if (!this.client || !this.isConnected) {
        resolve(false);
        return;
      }
      
      this.client.publish(topic, payload, { qos: 1, ...options }, (error) => {
        if (error) {
          console.error('MQTT publish error:', error);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  }

  public getConnectionStatus(): { connected: boolean; client_id?: string } {
    try {
      const config = getMqttConfig();
      return {
        connected: this.isConnected,
        client_id: config.clientId
      };
    } catch {
      return {
        connected: false,
        client_id: undefined
      };
    }
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.client) {
      // Publish offline status before disconnecting
      try {
        const config = getMqttConfig();
        this.client.publish(MQTT_TOPICS.WEB_STATUS, JSON.stringify({
          status: 'offline',
          timestamp: Date.now(),
          client_id: config.clientId
        }), { qos: 1, retain: true });
      } catch {
        // If MQTT config is not available, just disconnect without publishing
      }
      
      this.client.end();
      this.client = null;
    }
    
    this.isConnected = false;
  }

  public destroy() {
    this.disconnect();
  }
}

// Singleton instance
let mqttClient: CollarMQTTClient | null = null;

export function getMQTTClient(): CollarMQTTClient {
  if (!mqttClient) {
    mqttClient = new CollarMQTTClient();
  }
  return mqttClient;
}

export function destroyMQTTClient() {
  if (mqttClient) {
    mqttClient.destroy();
    mqttClient = null;
  }
}