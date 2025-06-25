// Position smoothing filter to reduce noise in triangulation data
export interface Position {
  x: number;
  y: number;
}

export interface PositionWithTimestamp extends Position {
  timestamp: number;
  confidence?: number;
}

export class PositionSmoothingFilter {
  private history: PositionWithTimestamp[] = [];
  private readonly maxHistorySize: number;
  private readonly smoothingFactor: number;
  private readonly maxJumpDistance: number;
  private lastValidPosition: Position | null = null;

  constructor(
    maxHistorySize: number = 5,
    smoothingFactor: number = 0.3,
    maxJumpDistance: number = 5.0 // meters
  ) {
    this.maxHistorySize = maxHistorySize;
    this.smoothingFactor = smoothingFactor;
    this.maxJumpDistance = maxJumpDistance;
  }

  /**
   * Add a new position reading and get the smoothed result
   */
  addPosition(position: PositionWithTimestamp): Position {
    // Check for unrealistic jumps
    if (this.lastValidPosition && this.isUnrealisticJump(position, this.lastValidPosition)) {
      console.log(`🚫 Filtering unrealistic jump: (${position.x.toFixed(2)}, ${position.y.toFixed(2)}) - distance: ${this.calculateDistance(position, this.lastValidPosition).toFixed(2)}m`);
      return this.lastValidPosition;
    }

    // Add to history
    this.history.push(position);
    
    // Keep only recent history
    if (this.history.length > this.maxHistorySize) {
      this.history.shift();
    }

    // Calculate smoothed position
    const smoothed = this.calculateSmoothedPosition();
    this.lastValidPosition = smoothed;
    
    console.log(`📍 Position filter: Raw (${position.x.toFixed(2)}, ${position.y.toFixed(2)}) → Smoothed (${smoothed.x.toFixed(2)}, ${smoothed.y.toFixed(2)})`);
    
    return smoothed;
  }

  /**
   * Calculate smoothed position using weighted average
   */
  private calculateSmoothedPosition(): Position {
    if (this.history.length === 0) {
      return { x: 0, y: 0 };
    }

    if (this.history.length === 1) {
      return { x: this.history[0].x, y: this.history[0].y };
    }

    // Use exponential moving average with confidence weighting
    let totalWeight = 0;
    let weightedX = 0;
    let weightedY = 0;

    for (let i = 0; i < this.history.length; i++) {
      const position = this.history[i];
      const age = this.history.length - i - 1; // 0 for newest, higher for older
      const ageWeight = Math.pow(this.smoothingFactor, age);
      const confidenceWeight = (position.confidence || 50) / 100;
      const weight = ageWeight * confidenceWeight;

      weightedX += position.x * weight;
      weightedY += position.y * weight;
      totalWeight += weight;
    }

    return {
      x: weightedX / totalWeight,
      y: weightedY / totalWeight
    };
  }

  /**
   * Check if a position jump is unrealistic
   */
  private isUnrealisticJump(newPosition: Position, lastPosition: Position): boolean {
    const distance = this.calculateDistance(newPosition, lastPosition);
    return distance > this.maxJumpDistance;
  }

  /**
   * Calculate distance between two positions
   */
  private calculateDistance(pos1: Position, pos2: Position): number {
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * Reset the filter
   */
  reset(): void {
    this.history = [];
    this.lastValidPosition = null;
  }

  /**
   * Get current smoothed position without adding new data
   */
  getCurrentPosition(): Position | null {
    return this.lastValidPosition;
  }
} 