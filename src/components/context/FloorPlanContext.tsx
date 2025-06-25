'use client'

import React, { createContext, useContext, useReducer, ReactNode } from 'react'

// Types for our floor plan system
export interface Point2D {
  x: number // Percentage 0-100
  y: number // Percentage 0-100
}

export interface Room {
  id: string
  name: string
  color: string
  type: 'rectangle' | 'l-shape'
  points: Point2D[]
  zIndex: number
}

export interface BeaconPlacement {
  beacon_id: string
  beacon_name: string
  x: number // Percentage 0-100
  y: number // Percentage 0-100
  room_id?: string
}

export interface FloorPlanState {
  rooms: Room[]
  beacons: BeaconPlacement[]
  availableBeacons: Array<{ id: string; name: string; paired: boolean }>
  selectedRoom: string | null
  currentStep: 'rooms' | 'beacons' | 'complete'
  isEditing: boolean
}

// Color palette for rooms (10 colors as requested)
export const ROOM_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange  
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#10B981', // Emerald
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#6366F1', // Indigo
  '#8B5CF6', // Violet
  '#EC4899', // Pink
] as const

// Grid snapping configuration
export const GRID_SIZE = 2 // 2% of canvas (8px on 400px canvas)

// Action types
type FloorPlanAction =
  | { type: 'ADD_ROOM'; room: Omit<Room, 'id' | 'zIndex' | 'color'> }
  | { type: 'UPDATE_ROOM'; id: string; updates: Partial<Room> }
  | { type: 'DELETE_ROOM'; id: string }
  | { type: 'SELECT_ROOM'; id: string | null }
  | { type: 'SET_ROOM_NAME'; id: string; name: string }
  | { type: 'PLACE_BEACON'; beacon_id: string; x: number; y: number }
  | { type: 'REMOVE_BEACON'; beacon_id: string }
  | { type: 'SET_AVAILABLE_BEACONS'; beacons: Array<{ id: string; name: string; paired: boolean }> }
  | { type: 'SET_STEP'; step: FloorPlanState['currentStep'] }
  | { type: 'SET_EDITING'; editing: boolean }
  | { type: 'LOAD_FLOOR_PLAN'; rooms: Room[]; beacons: BeaconPlacement[] }
  | { type: 'RESET' }

// Initial state
const initialState: FloorPlanState = {
  rooms: [],
  beacons: [],
  availableBeacons: [],
  selectedRoom: null,
  currentStep: 'rooms',
  isEditing: false,
}

// Reducer
function floorPlanReducer(state: FloorPlanState, action: FloorPlanAction): FloorPlanState {
  switch (action.type) {
    case 'ADD_ROOM': {
      const roomCount = state.rooms.length
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        color: ROOM_COLORS[roomCount % ROOM_COLORS.length],
        zIndex: roomCount,
        ...action.room,
      }
      return {
        ...state,
        rooms: [...state.rooms, newRoom],
        selectedRoom: newRoom.id,
      }
    }

    case 'UPDATE_ROOM': {
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.id ? { ...room, ...action.updates } : room
        ),
      }
    }

    case 'DELETE_ROOM': {
      return {
        ...state,
        rooms: state.rooms.filter(room => room.id !== action.id),
        selectedRoom: state.selectedRoom === action.id ? null : state.selectedRoom,
        // Remove beacons that were in this room
        beacons: state.beacons.map(beacon =>
          beacon.room_id === action.id ? { ...beacon, room_id: undefined } : beacon
        ),
      }
    }

    case 'SELECT_ROOM': {
      return {
        ...state,
        selectedRoom: action.id,
      }
    }

    case 'SET_ROOM_NAME': {
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.id ? { ...room, name: action.name } : room
        ),
      }
    }

    case 'PLACE_BEACON': {
      const existingIndex = state.beacons.findIndex(b => b.beacon_id === action.beacon_id)
      const updatedBeacon: BeaconPlacement = {
        beacon_id: action.beacon_id,
        beacon_name: state.availableBeacons.find(b => b.id === action.beacon_id)?.name || 'Unknown',
        x: Math.round(action.x / GRID_SIZE) * GRID_SIZE, // Snap to grid
        y: Math.round(action.y / GRID_SIZE) * GRID_SIZE,
      }

      if (existingIndex >= 0) {
        // Update existing beacon position
        const newBeacons = [...state.beacons]
        newBeacons[existingIndex] = updatedBeacon
        return { ...state, beacons: newBeacons }
      } else {
        // Add new beacon
        return { ...state, beacons: [...state.beacons, updatedBeacon] }
      }
    }

    case 'REMOVE_BEACON': {
      return {
        ...state,
        beacons: state.beacons.filter(beacon => beacon.beacon_id !== action.beacon_id),
      }
    }

    case 'SET_AVAILABLE_BEACONS': {
      return {
        ...state,
        availableBeacons: action.beacons,
      }
    }

    case 'SET_STEP': {
      return {
        ...state,
        currentStep: action.step,
      }
    }

    case 'SET_EDITING': {
      return {
        ...state,
        isEditing: action.editing,
      }
    }

    case 'LOAD_FLOOR_PLAN': {
      return {
        ...state,
        rooms: action.rooms,
        beacons: action.beacons,
      }
    }

    case 'RESET': {
      return initialState
    }

    default:
      return state
  }
}

// Context
const FloorPlanContext = createContext<{
  state: FloorPlanState
  dispatch: React.Dispatch<FloorPlanAction>
} | null>(null)

// Provider component
export function FloorPlanProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(floorPlanReducer, initialState)

  return (
    <FloorPlanContext.Provider value={{ state, dispatch }}>
      {children}
    </FloorPlanContext.Provider>
  )
}

// Hook to use the context
export function useFloorPlan() {
  const context = useContext(FloorPlanContext)
  if (!context) {
    throw new Error('useFloorPlan must be used within a FloorPlanProvider')
  }
  return context
}

// Utility functions
export function snapToGrid(value: number): number {
  return Math.round(value / GRID_SIZE) * GRID_SIZE
}

export function createRectanglePoints(x: number, y: number, width: number, height: number): Point2D[] {
  return [
    { x: snapToGrid(x), y: snapToGrid(y) },
    { x: snapToGrid(x + width), y: snapToGrid(y) },
    { x: snapToGrid(x + width), y: snapToGrid(y + height) },
    { x: snapToGrid(x), y: snapToGrid(y + height) },
  ]
}

export function createLShapePoints(
  x: number, 
  y: number, 
  width1: number, 
  height1: number,
  width2: number, 
  height2: number,
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'top-left'
): Point2D[] {
  // Create L-shape as two overlapping rectangles
  const baseRect = createRectanglePoints(x, y, width1, height1)
  
  let extRect: Point2D[]
  switch (position) {
    case 'top-right':
      extRect = createRectanglePoints(x + width1, y, width2, height2)
      break
    case 'bottom-left':
      extRect = createRectanglePoints(x, y + height1, width2, height2)
      break
    case 'bottom-right':
      extRect = createRectanglePoints(x + width1, y + height1, width2, height2)
      break
    default: // top-left
      extRect = createRectanglePoints(x - width2, y, width2, height2)
  }
  
  // For now, return the union as a simple concatenation
  // TODO: Implement proper polygon union for complex L-shapes
  return [...baseRect, ...extRect]
} 