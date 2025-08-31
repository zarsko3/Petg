'use client';

import React, { useState, useCallback, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { FloorPlanProvider, useFloorPlan, exportFloorPlan, importFloorPlan, downloadFloorPlan } from '@/components/context/FloorPlanContext'
import { RoomList } from '@/components/room-setup/RoomList'
import { RoomTemplates } from '@/components/room-setup/RoomTemplates'

// Import RoomCanvas with SSR disabled
const RoomCanvas = dynamic(() => import('@/components/room-setup/RoomCanvas'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-50">
      <div className="text-center text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
        <p className="text-sm">Loading room canvas...</p>
      </div>
    </div>
  ),
})

function RoomSetupContent() {
  const { state, dispatch } = useFloorPlan()
  const [showTemplates, setShowTemplates] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isClient, setIsClient] = useState(false)

  // Ensure component only renders on client side
  useEffect(() => {
    setIsClient(true)
  }, [])

  const handleNext = useCallback(() => {
    if (state.rooms.length === 0) {
      if (typeof window !== 'undefined') {
        alert('Please add at least one room before continuing.')
      }
      return
    }
    // Navigate to beacon placement
    if (typeof window !== 'undefined') {
      window.location.href = '/mobile/setup/beacons'
    }
  }, [state.rooms.length])

  const handleAddRoom = useCallback((template: any) => {
    try {
      setError(null)
      dispatch({
        type: 'ADD_ROOM',
        room: template,
      })
    } catch (error: any) {
      setError(error.message || 'Failed to add room')
      // Show error for 3 seconds
      setTimeout(() => setError(null), 3000)
    }
  }, [dispatch])

  const handleExport = useCallback(() => {
    try {
      const floorPlanData = exportFloorPlan(state.rooms, [])
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-')
      const filename = `floor-plan-${timestamp}.json`
      downloadFloorPlan(filename, floorPlanData)
    } catch (error: any) {
      setError('Failed to export floor plan')
      setTimeout(() => setError(null), 3000)
    }
  }, [state.rooms])

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

        dispatch({
          type: 'IMPORT_FLOOR_PLAN',
          data: importedData
        })

        setError('Floor plan imported successfully!')
        setTimeout(() => setError(null), 3000)
      } catch (error: any) {
        setError(error.message || 'Failed to import floor plan')
        setTimeout(() => setError(null), 5000)
      }
    }
    reader.readAsText(file)

    // Reset file input
    event.target.value = ''
  }, [dispatch])

  const canProceed = state.rooms.length > 0

  // Only render on client side to prevent SSR issues
  if (!isClient) {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-gray-400">
            <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-violet-600 mx-auto mb-3"></div>
            <p className="text-sm">Loading room setup...</p>
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
                if (typeof window !== 'undefined') {
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
              <h1 className="text-xl font-bold text-gray-900">Setup Rooms</h1>
              <p className="text-sm text-gray-600">Draw your home layout</p>
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
              title="Export floor plan"
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

      {/* Error Message */}
      {error && (
        <div className={`fixed top-4 left-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 ${
          error.includes('successfully')
            ? 'bg-green-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {error.includes('successfully') ? (
              <>
                <path d="M20 6L9 17l-5-5"/>
              </>
            ) : (
              <>
                <circle cx="12" cy="12" r="10"/>
                <path d="m15 9-6 6"/>
                <path d="m9 9 6 6"/>
              </>
            )}
          </svg>
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      {/* Room Templates Bottom Sheet */}
      {showTemplates && (
        <RoomTemplates
          onSelect={(template) => {
            handleAddRoom(template)
            setShowTemplates(false)
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

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

export default function RoomsClient() {
  return (
    <FloorPlanProvider>
      <RoomSetupContent />
    </FloorPlanProvider>
  )
}