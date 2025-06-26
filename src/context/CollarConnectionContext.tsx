'use client'

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react'
import { toast } from 'sonner'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected'

interface CollarData {
  position?: { x: number; y: number }
  battery?: number
  rssi?: number
  temperature?: number
  humidity?: number
  timestamp?: string
}

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

interface CollarConnectionProviderProps {
  children: React.ReactNode
}

export function CollarConnectionProvider({ children }: CollarConnectionProviderProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [collarData, setCollarData] = useState<CollarData | null>(null)
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null)
  const [connectionDuration, setConnectionDuration] = useState(0)
  const [connectedIP, setConnectedIP] = useState<string | null>(null)
  
  const wsRef = useRef<WebSocket | null>(null)
  const discoveryWsRef = useRef<WebSocket | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const connectionTimerRef = useRef<number | null>(null)
  const failoverTimeoutRef = useRef<number | null>(null)
  const connectStartTime = useRef<Date | null>(null)

  const isLive = status === 'connected'

  // Clean up function
  const cleanup = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close()
      wsRef.current = null
    }
    if (discoveryWsRef.current) {
      discoveryWsRef.current.close()
      discoveryWsRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    if (connectionTimerRef.current) {
      clearInterval(connectionTimerRef.current)
      connectionTimerRef.current = null
    }
    if (failoverTimeoutRef.current) {
      clearTimeout(failoverTimeoutRef.current)
      failoverTimeoutRef.current = null
    }
  }, [])

  // Auto-failover if no heartbeat received for >5s
  const resetFailoverTimeout = useCallback(() => {
    if (failoverTimeoutRef.current) {
      clearTimeout(failoverTimeoutRef.current)
    }
    
    if (status === 'connected') {
      failoverTimeoutRef.current = setTimeout(() => {
        console.log('💔 No heartbeat received for 5s, switching to demo data')
        setStatus('disconnected')
        setCollarData(null)
        setLastHeartbeat(null)
        cleanup()
        
        // Show toast after 3s debounce
        setTimeout(() => {
          toast.error('Lost connection to collar – showing demo data')
        }, 3000)
      }, 5000)
    }
  }, [status, cleanup])

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const message = JSON.parse(event.data)
      console.log('📡 Received collar message:', message)

      switch (message.type) {
        case 'HEARTBEAT':
          console.log('💓 Heartbeat received from collar')
          setLastHeartbeat(new Date())
          resetFailoverTimeout()
          
          // Send ACK reply
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'ACK',
              id: 'HEARTBEAT',
              timestamp: Date.now()
            }))
          }
          
          // Update status to connected if still connecting
          if (status === 'connecting') {
            setStatus('connected')
            connectStartTime.current = new Date()
            console.log('✅ Collar connection established')
            toast.success('Connected to collar - showing live data')
          }
          break

        case 'COLLAR_DATA':
          console.log('📊 Live collar data received (raw):', event.data)
          console.log('📊 Live collar data (parsed):', message.data)
          
          // Enhanced battery parsing with detailed logging
          let batteryLevel = 85; // default
          const data = message.data;
          if (data.battery !== undefined) {
            batteryLevel = Number(data.battery);
            console.log('🔋 Battery found in data.battery:', data.battery, '-> parsed as:', batteryLevel);
          } else if (data.bat !== undefined) {
            batteryLevel = Number(data.bat);
            console.log('🔋 Battery found in data.bat:', data.bat, '-> parsed as:', batteryLevel);
          } else if (data.power !== undefined) {
            batteryLevel = Number(data.power);
            console.log('🔋 Battery found in data.power:', data.power, '-> parsed as:', batteryLevel);
          } else if (data.voltage !== undefined) {
            // Convert voltage to percentage (typical LiPo: 3.0V = 0%, 4.2V = 100%)
            const voltage = Number(data.voltage);
            batteryLevel = Math.max(0, Math.min(100, ((voltage - 3.0) / 1.2) * 100));
            console.log('🔋 Battery calculated from voltage:', voltage, 'V -> ', batteryLevel, '%');
          } else {
            console.log('⚠️ No battery information found in collar data. Available fields:', Object.keys(data));
          }
          
          setCollarData({
            position: data.position || data.pos || { x: 50, y: 50 },
            battery: Math.round(batteryLevel),
            rssi: data.rssi || data.signal || -45,
            temperature: data.temperature || data.temp || 20,
            humidity: data.humidity || data.hum || 60,
            timestamp: new Date().toISOString()
          })
          resetFailoverTimeout()
          break

        case 'POSITION_UPDATE':
          console.log('📍 Position update:', message.data)
          setCollarData(prev => ({
            ...prev,
            position: message.data,
            timestamp: new Date().toISOString()
          }))
          resetFailoverTimeout()
          break

        default:
          console.log('📝 Unknown message type:', message.type)
      }
    } catch (error) {
      console.error('❌ Error parsing collar message:', error)
    }
  }, [status, resetFailoverTimeout])

  // Connect to specific collar IP
  const connectToCollar = useCallback(async (ip: string) => {
    console.log(`🔗 Connecting to collar at ${ip}... (current status: ${status}, connectedIP: ${connectedIP})`);
    
    // Avoid duplicate connections
    if (connectedIP === ip && status === 'connected') {
      console.log('💡 Already connected to this collar, ignoring');
      return;
    }
    
    setStatus('connecting');
    setConnectedIP(ip);
    
    try {
      const wsUrl = `ws://${ip}:8080`;
      console.log(`📡 Establishing WebSocket connection to ${wsUrl}`);
      
      const ws = new WebSocket(wsUrl);
      
      ws.onopen = () => {
        console.log('✅ WebSocket connection established');
        wsRef.current = ws;
        setStatus('connected');
        connectStartTime.current = new Date();
        toast.success(`Connected to collar at ${ip}`);
      };
      
      ws.onmessage = (event) => {
        handleMessage(event);
      };
      
      ws.onclose = () => {
        console.log('🔌 WebSocket connection closed');
        setStatus('disconnected');
        setConnectedIP(null);
        setCollarData(null);
        setLastHeartbeat(null);
        cleanup();
        
        setTimeout(() => {
          toast.error(`Lost connection to collar at ${ip} – showing demo data`);
        }, 1000);
      };
      
      ws.onerror = (error) => {
        console.error('❌ WebSocket connection error:', error);
        setStatus('disconnected');
        setConnectedIP(null);
        cleanup();
        toast.error(`Couldn't reach collar at ${ip} – retrying`);
      };
      
      // 5 second connection timeout
      setTimeout(() => {
        if (status === 'connecting') {
          ws.close();
          setStatus('disconnected');
          setConnectedIP(null);
          toast.error(`Connection timeout to collar at ${ip}`);
        }
      }, 5000);
      
    } catch (error) {
      console.error('❌ Failed to create WebSocket connection:', error);
      setStatus('disconnected');
      setConnectedIP(null);
      toast.error(`Failed to connect to collar at ${ip}`);
    }
  }, [connectedIP, status, handleMessage, cleanup]);

  // Listen for collar discovery events - ensure only one connection per tab
  useEffect(() => {
    const connectToDiscoveryServer = () => {
      // Prevent multiple connections
      if (discoveryWsRef.current?.readyState === WebSocket.CONNECTING || 
          discoveryWsRef.current?.readyState === WebSocket.OPEN) {
        console.log('🔄 Discovery WebSocket already connected/connecting, skipping...');
        return;
      }
      
      try {
        // Use localhost for discovery WebSocket connection
        const wsUrl = 'ws://localhost:3001/discovery';
        console.log(`🔄 Connecting to discovery WebSocket: ${wsUrl}`);
        const discoveryWs = new WebSocket(wsUrl);
        
        discoveryWs.onopen = () => {
          console.log(`🔌 Connected to discovery WebSocket: ${wsUrl}`);
          discoveryWsRef.current = discoveryWs;
        };
        
        discoveryWs.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            console.log('📡 Discovery message received (raw):', event.data);
            console.log('📡 Discovery message parsed:', message);
            
            if (message.type === 'COLLAR_DISCOVERED' && message.ip) {
              console.log(`🎯 Collar discovered at ${message.ip}, setting state to connecting...`);
              setStatus('connecting');
              
              // Use the discovered IP to build WebSocket URL
              const collarWsUrl = `ws://${message.ip}:8080`;
              console.log(`🔗 Connecting to collar WebSocket: ${collarWsUrl}`);
              connectToCollar(message.ip);
            }
          } catch (error) {
            console.error('❌ Error parsing discovery message:', error);
            console.error('❌ Raw message data:', event.data);
          }
        };
        
        discoveryWs.onclose = (event) => {
          console.log(`🔌 Discovery WebSocket closed (code: ${event.code}, reason: ${event.reason})`);
          discoveryWsRef.current = null;
          
          // Only retry if not a clean close
          if (event.code !== 1000) {
            console.log('🔄 Will retry discovery connection in 5 seconds...');
            setTimeout(connectToDiscoveryServer, 5000);
          }
        };
        
        discoveryWs.onerror = (error) => {
          console.error(`❌ Discovery WebSocket error:`, error);
          discoveryWsRef.current = null;
        };
        
      } catch (error) {
        console.error('❌ Failed to create discovery WebSocket connection:', error);
        setTimeout(connectToDiscoveryServer, 5000);
      }
    };
    
    // Start discovery connection
    connectToDiscoveryServer();
    
    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up discovery WebSocket...');
      if (discoveryWsRef.current) {
        discoveryWsRef.current.close(1000, 'Component unmounting');
        discoveryWsRef.current = null;
      }
    };
  }, [connectToCollar]);

  // Connection duration counter
  useEffect(() => {
    if (status === 'connected' && connectStartTime.current) {
      connectionTimerRef.current = setInterval(() => {
        const duration = Math.floor((Date.now() - connectStartTime.current!.getTime()) / 1000)
        setConnectionDuration(duration)
      }, 1000)
    } else {
      if (connectionTimerRef.current) {
        clearInterval(connectionTimerRef.current)
        connectionTimerRef.current = null
      }
      setConnectionDuration(0)
    }

    return () => {
      if (connectionTimerRef.current) {
        clearInterval(connectionTimerRef.current)
      }
    }
  }, [status])

  // Connect function (manual trigger)
  const connect = useCallback(async () => {
    console.log('🔄 Initiating manual collar connection...')
    
    try {
      // Try to get collar IP from proxy first
      const proxyResponse = await fetch('/api/collar-proxy?endpoint=/api/discover')
      
      if (proxyResponse.ok) {
        console.log('✅ Collar discovery via proxy successful');
        toast.info('Searching for collar on network...');
        // The discovery WebSocket listener will handle the actual connection
        return;
      }
      
      // Fallback: try common collar IPs
      const commonIPs = ['192.168.1.35', '192.168.0.35', '192.168.1.100'];
      console.log('🔍 Trying common collar IPs...');
      
      for (const ip of commonIPs) {
        try {
          await connectToCollar(ip);
          return; // Success, exit
        } catch (error) {
          console.log(`❌ Failed to connect to ${ip}`);
          continue;
        }
      }
      
      throw new Error('No collar found on common IPs');
      
    } catch (error) {
      console.error('❌ Failed to connect to collar:', error)
      setStatus('disconnected')
      toast.error('Failed to find collar - make sure it\'s powered on and connected to WiFi')
    }
  }, [connectToCollar])

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from collar...')
    setStatus('disconnected')
    setCollarData(null)
    setLastHeartbeat(null)
    setConnectedIP(null)
    connectStartTime.current = null
    cleanup()
    
    setTimeout(() => {
      toast.info('Disconnected from collar – showing demo data')
    }, 500)
  }, [cleanup])

  // Cleanup on unmount
  useEffect(() => {
    return cleanup
  }, [cleanup])

  const value: CollarConnectionContextType = {
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
    <CollarConnectionContext.Provider value={value}>
      {children}
    </CollarConnectionContext.Provider>
  )
}

export function useCollarConnection() {
  const context = useContext(CollarConnectionContext)
  if (context === undefined) {
    throw new Error('useCollarConnection must be used within a CollarConnectionProvider')
  }
  return context
} 