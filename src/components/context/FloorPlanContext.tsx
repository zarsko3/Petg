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
  type: 'rectangle' | 'l-shape' | 't-shape' | 'u-shape'
  points: Point2D[]
  zIndex: number
  rotation?: number // Rotation angle in degrees
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
  undoStack: Array<{ rooms: Room[]; beacons: BeaconPlacement[] }>
  redoStack: Array<{ rooms: Room[]; beacons: BeaconPlacement[] }>
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
  | { type: 'SAVE_TO_STORAGE' }
  | { type: 'LOAD_FROM_STORAGE' }
  | { type: 'DELETE_ROOM_UNDO'; id: string }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'ROTATE_ROOM'; id: string; angle: number }
  | { type: 'DUPLICATE_ROOM'; id: string }
  | { type: 'EXPORT_FLOOR_PLAN' }
  | { type: 'IMPORT_FLOOR_PLAN'; data: { rooms: Room[]; beacons: BeaconPlacement[] } }

// Initial state
const initialState: FloorPlanState = {
  rooms: [],
  beacons: [],
  availableBeacons: [],
  selectedRoom: null,
  currentStep: 'rooms',
  isEditing: false,
  undoStack: [],
  redoStack: [],
}

// Helper functions for undo/redo
function saveToUndoStack(state: FloorPlanState): FloorPlanState {
  const currentState = {
    rooms: [...state.rooms],
    beacons: [...state.beacons]
  }

  return {
    ...state,
    undoStack: [...state.undoStack, currentState].slice(-20), // Keep last 20 states
    redoStack: [] // Clear redo stack when new action is performed
  }
}

function createUndoAction(state: FloorPlanState, action: FloorPlanAction): FloorPlanState {
  // Only save state for actions that modify data
  const actionsToTrack = ['ADD_ROOM', 'UPDATE_ROOM', 'DELETE_ROOM', 'DELETE_ROOM_UNDO', 'PLACE_BEACON', 'REMOVE_BEACON', 'RESET']

  if (actionsToTrack.includes(action.type)) {
    return saveToUndoStack(state)
  }

  return state
}

