import mqtt, { MqttClient, IClientOptions } from 'mqtt';
import { MQTT_TOPICS, GUEST_DEVICE_ID } from './constants';
import { deviceStatusSchema, deviceTelemetrySchema, deviceCommandSchema, commandAckSchema } from './schema';
import { getPersistentClientId } from './mqtt-persistence';

// Freeze environment variables at module load
const ENV = {
  HOST: process.env.NEXT_PUBLIC_MQTT_HOST,
  PORT: process.env.NEXT_PUBLIC_MQTT_PORT,
  USER: process.env.NEXT_PUBLIC_MQTT_USER,
  PASS: process.env.NEXT_PUBLIC_MQTT_PASS
};

// Check if MQTT configuration is available
export function hasMqttConfig(): boolean {
  return !!(ENV.HOST && ENV.PORT && ENV.USER && ENV.PASS);
}

// Get MQTT configuration
function getMqttConfig(): IClientOptions {
  if (!hasMqttConfig()) {
    throw new Error('Missing required MQTT environment variables.');
  }

  return {
    protocol: 'wss',
    username: ENV.USER!,
    password: ENV.PASS!,
    connectTimeout: 4000,
    clean: true,
    clientId: getPersistentClientId(),
    // LWT for the web client:
    will: {
      topic: 'web/status',
      payload: 'offline',
      qos: 1,
      retain: true
    }
  };
}

// Callback types
type DeviceStatusCallback = (deviceId: string, status: 'online' | 'offline') => void;
type DeviceTelemetryCallback = (deviceId: string, data: any) => void;
type CommandAckCallback = (deviceId: string, data: any) => void;

// MQTT Client class
export class CollarMQTTClient {
  private client: MqttClient | null = null;
  private isConnected: boolean = false;
  private isConnecting: boolean = false;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;

  // Callbacks
  private onDeviceStatus?: DeviceStatusCallback;
  private onDeviceTelemetry?: DeviceTelemetryCallback;
  private onCommandAck?: CommandAckCallback;

  constructor() {
    // Prevent instantiation during SSR
    if (typeof window === 'undefined') {
      console.warn('MQTT client can only be used in the browser');
      return;
    }

    if (!hasMqttConfig()) {
      console.warn('MQTT configuration missing');
      return;
    }
  }

