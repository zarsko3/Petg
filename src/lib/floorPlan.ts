/**
 * Floor Plan Projection Utilities
 * Convert 3D AR points to 2D floor coordinates and normalize them
 */

export interface Point2D {
  x: number
  y: number
}

export interface Point3D {
  x: number
  y: number
  z: number
}

export interface FloorPlanBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
  width: number
  height: number
}

export interface NormalizedFloorPlan {
  points: Point2D[]
  bounds: FloorPlanBounds
  area: number
  perimeter: number
}

/**
 * Convert 3D XR points to 2D floor coordinates by dropping Y axis
 */
export const to2D = (points: Point3D[]): Point2D[] => {
  return points.map(point => ({
    x: point.x,
    y: point.z  // Use Z as Y in 2D floor plan
  }))
}

/**
 * Calculate bounding box for 2D points
 */
export const calculateBounds = (points: Point2D[]): FloorPlanBounds => {
  if (points.length === 0) {
    return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 }
  }

  const xs = points.map(p => p.x)
  const ys = points.map(p => p.y)
  
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  
  return {
    minX,
    maxX,
    minY,
    maxY,
    width: maxX - minX,
    height: maxY - minY
  }
}

/**
 * Normalize 2D points to 0-100% coordinate system
 */
export const normalise = (points: Point2D[]): NormalizedFloorPlan => {
  if (points.length < 3) {
    throw new Error('At least 3 points required for floor plan normalization')
  }

  const bounds = calculateBounds(points)
  
  // Avoid division by zero
  const width = Math.max(bounds.width, 0.001)
  const height = Math.max(bounds.height, 0.001)
  
  // Normalize points to 0-100 range
  const normalizedPoints = points.map(point => ({
    x: ((point.x - bounds.minX) / width) * 100,
    y: ((point.y - bounds.minY) / height) * 100
  }))
  
  // Calculate area using shoelace formula
  const area = calculatePolygonArea(normalizedPoints)
  
  // Calculate perimeter
  const perimeter = calculatePolygonPerimeter(normalizedPoints)
  
  return {
    points: normalizedPoints,
    bounds,
    area,
    perimeter
  }
}

/**
 * Calculate polygon area using shoelace formula
 */
export const calculatePolygonArea = (points: Point2D[]): number => {
  if (points.length < 3) return 0
  
  let area = 0
  const n = points.length
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i].x * points[j].y
    area -= points[j].x * points[i].y
  }
  
  return Math.abs(area) / 2
}

/**
 * Calculate polygon perimeter
 */
export const calculatePolygonPerimeter = (points: Point2D[]): number => {
  if (points.length < 2) return 0
  
  let perimeter = 0
  const n = points.length
  
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    const dx = points[j].x - points[i].x
    const dy = points[j].y - points[i].y
    perimeter += Math.sqrt(dx * dx + dy * dy)
  }
  
  return perimeter
}

/**
 * Smooth polygon points using simple averaging
 */
export const smoothPolygon = (points: Point2D[], factor: number = 0.1): Point2D[] => {
  if (points.length < 3) return points
  
  const smoothed: Point2D[] = []
  const n = points.length
  
  for (let i = 0; i < n; i++) {
    const prev = points[(i - 1 + n) % n]
    const curr = points[i]
    const next = points[(i + 1) % n]
    
    const smoothX = curr.x + factor * (prev.x + next.x - 2 * curr.x)
    const smoothY = curr.y + factor * (prev.y + next.y - 2 * curr.y)
    
    smoothed.push({ x: smoothX, y: smoothY })
  }
  
  return smoothed
}

/**
 * Check if a point is inside a polygon using ray casting
 */
export const isPointInPolygon = (point: Point2D, polygon: Point2D[]): boolean => {
  const x = point.x
  const y = point.y
  let inside = false
  
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x
    const yi = polygon[i].y
    const xj = polygon[j].x
    const yj = polygon[j].y
    
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  
  return inside
}

/**
 * Validate floor plan points
 */
export const validateFloorPlan = (points: Point2D[]): { valid: boolean; error?: string } => {
  if (points.length < 3) {
    return { valid: false, error: 'At least 3 points required' }
  }
  
  if (points.length > 20) {
    return { valid: false, error: 'Too many points (max 20)' }
  }
  
  // Check for duplicate points
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x
      const dy = points[i].y - points[j].y
      const distance = Math.sqrt(dx * dx + dy * dy)
      
      if (distance < 0.01) {
        return { valid: false, error: 'Points are too close together' }
      }
    }
  }
  
  // Check for minimum area
  const area = calculatePolygonArea(points)
  if (area < 0.1) {
    return { valid: false, error: 'Floor plan area is too small' }
  }
  
  return { valid: true }
}

/**
 * Convert normalized points back to real-world coordinates
 */
export const denormalizePoints = (
  normalizedPoints: Point2D[], 
  originalBounds: FloorPlanBounds
): Point2D[] => {
  return normalizedPoints.map(point => ({
    x: (point.x / 100) * originalBounds.width + originalBounds.minX,
    y: (point.y / 100) * originalBounds.height + originalBounds.minY
  }))
} 