// Reducer
function floorPlanReducer(state: FloorPlanState, action: FloorPlanAction): FloorPlanState {
  // Save current state to undo stack for reversible actions
  state = createUndoAction(state, action)

  switch (action.type) {
    case 'ADD_ROOM': {
      const roomCount = state.rooms.length
      const newRoom: Room = {
        id: `room-${Date.now()}`,
        color: ROOM_COLORS[roomCount % ROOM_COLORS.length],
        zIndex: roomCount,
        ...action.room,
      }

      // Check for overlaps with existing rooms
      const hasOverlap = state.rooms.some(existingRoom =>
        doPolygonsOverlap(newRoom.points, existingRoom.points)
      )

      if (hasOverlap) {
        // Return state unchanged and throw error to be handled by UI
        throw new Error('Room overlaps with existing room. Please adjust the position or size.')
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
      clearFloorPlanFromStorage()
      return initialState
    }

    case 'SAVE_TO_STORAGE': {
      saveFloorPlanToStorage(state.rooms, state.beacons)
      return state
    }

    case 'LOAD_FROM_STORAGE': {
      const data = loadFloorPlanFromStorage()
      if (data) {
        return {
          ...state,
          rooms: data.rooms,
          beacons: data.beacons
        }
      }
      return state
    }

    case 'DELETE_ROOM_UNDO': {
      const roomToDelete = state.rooms.find(room => room.id === action.id)
      if (!roomToDelete) return state

      return {
        ...state,
        rooms: state.rooms.filter(room => room.id !== action.id),
        selectedRoom: state.selectedRoom === action.id ? null : state.selectedRoom
      }
    }

    case 'UNDO': {
      if (state.undoStack.length === 0) return state

      const previousState = state.undoStack[state.undoStack.length - 1]
      const newUndoStack = state.undoStack.slice(0, -1)

      return {
        ...state,
        rooms: previousState.rooms,
        beacons: previousState.beacons,
        undoStack: newUndoStack,
        redoStack: [...state.redoStack, { rooms: state.rooms, beacons: state.beacons }]
      }
    }

    case 'REDO': {
      if (state.redoStack.length === 0) return state

      const nextState = state.redoStack[state.redoStack.length - 1]
      const newRedoStack = state.redoStack.slice(0, -1)

      return {
        ...state,
        rooms: nextState.rooms,
        beacons: nextState.beacons,
        redoStack: newRedoStack,
        undoStack: [...state.undoStack, { rooms: state.rooms, beacons: state.beacons }]
      }
    }

    case 'ROTATE_ROOM': {
      return {
        ...state,
        rooms: state.rooms.map(room =>
          room.id === action.id
            ? { ...room, rotation: (room.rotation || 0) + action.angle }
            : room
        )
      }
    }

    case 'DUPLICATE_ROOM': {
      const roomToDuplicate = state.rooms.find(room => room.id === action.id)
      if (!roomToDuplicate) return state

      const roomCount = state.rooms.length
      const newRoom: Room = {
        ...roomToDuplicate,
        id: `room-${Date.now()}`,
        name: `${roomToDuplicate.name} Copy`,
        zIndex: roomCount,
        // Offset the duplicated room slightly
        points: roomToDuplicate.points.map(point => ({
          x: Math.max(0, Math.min(100, point.x + 5)),
          y: Math.max(0, Math.min(100, point.y + 5))
        }))
      }

      return {
        ...state,
        rooms: [...state.rooms, newRoom],
        selectedRoom: newRoom.id
      }
    }

    case 'EXPORT_FLOOR_PLAN': {
      // Export is handled by the UI component directly
      return state
    }

    case 'IMPORT_FLOOR_PLAN': {
      return {
        ...state,
        rooms: action.data.rooms,
        beacons: action.data.beacons,
        undoStack: [],
        redoStack: []
      }
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
  const [isInitialized, setIsInitialized] = useState(false)

  // Load data from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const data = loadFloorPlanFromStorage()
      if (data && (data.rooms.length > 0 || data.beacons.length > 0)) {
        dispatch({
          type: 'LOAD_FLOOR_PLAN',
          rooms: data.rooms,
          beacons: data.beacons
        })
      }
      setIsInitialized(true)
    }
  }, [])

  // Auto-save to localStorage when state changes (after initialization)
  useEffect(() => {
    if (isInitialized && typeof window !== 'undefined') {
      saveFloorPlanToStorage(state.rooms, state.beacons)
    }
  }, [state.rooms, state.beacons, isInitialized])

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
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' = 'bottom-right'
): Point2D[] {
  // Create proper L-shape polygon by tracing the outer perimeter
  const snappedX = snapToGrid(x)
  const snappedY = snapToGrid(y)
  const snappedWidth1 = snapToGrid(width1)
  const snappedHeight1 = snapToGrid(height1)
  const snappedWidth2 = snapToGrid(width2)
  const snappedHeight2 = snapToGrid(height2)

  let points: Point2D[]

  switch (position) {
    case 'bottom-right':
      // L-shape extending to bottom-right
      points = [
        { x: snappedX, y: snappedY },                                    // Top-left of main rectangle
        { x: snappedX + snappedWidth1, y: snappedY },                   // Top-right of main rectangle
        { x: snappedX + snappedWidth1, y: snappedY + snappedHeight1 },  // Bottom-right of main rectangle
        { x: snappedX + snappedWidth1 + snappedWidth2, y: snappedY + snappedHeight1 }, // Bottom-right of extension
        { x: snappedX + snappedWidth1 + snappedWidth2, y: snappedY + snappedHeight1 + snappedHeight2 }, // Bottom-right corner
        { x: snappedX + snappedWidth1, y: snappedY + snappedHeight1 + snappedHeight2 }, // Bottom-left of extension
        { x: snappedX + snappedWidth1, y: snappedY + snappedHeight1 },  // Top-right of extension
        { x: snappedX, y: snappedY + snappedHeight1 },                  // Bottom-left of main rectangle
        { x: snappedX, y: snappedY }                                    // Back to start
      ]
      break

    case 'top-right':
      // L-shape extending to top-right
      points = [
        { x: snappedX, y: snappedY + snappedHeight1 },                  // Bottom-left of main rectangle
        { x: snappedX + snappedWidth1, y: snappedY + snappedHeight1 },  // Bottom-right of main rectangle
        { x: snappedX + snappedWidth1, y: snappedY },                   // Top-right of main rectangle
        { x: snappedX + snappedWidth1 + snappedWidth2, y: snappedY },   // Top-right of extension
        { x: snappedX + snappedWidth1 + snappedWidth2, y: snappedY - snappedHeight2 }, // Top-right corner
        { x: snappedX + snappedWidth1, y: snappedY - snappedHeight2 },  // Top-left of extension
        { x: snappedX + snappedWidth1, y: snappedY },                   // Bottom-right of extension
        { x: snappedX, y: snappedY },                                   // Top-left of main rectangle
        { x: snappedX, y: snappedY + snappedHeight1 }                   // Back to start
      ]
      break

    case 'bottom-left':
      // L-shape extending to bottom-left
      points = [
        { x: snappedX + snappedWidth1, y: snappedY },                   // Top-right of main rectangle
        { x: snappedX, y: snappedY },                                   // Top-left of main rectangle
        { x: snappedX, y: snappedY + snappedHeight1 },                  // Bottom-left of main rectangle
        { x: snappedX - snappedWidth2, y: snappedY + snappedHeight1 },  // Bottom-left of extension
        { x: snappedX - snappedWidth2, y: snappedY + snappedHeight1 + snappedHeight2 }, // Bottom-left corner
        { x: snappedX, y: snappedY + snappedHeight1 + snappedHeight2 }, // Bottom-right of extension
        { x: snappedX, y: snappedY + snappedHeight1 },                  // Top-right of extension
        { x: snappedX + snappedWidth1, y: snappedY + snappedHeight1 },  // Bottom-right of main rectangle
        { x: snappedX + snappedWidth1, y: snappedY }                    // Back to start
      ]
      break

    case 'top-left':
      // L-shape extending to top-left
      points = [
        { x: snappedX + snappedWidth1, y: snappedY + snappedHeight1 },  // Bottom-right of main rectangle
        { x: snappedX, y: snappedY + snappedHeight1 },                  // Bottom-left of main rectangle
        { x: snappedX, y: snappedY },                                   // Top-left of main rectangle
        { x: snappedX - snappedWidth2, y: snappedY },                   // Top-left of extension
        { x: snappedX - snappedWidth2, y: snappedY - snappedHeight2 },  // Top-left corner
        { x: snappedX, y: snappedY - snappedHeight2 },                  // Top-right of extension
        { x: snappedX, y: snappedY },                                   // Bottom-right of extension
        { x: snappedX + snappedWidth1, y: snappedY },                   // Top-right of main rectangle
        { x: snappedX + snappedWidth1, y: snappedY + snappedHeight1 }   // Back to start
      ]
      break
  }

  return points
}

