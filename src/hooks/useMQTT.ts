/**
 * 🔌 React Hook for MQTT Integration
 * 
 * Provides collar telemetry data, status updates, and command sending
 * capabilities through HiveMQ cloud broker
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { 
  getMQTTClient, 
  CollarTelemetryData, 
  CollarStatusData, 
  CollarCommandBuzz, 
  CollarCommandLED,
  type CollarMQTTClient 
} from '@/lib/mqtt-client';

interface CollarState {
  status: 'online' | 'offline' | 'unknown';
  lastSeen: number | null;
  telemetry: CollarTelemetryData | null;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'disconnected';
}

interface MQTTState {
  isConnected: boolean;
  client_id?: string;
  collars: Record<string, CollarState>;
  lastActivity: number | null;
  connectionAttempts: number;
  totalMessagesReceived: number;
}

interface UseMQTTReturn {
  // Connection state
  state: MQTTState;
  
  // Commands
  sendBuzzCommand: (collarId: string, duration: number, pattern?: 'single' | 'double' | 'triple') => Promise<boolean>;
  sendLEDCommand: (collarId: string, mode: 'on' | 'off' | 'blink' | 'pulse', color?: string, duration?: number) => Promise<boolean>;
  
  // Utilities
  getCollarState: (collarId: string) => CollarState | null;
  getOnlineCollars: () => string[];
  getCollarTelemetry: (collarId: string) => CollarTelemetryData | null;
  
  // Connection management
  reconnect: () => void;
  disconnect: () => void;
}

export function useMQTT(): UseMQTTReturn {
  const mqttClientRef = useRef<CollarMQTTClient | null>(null);
  
  const [state, setState] = useState<MQTTState>({
    isConnected: false,
    collars: {},
    lastActivity: null,
    connectionAttempts: 0,
    totalMessagesReceived: 0
  });

  // Initialize MQTT client
  useEffect(() => {
    console.log('🚀 useMQTT: Initializing MQTT client');
    
    try {
      mqttClientRef.current = getMQTTClient();
      
      // Set up event handlers
      mqttClientRef.current.onConnect = () => {
        console.log('✅ useMQTT: MQTT connected');
        setState(prev => ({
          ...prev,
          isConnected: true,
          client_id: mqttClientRef.current?.getConnectionStatus().client_id,
          connectionAttempts: prev.connectionAttempts + 1
        }));
      };

      mqttClientRef.current.onDisconnect = () => {
        console.log('🔌 useMQTT: MQTT disconnected');
        setState(prev => ({
          ...prev,
          isConnected: false,
          // Mark all collars as unknown status when MQTT disconnects
          collars: Object.fromEntries(
            Object.entries(prev.collars).map(([id, collar]) => [
              id, 
              { ...collar, status: 'unknown' as const, connectionQuality: 'disconnected' as const }
            ])
          )
        }));
      };

      mqttClientRef.current.onError = (error: Error) => {
        console.error('❌ useMQTT: MQTT error:', error);
      };

      mqttClientRef.current.onCollarStatus = (collarId: string, data: CollarStatusData) => {
        console.log(`📊 useMQTT: Collar ${collarId} status:`, data);
        
        setState(prev => ({
          ...prev,
          lastActivity: Date.now(),
          totalMessagesReceived: prev.totalMessagesReceived + 1,
          
          collars: {
            ...prev.collars,
            [collarId]: {
              ...prev.collars[collarId],
              status: data.status,
              lastSeen: data.timestamp,
              connectionQuality: data.status === 'online' ? 'excellent' : 'disconnected'
            }
          }
        }));
      };

      mqttClientRef.current.onCollarTelemetry = (collarId: string, data: CollarTelemetryData) => {
        console.log(`📈 useMQTT: Collar ${collarId} telemetry:`, data);
        
        // Calculate connection quality based on telemetry data
        let connectionQuality: CollarState['connectionQuality'] = 'excellent';
        if (data.battery_level < 20) connectionQuality = 'poor';
        else if (data.battery_level < 50) connectionQuality = 'good';
        
        setState(prev => ({
          ...prev,
          lastActivity: Date.now(),
          totalMessagesReceived: prev.totalMessagesReceived + 1,
          
          collars: {
            ...prev.collars,
            [collarId]: {
              ...prev.collars[collarId],
              status: 'online',
              lastSeen: Date.now(),
              telemetry: data,
              connectionQuality
            }
          }
        }));
      };

      // Get initial connection status
      const status = mqttClientRef.current.getConnectionStatus();
      setState(prev => ({
        ...prev,
        isConnected: status.connected,
        client_id: status.client_id
      }));

    } catch (error) {
      console.error('❌ useMQTT: Failed to initialize MQTT client:', error);
    }

    // Cleanup on unmount
    return () => {
      console.log('🧹 useMQTT: Cleaning up MQTT client');
      mqttClientRef.current?.disconnect();
    };
  }, []);

  // Command functions
  const sendBuzzCommand = useCallback(async (
    collarId: string, 
    duration: number, 
    pattern: 'single' | 'double' | 'triple' = 'single'
  ): Promise<boolean> => {
    if (!mqttClientRef.current) {
      console.warn('⚠️ useMQTT: MQTT client not initialized');
      return false;
    }

    const command: CollarCommandBuzz = {
      duration_ms: duration,
      pattern
    };

    const success = mqttClientRef.current.sendBuzzCommand(collarId, command);
    
    if (success) {
      console.log(`🔊 useMQTT: Sent buzz command to collar ${collarId}: ${duration}ms ${pattern}`);
    }
    
    return success;
  }, []);

  const sendLEDCommand = useCallback(async (
    collarId: string,
    mode: 'on' | 'off' | 'blink' | 'pulse',
    color: string = 'white',
    duration?: number
  ): Promise<boolean> => {
    if (!mqttClientRef.current) {
      console.warn('⚠️ useMQTT: MQTT client not initialized');
      return false;
    }

    const command: CollarCommandLED = {
      mode,
      color: color as any,
      duration_ms: duration
    };

    const success = mqttClientRef.current.sendLEDCommand(collarId, command);
    
    if (success) {
      console.log(`💡 useMQTT: Sent LED command to collar ${collarId}: ${mode} ${color}`);
    }
    
    return success;
  }, []);

  // Utility functions
  const getCollarState = useCallback((collarId: string): CollarState | null => {
    return state.collars[collarId] || null;
  }, [state.collars]);

  const getOnlineCollars = useCallback((): string[] => {
    return Object.entries(state.collars)
      .filter(([, collar]) => collar.status === 'online')
      .map(([id]) => id);
  }, [state.collars]);

  const getCollarTelemetry = useCallback((collarId: string): CollarTelemetryData | null => {
    return state.collars[collarId]?.telemetry || null;
  }, [state.collars]);

  const reconnect = useCallback(() => {
    console.log('🔄 useMQTT: Manual reconnect requested');
    mqttClientRef.current?.disconnect();
    
    setTimeout(() => {
      mqttClientRef.current = getMQTTClient();
    }, 1000);
  }, []);

  const disconnect = useCallback(() => {
    console.log('🔌 useMQTT: Manual disconnect requested');
    mqttClientRef.current?.disconnect();
    setState(prev => ({ ...prev, isConnected: false }));
  }, []);

  return {
    state,
    sendBuzzCommand,
    sendLEDCommand,
    getCollarState,
    getOnlineCollars,
    getCollarTelemetry,
    reconnect,
    disconnect
  };
} 