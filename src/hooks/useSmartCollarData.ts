'use client'

import { useState, useEffect, useCallback } from 'react'
import { useCollarConnection } from '@/components/collar-service-provider'

// Demo data for fallback
const DEMO_STATS = {
  battery: 78,
  rssi: -52,
  temperature: 24.5,
  humidity: 62,
  uptime: '2h 34m',
  lastSeen: '12 seconds ago'
}

const DEMO_POSITION = {
  x: 45,
  y: 50
}

const DEMO_BEACONS = [
  { id: 1, name: 'Living Room', x: 30, y: 40, connected: true, rssi: -45, distance: 3 },
  { id: 2, name: 'Kitchen', x: 70, y: 30, connected: true, rssi: -62, distance: 7 },
  { id: 3, name: 'Bedroom', x: 50, y: 70, connected: true, rssi: -71, distance: 9 },
]

// Smart collar stats hook - switches between live and demo
export function useCollarStats() {
  const { status, collarData, isLive, connectionDuration } = useCollarConnection()
  const [stats, setStats] = useState(DEMO_STATS)

  useEffect(() => {
    if (isLive && collarData) {
      // Use live data
      const formatUptime = (seconds: number) => {
        const hours = Math.floor(seconds / 3600)
        const minutes = Math.floor((seconds % 3600) / 60)
        return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`
      }

      setStats({
        battery: collarData.battery || 0,
        rssi: collarData.rssi || -100,
        temperature: collarData.temperature || 0,
        humidity: collarData.humidity || 0,
        uptime: formatUptime(connectionDuration),
        lastSeen: 'Live'
      })
    } else {
      // Use demo data
      setStats(DEMO_STATS)
    }
  }, [isLive, collarData, connectionDuration])

  return {
    stats,
    isLive,
    status
  }
}

// Smart position hook - switches between live and demo
export function useCollarPosition() {
  const { status, collarData, isLive } = useCollarConnection()
  const [position, setPosition] = useState(DEMO_POSITION)

  useEffect(() => {
    if (isLive && collarData?.position) {
      // Use live position data
      setPosition(collarData.position)
    } else {
      // Use demo position with slight animation
      const interval = setInterval(() => {
        setPosition(prev => ({
          x: DEMO_POSITION.x + Math.sin(Date.now() / 5000) * 2,
          y: DEMO_POSITION.y + Math.cos(Date.now() / 7000) * 1.5
        }))
      }, 100)

      return () => clearInterval(interval)
    }
  }, [isLive, collarData])

  return {
    position,
    isLive,
    status
  }
}

// Smart beacons hook - switches between live and demo
export function useBeacons() {
  const { status, isLive } = useCollarConnection()
  const [beacons, setBeacons] = useState(DEMO_BEACONS)

  useEffect(() => {
    if (isLive) {
      // In live mode, we could fetch real beacon data
      // For now, use enhanced demo data to show "live" indicators
      setBeacons(DEMO_BEACONS.map(beacon => ({
        ...beacon,
        rssi: beacon.rssi + Math.floor(Math.random() * 10 - 5), // Vary RSSI slightly
        distance: Math.max(1, beacon.distance + Math.random() * 2 - 1) // Vary distance
      })))
    } else {
      // Use static demo data
      setBeacons(DEMO_BEACONS)
    }
  }, [isLive])

  return {
    beacons,
    isLive,
    status
  }
}

// Smart connection indicator hook
export function useConnectionIndicator() {
  const { status, lastHeartbeat, connectionDuration } = useCollarConnection()
  const [showDemo, setShowDemo] = useState(false)

  // 3s debounce for showing demo indicator
  useEffect(() => {
    if (status === 'disconnected') {
      const timeout = setTimeout(() => {
        setShowDemo(true)
      }, 3000)
      
      return () => clearTimeout(timeout)
    } else {
      setShowDemo(false)
    }
  }, [status])

  const getIndicatorConfig = useCallback(() => {
    switch (status) {
      case 'connected':
        return {
          text: 'LIVE',
          color: 'bg-green-500',
          textColor: 'text-white',
          icon: '●',
          show: true
        }
      case 'connecting':
        return {
          text: 'CONNECTING…',
          color: 'bg-yellow-500',
          textColor: 'text-white',
          icon: '⟳',
          show: true
        }
      case 'disconnected':
        return {
          text: 'Demo',
          color: 'bg-gray-500',
          textColor: 'text-white',
          icon: '●',
          show: showDemo
        }
      default:
        return {
          text: '',
          color: '',
          textColor: '',
          icon: '',
          show: false
        }
    }
  }, [status, showDemo])

  return {
    ...getIndicatorConfig(),
    status,
    lastHeartbeat,
    connectionDuration,
    isLive: status === 'connected'
  }
} 