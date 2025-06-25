'use client'

import { useEffect, useState, useCallback } from 'react'
import { mobileWebSocketService, CollarWebSocketData } from '@/lib/mobile-websocket'

export function useMobileWebSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const [latestData, setLatestData] = useState<CollarWebSocketData | null>(null)
  const [connectionAttempts, setConnectionAttempts] = useState(0)

  useEffect(() => {
    // Subscribe to connection status
    const unsubscribeConnection = mobileWebSocketService.subscribe('connection', (data) => {
      setIsConnected(data.data.heartbeat || false)
      if (!data.data.heartbeat) {
        setConnectionAttempts(prev => prev + 1)
      } else {
        setConnectionAttempts(0)
      }
    })

    // Subscribe to all data updates
    const unsubscribeAll = mobileWebSocketService.subscribe('all', (data) => {
      setLatestData(data)
    })

    // Initial connection status
    setIsConnected(mobileWebSocketService.getConnectionStatus())

    return () => {
      unsubscribeConnection()
      unsubscribeAll()
    }
  }, [])

  const sendData = useCallback((data: any) => {
    mobileWebSocketService.send(data)
  }, [])

  const testAlert = useCallback(() => {
    mobileWebSocketService.testCollarAlert()
  }, [])

  const requestStatus = useCallback(() => {
    mobileWebSocketService.requestCollarStatus()
  }, [])

  const updateSettings = useCallback((settings: any) => {
    mobileWebSocketService.updateCollarSettings(settings)
  }, [])

  const subscribe = useCallback((eventType: string, callback: (data: CollarWebSocketData) => void) => {
    return mobileWebSocketService.subscribe(eventType, callback)
  }, [])

  return {
    isConnected,
    latestData,
    connectionAttempts,
    sendData,
    testAlert,
    requestStatus,
    updateSettings,
    subscribe
  }
}

export function useMobileCollarData(refreshInterval = 5000) {
  const { isConnected, subscribe } = useMobileWebSocket()
  const [collarData, setCollarData] = useState<any>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  useEffect(() => {
    // Subscribe to status updates
    const unsubscribeStatus = subscribe('status', (data) => {
      setCollarData((prevData: any) => ({
        ...prevData,
        ...data.data
      }))
      setLastUpdate(new Date(data.timestamp))
    })

    // Subscribe to location updates
    const unsubscribeLocation = subscribe('location', (data) => {
      setCollarData((prevData: any) => ({
        ...prevData,
        location: data.data.location
      }))
      setLastUpdate(new Date(data.timestamp))
    })

    // Subscribe to battery updates
    const unsubscribeBattery = subscribe('battery', (data) => {
      setCollarData((prevData: any) => ({
        ...prevData,
        battery_level: data.data.battery_level
      }))
      setLastUpdate(new Date(data.timestamp))
    })

    // Subscribe to activity updates
    const unsubscribeActivity = subscribe('activity', (data) => {
      setCollarData((prevData: any) => ({
        ...prevData,
        activity_level: data.data.activity_level
      }))
      setLastUpdate(new Date(data.timestamp))
    })

    return () => {
      unsubscribeStatus()
      unsubscribeLocation()
      unsubscribeBattery()
      unsubscribeActivity()
    }
  }, [subscribe])

  // Fallback to polling if WebSocket is not connected
  useEffect(() => {
    if (!isConnected && refreshInterval > 0) {
      const interval = setInterval(() => {
        // Simulate collar data for demo mode
        setCollarData({
          battery_level: Math.floor(Math.random() * 30) + 70, // 70-100%
          signal_strength: Math.floor(Math.random() * 40) + 60, // 60-100%
          activity_level: Math.floor(Math.random() * 50) + 40, // 40-90%
          temperature: Math.floor(Math.random() * 8) + 18, // 18-26°C
          location: 'Living Room',
          daily_stats: {
            active_time: Math.floor(Math.random() * 3) + 3, // 3-6 hours
            rest_time: Math.floor(Math.random() * 4) + 5, // 5-9 hours
            sleep_time: Math.floor(Math.random() * 3) + 7, // 7-10 hours
            steps: Math.floor(Math.random() * 3000) + 4000, // 4000-7000
            calories: Math.floor(Math.random() * 100) + 200, // 200-300
            distance: Math.floor(Math.random() * 2) + 1.5 // 1.5-3.5 km
          }
        })
        setLastUpdate(new Date())
      }, refreshInterval)

      return () => clearInterval(interval)
    }
  }, [isConnected, refreshInterval])

  const refetch = useCallback(() => {
    if (isConnected) {
      mobileWebSocketService.requestCollarStatus()
    }
  }, [isConnected])

  return {
    data: collarData,
    isConnected,
    isLoading: false,
    lastUpdate,
    refetch
  }
} 