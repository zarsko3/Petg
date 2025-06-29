'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the Konva map component to prevent SSR issues
const EnhancedKonvaMap = dynamic(
  () => import('@/components/mobile/enhanced-konva-map').then(mod => ({ default: mod.EnhancedKonvaMap })),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading interactive map...</p>
        </div>
      </div>
    )
  }
)

// Sample data for testing
const sampleBeacons = [
  { id: 'b1', name: 'Living Room', position: { x: 20, y: 30 }, connected: true, rssi: -45, batteryLevel: 85 },
  { id: 'b2', name: 'Kitchen', position: { x: 70, y: 25 }, connected: true, rssi: -52, batteryLevel: 92 },
  { id: 'b3', name: 'Bedroom', position: { x: 25, y: 75 }, connected: false, rssi: -89, batteryLevel: 12 },
  { id: 'b4', name: 'Hallway', position: { x: 50, y: 50 }, connected: true, rssi: -38, batteryLevel: 76 },
  { id: 'b5', name: 'Bathroom', position: { x: 75, y: 70 }, connected: true, rssi: -61, batteryLevel: 68 },
  // Clustered beacons for testing
  { id: 'b6', name: 'Cluster A', position: { x: 21, y: 32 }, connected: true, rssi: -48, batteryLevel: 80 },
  { id: 'b7', name: 'Cluster B', position: { x: 23, y: 29 }, connected: false, rssi: -72, batteryLevel: 45 },
]

const samplePetData = {
  name: 'Caruso',
  position: { x: 45, y: 40 },
  isActive: true
}

export default function EnhancedMapPage() {
  const [connectionState, setConnectionState] = useState<{
    status: 'disconnected' | 'connecting' | 'connected',
    connectedDevices: number,
    totalDevices: number
  }>({
    status: 'disconnected',
    connectedDevices: 0,
    totalDevices: sampleBeacons.length
  })
  const [isLiveMode, setIsLiveMode] = useState(false)
  const [currentZoom, setCurrentZoom] = useState(1)
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 })

  // Simulate connection state changes
  useEffect(() => {
    const connectedCount = sampleBeacons.filter(b => b.connected).length
    setConnectionState(prev => ({
      ...prev,
      connectedDevices: connectedCount
    }))

    // Simulate connection process
    const timer = setTimeout(() => {
      setConnectionState(prev => ({
        ...prev,
        status: connectedCount > 0 ? 'connected' : 'disconnected'
      }))
      setIsLiveMode(connectedCount > 0)
    }, 2000)

    return () => clearTimeout(timer)
  }, [])

  const handleMarkerTap = (type: 'beacon' | 'collar', id: string) => {
    console.log(`Tapped ${type}:`, id)
  }

  const handleZoomChange = (scale: number) => {
    setCurrentZoom(scale)
    console.log('Zoom changed:', scale)
  }

  const handlePanChange = (x: number, y: number) => {
    setPanPosition({ x, y })
    console.log('Pan changed:', { x, y })
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-violet-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Enhanced Konva Map</h1>
            <p className="text-sm text-gray-600">
              {connectionState.connectedDevices}/{connectionState.totalDevices} devices connected
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`
              px-3 py-1 rounded-full text-xs font-semibold
              ${connectionState.status === 'connected' 
                ? 'bg-green-100 text-green-800' 
                : connectionState.status === 'connecting'
                ? 'bg-yellow-100 text-yellow-800'
                : 'bg-gray-100 text-gray-800'
              }
            `}>
              {connectionState.status.toUpperCase()}
            </div>
            {isLiveMode && (
              <div className="px-3 py-1 bg-green-500 text-white rounded-full text-xs font-bold animate-pulse">
                LIVE
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Debug Info */}
      <div className="bg-gray-50 px-4 py-2 text-xs text-gray-600 border-b">
        Zoom: {currentZoom.toFixed(2)}x | Pan: ({panPosition.x.toFixed(0)}, {panPosition.y.toFixed(0)})
      </div>

      {/* Map Container */}
      <div className="flex-1 relative">
        <EnhancedKonvaMap
          className="w-full h-full"
          beacons={sampleBeacons}
          petData={samplePetData}
          connectionState={connectionState}
          isLiveMode={isLiveMode}
          onMarkerTap={handleMarkerTap}
          onZoomChange={handleZoomChange}
          onPanChange={handlePanChange}
        />
      </div>

      {/* Instructions */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Instructions:</strong></p>
          <p>• Pinch to zoom (0.3x - 3x range)</p>
          <p>• Drag to pan around the map</p>
          <p>• Tap markers for tooltips</p>
          <p>• Grid shows at 0.5x, 1x, 2x zoom levels</p>
          <p>• Markers cluster when &lt;20px apart</p>
        </div>
      </div>
    </div>
  )
} 