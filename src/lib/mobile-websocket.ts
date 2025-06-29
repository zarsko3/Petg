'use client'

import { toast } from 'sonner'

export interface CollarWebSocketData {
  type: 'status' | 'location' | 'alert' | 'battery' | 'activity'
  timestamp: string
  data: {
    battery_level?: number
    signal_strength?: number
    location?: string | { x: number; y: number; room?: string }
    activity_level?: number
    temperature?: number
    alerts?: Array<{
      type: string
      message: string
      severity: 'low' | 'medium' | 'high'
      timestamp: string
    }>
    heartbeat?: boolean
  }
}

export class MobileWebSocketService {
  private ws: WebSocket | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectInterval = 1000
  private listeners = new Map<string, Set<(data: CollarWebSocketData) => void>>()
  private isConnected = false
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null

  constructor(private url: string = 'auto') {
    this.connect()
  }

  private connect() {
    try {
      // 🔄 PROXY: Use same-origin proxy for collar WebSocket
      let wsUrl: string;
      
      if (this.url === 'auto' || this.url.includes('collar')) {
        // Use Vercel proxy for collar connections
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        wsUrl = `${protocol}//${window.location.host}/ws`;
        console.log('📱 MobileWebSocket: Using Vercel proxy for collar connection');
      } else {
        // Legacy URL handling for non-collar WebSockets
        wsUrl = window.location.protocol === 'https:' 
          ? this.url.replace('ws://', 'wss://') 
          : this.url;
      }

      console.log(`🔗 MobileWebSocket: Connecting to ${wsUrl}`);
      this.ws = new WebSocket(wsUrl)
      
      this.ws.onopen = () => {
        console.log('Mobile WebSocket connected')
        this.isConnected = true
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.emit('connection', { 
          type: 'status', 
          timestamp: new Date().toISOString(),
          data: { heartbeat: true }
        })
      }

      this.ws.onmessage = (event) => {
        try {
          const data: CollarWebSocketData = JSON.parse(event.data)
          this.handleMessage(data)
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error)
        }
      }

      this.ws.onclose = () => {
        console.log('Mobile WebSocket disconnected')
        this.isConnected = false
        this.stopHeartbeat()
        this.emit('connection', { 
          type: 'status', 
          timestamp: new Date().toISOString(),
          data: { heartbeat: false }
        })
        this.attemptReconnect()
      }

      this.ws.onerror = (error) => {
        console.error('Mobile WebSocket error:', error)
        if (this.reconnectAttempts === 0) {
          toast.error('Connection to collar lost. Attempting to reconnect...')
        }
      }
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error)
      this.attemptReconnect()
    }
  }

  private handleMessage(data: CollarWebSocketData) {
    // Handle different message types
    switch (data.type) {
      case 'alert':
        if (data.data.alerts) {
          data.data.alerts.forEach(alert => {
            const severity = alert.severity || 'medium'
            if (severity === 'high') {
              toast.error(alert.message)
            } else if (severity === 'medium') {
              toast.warning(alert.message)
            } else {
              toast.info(alert.message)
            }
          })
        }
        break
      
      case 'battery':
        if (data.data.battery_level !== undefined && data.data.battery_level < 20) {
          toast.warning(`Low battery: ${data.data.battery_level}%`)
        }
        break

      case 'location':
        // Handle location updates silently for real-time tracking
        break
    }

    // Emit to all listeners
    this.emit(data.type, data)
    this.emit('all', data)
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.send(JSON.stringify({ type: 'ping' }))
      }
    }, 30000) // Send heartbeat every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached')
      toast.error('Unable to reconnect to collar. Please check your connection.')
      return
    }

    this.reconnectAttempts++
    console.log(`Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)
    
    setTimeout(() => {
      this.connect()
    }, this.reconnectInterval * this.reconnectAttempts)
  }

  public subscribe(eventType: string, callback: (data: CollarWebSocketData) => void) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set())
    }
    this.listeners.get(eventType)!.add(callback)

    // Return unsubscribe function
    return () => {
      const eventListeners = this.listeners.get(eventType)
      if (eventListeners) {
        eventListeners.delete(callback)
        if (eventListeners.size === 0) {
          this.listeners.delete(eventType)
        }
      }
    }
  }

  private emit(eventType: string, data: CollarWebSocketData) {
    const eventListeners = this.listeners.get(eventType)
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in WebSocket listener:', error)
        }
      })
    }
  }

  public send(data: any) {
    if (this.ws && this.isConnected) {
      this.ws.send(JSON.stringify(data))
    } else {
      console.warn('WebSocket not connected, cannot send data')
    }
  }

  public getConnectionStatus() {
    return this.isConnected
  }

  public disconnect() {
    if (this.ws) {
      this.stopHeartbeat()
      this.ws.close()
      this.ws = null
      this.isConnected = false
    }
  }

  // Mobile-specific methods
  public testCollarAlert() {
    this.send({
      type: 'test_alert',
      data: { pattern: 'short_beep' }
    })
  }

  public requestCollarStatus() {
    this.send({
      type: 'status_request',
      timestamp: new Date().toISOString()
    })
  }

  public updateCollarSettings(settings: any) {
    this.send({
      type: 'update_settings',
      data: settings,
      timestamp: new Date().toISOString()
    })
  }
}

// Singleton instance for mobile app
export const mobileWebSocketService = new MobileWebSocketService() 