'use client'

import { useRef, useState, useEffect } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { useCollarPosition, useBeacons } from '@/hooks/useSmartCollarData'
import { CameraHeader } from '@/components/mobile/camera-header'
import { FloatingActionButtons } from '@/components/mobile/floating-action-buttons'
import { BottomInfoPanel } from '@/components/mobile/bottom-info-panel'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'

// Dynamically import components that use browser APIs
const EnhancedKonvaMap = dynamic(() => import('@/components/mobile/enhanced-konva-map-client').then(mod => ({ default: mod.EnhancedKonvaMap })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <Skeleton className="w-full h-full" />
    </div>
  ),
})

export default function MobileLocationPage() {
  const { position } = useCollarPosition()
  const { beacons } = useBeacons()
  const [selectedMarker, setSelectedMarker] = useState<{
    type: 'beacon' | 'collar' | 'cluster',
    id: string
  } | undefined>()
  
  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Camera Header Component - Fixed at top */}
      <div className="flex-shrink-0 relative z-30">
        <CameraHeader beacons={beacons || []} position={position} />
      </div>

      {/* Main content area - Properly bounded map section */}
      <div className="flex-1 relative bg-gray-50 p-4 overflow-visible">
        {/* Map container - Contained with rounded corners and shadow */}
        <div className="relative h-full bg-white rounded-2xl shadow-lg overflow-visible border border-gray-200/50">
          <EnhancedKonvaMap 
            floorplanImage="/floorplan.png"
            beacons={beacons.map(beacon => ({
              id: beacon.id.toString(),
              name: beacon.name,
              position: { x: beacon.x, y: beacon.y },
              connected: beacon.connected,
              rssi: beacon.rssi,
              batteryLevel: 100
            }))}
            petData={position ? {
              name: "Buddy",
              position: { x: position.x, y: position.y },
              isActive: true
            } : undefined}
            isLiveMode={true}
            className="w-full h-full rounded-2xl"
            selectedMarker={selectedMarker}
            onMarkerTap={(type, id) => setSelectedMarker({ type, id })}
          />
        </div>
        
        {/* Floating Action Buttons - Positioned outside map container with high z-index */}
        <FloatingActionButtons position={position} mapRef={null} />
        

      </div>

      {/* Bottom Info Panel - Above mobile navigation with proper spacing */}
      <div className="flex-shrink-0 relative z-20 pb-[env(safe-area-inset-bottom)]">
        <BottomInfoPanel position={position} />
      </div>
    </div>
  )
} 