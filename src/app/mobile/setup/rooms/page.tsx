'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { FloorPlanProvider, useFloorPlan } from '@/components/context/FloorPlanContext'
import { RoomList } from '@/components/room-setup/RoomList'
import { RoomTemplates } from '@/components/room-setup/RoomTemplates'

// Dynamically import RoomCanvas to avoid SSR issues with Konva
const RoomCanvas = dynamic(() => import('@/components/room-setup/RoomCanvas').then(mod => ({ default: mod.RoomCanvas })), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
        <p className="text-sm">Loading canvas...</p>
      </div>
    </div>
  ),
})

function RoomSetupContent() {
  const { state, dispatch } = useFloorPlan()
  const [showTemplates, setShowTemplates] = useState(false)

  const handleNext = useCallback(() => {
    if (state.rooms.length === 0) {
      alert('Please add at least one room before continuing.')
      return
    }
    // Navigate to beacon placement
    window.location.href = '/mobile/setup/beacons'
  }, [state.rooms.length])

  const canProceed = state.rooms.length > 0

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
              <h1 className="text-xl font-bold text-gray-900">Setup Rooms</h1>
              <p className="text-sm text-gray-600">Draw your home layout</p>
            </div>
          </div>
          
          <button
            onClick={handleNext}
            disabled={!canProceed}
            className={`px-6 py-2 rounded-lg font-medium transition-all ${
              canProceed
                ? 'bg-violet-600 text-white hover:bg-violet-700 shadow-lg hover:shadow-xl'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Next
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Welcome Message */}
        {state.rooms.length === 0 && (
          <div className="px-6 py-4 bg-blue-50 border-b border-blue-100">
            <div className="text-center">
              <h2 className="text-lg font-semibold text-blue-900 mb-1">
                Let's draw your home
              </h2>
              <p className="text-blue-700">
                Tap "Add Room" to start creating your floor plan
              </p>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className="flex-1 px-4 py-4">
          <div className="h-full bg-white rounded-2xl shadow-lg overflow-hidden">
            <RoomCanvas />
          </div>
        </div>

        {/* Room List */}
        <div className="flex-shrink-0 bg-white border-t border-gray-200 max-h-48 overflow-hidden">
          <RoomList />
        </div>

        {/* Add Room Button */}
        <div className="flex-shrink-0 p-4">
          <button
            onClick={() => setShowTemplates(true)}
            className="w-full bg-gradient-to-r from-teal-500 to-cyan-600 text-white py-4 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14"/>
              <path d="M12 5v14"/>
            </svg>
            Add Room
          </button>
        </div>
      </div>

      {/* Room Templates Bottom Sheet */}
      {showTemplates && (
        <RoomTemplates 
          onSelect={(template) => {
            dispatch({
              type: 'ADD_ROOM',
              room: template,
            })
            setShowTemplates(false)
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  )
}

export default function RoomSetupPage() {
  return (
    <FloorPlanProvider>
      <RoomSetupContent />
    </FloorPlanProvider>
  )
} 