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
  const retryTimeoutRef = useRef<number | null>(null)
  const connectStartTime = useRef<Date | null>(null)
  const connectionFailureCount = useRef<{ [ip: string]: number }>({})

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
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current)
      retryTimeoutRef.current = null
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

  // Connect to specific collar IP with failure tracking
  const connectToCollar = useCallback(async (ip: string): Promise<void> => {
    console.log(`🔗 Connecting to collar at ${ip}... (current status: ${status}, connectedIP: ${connectedIP})`);
    
    // Avoid duplicate connections
    if (connectedIP === ip && status === 'connected') {
      console.log('💡 Already connected to this collar, ignoring');
      return;
    }
    
    setStatus('connecting');
    setConnectedIP(ip);
    
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `ws://${ip}:8080`;
        console.log(`📡 Establishing WebSocket connection to ${wsUrl}`);
        
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
          console.log('✅ WebSocket connection established');
          wsRef.current = ws;
          
          // Reset failure count on successful connection
          connectionFailureCount.current[ip] = 0;
          
          // Start heartbeat interval
          heartbeatIntervalRef.current = setInterval(() => {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({
                type: 'PING',
                timestamp: Date.now()
              }));
            }
          }, 2000);
          
          resolve();
        };
        
        ws.onmessage = handleMessage;
        
        ws.onclose = (event) => {
          console.log(`🔌 WebSocket connection closed (code: ${event.code})`);
          if (wsRef.current === ws) {
            wsRef.current = null;
            setStatus('disconnected');
            setConnectedIP(null);
            if (heartbeatIntervalRef.current) {
              clearInterval(heartbeatIntervalRef.current);
              heartbeatIntervalRef.current = null;
            }
          }
        };
        
        ws.onerror = (error) => {
          console.error(`❌ WebSocket connection error to ${ip}:`, error);
          
          // Track failure count
          connectionFailureCount.current[ip] = (connectionFailureCount.current[ip] || 0) + 1;
          console.log(`📊 Connection failures for ${ip}: ${connectionFailureCount.current[ip]}`);
          
          // If failed twice, clear from localStorage and restart UDP discovery
          if (connectionFailureCount.current[ip] >= 2) {
            console.log(`🚫 ${ip} failed ${connectionFailureCount.current[ip]} times, removing from cache`);
            localStorage.removeItem('petg.wsUrl');
            connectionFailureCount.current[ip] = 0; // Reset counter
          }
          
          setStatus('disconnected');
          setConnectedIP(null);
          reject(error);
        };
        
        // 5 second connection timeout
        setTimeout(() => {
          if (ws.readyState === WebSocket.CONNECTING) {
            ws.close();
            
            // Track timeout as failure
            connectionFailureCount.current[ip] = (connectionFailureCount.current[ip] || 0) + 1;
            console.log(`⏰ Connection timeout for ${ip} (failure #${connectionFailureCount.current[ip]})`);
            
            // If failed twice, clear from localStorage
            if (connectionFailureCount.current[ip] >= 2) {
              console.log(`🚫 ${ip} timed out ${connectionFailureCount.current[ip]} times, removing from cache`);
              localStorage.removeItem('petg.wsUrl');
              connectionFailureCount.current[ip] = 0; // Reset counter
            }
            
            setStatus('disconnected');
            setConnectedIP(null);
            reject(new Error(`Connection timeout to collar at ${ip}`));
          }
        }, 5000);
        
      } catch (error) {
        console.error('❌ Failed to create WebSocket connection:', error);
        setStatus('disconnected');
        setConnectedIP(null);
        reject(error);
      }
    });
  }, [connectedIP, status, handleMessage]);

  // Retry UDP discovery every 3 seconds
  const retryUntilFound = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    retryTimeoutRef.current = setTimeout(() => {
      console.log('🔄 UDP scan retry (waiting for collar broadcasts)...');
      
      // Check if we got a connection via UDP
      if (status !== 'connected') {
        retryUntilFound(); // Continue retrying every 3 seconds
      }
    }, 3000);
  }, [status]);

  // Handle UDP discovery packet
  const handleUDPPacket = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data);
      console.log('📡 UDP discovery packet received:', data);
      
      // Extract WebSocket URL from collar broadcast
      const ws = data.websocket_url || data.ws;
      if (ws) {
        console.log(`📡 UDP discovery found WebSocket URL: ${ws}`);
        localStorage.setItem('petg.wsUrl', ws);
        
        // 🔒 SECURITY FIX: Extract IP from WebSocket URL (handles both ws:// and wss://)
        const ipMatch = ws.match(/wss?:\/\/([^:]+):/);
        if (ipMatch) {
          const ip = ipMatch[1];
          
          // Try connection with automatic retry on failure
          connectToCollar(ip).catch(() => {
            console.log(`❌ Failed to connect to ${ip} from UDP discovery`);
            retryUntilFound(); // Continue UDP scanning
          });
        }
      }
    } catch (error) {
      console.log('⚠️ Invalid UDP packet received');
    }
  }, [connectToCollar, retryUntilFound]);

  // Discovery server disabled - using MQTT cloud connectivity instead
  const connectToDiscoveryServer = useCallback(() => {
    console.log('🌐 Discovery server disabled - using MQTT cloud connectivity');
    // WebSocket discovery is replaced by MQTT-over-WSS for cloud connectivity
    // The CollarServiceProvider now handles MQTT connections to HiveMQ Cloud
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    console.log('🚀 CollarConnectionProvider: Starting auto-initialization...');

    // Try cached URL first (don't clear immediately)
    const cachedUrl = localStorage.getItem('petg.wsUrl');
    if (cachedUrl) {
      console.log(`🔄 Trying cached WebSocket URL: ${cachedUrl}`);
      const ipMatch = cachedUrl.match(/ws:\/\/([^:]+):/);
      if (ipMatch) {
        const ip = ipMatch[1];
        connectToCollar(ip).catch(() => {
          console.log(`❌ Cached URL ${cachedUrl} failed, starting UDP discovery...`);
          // Don't remove here - let the failure counter handle it
          retryUntilFound();
        });
      }
    } else {
      console.log('🔍 No cached URL found, starting UDP discovery...');
    }

    // Always start discovery server connection
    connectToDiscoveryServer();

    // Start retry logic for UDP scanning
    retryUntilFound();

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up collar connection...');
      cleanup();
    };
  }, [connectToDiscoveryServer, connectToCollar, retryUntilFound, cleanup]);

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

  // Connect function (manual trigger) - Use cached URL
  const connect = useCallback(async () => {
    console.log('🔄 Initiating manual collar connection...')
    
    const wsUrl = localStorage.getItem('petg.wsUrl');
    if (wsUrl) {
      console.log(`🔗 Using cached WebSocket URL: ${wsUrl}`);
      const ipMatch = wsUrl.match(/ws:\/\/([^:]+):/);
      if (ipMatch) {
        const ip = ipMatch[1];
        try {
          await connectToCollar(ip);
          return;
        } catch (error) {
          console.log(`❌ Cached URL ${wsUrl} failed, waiting for UDP discovery...`);
        }
      }
    }
    
    // Fallback: show toast if no cached URL
    toast.error('Collar not discovered — save it once on the dashboard first.');
    console.log('🔍 No cached URL available, waiting for UDP discovery...');
    retryUntilFound();
  }, [connectToCollar, retryUntilFound])

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