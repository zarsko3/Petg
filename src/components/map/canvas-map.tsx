'use client';

import React, { useRef, useEffect, useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { Position } from './types';

interface CanvasMapProps {
  className?: string;
  floorplanImage?: string;
  petPosition?: Position;
  beacons?: Array<{
    id: string;
    name: string;
    position: Position;
    strength: number;
    batteryLevel: number;
    locked?: boolean;
  }>;
  realBeacons?: Array<{
    name: string;
    address?: string;
    rssi: number;
    distance?: number;
  }>;
  safeZones?: Array<{
    id: string;
    name: string;
    startPoint: Position;
    endPoint: Position;
  }>;
  isLiveTracking?: boolean;
  onPetPositionChange?: (position: Position) => void;
  onBeaconDrag?: (beaconId: string, position: Position) => void;
  onBeaconDelete?: (beaconId: string) => void;
  onRealBeaconDelete?: (beaconIndex: number) => void;
}

interface AnimatedMarker {
  id: string;
  currentPos: Position;
  targetPos: Position;
  animationProgress: number;
  isAnimating: boolean;
}

export function CanvasMap({
  className,
  floorplanImage = '/images/floorplan-3d.png',
  petPosition,
  beacons = [],
  realBeacons = [],
  safeZones = [],
  isLiveTracking = false,
  onPetPositionChange,
  onBeaconDrag,
  onBeaconDelete,
  onRealBeaconDelete
}: CanvasMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const floorplanImageRef = useRef<HTMLImageElement>();
  
  // Interaction state
  const [mousePosition, setMousePosition] = useState<Position | null>(null);
  const [hoveredElement, setHoveredElement] = useState<{
    type: 'beacon' | 'pet' | 'safeZone' | null;
    id: string | null;
  }>({ type: null, id: null });
  const [isDragging, setIsDragging] = useState(false);
  const [dragTarget, setDragTarget] = useState<{
    type: 'beacon' | 'pet' | null;
    id: string | null;
    offset: Position;
  } | null>(null);
  const [isCreatingSafeZone, setIsCreatingSafeZone] = useState(false);
  const [safeZoneStart, setSafeZoneStart] = useState<Position | null>(null);
  const [safeZonePreview, setSafeZonePreview] = useState<Position | null>(null);
  
  // Animation state
  const [petMarker, setPetMarker] = useState<AnimatedMarker>({
    id: 'pet',
    currentPos: petPosition || { x: 50, y: 50 },
    targetPos: petPosition || { x: 50, y: 50 },
    animationProgress: 1,
    isAnimating: false
  });

  // Canvas dimensions
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 600 });

  // Load floorplan image
  useEffect(() => {
    if (floorplanImage) {
      const img = new Image();
      img.onload = () => {
        floorplanImageRef.current = img;
        redraw();
      };
      img.src = floorplanImage;
    }
  }, [floorplanImage]);

  // Update canvas dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Update pet position with smooth animation
  useEffect(() => {
    if (petPosition) {
      setPetMarker(prev => ({
        ...prev,
        targetPos: petPosition,
        animationProgress: 0,
        isAnimating: true
      }));
    }
  }, [petPosition]);

  // Convert percentage coordinates to canvas pixels
  const percentToPixels = useCallback((pos: Position): Position => {
    return {
      x: (pos.x / 100) * canvasDimensions.width,
      y: (pos.y / 100) * canvasDimensions.height
    };
  }, [canvasDimensions]);

  // Convert canvas pixels to percentage coordinates
  const pixelsToPercent = useCallback((pos: Position): Position => {
    return {
      x: (pos.x / canvasDimensions.width) * 100,
      y: (pos.y / canvasDimensions.height) * 100
    };
  }, [canvasDimensions]);

  // Easing function for smooth animations
  const easeOutCubic = (t: number): number => {
    return 1 - Math.pow(1 - t, 3);
  };

  // Interpolate between two positions
  const interpolatePosition = (start: Position, end: Position, progress: number): Position => {
    const easedProgress = easeOutCubic(progress);
    return {
      x: start.x + (end.x - start.x) * easedProgress,
      y: start.y + (end.y - start.y) * easedProgress
    };
  };

  // Hit testing functions
  const isPointInCircle = (point: Position, center: Position, radius: number): boolean => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    return Math.sqrt(dx * dx + dy * dy) <= radius;
  };

  const isPointInRectangle = (point: Position, rect: { x: number; y: number; width: number; height: number }): boolean => {
    return point.x >= rect.x && 
           point.x <= rect.x + rect.width && 
           point.y >= rect.y && 
           point.y <= rect.y + rect.height;
  };

  // Find element under mouse cursor
  const getElementUnderMouse = (mousePos: Position): { type: 'beacon' | 'pet' | 'safeZone' | null; id: string | null } => {
    const mousePixels = percentToPixels(mousePos);
    
    // Check pet marker first (highest priority)
    const petPixels = percentToPixels(petMarker.currentPos);
    if (isPointInCircle(mousePixels, petPixels, 20)) {
      return { type: 'pet', id: 'pet' };
    }
    
    // Check beacons
    for (const beacon of beacons) {
      const beaconPixels = percentToPixels(beacon.position);
      if (isPointInCircle(mousePixels, beaconPixels, 15)) {
        return { type: 'beacon', id: beacon.id };
      }
    }
    
    // Check safe zones
    for (const zone of safeZones) {
      const startPixels = percentToPixels(zone.startPoint);
      const endPixels = percentToPixels(zone.endPoint);
      const rect = {
        x: Math.min(startPixels.x, endPixels.x),
        y: Math.min(startPixels.y, endPixels.y),
        width: Math.abs(endPixels.x - startPixels.x),
        height: Math.abs(endPixels.y - startPixels.y)
      };
      
      if (isPointInRectangle(mousePixels, rect)) {
        return { type: 'safeZone', id: zone.id };
      }
    }
    
    return { type: null, id: null };
  };

  // Draw floorplan background
  const drawFloorplan = (ctx: CanvasRenderingContext2D) => {
    if (floorplanImageRef.current) {
      const img = floorplanImageRef.current;
      const canvasAspect = canvasDimensions.width / canvasDimensions.height;
      const imageAspect = img.width / img.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      
      if (imageAspect > canvasAspect) {
        // Image is wider than canvas
        drawWidth = canvasDimensions.width;
        drawHeight = canvasDimensions.width / imageAspect;
        offsetX = 0;
        offsetY = (canvasDimensions.height - drawHeight) / 2;
      } else {
        // Image is taller than canvas
        drawHeight = canvasDimensions.height;
        drawWidth = canvasDimensions.height * imageAspect;
        offsetX = (canvasDimensions.width - drawWidth) / 2;
        offsetY = 0;
      }
      
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);
    } else {
      // Fallback background
      ctx.fillStyle = '#f8f9fa';
      ctx.fillRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    }
  };

  // Draw safe zones
  const drawSafeZones = (ctx: CanvasRenderingContext2D) => {
    // Draw existing safe zones
    safeZones.forEach(zone => {
      const startPixels = percentToPixels(zone.startPoint);
      const endPixels = percentToPixels(zone.endPoint);
      const isHovered = hoveredElement.type === 'safeZone' && hoveredElement.id === zone.id;
      
      const x = Math.min(startPixels.x, endPixels.x);
      const y = Math.min(startPixels.y, endPixels.y);
      const width = Math.abs(endPixels.x - startPixels.x);
      const height = Math.abs(endPixels.y - startPixels.y);
      
      // Fill
      ctx.fillStyle = isHovered ? '#ef444430' : '#ef444420';
      ctx.fillRect(x, y, width, height);
      
      // Border
      ctx.strokeStyle = isHovered ? '#dc2626' : '#ef4444';
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.strokeRect(x, y, width, height);
      
      // Zone label
      if (zone.name) {
        ctx.fillStyle = isHovered ? '#7f1d1d' : '#991b1b';
        ctx.font = isHovered ? 'bold 11px system-ui' : '10px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText(zone.name, x + width / 2, y + height / 2);
      }
    });
    
    // Draw safe zone creation preview
    if (isCreatingSafeZone && safeZoneStart && safeZonePreview) {
      const startPixels = percentToPixels(safeZoneStart);
      const endPixels = percentToPixels(safeZonePreview);
      
      const x = Math.min(startPixels.x, endPixels.x);
      const y = Math.min(startPixels.y, endPixels.y);
      const width = Math.abs(endPixels.x - startPixels.x);
      const height = Math.abs(endPixels.y - startPixels.y);
      
      // Preview fill
      ctx.fillStyle = '#ef444415';
      ctx.fillRect(x, y, width, height);
      
      // Preview border (dashed)
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(x, y, width, height);
      ctx.setLineDash([]); // Reset line dash
      
      // Preview label
      ctx.fillStyle = '#991b1b';
      ctx.font = '10px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('New Safe Zone', x + width / 2, y + height / 2);
    }
  };

  // Draw beacon markers
  const drawBeacons = (ctx: CanvasRenderingContext2D) => {
    // Draw configured beacons
    beacons.forEach(beacon => {
      const pos = percentToPixels(beacon.position);
      const isHovered = hoveredElement.type === 'beacon' && hoveredElement.id === beacon.id;
      const isDraggingThis = dragTarget?.type === 'beacon' && dragTarget.id === beacon.id;
      
      // Signal strength circle
      const signalRadius = (beacon.strength * 0.8) / 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, signalRadius, 0, 2 * Math.PI);
      ctx.fillStyle = isHovered ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.1)';
      ctx.fill();
      
      // Hover glow effect
      if (isHovered || isDraggingThis) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, 18, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
        ctx.fill();
      }
      
      // Beacon icon
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, isHovered ? 12 : 10, 0, 2 * Math.PI);
      ctx.fillStyle = beacon.locked ? '#93c5fd' : '#dbeafe';
      ctx.fill();
      ctx.strokeStyle = isHovered ? '#2563eb' : '#3b82f6'; // darker blue on hover
      ctx.lineWidth = isHovered ? 3 : 2;
      ctx.stroke();
      
      // Lock indicator
      if (beacon.locked) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '8px system-ui';
        ctx.textAlign = 'center';
        ctx.fillText('🔒', pos.x, pos.y + 3);
      }
      
      // Beacon label
      ctx.fillStyle = isHovered ? '#111827' : '#1f2937';
      ctx.font = isHovered ? 'bold 12px system-ui' : '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText(beacon.name, pos.x, pos.y + (isHovered ? 28 : 25));
    });

    // Draw real beacons (from collar)
    realBeacons.forEach((realBeacon, index) => {
      // Skip if already matched with configured beacon
      const isMatched = beacons.some(configBeacon => 
        configBeacon.name === realBeacon.name ||
        (realBeacon.address && configBeacon.name.toLowerCase().includes(realBeacon.address.slice(-4).toLowerCase()))
      );
      
      if (isMatched) return;
      
      // Position real beacons on the right side as fallback
      const pos = percentToPixels({
        x: 80 + (index * 3) % 15,
        y: 20 + (index * 15) % 60
      });
      
      const signalStrength = Math.max(0, Math.min(100, ((realBeacon.rssi + 100) / 70) * 100));
      const status = realBeacon.rssi > -50 ? 'excellent' : 
                    realBeacon.rssi > -70 ? 'good' : 
                    realBeacon.rssi > -85 ? 'fair' : 'poor';
      
      // Signal strength circle
      const signalRadius = Math.max(10, signalStrength * 0.3);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, signalRadius, 0, 2 * Math.PI);
      ctx.fillStyle = status === 'excellent' ? 'rgba(34, 197, 94, 0.2)' :
                     status === 'good' ? 'rgba(34, 197, 94, 0.2)' :
                     status === 'fair' ? 'rgba(234, 179, 8, 0.2)' : 'rgba(239, 68, 68, 0.2)';
      ctx.fill();
      
      // Real beacon icon
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 12, 0, 2 * Math.PI);
      ctx.fillStyle = status === 'excellent' ? '#dcfce7' :
                     status === 'good' ? '#dcfce7' :
                     status === 'fair' ? '#fef3c7' : '#fee2e2';
      ctx.fill();
      ctx.strokeStyle = status === 'excellent' ? '#22c55e' :
                       status === 'good' ? '#16a34a' :
                       status === 'fair' ? '#eab308' : '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      // Live indicator
      ctx.beginPath();
      ctx.arc(pos.x + 8, pos.y - 8, 3, 0, 2 * Math.PI);
      ctx.fillStyle = '#ef4444';
      ctx.fill();
    });
  };

  // Draw pet marker with smooth animation
  const drawPetMarker = (ctx: CanvasRenderingContext2D) => {
    const pos = percentToPixels(petMarker.currentPos);
    const isHovered = hoveredElement.type === 'pet';
    const isDraggingThis = dragTarget?.type === 'pet';
    
    // Movement indicator (pulsing circle)
    if (isLiveTracking || petMarker.isAnimating) {
      const pulseRadius = 17 + Math.sin(Date.now() * 0.005) * 3;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, pulseRadius, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.fill();
    }
    
    // Hover glow effect
    if (isHovered || isDraggingThis) {
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 22, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.1)';
      ctx.fill();
    }
    
    // Pet icon background
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, isHovered ? 16 : 14, 0, 2 * Math.PI);
    ctx.fillStyle = '#dcfce7';
    ctx.fill();
    ctx.strokeStyle = isHovered ? '#15803d' : '#22c55e';
    ctx.lineWidth = isHovered ? 3 : 2;
    ctx.stroke();
    
    // Pet icon (simplified bone shape)
    ctx.fillStyle = '#16a34a';
    const boneScale = isHovered ? 1.2 : 1;
    ctx.fillRect(pos.x - 6 * boneScale, pos.y - 1 * boneScale, 12 * boneScale, 2 * boneScale);
    ctx.beginPath();
    ctx.arc(pos.x - 6 * boneScale, pos.y, 3 * boneScale, 0, 2 * Math.PI);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(pos.x + 6 * boneScale, pos.y, 3 * boneScale, 0, 2 * Math.PI);
    ctx.fill();
    
    // Pet label
    ctx.fillStyle = isHovered ? '#111827' : '#1f2937';
    ctx.font = isHovered ? 'bold 12px system-ui' : '12px system-ui';
    ctx.textAlign = 'center';
    ctx.fillText('Pet', pos.x, pos.y + (isHovered ? 28 : 25));
  };

  // Main drawing function
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvasDimensions.width, canvasDimensions.height);
    
    // Draw layers in order
    drawFloorplan(ctx);
    drawSafeZones(ctx);
    drawBeacons(ctx);
    drawPetMarker(ctx);
  }, [canvasDimensions, petMarker, beacons, realBeacons, safeZones, isLiveTracking]);

  // Animation loop
  const animate = useCallback(() => {
    let needsRedraw = false;
    
    // Update pet marker animation
    if (petMarker.isAnimating) {
      setPetMarker(prev => {
        const newProgress = Math.min(1, prev.animationProgress + 0.02); // ~60fps animation
        const newCurrentPos = interpolatePosition(prev.currentPos, prev.targetPos, newProgress);
        
        const isComplete = newProgress >= 1;
        needsRedraw = true;
        
        return {
          ...prev,
          currentPos: newCurrentPos,
          animationProgress: newProgress,
          isAnimating: !isComplete
        };
      });
    }
    
    if (needsRedraw) {
      redraw();
    }
    
    animationFrameRef.current = requestAnimationFrame(animate);
  }, [petMarker.isAnimating, redraw]);

  // Start animation loop
  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [animate]);

  // Mouse event handlers
  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const mousePixels = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
    const mousePercent = pixelsToPercent(mousePixels);
    setMousePosition(mousePercent);
    
    // Update hover state
    const elementUnder = getElementUnderMouse(mousePercent);
    setHoveredElement(elementUnder);
    
    // Handle dragging
    if (isDragging && dragTarget) {
      const newPosition = {
        x: Math.max(0, Math.min(100, mousePercent.x - dragTarget.offset.x)),
        y: Math.max(0, Math.min(100, mousePercent.y - dragTarget.offset.y))
      };
      
      if (dragTarget.type === 'beacon' && onBeaconDrag) {
        onBeaconDrag(dragTarget.id!, newPosition);
      } else if (dragTarget.type === 'pet' && onPetPositionChange) {
        onPetPositionChange(newPosition);
      }
    }
    
    // Handle safe zone creation preview
    if (isCreatingSafeZone && safeZoneStart) {
      setSafeZonePreview(mousePercent);
    }
  }, [isDragging, dragTarget, isCreatingSafeZone, safeZoneStart, pixelsToPercent, getElementUnderMouse, onBeaconDrag, onPetPositionChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mousePosition) return;
    
    const elementUnder = getElementUnderMouse(mousePosition);
    
    if (elementUnder.type && elementUnder.id) {
      // Check for right click to delete
      if (e.button === 2) { // Right click
        if (elementUnder.type === 'beacon' && onBeaconDelete) {
          onBeaconDelete(elementUnder.id);
          return;
        }
      }
      
      // Start dragging
      const elementPos = elementUnder.type === 'pet' 
        ? petMarker.currentPos 
        : beacons.find(b => b.id === elementUnder.id)?.position;
      
      if (elementPos) {
        setIsDragging(true);
        setDragTarget({
          type: elementUnder.type as 'beacon' | 'pet',
          id: elementUnder.id,
          offset: {
            x: mousePosition.x - elementPos.x,
            y: mousePosition.y - elementPos.y
          }
        });
      }
    } else if (isCreatingSafeZone) {
      // Start safe zone creation
      setSafeZoneStart(mousePosition);
    } else {
      // Click to position pet (if not live tracking)
      if (!isLiveTracking && onPetPositionChange) {
        onPetPositionChange(mousePosition);
      }
    }
  }, [mousePosition, getElementUnderMouse, petMarker.currentPos, beacons, isCreatingSafeZone, isLiveTracking, onPetPositionChange, onBeaconDelete]);

  const handleMouseUp = useCallback(() => {
    if (isCreatingSafeZone && safeZoneStart && safeZonePreview) {
      // Finish safe zone creation
      // This would integrate with the existing safe zone creation system
      console.log('Safe zone created:', { start: safeZoneStart, end: safeZonePreview });
      setSafeZoneStart(null);
      setSafeZonePreview(null);
      setIsCreatingSafeZone(false);
    }
    
    setIsDragging(false);
    setDragTarget(null);
  }, [isCreatingSafeZone, safeZoneStart, safeZonePreview]);

  const handleMouseLeave = useCallback(() => {
    setMousePosition(null);
    setHoveredElement({ type: null, id: null });
    setIsDragging(false);
    setDragTarget(null);
  }, []);

  // Redraw when dependencies change
  useEffect(() => {
    redraw();
  }, [redraw]);

  // Determine cursor style based on interaction state
  const getCursorStyle = (): string => {
    if (isDragging) return 'grabbing';
    if (isCreatingSafeZone) return 'crosshair';
    if (hoveredElement.type === 'beacon' || hoveredElement.type === 'pet') return 'grab';
    if (hoveredElement.type === 'safeZone') return 'pointer';
    return 'default';
  };

  return (
    <div 
      ref={containerRef}
      className={cn("relative w-full h-full bg-gray-100 rounded-lg overflow-hidden", className)}
    >
      <canvas
        ref={canvasRef}
        width={canvasDimensions.width}
        height={canvasDimensions.height}
        className="absolute inset-0"
        style={{ 
          width: '100%', 
          height: '100%',
          imageRendering: 'pixelated',
          cursor: getCursorStyle()
        }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onContextMenu={(e) => e.preventDefault()} // Prevent default right-click menu
      />
    </div>
  );
} 