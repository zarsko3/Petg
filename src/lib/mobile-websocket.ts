'use client'

import { toast } from 'sonner'
import { getMQTTClient } from '@/lib/mqtt-client'

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
  private mqttClient = getMQTTClient()
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
      // Set up MQTT event handlers
      this.mqttClient.onConnect = () => {
        this.isConnected = true
        this.reconnectAttempts = 0
        this.startHeartbeat()
        this.emit('connection', { 
          type: 'status', 
          timestamp: new Date().toISOString(),
          data: { heartbeat: true }
        })
        toast.success('Connected to collar via cloud')
      }

      this.mqttClient.onCollarTelemetry = (collarId: string, data: any) => {
        const mobileData: CollarWebSocketData = {
          type: 'status',
          timestamp: new Date().toISOString(),
          data: {
            battery_level: data.battery_level,
            heartbeat: true,
            ...data
          }
        }
        this.handleMessage(mobileData)
      }

      this.mqttClient.onCollarStatus = (collarId: string, data: any) => {
        const mobileData: CollarWebSocketData = {
          type: 'status',
          timestamp: new Date().toISOString(),
          data: {
            heartbeat: data.status === 'online',
            ...data
          }
        }
        this.handleMessage(mobileData)
      }

      this.mqttClient.onDisconnect = () => {
        this.isConnected = false
        this.stopHeartbeat()
        this.emit('connection', { 
          type: 'status', 
          timestamp: new Date().toISOString(),
          data: { heartbeat: false }
        })
        this.attemptReconnect()
      }

      this.mqttClient.onError = (error: Error) => {
        if (this.reconnectAttempts === 0) {
          toast.error('Connection to collar lost. Attempting to reconnect...')
        }
      }

      // Check initial connection status
      this.isConnected = this.mqttClient.getConnectionStatus().connected
      
    } catch (error) {
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
      // MQTT handles heartbeat automatically
    }, 30000) // Check heartbeat every 30 seconds
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval)
      this.heartbeatInterval = null
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      toast.error('Unable to reconnect to collar. Please check your connection.')
      return
    }

    this.reconnectAttempts++
    
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
          // Remove console.error as per the new code
        }
      })
    }
  }

  public send(data: any) {
    if (this.isConnected) {
      // TODO: Send command via MQTT when collar command topics are implemented
    }
  }

  public getConnectionStatus() {
    return this.isConnected
  }

  public disconnect() {
    this.stopHeartbeat()
    this.mqttClient.disconnect()
    this.isConnected = false
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