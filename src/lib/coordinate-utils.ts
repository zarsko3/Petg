/**
 * Coordinate Transformation Utilities
 * 
 * This module provides utilities for transforming coordinates between different
 * coordinate systems in the floor plan calibration system.
 */

export interface CalibrationData {
  anchorPoint: { x: number; y: number }; // Anchor point in percentage coordinates
  realWorldSize: { width: number; height: number }; // Real dimensions in meters
  imageSize: { width: number; height: number }; // Image dimensions in pixels
  pixelsPerMeter: number; // Scale factor
}

export interface Position {
  x: number;
  y: number;
}

/**
 * Convert percentage coordinates to real-world coordinates
 * using calibration data
 */
export function percentToRealWorld(
  percentPosition: Position,
  calibrationData: CalibrationData
): Position {
  // Convert percentage to pixels relative to image
  const pixelX = (percentPosition.x / 100) * calibrationData.imageSize.width;
  const pixelY = (percentPosition.y / 100) * calibrationData.imageSize.height;
  
  // Convert anchor point percentage to pixels
  const anchorPixelX = (calibrationData.anchorPoint.x / 100) * calibrationData.imageSize.width;
  const anchorPixelY = (calibrationData.anchorPoint.y / 100) * calibrationData.imageSize.height;
  
  // Calculate offset from anchor point in pixels
  const offsetPixelX = pixelX - anchorPixelX;
  const offsetPixelY = pixelY - anchorPixelY;
  
  // Convert to real-world coordinates (meters from anchor)
  const realX = offsetPixelX / calibrationData.pixelsPerMeter;
  const realY = offsetPixelY / calibrationData.pixelsPerMeter;
  
  return { x: realX, y: realY };
}

/**
 * Convert real-world coordinates to percentage coordinates
 * using calibration data
 */
export function realWorldToPercent(
  realPosition: Position,
  calibrationData: CalibrationData
): Position {
  // Convert real-world offset to pixels
  const offsetPixelX = realPosition.x * calibrationData.pixelsPerMeter;
  const offsetPixelY = realPosition.y * calibrationData.pixelsPerMeter;
  
  // Convert anchor point percentage to pixels
  const anchorPixelX = (calibrationData.anchorPoint.x / 100) * calibrationData.imageSize.width;
  const anchorPixelY = (calibrationData.anchorPoint.y / 100) * calibrationData.imageSize.height;
  
  // Calculate absolute pixel position
  const pixelX = anchorPixelX + offsetPixelX;
  const pixelY = anchorPixelY + offsetPixelY;
  
  // Convert to percentage coordinates
  const percentX = (pixelX / calibrationData.imageSize.width) * 100;
  const percentY = (pixelY / calibrationData.imageSize.height) * 100;
  
  return { x: percentX, y: percentY };
}

/**
 * Calculate distance between two positions in real-world coordinates
 */
export function calculateRealWorldDistance(
  position1: Position,
  position2: Position,
  calibrationData: CalibrationData
): number {
  const real1 = percentToRealWorld(position1, calibrationData);
  const real2 = percentToRealWorld(position2, calibrationData);
  
  const deltaX = real2.x - real1.x;
  const deltaY = real2.y - real1.y;
  
  return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
}

/**
 * Validate beacon placement against real-world measurements
 */
export function validateBeaconPlacement(
  beaconPositions: Position[],
  measuredDistances: number[][],
  calibrationData: CalibrationData,
  toleranceMeters: number = 0.5
): {
  isValid: boolean;
  errors: string[];
  suggestions: string[];
} {
  const errors: string[] = [];
  const suggestions: string[] = [];
  
  // Check distances between all beacon pairs
  for (let i = 0; i < beaconPositions.length; i++) {
    for (let j = i + 1; j < beaconPositions.length; j++) {
      const calculatedDistance = calculateRealWorldDistance(
        beaconPositions[i],
        beaconPositions[j],
        calibrationData
      );
      
      const measuredDistance = measuredDistances[i]?.[j];
      
      if (measuredDistance && Math.abs(calculatedDistance - measuredDistance) > toleranceMeters) {
        errors.push(
          `Distance between beacon ${i + 1} and ${j + 1}: ` +
          `calculated ${calculatedDistance.toFixed(2)}m, ` +
          `measured ${measuredDistance.toFixed(2)}m ` +
          `(difference: ${Math.abs(calculatedDistance - measuredDistance).toFixed(2)}m)`
        );
        
        suggestions.push(
          `Adjust beacon ${i + 1} or ${j + 1} position to match measured distance`
        );
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    suggestions
  };
}

/**
 * Auto-correct beacon positions based on measured distances
 * using trilateration
 */
export function autoCorrectBeaconPositions(
  beaconPositions: Position[],
  measuredDistances: number[][],
  calibrationData: CalibrationData,
  anchorBeaconIndex: number = 0
): Position[] {
  if (beaconPositions.length < 3) {
    return beaconPositions; // Need at least 3 beacons for trilateration
  }
  
  const correctedPositions = [...beaconPositions];
  const anchorReal = percentToRealWorld(beaconPositions[anchorBeaconIndex], calibrationData);
  
  // Keep anchor beacon fixed, adjust others
  for (let i = 0; i < beaconPositions.length; i++) {
    if (i === anchorBeaconIndex) continue;
    
    // Use trilateration with anchor and other known beacons
    const distanceToAnchor = measuredDistances[anchorBeaconIndex]?.[i];
    
    if (distanceToAnchor) {
      // Simple correction: maintain distance to anchor
      const currentReal = percentToRealWorld(beaconPositions[i], calibrationData);
      const currentDistance = Math.sqrt(
        Math.pow(currentReal.x - anchorReal.x, 2) + 
        Math.pow(currentReal.y - anchorReal.y, 2)
      );
      
      if (Math.abs(currentDistance - distanceToAnchor) > 0.1) {
        // Scale position to correct distance
        const scale = distanceToAnchor / currentDistance;
        const correctedReal = {
          x: anchorReal.x + (currentReal.x - anchorReal.x) * scale,
          y: anchorReal.y + (currentReal.y - anchorReal.y) * scale
        };
        
        correctedPositions[i] = realWorldToPercent(correctedReal, calibrationData);
      }
    }
  }
  
  return correctedPositions;
}

/**
 * Generate calibration report
 */
export function generateCalibrationReport(
  calibrationData: CalibrationData,
  beaconPositions: Position[],
  measuredDistances?: number[][]
): {
  summary: string;
  details: {
    imageInfo: string;
    scaleInfo: string;
    anchorInfo: string;
    areaInfo: string;
  };
  validation?: ReturnType<typeof validateBeaconPlacement>;
} {
  const { realWorldSize, imageSize, pixelsPerMeter, anchorPoint } = calibrationData;
  
  const summary = `Floor plan calibrated: ${realWorldSize.width.toFixed(1)}m × ${realWorldSize.height.toFixed(1)}m`;
  
  const details = {
    imageInfo: `Image: ${imageSize.width}×${imageSize.height} pixels`,
    scaleInfo: `Scale: ${pixelsPerMeter.toFixed(1)} pixels per meter`,
    anchorInfo: `Anchor: (${anchorPoint.x.toFixed(1)}%, ${anchorPoint.y.toFixed(1)}%)`,
    areaInfo: `Total area: ${(realWorldSize.width * realWorldSize.height).toFixed(1)}m²`
  };
  
  let validation;
  if (measuredDistances && beaconPositions.length > 1) {
    validation = validateBeaconPlacement(beaconPositions, measuredDistances, calibrationData);
  }
  
  return { summary, details, validation };
} 