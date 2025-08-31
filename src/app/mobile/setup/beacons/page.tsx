'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
// Temporarily not using context - using mock data instead
// import { FloorPlanProvider, useFloorPlan, exportFloorPlan, importFloorPlan, downloadFloorPlan } from '@/components/context/FloorPlanContext'

// Temporarily disable context usage to isolate the issue
// function useFloorPlanSafe() {
//   try {
//     return useFloorPlan()
//   } catch (error) {
//     // Return safe defaults if context is not available
//     return {
//       state: {
//         rooms: [],
//         beacons: [],
//         availableBeacons: []
//       },
//       dispatch: () => {}
//     }
//   }
// }

// Dynamically import BeaconCanvas to avoid SSR issues with Konva
const BeaconCanvas = dynamic(() => import('@/components/room-setup/BeaconCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
        <p className="text-sm">Loading beacon placement...</p>
      </div>
    </div>
  ),
})

function BeaconSetupContent() {
  // Temporarily use mock data instead of context
  const [mockState] = useState({
    rooms: [],
    beacons: [],
    availableBeacons: [
      { id: 'beacon-1', name: 'Living Room Beacon', paired: true },
      { id: 'beacon-2', name: 'Kitchen Beacon', paired: true },
      { id: 'beacon-3', name: 'Bedroom Beacon', paired: true },
    ]
  })

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Ensure component only renders on client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleFinish = useCallback(() => {
    const unplacedBeacons = mockState.availableBeacons.filter(
      beacon => !mockState.beacons.find(placed => placed.beacon_id === beacon.id)
    )

    if (unplacedBeacons.length > 0) {
      if (typeof window !== 'undefined') {
        alert(`Please place all beacons before finishing. Missing: ${unplacedBeacons.map(b => b.name).join(', ')}`)
      }
      return
    }

    // Save floor plan and navigate to location page
    if (typeof window !== 'undefined') {
      alert('Floor plan saved! Redirecting to location page...')
      window.location.href = '/mobile/location'
    }
  }, [mockState])

  const handleExport = useCallback(() => {
    try {
      const floorPlanData = exportFloorPlan(mockState.rooms, mockState.beacons)
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = `complete-floor-plan-${timestamp}.json`
      downloadFloorPlan(filename, floorPlanData)
    } catch (error: any) {
      if (typeof window !== 'undefined') {
        alert('Failed to export floor plan')
      }
    }
  }, [mockState])

  const handleImport = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  const handleFileImport = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const jsonData = e.target?.result as string
        const importedData = importFloorPlan(jsonData)

        // For now, just show success message since we're not using context
        console.log('Floor plan imported:', importedData)

        setImportStatus('Floor plan imported successfully!')
        setTimeout(() => setImportStatus(null), 3000)
      } catch (error: any) {
        const errorMessage = error?.message || 'Failed to import floor plan'
        setImportStatus(errorMessage)
        setTimeout(() => setImportStatus(null), 5000)
      }
    }
    reader.readAsText(file)

    // Reset file input
    event.target.value = ''
  }, [])

  // Use mock state data
  const canFinish = mockState.availableBeacons.every(
    beacon => mockState.beacons.find(placed => placed.beacon_id === beacon.id)
  ) || false

  const unplacedBeacons = mockState.availableBeacons.filter(
    beacon => !mockState.beacons.find(placed => placed.beacon_id === beacon.id)
  ) || []

  // Only render on client side to prevent SSR issues
  if (!isClient) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
            <p className="text-sm">Loading beacon setup...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (typeof window !== 'undefined' && window.history) {
                  window.history.back()
                }
              }}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m15 18-6-6 6-6"/>
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Place Beacons</h1>
              <p className="text-sm text-gray-600">Drag beacons into your rooms</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {/* Export/Import buttons */}
            <button
              onClick={handleExport}
              disabled={state.rooms.length === 0}
              className={`px-3 py-2 rounded-lg font-medium transition-all text-sm ${
                state.rooms.length > 0
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
              title="Export complete floor plan"
            >
              📤
            </button>

            <button
              onClick={handleImport}
              className="px-3 py-2 rounded-lg font-medium transition-all text-sm bg-green-600 text-white hover:bg-green-700"
              title="Import floor plan"
            >
              📥
            </button>

            <button
              onClick={handleFinish}
              disabled={!canFinish}
              className={`px-6 py-2 rounded-lg font-medium transition-all ${
                canFinish
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              Finish
            </button>
          </div>
        </div>
      </div>

      {/* Instructions */}
      <div className="px-6 py-4 bg-green-50 border-b border-green-100">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-green-900 mb-1">
            Place your beacons
          </h2>
          <p className="text-green-700 text-sm">
            Drag each beacon from the left side into a room on your floor plan
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Beacon Gutter */}
        <div className="w-20 bg-white border-r border-gray-200 flex flex-col p-2 gap-2">
          <div className="text-xs font-medium text-gray-600 text-center mb-2">
            Beacons
          </div>
          {unplacedBeacons?.map((beacon) => (
            <div
              key={beacon?.id || Math.random()}
              className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg cursor-grab active:cursor-grabbing transition-all duration-200 hover:scale-105 active:scale-95"
              title={beacon?.name || 'Beacon'}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('beacon-id', beacon?.id || '')
                e.dataTransfer.effectAllowed = 'move'
                e.currentTarget.classList.add('dragging')
              }}
              onDragEnd={(e) => {
                e.currentTarget.classList.remove('dragging')
              }}
              onTouchStart={(e) => {
                // Store beacon ID for touch drag
                e.currentTarget.setAttribute('data-beacon-id', beacon?.id || '')
                e.currentTarget.classList.add('touch-dragging')
                // Add visual feedback
                e.currentTarget.style.transform = 'scale(1.1)'
              }}
              onTouchEnd={(e) => {
                e.currentTarget.classList.remove('touch-dragging')
                e.currentTarget.style.transform = 'scale(1)'
              }}
              onTouchMove={(e) => {
                // Optional: Add some visual feedback during touch move
                e.currentTarget.style.opacity = '0.8'
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m12 1 3 3-3 3-3-3z"/>
                <path d="M8 11v6"/>
                <path d="M12 11v6"/>
                <path d="M16 11v6"/>
                <circle cx="12" cy="12" r="1"/>
              </svg>
            </div>
          ))}

          {(unplacedBeacons?.length === 0) && (
            <div className="text-xs text-gray-400 text-center">
              All placed!
            </div>
          )}
        </div>

        {/* Canvas Area */}
        <div className="flex-1 p-4">
          <div className="h-full bg-white rounded-2xl shadow-lg overflow-hidden">
            <BeaconCanvas />
          </div>
        </div>
      </div>

      {/* Status Bar */}
      <div className="flex-shrink-0 bg-white border-t border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between text-sm">
          <div className="text-gray-600">
            {mockState.beacons.length} of {mockState.availableBeacons.length} beacons placed
          </div>
          {!canFinish && (
            <div className="text-amber-600 font-medium">
              Place remaining {unplacedBeacons.length} beacon(s)
            </div>
          )}
          {canFinish && (
            <div className="text-green-600 font-medium">
              ✓ All beacons placed!
            </div>
          )}
        </div>

        {/* Import status message */}
        {importStatus && (
          <div className={`mt-2 px-3 py-2 rounded-lg text-sm font-medium ${
            importStatus.includes('successfully')
              ? 'bg-green-100 text-green-800'
              : 'bg-red-100 text-red-800'
          }`}>
            {importStatus}
          </div>
        )}
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileImport}
        className="hidden"
      />
    </div>
  )
}

export default function BeaconSetupPage() {
  return (
    <BeaconSetupContent />
  )
}

// Disable static generation for this page to avoid SSR issues
export const dynamic = 'force-dynamic' 