export function createTShapePoints(
  x: number,
  y: number,
  width: number,
  height: number,
  stemWidth: number,
  stemHeight: number
): Point2D[] {
  // Create T-shape: horizontal bar with vertical stem in center
  const snappedX = snapToGrid(x)
  const snappedY = snapToGrid(y)
  const snappedWidth = snapToGrid(width)
  const snappedHeight = snapToGrid(height)
  const snappedStemWidth = snapToGrid(stemWidth)
  const snappedStemHeight = snapToGrid(stemHeight)

  const stemX = snappedX + (snappedWidth - snappedStemWidth) / 2

  return [
    // Top bar
    { x: snappedX, y: snappedY },
    { x: snappedX + snappedWidth, y: snappedY },
    { x: snappedX + snappedWidth, y: snappedY + snappedStemHeight },
    { x: snappedX + snappedWidth - (snappedWidth - snappedStemWidth) / 2, y: snappedY + snappedStemHeight },
    // Stem
    { x: stemX + snappedStemWidth, y: snappedY + snappedStemHeight },
    { x: stemX + snappedStemWidth, y: snappedY + snappedHeight },
    { x: stemX, y: snappedY + snappedHeight },
    { x: stemX, y: snappedY + snappedStemHeight },
    { x: snappedX + (snappedWidth - snappedStemWidth) / 2, y: snappedY + snappedStemHeight },
    // Complete top bar
    { x: snappedX, y: snappedY + snappedStemHeight },
    { x: snappedX, y: snappedY }
  ]
}

