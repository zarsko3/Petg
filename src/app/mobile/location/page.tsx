'use client'

import { useState, useEffect } from 'react'
import { LiveCameraFrame } from '@/components/mobile/live-camera-frame'
import { Skeleton } from '@/components/ui/skeleton'
import dynamic from 'next/dynamic'

// Dynamically import components that use browser APIs
const MobileLeafletMap = dynamic(() => import('@/components/mobile/leaflet-map').then(mod => ({ default: mod.MobileLeafletMap })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-gray-100 flex items-center justify-center">
      <Skeleton className="w-full h-full" />
    </div>
  ),
})

export default function MobileLocationPage() {
  return (
    <main className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50 overflow-hidden">
      {/* Camera Frame - Fixed height */}
      <section className="flex-shrink-0">
        <LiveCameraFrame />
      </section>

      {/* Map Container - Flexible height */}
      <section className="flex-1 relative overflow-hidden">
        {/* Action Buttons */}
        <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => window.location.href = '/mobile/zones'}
            className="bg-gradient-to-r from-orange-500 to-amber-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium hover:from-orange-600 hover:to-amber-700 transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
              <circle cx="12" cy="10" r="3"/>
            </svg>
            Safety Zones
          </button>
          <button
            onClick={() => window.location.href = '/mobile/setup/rooms'}
            className="bg-gradient-to-r from-violet-500 to-purple-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium hover:from-violet-600 hover:to-purple-700 transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
              <polyline points="9,22 9,12 15,12 15,22"/>
            </svg>
            Setup Rooms
          </button>
        </div>

        {/* Refresh Button */}
        <div className="absolute top-4 left-4 z-[1000]">
          <button
            onClick={() => window.location.reload()}
            className="bg-white/90 hover:bg-white text-gray-700 p-2 rounded-lg shadow-lg transition-all duration-200"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
              <path d="M21 3v5h-5"/>
              <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
              <path d="M3 21v-5h5"/>
            </svg>
          </button>
        </div>

        {/* Map takes full remaining space */}
        <div className="w-full h-full">
          <MobileLeafletMap 
            beacons={[
              { id: 1, name: 'Living Room', x: 30, y: 40, connected: true, rssi: -45, distance: 3 },
              { id: 2, name: 'Kitchen', x: 70, y: 30, connected: true, rssi: -62, distance: 7 },
              { id: 3, name: 'Bedroom', x: 50, y: 70, connected: true, rssi: -71, distance: 9 },
            ]}
            petPosition={{ x: 45, y: 50 }}
            petName="Buddy"
          />
        </div>
      </section>
    </main>
  )
} 