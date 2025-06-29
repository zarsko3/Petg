/**
 * 🌐 MQTT Client for HiveMQ Cloud Integration
 * 
 * This provides a cloud-based message broker solution that eliminates
 * the need for WebSocket tunneling from private networks.
 */

import mqtt, { MqttClient, IClientOptions } from 'mqtt';

// MQTT connection configuration
const MQTT_CONFIG: IClientOptions = {
      host: process.env.NEXT_PUBLIC_MQTT_HOST || 'ab1d45df84884fd68d24d7d25cc78f2f.s1.eu.hivemq.cloud',
  port: parseInt(process.env.NEXT_PUBLIC_MQTT_PORT || '8884'),
  protocol: 'wss', // WebSocket Secure for browser clients
  username: process.env.NEXT_PUBLIC_MQTT_USER || 'zarsko',
  password: process.env.NEXT_PUBLIC_MQTT_PASS || '089430732zG',
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

// Topic scheme for collar communication (matches ESP32 firmware)
export const MQTT_TOPICS = {
  // Collar status (online/offline)
  COLLAR_STATUS: (collarId: string) => `pet-collar/${collarId}/status`,
  COLLAR_STATUS_WILDCARD: 'pet-collar/+/status',
  
  // Collar telemetry data (position, battery, sensors)
  COLLAR_TELEMETRY: (collarId: string) => `pet-collar/${collarId}/telemetry`, 
  COLLAR_TELEMETRY_WILDCARD: 'pet-collar/+/telemetry',
  
  // Additional firmware topics
  COLLAR_ZONES: (collarId: string) => `pet-collar/${collarId}/zones`,
  COLLAR_ZONES_WILDCARD: 'pet-collar/+/zones',
  COLLAR_LOCATION: (collarId: string) => `pet-collar/${collarId}/location`,
  COLLAR_LOCATION_WILDCARD: 'pet-collar/+/location',
  COLLAR_BEACONS: (collarId: string) => `pet-collar/${collarId}/beacon-detection`,
  COLLAR_BEACONS_WILDCARD: 'pet-collar/+/beacon-detection',
  COLLAR_ALERTS: (collarId: string) => `pet-collar/${collarId}/alert`,
  COLLAR_ALERTS_WILDCARD: 'pet-collar/+/alert',
  
  // Commands to collar
  COLLAR_COMMAND_BUZZ: (collarId: string) => `pet-collar/${collarId}/command/buzz`,
  COLLAR_COMMAND_ZONE: (collarId: string) => `pet-collar/${collarId}/command/zone`,
  COLLAR_COMMAND_LOCATE: (collarId: string) => `pet-collar/${collarId}/command/locate`,
  COLLAR_COMMAND_LED: (collarId: string) => `pet-collar/${collarId}/command/led`,
  COLLAR_COMMAND_SETTINGS: (collarId: string) => `pet-collar/${collarId}/command/settings`,
  
  // Web client status
  WEB_STATUS: 'web/status'
} as const;

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
    this.connect();
  }

  private connect() {
    try {
      console.log('🌐 MQTT: Connecting to HiveMQ cloud...');
      
      const wsUrl = `${MQTT_CONFIG.protocol}://${MQTT_CONFIG.host}:${MQTT_CONFIG.port}/mqtt`;
      console.log(`📡 MQTT: URL: ${wsUrl}`);
      
      this.client = mqtt.connect(wsUrl, MQTT_CONFIG);
      
      this.client.on('connect', () => {
        console.log('✅ MQTT: Connected to HiveMQ cloud');
        this.isConnected = true;
        
        // Subscribe to collar topics
        this.subscribeToCollarTopics();
        
        // Publish web client online status
        this.client?.publish(MQTT_TOPICS.WEB_STATUS, JSON.stringify({
          status: 'online',
          timestamp: Date.now(),
          client_id: MQTT_CONFIG.clientId
        }), { qos: 1, retain: true });
        
        this.onConnect?.();
      });
      
      this.client.on('message', (topic: string, message: Buffer) => {
        this.handleMessage(topic, message);
      });
      
      this.client.on('error', (error: Error) => {
        console.error('❌ MQTT: Connection error:', error);
        this.isConnected = false;
        this.onError?.(error);
        this.scheduleReconnect();
      });
      
      this.client.on('close', () => {
        console.log('🔌 MQTT: Connection closed');
        this.isConnected = false;
        this.onDisconnect?.();
        this.scheduleReconnect();
      });
      
      this.client.on('offline', () => {
        console.log('📡 MQTT: Client went offline');
        this.isConnected = false;
      });
      
    } catch (error) {
      console.error('❌ MQTT: Failed to create connection:', error);
      this.scheduleReconnect();
    }
  }

  private subscribeToCollarTopics() {
    if (!this.client || !this.isConnected) return;
    
    const topics = [
      MQTT_TOPICS.COLLAR_STATUS_WILDCARD,
      MQTT_TOPICS.COLLAR_TELEMETRY_WILDCARD,
      MQTT_TOPICS.COLLAR_ZONES_WILDCARD,
      MQTT_TOPICS.COLLAR_LOCATION_WILDCARD,
      MQTT_TOPICS.COLLAR_BEACONS_WILDCARD,
      MQTT_TOPICS.COLLAR_ALERTS_WILDCARD
    ];
    
    topics.forEach(topic => {
      this.client?.subscribe(topic, { qos: 1 }, (error: Error | null) => {
        if (error) {
          console.error(`❌ MQTT: Failed to subscribe to ${topic}:`, error);
        } else {
          console.log(`✅ MQTT: Subscribed to ${topic}`);
        }
      });
    });
  }

  private handleMessage(topic: string, message: Buffer) {
    try {
      const messageStr = message.toString();
      console.log(`📨 MQTT: Received on ${topic}:`, messageStr);
      
      // Parse collar ID from topic (e.g., "pet-collar/001/telemetry" → "001")
      const collarIdMatch = topic.match(/^pet-collar\/([^\/]+)\//);
      if (!collarIdMatch) {
        console.warn('⚠️ MQTT: Could not parse collar ID from topic:', topic);
        return;
      }
      
      const collarId = collarIdMatch[1];
      
      // Handle different message types
      if (topic.includes('/telemetry')) {
        const data: CollarTelemetryData = JSON.parse(messageStr);
        this.onCollarTelemetry?.(collarId, data);
      } else if (topic.includes('/status')) {
        const data: CollarStatusData = JSON.parse(messageStr);
        this.onCollarStatus?.(collarId, data);
      } else if (topic.includes('/zones')) {
        console.log(`🗺️ MQTT: Zone data for collar ${collarId}:`, messageStr);
      } else if (topic.includes('/location')) {
        console.log(`📍 MQTT: Location data for collar ${collarId}:`, messageStr);
      } else if (topic.includes('/beacon-detection')) {
        console.log(`📡 MQTT: Beacon detection for collar ${collarId}:`, messageStr);
        
        // Parse beacon detection data
        const beaconData = JSON.parse(messageStr);
        
        // Validate required fields
        if (beaconData.beacon_name && beaconData.rssi !== undefined) {
          console.log(`🔍 MQTT: Processing beacon detection: ${beaconData.beacon_name} (${beaconData.rssi}dBm, ${beaconData.distance}cm)`);
          
          // Call the beacon detection handler
          this.onCollarBeaconDetection?.(collarId, {
            device_id: beaconData.device_id || collarId,
            timestamp: beaconData.timestamp || Date.now(),
            beacon_name: beaconData.beacon_name,
            rssi: beaconData.rssi,
            distance: beaconData.distance || 0,
            confidence: beaconData.confidence || 0.5,
            address: beaconData.address
          });
        } else {
          console.warn('⚠️ MQTT: Invalid beacon detection data - missing beacon_name or rssi:', beaconData);
        }
      } else if (topic.includes('/alert')) {
        console.log(`🚨 MQTT: Alert from collar ${collarId}:`, messageStr);
      }
      
    } catch (error) {
      console.error('❌ MQTT: Error parsing message:', error);
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    
    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 MQTT: Attempting to reconnect...');
      this.connect();
    }, 5000);
  }

  // Public methods for sending commands
  public sendBuzzCommand(collarId: string, command: CollarCommandBuzz): boolean {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ MQTT: Not connected, cannot send buzz command');
      return false;
    }
    
    const topic = MQTT_TOPICS.COLLAR_COMMAND_BUZZ(collarId);
    const payload = JSON.stringify(command);
    
    this.client.publish(topic, payload, { qos: 1 }, (error?: Error) => {
      if (error) {
        console.error('❌ MQTT: Failed to send buzz command:', error);
      } else {
        console.log(`✅ MQTT: Sent buzz command to collar ${collarId}`);
      }
    });
    
    return true;
  }

  public sendLEDCommand(collarId: string, command: CollarCommandLED): boolean {
    if (!this.client || !this.isConnected) {
      console.warn('⚠️ MQTT: Not connected, cannot send LED command');
      return false;
    }
    
    const topic = MQTT_TOPICS.COLLAR_COMMAND_LED(collarId);
    const payload = JSON.stringify(command);
    
    this.client.publish(topic, payload, { qos: 1 }, (error?: Error) => {
      if (error) {
        console.error('❌ MQTT: Failed to send LED command:', error);
      } else {
        console.log(`✅ MQTT: Sent LED command to collar ${collarId}`);
      }
    });
    
    return true;
  }

  public getConnectionStatus(): { connected: boolean; client_id?: string } {
    return {
      connected: this.isConnected,
      client_id: MQTT_CONFIG.clientId
    };
  }

  public disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    if (this.client) {
      // Publish offline status before disconnecting
      this.client.publish(MQTT_TOPICS.WEB_STATUS, JSON.stringify({
        status: 'offline',
        timestamp: Date.now(),
        client_id: MQTT_CONFIG.clientId
      }), { qos: 1, retain: true });
      
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