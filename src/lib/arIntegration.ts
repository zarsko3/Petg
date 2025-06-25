/**
 * AR Integration Utilities
 * Handles saving AR floor plans and broadcasting updates
 */

import { Point2D, Point3D, to2D, normalise, NormalizedFloorPlan } from './floorPlan'

// TODO: Enable AR in v2
/*
import { Point3D, Point2D, FloorPlan } from './floorPlan'

// Database interface for Supabase floor plan storage
export interface FloorPlanRecord {
  id: string
  user_id: string
  name: string
  created_at: string
  updated_at: string
  ar_points: Point3D[]
  floor_plan_2d: Point2D[]
  bounds: {
    min_x: number
    max_x: number
    min_y: number
    max_y: number
    area_sqm: number
  }
  metadata: {
    device_info: string
    capture_method: 'ar_scan' | 'manual_draw'
    confidence_score?: number
  }
}

// WebSocket message types for real-time updates
export interface FloorPlanUpdateMessage {
  type: 'floor_plan_updated'
  user_id: string
  floor_plan: FloorPlanRecord
}

// Save AR floor plan to Supabase
export async function saveFloorPlan(
  userId: string,
  name: string,
  arPoints: Point3D[],
  floorPlan2D: Point2D[],
  deviceInfo: string = navigator.userAgent
): Promise<FloorPlanRecord> {
  const record: Omit<FloorPlanRecord, 'id' | 'created_at' | 'updated_at'> = {
    user_id: userId,
    name,
    ar_points: arPoints,
    floor_plan_2d: floorPlan2D,
    bounds: calculateBounds(floorPlan2D),
    metadata: {
      device_info: deviceInfo,
      capture_method: 'ar_scan'
    }
  }

  // TODO: Implement Supabase save
  // const { data, error } = await supabase
  //   .from('floor_plans')
  //   .insert(record)
  //   .select()
  //   .single()

  // if (error) throw error
  // return data

  // Mock implementation for now
  return {
    ...record,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
}

// Calculate bounds for a 2D floor plan
function calculateBounds(points: Point2D[]) {
  if (points.length === 0) {
    return { min_x: 0, max_x: 0, min_y: 0, max_y: 0, area_sqm: 0 }
  }

  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  
  const bounds = {
    min_x: Math.min(...xs),
    max_x: Math.max(...xs),
    min_y: Math.min(...ys),
    max_y: Math.max(...ys),
    area_sqm: 0 // TODO: Calculate polygon area
  }

  return bounds
}

// Broadcast floor plan update via WebSocket
export function broadcastFloorPlanUpdate(
  floorPlan: FloorPlanRecord,
  socket?: WebSocket
): void {
  const message: FloorPlanUpdateMessage = {
    type: 'floor_plan_updated',
    user_id: floorPlan.user_id,
    floor_plan: floorPlan
  }

  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(message))
  }

  // TODO: Also broadcast to other connected clients via server-side WebSocket
  console.log('Broadcasting floor plan update:', message)
}

// Load floor plans for a user
export async function loadFloorPlans(userId: string): Promise<FloorPlanRecord[]> {
  // TODO: Implement Supabase query
  // const { data, error } = await supabase
  //   .from('floor_plans')
  //   .select('*')
  //   .eq('user_id', userId)
  //   .order('updated_at', { ascending: false })

  // if (error) throw error
  // return data || []

  // Mock implementation for now
  return []
}

// Delete a floor plan
export async function deleteFloorPlan(planId: string): Promise<void> {
  // TODO: Implement Supabase delete
  // const { error } = await supabase
  //   .from('floor_plans')
  //   .delete()
  //   .eq('id', planId)

  // if (error) throw error
  
  console.log('Floor plan deleted:', planId)
}
*/

// Placeholder for v2 AR features
export const AR_INTEGRATION_DISABLED = true
export const AR_V2_COMING_SOON = "AR room scanning will be available in v2"

export interface FloorPlanRecord {
  id: string
  user_id: string
  name: string
  points_json: Point2D[]
  created_at: string
  updated_at: string
  method: 'ar' | 'manual' | 'upload'
  area: number
  perimeter: number
}

/**
 * Save floor plan to database (Supabase integration placeholder)
 */
