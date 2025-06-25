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
  
  const wsRef = useRef<WebSocket | null>(null)
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
          console.log('📊 Live collar data received:', message.data)
          setCollarData({
            position: message.data.position,
            battery: message.data.battery,
            rssi: message.data.rssi,
            temperature: message.data.temperature,
            humidity: message.data.humidity,
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

  // Connect function
  const connect = useCallback(async () => {
    console.log('🔄 Initiating collar connection...')
    setStatus('connecting')
    
    try {
      // Try to get collar IP from proxy
      const proxyResponse = await fetch('/api/collar-proxy?endpoint=/api/discover')
      
      if (!proxyResponse.ok) {
        throw new Error('Failed to discover collar')
      }

      // For demo purposes, simulate WebSocket connection
      // In production, this would connect to the actual collar WebSocket
      const wsUrl = 'ws://192.168.1.35:8080' // From the logs, this is the collar IP
      
      console.log('🔗 Connecting to collar WebSocket:', wsUrl)
      
      // Simulate connection for demo
      setTimeout(() => {
        console.log('🎭 Demo: Simulating collar connection...')
        
        // Create mock WebSocket for demo
        const mockWs = {
          readyState: WebSocket.OPEN,
          send: (data: string) => {
            console.log('📤 Sent to collar:', data)
          },
          close: () => {
            console.log('🔌 Mock WebSocket closed')
          }
        } as WebSocket

        wsRef.current = mockWs

        // Simulate heartbeat from collar
        const simulateHeartbeat = () => {
          if (status === 'connecting' || status === 'connected') {
            handleMessage({
              data: JSON.stringify({
                type: 'HEARTBEAT',
                timestamp: Date.now()
              })
            } as MessageEvent)
            
            // Send some demo live data periodically
            setTimeout(() => {
              if (status === 'connected') {
                handleMessage({
                  data: JSON.stringify({
                    type: 'COLLAR_DATA',
                    data: {
                      position: { 
                        x: 45 + Math.random() * 10 - 5, 
                        y: 50 + Math.random() * 10 - 5 
                      },
                      battery: Math.floor(Math.random() * 100),
                      rssi: -45 - Math.floor(Math.random() * 30),
                      temperature: 22 + Math.random() * 8,
                      humidity: 45 + Math.random() * 20
                    }
                  })
                } as MessageEvent)
              }
            }, 1000)
          }
        }

        // Start heartbeat simulation
        heartbeatIntervalRef.current = setInterval(simulateHeartbeat, 2000)
        simulateHeartbeat() // Initial heartbeat
        
      }, 1000) // 1 second delay to show connecting state

    } catch (error) {
      console.error('❌ Failed to connect to collar:', error)
      setStatus('disconnected')
      toast.error('Failed to connect to collar')
    }
  }, [status, handleMessage])

  // Disconnect function
  const disconnect = useCallback(() => {
    console.log('🔌 Disconnecting from collar...')
    setStatus('disconnected')
    setCollarData(null)
    setLastHeartbeat(null)
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
    connectionDuration
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