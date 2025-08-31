'use client'

import React, { useState } from 'react'
import { useFloorPlan } from '@/components/context/FloorPlanContext'

export function RoomList() {
  const { state, dispatch } = useFloorPlan()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  const handleStartEdit = (room: any) => {
    setEditingId(room.id)
    setEditingName(room.name)
  }

  const handleSaveEdit = () => {
    if (editingId && editingName.trim()) {
      dispatch({ 
        type: 'SET_ROOM_NAME', 
        id: editingId, 
        name: editingName.trim() 
      })
    }
    setEditingId(null)
    setEditingName('')
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingName('')
  }

  const handleDelete = (roomId: string) => {
    if (confirm('Delete this room? You can undo this action.')) {
      dispatch({ type: 'DELETE_ROOM_UNDO', id: roomId })
    }
  }

  const handleUndo = () => {
    dispatch({ type: 'UNDO' })
  }

  const handleRedo = () => {
    dispatch({ type: 'REDO' })
  }

  if (state.rooms.length === 0) {
    return (
      <div className="p-6 text-center text-gray-500">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mx-auto mb-2 opacity-50">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9,22 9,12 15,12 15,22"/>
        </svg>
        <p className="text-sm">No rooms yet</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900">Rooms ({state.rooms.length})</h3>
        <div className="flex items-center gap-2">
          {/* Undo/Redo buttons */}
          <button
            onClick={handleUndo}
            disabled={state.undoStack.length === 0}
            className={`p-1.5 rounded transition-colors ${
              state.undoStack.length === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Undo last action"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 19c-5 0-9-4-9-9s4-9 9-9"/>
              <path d="M15 10l-3 3 3 3"/>
            </svg>
          </button>

          <button
            onClick={handleRedo}
            disabled={state.redoStack.length === 0}
            className={`p-1.5 rounded transition-colors ${
              state.redoStack.length === 0
                ? 'text-gray-300 cursor-not-allowed'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
            title="Redo last undone action"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 5c5 0 9 4 9 9s-4 9-9 9"/>
              <path d="M9 14l3-3-3-3"/>
            </svg>
          </button>

          {state.rooms.length > 0 && (
            <span className="text-xs text-gray-500 hidden sm:inline">Tap to select, double-tap to rename</span>
          )}
        </div>
      </div>
      
      <div className="space-y-2 max-h-32 overflow-y-auto">
        {state.rooms.map((room) => (
          <div
            key={room.id}
            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
              state.selectedRoom === room.id
                ? 'border-violet-300 bg-violet-50'
                : 'border-gray-200 bg-white hover:bg-gray-50'
            }`}
            onClick={() => dispatch({ type: 'SELECT_ROOM', id: room.id })}
          >
            {/* Color swatch */}
            <div 
              className="w-4 h-4 rounded-full border-2 border-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: room.color }}
            />
            
            {/* Room name */}
            <div className="flex-1 min-w-0">
              {editingId === room.id ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveEdit()
                      if (e.key === 'Escape') handleCancelEdit()
                    }}
                    className="flex-1 px-2 py-1 text-sm border rounded focus:ring-2 focus:ring-violet-500 focus:border-violet-500"
                    autoFocus
                    onBlur={handleSaveEdit}
                  />
                </div>
              ) : (
                <div
                  className="font-medium text-gray-900 truncate cursor-pointer"
                  onDoubleClick={() => handleStartEdit(room)}
                >
                  {room.name}
                </div>
              )}
              <div className="flex items-center gap-1 mt-0.5">
                <span className="text-xs text-gray-500">
                  {room.type === 'rectangle' ? 'Rectangle' :
                   room.type === 'l-shape' ? 'L-Shape' :
                   room.type === 't-shape' ? 'T-Shape' :
                   room.type === 'u-shape' ? 'U-Shape' : 'Shape'}
                </span>
                {room.type === 'l-shape' && (
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                  </div>
                )}
                {room.type === 't-shape' && (
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-purple-500 rounded-full"></div>
                  </div>
                )}
                {room.type === 'u-shape' && (
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                    <div className="w-1 h-1 bg-orange-500 rounded-full"></div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-1">
              {/* Advanced editing actions - shown only for selected room */}
              {state.selectedRoom === room.id && (
                <div className="flex items-center gap-1 mr-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      dispatch({ type: 'ROTATE_ROOM', id: room.id, angle: 45 })
                    }}
                    className="p-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded"
                    title="Rotate room 45°"
                  >
                    ↻
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      dispatch({ type: 'ROTATE_ROOM', id: room.id, angle: -45 })
                    }}
                    className="p-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded"
                    title="Rotate room -45°"
                  >
                    ↺
                  </button>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      dispatch({ type: 'DUPLICATE_ROOM', id: room.id })
                    }}
                    className="p-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                    title="Duplicate room"
                  >
                    📋
                  </button>

                  {(room.rotation || 0) !== 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        dispatch({ type: 'ROTATE_ROOM', id: room.id, angle: -(room.rotation || 0) })
                      }}
                      className="p-1 text-xs text-orange-600 hover:text-orange-800 hover:bg-orange-50 rounded"
                      title="Reset rotation"
                    >
                      ⟲
                    </button>
                  )}
                </div>
              )}

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleStartEdit(room)
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
                title="Rename room"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 20h9"/>
                  <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                </svg>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(room.id)
                }}
                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                title="Delete room"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 6h18"/>
                  <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
                  <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
} 