  // Connect to MQTT broker
  async connect(): Promise<void> {
    if (typeof window === 'undefined') return;
    
    if (this.isConnected || this.isConnecting) return;
    this.isConnecting = true;

    try {
      const { default: mqtt } = await import('mqtt');
      const config = getMqttConfig();
      const url = `wss://${ENV.HOST}:${ENV.PORT}/mqtt`;

      console.log('📡 Connecting to MQTT:', {
        url,
        clientId: config.clientId,
        clean: config.clean
      });

      this.client = mqtt.connect(url, config);

      this.client.on('connect', () => {
        console.log('✅ MQTT Connected');
        this.isConnected = true;
        this.isConnecting = false;
        this.reconnectAttempts = 0;

        // Publish online status
        this.client?.publish('web/status', 'online', { 
          qos: 1, 
          retain: true 
        });
      });

      this.client.on('error', (error) => {
        console.error('❌ MQTT Error:', error);
        this.isConnected = false;
      });

      this.client.on('close', () => {
        console.log('📡 MQTT Connection closed');
        this.isConnected = false;
        this.scheduleReconnect();
      });

      this.client.on('message', this.handleMessage.bind(this));

    } catch (error) {
      console.error('❌ MQTT Connection error:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // Handle incoming MQTT messages
  private handleMessage(topic: string, message: Buffer) {
    try {
      const messageStr = message.toString();
      const collarId = topic.split('/')[1]; // pet-collar/<id>/...

      if (topic.includes('/telemetry')) {
        const data = JSON.parse(messageStr);
        // Handle both guest mode and PetCollar-001
        if (data.device_id === '001' || data.device_id === 'ESP32_PET_COLLAR' || data.device_id === 'PetCollar-001') {
          console.log('📡 Received telemetry from collar:', data);
          this.onDeviceTelemetry?.(collarId, data);
        }
      } else if (topic.includes('/status')) {
        const data = deviceStatusSchema.parse(JSON.parse(messageStr));
        // Handle both guest mode and PetCollar-001
        if (data.device_id === '001' || data.device_id === 'ESP32_PET_COLLAR' || data.device_id === 'PetCollar-001') {
          console.log('📡 Received status from collar:', data);
          this.onDeviceStatus?.(collarId, data.status);
        }
      } else if (topic.includes('/command/ack')) {
        const data = commandAckSchema.parse(JSON.parse(messageStr));
        this.onCommandAck?.(collarId, data);
      }
    } catch (error) {
      console.error('MQTT message handling error:', error);
    }
  }

  // Subscribe to device status updates
  subscribeToDeviceStatus(deviceId: string, callback: DeviceStatusCallback) {
    if (!this.client) return;
    
    const topic = deviceId === '*' 
      ? 'pet-collar/+/status'
      : `pet-collar/${deviceId}/status`;
      
    this.client.subscribe(topic);
    this.onDeviceStatus = callback;
  }

  // Subscribe to device telemetry
  subscribeToDeviceTelemetry(deviceId: string, callback: DeviceTelemetryCallback) {
    if (!this.client) return;
    
    const topic = deviceId === '*'
      ? 'pet-collar/+/telemetry'
      : `pet-collar/${deviceId}/telemetry`;
      
    this.client.subscribe(topic);
    this.onDeviceTelemetry = callback;
  }

  // Subscribe to command acknowledgments
  subscribeToCommandAck(deviceId: string, callback: CommandAckCallback) {
    if (!this.client) return;
    
    const topic = `pet-collar/${deviceId}/command/ack`;
    this.client.subscribe(topic);
    this.onCommandAck = callback;
  }

  // Unsubscribe from device status
  unsubscribeFromDeviceStatus(deviceId: string) {
    if (!this.client) return;
    
    const topic = deviceId === '*'
      ? 'pet-collar/+/status'
      : `pet-collar/${deviceId}/status`;
      
    this.client.unsubscribe(topic);
    this.onDeviceStatus = undefined;
  }

  // Send buzz command
  async sendBuzzCommand(collarId: string, command: { duration_ms: number; pattern?: string; intensity?: number }): Promise<boolean> {
    return new Promise((resolve, reject) => {
      if (!hasMqttConfig()) {
        const error = new Error('MQTT configuration missing. Please check environment variables.');
        console.error('❌ Cannot send buzz command:', error.message);
        reject(error);
        return;
      }

      if (!this.client) {
        const error = new Error('MQTT client not initialized. Configuration may be missing.');
        console.error('❌ Cannot send buzz command:', error.message);
        reject(error);
        return;
      }

      if (!this.isConnected) {
        const error = new Error('MQTT client not connected. Please check connection status.');
        console.error('❌ Cannot send buzz command:', error.message);
        reject(error);
        return;
      }
      
      // Topic must be: pet-collar/<id>/command/buzz
      const topic = `pet-collar/${collarId}/command/buzz`;
      const payload = JSON.stringify({
        duration_ms: command.duration_ms || 1200,
        pattern: command.pattern || 'single',
        intensity: command.intensity || 180
      });
      
      console.log('📡 Sending buzz command:', {
        topic,
        payload,
        connected: this.isConnected,
        clientId: this.client.options.clientId
      });
      
      try {
        this.client.publish(topic, payload, { qos: 1 }, (error?: Error) => {
          if (error) {
            console.error('❌ MQTT publish error:', error);
            reject(error);
          } else {
            console.log('✅ Buzz command sent successfully');
            resolve(true);
          }
        });
      } catch (error) {
        console.error('❌ MQTT publish exception:', error);
        reject(error);
      }
    });
  }

  // Schedule reconnection with exponential backoff
  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    // Implement exponential backoff with max attempts
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Please check your connection and reload the page.');
      return;
    }

    const backoffDelay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000); // Max 30 seconds
    this.reconnectAttempts++;

    console.log('⏳ Scheduling reconnect:', {
      attempt: this.reconnectAttempts,
      delay: backoffDelay,
      maxAttempts: this.maxReconnectAttempts
    });
    
    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, backoffDelay);
  }
}

// Singleton instance
let mqttClient: CollarMQTTClient | null = null;

export function getMQTTClient(): CollarMQTTClient {
  if (typeof window === 'undefined') {
    throw new Error('MQTT client can only be used in the browser');
  }
  
  if (!mqttClient) {
    mqttClient = new CollarMQTTClient();
    mqttClient.connect();
  }
  return mqttClient;
}