export function createUShapePoints(
  x: number,
  y: number,
  width: number,
  height: number,
  thickness: number
): Point2D[] {
  // Create U-shape: open at top
  const snappedX = snapToGrid(x)
  const snappedY = snapToGrid(y)
  const snappedWidth = snapToGrid(width)
  const snappedHeight = snapToGrid(height)
  const snappedThickness = snapToGrid(thickness)

  return [
    // Left side
    { x: snappedX, y: snappedY },
    { x: snappedX + snappedThickness, y: snappedY },
    { x: snappedX + snappedThickness, y: snappedY + snappedHeight - snappedThickness },
    { x: snappedX, y: snappedY + snappedHeight - snappedThickness },
    { x: snappedX, y: snappedY + snappedHeight },
    { x: snappedX + snappedWidth, y: snappedY + snappedHeight },
    { x: snappedX + snappedWidth, y: snappedY + snappedHeight - snappedThickness },
    { x: snappedX + snappedWidth - snappedThickness, y: snappedY + snappedHeight - snappedThickness },
    { x: snappedX + snappedWidth - snappedThickness, y: snappedY },
    { x: snappedX + snappedWidth, y: snappedY },
    { x: snappedX + snappedWidth, y: snappedY + snappedThickness },
    { x: snappedX + snappedThickness, y: snappedY + snappedThickness },
    { x: snappedX + snappedThickness, y: snappedY }
  ]
}

