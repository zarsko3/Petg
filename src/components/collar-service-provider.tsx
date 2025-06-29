'use client';

import { useEffect, createContext, useContext, useState, useRef } from 'react';
import { getMQTTClient, CollarTelemetryData } from '@/lib/mqtt-client';
import { usePetgStore } from '@/lib/store';
import { toast } from 'sonner';

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
  
  // Telemetry watchdog ref - use number for setTimeout return type
  const telemetryWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  
  const isLive = status === 'connected'
  
  // Telemetry watchdog function
  const startTelemetryWatchdog = () => {
    if (telemetryWatchdogRef.current) {
      clearTimeout(telemetryWatchdogRef.current)
    }
    
    telemetryWatchdogRef.current = setTimeout(() => {
      if (status === 'connected') {
        toast.info('Awaiting live data…', {
          description: 'MQTT connected but no telemetry received'
        })
      }
    }, 10000) // 10 second timeout
  }
  
  const resetTelemetryWatchdog = () => {
    if (telemetryWatchdogRef.current) {
      clearTimeout(telemetryWatchdogRef.current)
      telemetryWatchdogRef.current = null
    }
  }
  
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
          
          // Start telemetry watchdog
          startTelemetryWatchdog();
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
          
          // Clear watchdog on disconnect
          resetTelemetryWatchdog();
        };
        
        mqttClient.onCollarStatus = (collarId: string, data) => {
          console.log(`📡 CollarServiceProvider: Status from ${collarId}:`, data);
          
          // Check for device_id "001" and status "online" to exit demo mode
          if (data.device_id === "001" && data.status === 'online') {
            console.log('🎯 CollarServiceProvider: Device 001 online - exiting demo mode');
            store.setDemoMode(false);
            toast.success('Live Mode Activated', {
              description: 'Collar 001 is now online'
            });
          }
          
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
            
            // Reset watchdog since we got data
            resetTelemetryWatchdog();
            startTelemetryWatchdog();
          } else {
            setStatus('disconnected');
            setCollarData(null);
            setLastHeartbeat(null);
            setConnectedIP(null);
            resetTelemetryWatchdog();
          }
        };
        
        mqttClient.onCollarTelemetry = (collarId: string, data: CollarTelemetryData) => {
          console.log(`📊 CollarServiceProvider: Telemetry from ${collarId}:`, data);
          
          // Reset telemetry watchdog since we received data
          resetTelemetryWatchdog();
          startTelemetryWatchdog();
          
          // Transform MQTT telemetry to collar data format
          const telemetryCollarData: CollarData = {
            position: data.location ? { 
              x: data.location.latitude, 
              y: data.location.longitude 
            } : { x: 50, y: 50 },
            battery: data.battery_level || 85,
            rssi: data.beacons?.[0]?.rssi || -45, // Use first beacon RSSI if available
            temperature: 20, // Temperature not in telemetry data yet
            humidity: 60, // Humidity not in telemetry data yet
            timestamp: new Date().toISOString()
          };
          
          setCollarData(telemetryCollarData);
          setLastHeartbeat(new Date()); // Treat telemetry as heartbeat
          setStatus('connected');
          
          // Update global store with processed telemetry data
          store.setLastCollarData(data);
          store.setLastDataReceived(Date.now());
          
          // If this is from device_id "001", ensure demo mode is off
          if (data.device_id === "001") {
            console.log('📊 Telemetry from device 001 - ensuring demo mode is off');
            store.setDemoMode(false);
          }
          
          // Process beacon data if available in telemetry
          if (data.beacons && data.beacons.length > 0) {
            console.log(`📍 CollarServiceProvider: Beacon data from telemetry (${data.beacons.length} beacons)`);
            
            const currentData = store.lastCollarData || {};
            const updatedData = {
              ...currentData,
              beacons: data.beacons,
              beacon_scan: {
                active: data.scanner?.ble_active || true,
                last_scan: data.scanner?.last_scan || Date.now(),
                detected_count: data.beacons.length
              }
            };
            
            store.setLastCollarData(updatedData);
          }
        };
        
        mqttClient.onCollarBeaconDetection = (collarId: string, beacon) => {
          console.log(`🔍 CollarServiceProvider: Beacon detection from ${collarId}:`, beacon);
          
          // Check for device_id "001" and exit demo mode if needed
          if (beacon.device_id === "001" || collarId === "001") {
            console.log('🔍 Beacon detection from device 001 - ensuring demo mode is off');
            store.setDemoMode(false);
            // TODO: Remove this toast once we confirm the list updates work correctly
            // toast.success('Live Beacon Data', {
            //   description: `Detected ${beacon.beacon_name} via collar 001`
            // });
          }
          
          // Add or update beacon in the store (store handles the logic)
          const beaconId = beacon.address || beacon.beacon_name || `beacon-${Date.now()}`;
          const storeBeacon = {
            id: beaconId,
            name: beacon.beacon_name,
            rssi: beacon.rssi,
            distance: beacon.distance,
            confidence: beacon.confidence,
            timestamp: beacon.timestamp,
            address: beacon.address,
            collarId: collarId
          };
          
          store.addOrUpdateBeacon(storeBeacon);
          console.log(`📊 Beacon stored: ${beacon.beacon_name} (${beacon.rssi}dBm, ${beacon.distance.toFixed(1)}cm)`);
          
          // Clean up old beacons (older than 5 minutes)
          store.cleanupOldBeacons(300000);
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
          resetTelemetryWatchdog();
        };
        
        console.log('✅ CollarServiceProvider: MQTT client initialized');
        
      } catch (error) {
        console.error('❌ CollarServiceProvider: MQTT initialization failed:', error);
        resetTelemetryWatchdog();
      }
    };
    
    initializeMQTT();
    
    return () => {
      console.log('🧹 CollarServiceProvider: Cleaning up MQTT client...');
      resetTelemetryWatchdog();
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
    resetTelemetryWatchdog()
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