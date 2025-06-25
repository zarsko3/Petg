'use client'

import { useState, useEffect, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { FloorPlanProvider, useFloorPlan } from '@/components/context/FloorPlanContext'

// Dynamically import beacon canvas to avoid SSR issues
const BeaconCanvas = dynamic(() => import('@/components/room-setup/BeaconCanvas').then(mod => ({ default: mod.BeaconCanvas })), {
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
  const { state, dispatch } = useFloorPlan()

  // Mock available beacons - in real app, fetch from Supabase
  useEffect(() => {
    const mockBeacons = [
      { id: 'beacon-1', name: 'Living Room Beacon', paired: true },
      { id: 'beacon-2', name: 'Kitchen Beacon', paired: true },
      { id: 'beacon-3', name: 'Bedroom Beacon', paired: true },
    ]
    dispatch({ type: 'SET_AVAILABLE_BEACONS', beacons: mockBeacons })
  }, [dispatch])

  const handleFinish = useCallback(() => {
    const unplacedBeacons = state.availableBeacons.filter(
      beacon => !state.beacons.find(placed => placed.beacon_id === beacon.id)
    )

    if (unplacedBeacons.length > 0) {
      alert(`Please place all beacons before finishing. Missing: ${unplacedBeacons.map(b => b.name).join(', ')}`)
      return
    }

    // Save floor plan and navigate to location page
    alert('Floor plan saved! Redirecting to location page...')
    window.location.href = '/mobile/location'
  }, [state.availableBeacons, state.beacons])

  const canFinish = state.availableBeacons.every(
    beacon => state.beacons.find(placed => placed.beacon_id === beacon.id)
  )

  const unplacedBeacons = state.availableBeacons.filter(
    beacon => !state.beacons.find(placed => placed.beacon_id === beacon.id)
  )

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.history.back()}
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
          {unplacedBeacons.map((beacon) => (
            <div
              key={beacon.id}
              className="w-16 h-16 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg cursor-grab active:cursor-grabbing"
              title={beacon.name}
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
          
          {unplacedBeacons.length === 0 && (
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
            {state.beacons.length} of {state.availableBeacons.length} beacons placed
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
      </div>
    </div>
  )
}

export default function BeaconSetupPage() {
  return (
    <FloorPlanProvider>
      <BeaconSetupContent />
    </FloorPlanProvider>
  )
} 