// Beacon placement validation utilities
export function isPointInRoom(point: Point2D, room: Room): boolean {
  // Handle rotation by rotating the point in the opposite direction
  const rotation = -(room.rotation || 0)
  const rotatedPoint = rotatePoint(point, room, rotation)

  // Use ray casting algorithm to determine if point is inside polygon
  let inside = false
  for (let i = 0, j = room.points.length - 1; i < room.points.length; j = i++) {
    const xi = room.points[i].x, yi = room.points[i].y
    const xj = room.points[j].x, yj = room.points[j].y

    if (((yi > rotatedPoint.y) !== (yj > rotatedPoint.y)) &&
        (rotatedPoint.x < (xj - xi) * (rotatedPoint.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }

  return inside
}

export function rotatePoint(point: Point2D, room: Room, angleInDegrees: number): Point2D {
  if (angleInDegrees === 0) return point

  // Calculate room center
  const center = room.points.reduce(
    (acc, p) => ({
      x: acc.x + p.x,
      y: acc.y + p.y
    }),
    { x: 0, y: 0 }
  )
  center.x /= room.points.length
  center.y /= room.points.length

  // Convert to radians
  const angle = (angleInDegrees * Math.PI) / 180

  // Translate point to origin, rotate, translate back
  const translatedX = point.x - center.x
  const translatedY = point.y - center.y

  const rotatedX = translatedX * Math.cos(angle) - translatedY * Math.sin(angle)
  const rotatedY = translatedX * Math.sin(angle) + translatedY * Math.cos(angle)

  return {
    x: rotatedX + center.x,
    y: rotatedY + center.y
  }
}

export function getMinimumBeaconDistance(): number {
  return 15 // Minimum 15% of canvas distance between beacons
}

export function validateBeaconPlacement(
  beacon: BeaconPlacement,
  allBeacons: BeaconPlacement[],
  rooms: Room[]
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = []
  const warnings: string[] = []

  // Check if beacon is placed in a room
  const room = rooms.find(r => isPointInRoom({ x: beacon.x, y: beacon.y }, r))
  if (!room) {
    errors.push('Beacon must be placed inside a room')
  }

  // Check minimum distance from other beacons
  const minDistance = getMinimumBeaconDistance()
  for (const otherBeacon of allBeacons) {
    if (otherBeacon.beacon_id === beacon.beacon_id) continue

    const distance = Math.sqrt(
      Math.pow(beacon.x - otherBeacon.x, 2) + Math.pow(beacon.y - otherBeacon.y, 2)
    )

    if (distance < minDistance) {
      errors.push(`Beacon too close to another beacon (minimum ${minDistance}% distance required)`)
      break
    }
  }

  // Check if beacon is too close to room walls (warning)
  if (room) {
    const margin = 5 // 5% margin from walls
    const bounds = getPolygonBounds(room.points)

    if (
      beacon.x < bounds.minX + margin ||
      beacon.x > bounds.maxX - margin ||
      beacon.y < bounds.minY + margin ||
      beacon.y > bounds.maxY - margin
    ) {
      warnings.push('Beacon placed too close to room walls')
    }
  }

  return { valid: errors.length === 0, errors, warnings }
}

export function getOptimalBeaconPositions(rooms: Room[]): Array<{ x: number; y: number; roomId: string }> {
  const positions: Array<{ x: number; y: number; roomId: string }> = []

  for (const room of rooms) {
    const bounds = getPolygonBounds(room.points)
    const centerX = (bounds.minX + bounds.maxX) / 2
    const centerY = (bounds.minY + bounds.maxY) / 2

    // For simple shapes, place beacon in center
    // For complex shapes, you might want more sophisticated algorithms
    positions.push({
      x: centerX,
      y: centerY,
      roomId: room.id
    })
  }

  return positions
}

// Room overlap detection utilities
export function doPolygonsOverlap(polygon1: Point2D[], polygon2: Point2D[]): boolean {
  // Simple bounding box overlap check first
  if (!doBoundingBoxesOverlap(polygon1, polygon2)) {
    return false
  }

  // Check if any edge of polygon1 intersects with any edge of polygon2
  for (let i = 0; i < polygon1.length; i++) {
    const edge1 = {
      start: polygon1[i],
      end: polygon1[(i + 1) % polygon1.length]
    }

    for (let j = 0; j < polygon2.length; j++) {
      const edge2 = {
        start: polygon2[j],
        end: polygon2[(j + 1) % polygon2.length]
      }

      if (doEdgesIntersect(edge1, edge2)) {
        return true
      }
    }
  }

  // Check if one polygon is completely inside the other
  return isPointInsidePolygon(polygon1[0], polygon2) || isPointInsidePolygon(polygon2[0], polygon1)
}

export function doBoundingBoxesOverlap(polygon1: Point2D[], polygon2: Point2D[]): boolean {
  const bounds1 = getPolygonBounds(polygon1)
  const bounds2 = getPolygonBounds(polygon2)

  return !(bounds1.maxX < bounds2.minX ||
           bounds1.minX > bounds2.maxX ||
           bounds1.maxY < bounds2.minY ||
           bounds1.minY > bounds2.maxY)
}

function getPolygonBounds(polygon: Point2D[]): {
  minX: number
  maxX: number
  minY: number
  maxY: number
} {
  return polygon.reduce(
    (bounds, point) => ({
      minX: Math.min(bounds.minX, point.x),
      maxX: Math.max(bounds.maxX, point.x),
      minY: Math.min(bounds.minY, point.y),
      maxY: Math.max(bounds.maxY, point.y)
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
  )
}

function doEdgesIntersect(
  edge1: { start: Point2D; end: Point2D },
  edge2: { start: Point2D; end: Point2D }
): boolean {
  const { start: p1, end: p2 } = edge1
  const { start: p3, end: p4 } = edge2

  const denom = (p1.x - p2.x) * (p3.y - p4.y) - (p1.y - p2.y) * (p3.x - p4.x)

  if (Math.abs(denom) < 1e-10) {
    return false // Lines are parallel
  }

  const t = ((p1.x - p3.x) * (p3.y - p4.y) - (p1.y - p3.y) * (p3.x - p4.x)) / denom
  const u = -((p1.x - p2.x) * (p1.y - p3.y) - (p1.y - p2.y) * (p1.x - p3.x)) / denom

  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

function isPointInsidePolygon(point: Point2D, polygon: Point2D[]): boolean {
  let inside = false

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y

    if (((yi > point.y) !== (yj > point.y)) &&
        (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }

  return inside
}

// Local storage utilities for floor plan persistence
const STORAGE_KEY = 'floor-plan-data'

export function saveFloorPlanToStorage(rooms: Room[], beacons: BeaconPlacement[]): void {
  if (typeof window === 'undefined') return

  try {
    const data = {
      rooms,
      beacons,
      timestamp: Date.now()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (error) {
    console.warn('Failed to save floor plan to localStorage:', error)
  }
}

export function loadFloorPlanFromStorage(): { rooms: Room[]; beacons: BeaconPlacement[] } | null {
  if (typeof window === 'undefined') return null

  try {
    const data = localStorage.getItem(STORAGE_KEY)
    if (!data) return null

    const parsed = JSON.parse(data)
    return {
      rooms: parsed.rooms || [],
      beacons: parsed.beacons || []
    }
  } catch (error) {
    console.warn('Failed to load floor plan from localStorage:', error)
    return null
  }
}

export function clearFloorPlanFromStorage(): void {
  if (typeof window === 'undefined') return

  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.warn('Failed to clear floor plan from localStorage:', error)
  }
}

// Export/Import utilities
export function exportFloorPlan(rooms: Room[], beacons: BeaconPlacement[]): string {
  const floorPlanData = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    rooms,
    beacons,
    metadata: {
      roomCount: rooms.length,
      beaconCount: beacons.length,
      roomTypes: [...new Set(rooms.map(r => r.type))]
    }
  }

  return JSON.stringify(floorPlanData, null, 2)
}

export function importFloorPlan(jsonData: string): { rooms: Room[]; beacons: BeaconPlacement[] } {
  try {
    const data = JSON.parse(jsonData)

    // Validate the imported data structure
    if (!data.rooms || !Array.isArray(data.rooms)) {
      throw new Error('Invalid floor plan: missing or invalid rooms data')
    }

    if (!data.beacons || !Array.isArray(data.beacons)) {
      throw new Error('Invalid floor plan: missing or invalid beacons data')
    }

    // Basic validation of room and beacon data
    data.rooms.forEach((room: any, index: number) => {
      if (!room.id || !room.name || !room.type || !room.points) {
        throw new Error(`Invalid room data at index ${index}`)
      }
    })

    data.beacons.forEach((beacon: any, index: number) => {
      if (!beacon.beacon_id || typeof beacon.x !== 'number' || typeof beacon.y !== 'number') {
        throw new Error(`Invalid beacon data at index ${index}`)
      }
    })

    return {
      rooms: data.rooms,
      beacons: data.beacons
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to import floor plan: ${error.message}`)
    }
    throw new Error('Failed to import floor plan: Invalid JSON format')
  }
}

export function downloadFloorPlan(filename: string, data: string): void {
  if (typeof window === 'undefined') return

  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
} 