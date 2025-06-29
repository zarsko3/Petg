  'use client';

import { useEffect, createContext, useContext, useState } from 'react';
import { getMQTTClient } from '@/lib/mqtt-client';
import { usePetgStore } from '@/lib/store';

interface CollarData {
  position?: { x: number; y: number }
  battery?: number
  rssi?: number
  temperature?: number
  humidity?: number
  timestamp?: string
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface CollarConnectionContextType {
  status: ConnectionStatus
  collarData: CollarData | null
  lastHeartbeat: Date | null
  connect: () => Promise<void>
  disconnect: () => void
  isLive: boolean
  connectionDuration: number
  connectedIP: string | null
}

const CollarConnectionContext = createContext<CollarConnectionContextType | undefined>(undefined)

interface CollarServiceProviderProps {
  children: React.ReactNode;
}

export function CollarServiceProvider({ children }: CollarServiceProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [collarData, setCollarData] = useState<CollarData | null>(null)
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null)
  const [connectionDuration, setConnectionDuration] = useState(0)
  const [connectedIP, setConnectedIP] = useState<string | null>(null)
  
  const isLive = status === 'connected'
  useEffect(() => {
    console.log('🚀 CollarServiceProvider: Starting MQTT client...');
    
    // Initialize MQTT client for cloud connectivity
    const initializeMQTT = async () => {
      try {
        const mqttClient = getMQTTClient();
        const store = usePetgStore.getState();
        
        // Set up event handlers
        mqttClient.onConnect = () => {
          console.log('✅ CollarServiceProvider: MQTT connected');
          setStatus('connecting'); // Set to connecting first, will be set to connected when we get collar status
          store.setCollarConnected(true);
          store.setConnectionStatus('Connected');
          store.setConnectionMessage('Connected to HiveMQ Cloud');
        };
        
        mqttClient.onDisconnect = () => {
          console.log('🔌 CollarServiceProvider: MQTT disconnected');
          setStatus('disconnected');
          setCollarData(null);
          setLastHeartbeat(null);
          setConnectedIP(null);
          store.setCollarConnected(false);
          store.setConnectionStatus('Failed');
          store.setConnectionMessage('MQTT connection lost');
        };
        
        mqttClient.onCollarStatus = (collarId: string, data) => {
          console.log(`📡 CollarServiceProvider: Status from ${collarId}:`, data);
          if (data.status === 'online') {
            setStatus('connected');
            setConnectedIP(data.ip_address || 'MQTT Cloud');
            setLastHeartbeat(new Date());
            
            // Create collar data from status message
            const statusCollarData: CollarData = {
              position: { x: 50, y: 50 }, // Default position
              battery: 85, // Default battery
              rssi: -45, // Default signal
              temperature: 20, // Default temp
              humidity: 60, // Default humidity
              timestamp: new Date().toISOString()
            };
            setCollarData(statusCollarData);
            
            store.setCollarConnected(true);
            store.setConnectionStatus('Connected');
            store.setConnectionMessage(`Collar ${collarId} online`);
            store.setLastCollarData(data);
            store.setLastDataReceived(Date.now());
          } else {
            setStatus('disconnected');
            setCollarData(null);
            setLastHeartbeat(null);
            setConnectedIP(null);
          }
        };
        
        mqttClient.onCollarTelemetry = (collarId: string, data) => {
          console.log(`📊 CollarServiceProvider: Telemetry from ${collarId}:`, data);
          
          // Transform MQTT telemetry to collar data format
          const telemetryCollarData: CollarData = {
            position: { x: 50, y: 50 }, // TODO: Extract from data if available
            battery: data.battery_level || 85,
            rssi: -45, // TODO: Extract from data if available  
            temperature: 20, // TODO: Extract from data if available
            humidity: 60, // TODO: Extract from data if available
            timestamp: new Date().toISOString()
          };
          
          setCollarData(telemetryCollarData);
          setLastHeartbeat(new Date()); // Treat telemetry as heartbeat
          setStatus('connected');
          
          store.setLastCollarData(data);
          store.setLastDataReceived(Date.now());
        };
        
        mqttClient.onError = (error) => {
          console.error('❌ CollarServiceProvider: MQTT error:', error);
          setStatus('disconnected');
          setCollarData(null);
          setLastHeartbeat(null);
          setConnectedIP(null);
          store.setCollarConnected(false);
          store.setConnectionStatus('Failed');
          store.setConnectionMessage('MQTT connection error');
        };
        
        console.log('✅ CollarServiceProvider: MQTT client initialized');
        
      } catch (error) {
        console.error('❌ CollarServiceProvider: MQTT initialization failed:', error);
      }
    };
    
    initializeMQTT();
    
    return () => {
      console.log('🧹 CollarServiceProvider: Cleaning up MQTT client...');
      // Note: MQTT client manages its own lifecycle
    };
  }, []);

  // Connection duration counter
  useEffect(() => {
    if (status === 'connected' && lastHeartbeat) {
      const interval = setInterval(() => {
        const duration = Math.floor((Date.now() - lastHeartbeat.getTime()) / 1000)
        setConnectionDuration(duration)
      }, 1000)
      
      return () => clearInterval(interval)
    } else {
      setConnectionDuration(0)
    }
  }, [status, lastHeartbeat])

  // Dummy functions for compatibility (MQTT handles connection automatically)
  const connect = async () => {
    console.log('🔄 Manual connect called (MQTT handles this automatically)')
  }
  
  const disconnect = () => {
    console.log('🔌 Manual disconnect called')
    setStatus('disconnected')
    setCollarData(null)
    setLastHeartbeat(null)
    setConnectedIP(null)
  }

  const contextValue: CollarConnectionContextType = {
    status,
    collarData,
    lastHeartbeat,
    connect,
    disconnect,
    isLive,
    connectionDuration,
    connectedIP
  }

  return (
    <CollarConnectionContext.Provider value={contextValue}>
      {children}
    </CollarConnectionContext.Provider>
  );
}

export function useCollarConnection() {
  const context = useContext(CollarConnectionContext)
  if (context === undefined) {
    throw new Error('useCollarConnection must be used within a CollarServiceProvider')
  }
  return context
} 