export const saveFloorPlan = async (
  userId: string, 
  points: Point2D[], 
  method: 'ar' | 'manual' = 'ar',
  name?: string
): Promise<FloorPlanRecord | null> => {
  try {
    const normalized = normalise(points)
    
    const floorPlan: Omit<FloorPlanRecord, 'id' | 'created_at' | 'updated_at'> = {
      user_id: userId,
      name: name || `${method === 'ar' ? 'AR Scanned' : 'Manual'} Floor Plan`,
      points_json: normalized.points,
      method,
      area: normalized.area,
      perimeter: normalized.perimeter
    }

    // TODO: Replace with actual Supabase call
    console.log('Saving floor plan to database:', floorPlan)
    
    /*
    const { data, error } = await supabase
      .from('floor_plan_points')
      .insert(floorPlan)
      .select()
      .single()
    
    if (error) throw error
    return data
    */
    
    // Mock response for now
    return {
      ...floorPlan,
      id: `fp_${Date.now()}`,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    
  } catch (error) {
    console.error('Error saving floor plan:', error)
    return null
  }
}

/**
 * Load user's floor plans from database
 */
export const loadFloorPlans = async (userId: string): Promise<FloorPlanRecord[]> => {
  try {
    // TODO: Replace with actual Supabase call
    console.log('Loading floor plans for user:', userId)
    
    /*
    const { data, error } = await supabase
      .from('floor_plan_points')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false })
    
    if (error) throw error
    return data || []
    */
    
    // Mock response for now
    return []
    
  } catch (error) {
    console.error('Error loading floor plans:', error)
    return []
  }
}

/**
 * Broadcast floor plan update via WebSocket
 */
export const broadcastFloorPlanUpdate = async (
  floorPlan: NormalizedFloorPlan,
  method: 'ar' | 'manual' = 'ar'
): Promise<void> => {
  try {
    const updatePayload = {
      type: 'floorPlanUpdated',
      data: {
        points: floorPlan.points,
        bounds: floorPlan.bounds,
        area: floorPlan.area,
        perimeter: floorPlan.perimeter,
        method,
        timestamp: Date.now()
      }
    }

    // TODO: Replace with actual WebSocket broadcast
    console.log('Broadcasting floor plan update:', updatePayload)
    
    /*
    if (websocket && websocket.readyState === WebSocket.OPEN) {
      websocket.send(JSON.stringify(updatePayload))
    }
    */
    
  } catch (error) {
    console.error('Error broadcasting floor plan update:', error)
  }
}

/**
 * Process AR scanning results and save
 */
export const processARResults = async (
  userId: string,
  arPoints: Point3D[],
  name?: string
): Promise<FloorPlanRecord | null> => {
  try {
    // Convert 3D AR points to 2D
    const points2D = to2D(arPoints)
    
    // Save to database
    const saved = await saveFloorPlan(userId, points2D, 'ar', name)
    
    if (saved) {
      // Broadcast update
      const normalized = normalise(points2D)
      await broadcastFloorPlanUpdate(normalized, 'ar')
    }
    
    return saved
    
  } catch (error) {
    console.error('Error processing AR results:', error)
    return null
  }
}

/**
 * Process manual canvas results and save
 */
export const processManualResults = async (
  userId: string,
  canvasPoints: Point2D[],
  name?: string
): Promise<FloorPlanRecord | null> => {
  try {
    // Save to database
    const saved = await saveFloorPlan(userId, canvasPoints, 'manual', name)
    
    if (saved) {
      // Broadcast update
      const normalized = normalise(canvasPoints)
      await broadcastFloorPlanUpdate(normalized, 'manual')
    }
    
    return saved
    
  } catch (error) {
    console.error('Error processing manual results:', error)
    return null
  }
}

/**
 * Get HTTPS requirements message for AR
 */
export const getARRequirements = (): string => {
  const isHTTPS = typeof window !== 'undefined' && window.location.protocol === 'https:'
  
  if (!isHTTPS) {
    return 'AR features require HTTPS. Please access this app over a secure connection.'
  }
  
  return 'AR requirements satisfied. Ready for room scanning.'
}

/**
 * Check deployment headers for WebXR
 */
export const checkARHeaders = (): { supported: boolean; missing: string[] } => {
  const missing: string[] = []
  
  // These headers are typically set at deployment level
  // For future WebXR Depth API support
  
  /*
  if (!document.querySelector('meta[http-equiv="Cross-Origin-Opener-Policy"]')) {
    missing.push('Cross-Origin-Opener-Policy: same-origin')
  }
  
  if (!document.querySelector('meta[http-equiv="Cross-Origin-Embedder-Policy"]')) {
    missing.push('Cross-Origin-Embedder-Policy: require-corp')
  }
  */
  
  return {
    supported: missing.length === 0,
    missing
  }
} 