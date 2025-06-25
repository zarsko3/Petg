// Coordinate system for mapping triangulation data to map display
// This maps the real-world coordinates from the collar to map percentages

export interface RealWorldBounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export interface MapPosition {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
}

export interface TriangulationPosition {
  x: number; // real-world coordinates from collar
  y: number; // real-world coordinates from collar
}

// Define the real-world bounds of your home/area
// These should match the actual physical layout where beacons are placed
// Updated based on current collar position: x=6.1, y=-7.6
export const REAL_WORLD_BOUNDS: RealWorldBounds = {
  minX: -2,  // leftmost coordinate
  maxX: 12,  // rightmost coordinate  
  minY: -10, // topmost coordinate (collar is at -7.6)
  maxY: 5    // bottommost coordinate
};

// Fixed beacon positions in real-world coordinates
// These should match the actual physical positions of your beacons
// Updated based on triangulation system and current active beacons
export const BEACON_REAL_POSITIONS: Record<string, TriangulationPosition> = {
  'PetZone-Home-01': { x: 0, y: 0 },     // Living room corner
  'PetZone-Home-02': { x: 8, y: 0 },     // Kitchen area  
  'PetZone-Home-03': { x: 4, y: -2 },    // Currently active beacon (estimated position)
  // Add more beacons as needed
};

/**
 * Convert triangulation coordinates to map percentage coordinates
 */
export function triangulationToMap(position: TriangulationPosition): MapPosition {
  const xPercent = ((position.x - REAL_WORLD_BOUNDS.minX) / 
                   (REAL_WORLD_BOUNDS.maxX - REAL_WORLD_BOUNDS.minX)) * 100;
  
  const yPercent = ((position.y - REAL_WORLD_BOUNDS.minY) / 
                   (REAL_WORLD_BOUNDS.maxY - REAL_WORLD_BOUNDS.minY)) * 100;
  
  // Clamp to 0-100 range
  const result = {
    x: Math.max(0, Math.min(100, xPercent)),
    y: Math.max(0, Math.min(100, yPercent))
  };
  
  // Debug logging
  console.log(`🗺️ Coordinate conversion: (${position.x}, ${position.y}) → (${result.x.toFixed(1)}%, ${result.y.toFixed(1)}%)`);
  console.log(`   Bounds: X[${REAL_WORLD_BOUNDS.minX}, ${REAL_WORLD_BOUNDS.maxX}] Y[${REAL_WORLD_BOUNDS.minY}, ${REAL_WORLD_BOUNDS.maxY}]`);
  
  return result;
}

/**
 * Convert map percentage coordinates to triangulation coordinates
 */
export function mapToTriangulation(position: MapPosition): TriangulationPosition {
  const x = REAL_WORLD_BOUNDS.minX + 
           (position.x / 100) * (REAL_WORLD_BOUNDS.maxX - REAL_WORLD_BOUNDS.minX);
  
  const y = REAL_WORLD_BOUNDS.minY + 
           (position.y / 100) * (REAL_WORLD_BOUNDS.maxY - REAL_WORLD_BOUNDS.minY);
  
  return { x, y };
}

/**
 * Get the map position for a known beacon
 */
export function getBeaconMapPosition(beaconName: string): MapPosition | null {
  const realPosition = BEACON_REAL_POSITIONS[beaconName];
  if (!realPosition) return null;
  
  return triangulationToMap(realPosition);
}

/**
 * Check if a beacon name matches any known beacon
 */
export function findMatchingBeacon(beaconName: string): string | null {
  const knownBeacons = Object.keys(BEACON_REAL_POSITIONS);
  
  // Exact match first
  if (knownBeacons.includes(beaconName)) {
    return beaconName;
  }
  
  // Partial match
  const partialMatch = knownBeacons.find(known => 
    known.toLowerCase().includes(beaconName.toLowerCase()) ||
    beaconName.toLowerCase().includes(known.toLowerCase())
  );
  
  return partialMatch || null;
} 