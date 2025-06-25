'use client';

import React, { useRef, useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface UnifiedFloorPlanProps {
  className?: string;
  children?: React.ReactNode;
  onImageLoad?: (dimensions: { width: number; height: number }) => void;
  style?: React.CSSProperties;
  onMouseMove?: (e: React.MouseEvent) => void;
  onMouseUp?: () => void;
  onMouseLeave?: () => void;
  onClick?: (e: React.MouseEvent) => void;
  customImage?: string;
  calibrationData?: {
    anchorPoint: { x: number; y: number };
    realWorldSize: { width: number; height: number };
    imageSize: { width: number; height: number };
    pixelsPerMeter: number;
  };
}

/**
 * Unified Floor Plan Component
 * 
 * This component ensures consistent floor plan image rendering across all views:
 * - Setup Tracking (beacon placement)
 * - Zone Drawing (safe zone creation)
 * - Location Tracking (live tracking)
 * 
 * Key features:
 * - Fixed aspect ratio (16:9) for consistent layout
 * - object-contain scaling to preserve image proportions
 * - Consistent coordinate system (0-100% for both X and Y)
 * - Same image source (/floorplan.png) across all views
 */
export const UnifiedFloorPlan = React.forwardRef<HTMLDivElement, UnifiedFloorPlanProps>(({ 
  className, 
  children, 
  onImageLoad,
  style,
  onMouseMove,
  onMouseUp,
  onMouseLeave,
  onClick,
  customImage,
  calibrationData,
  ...props 
}, ref) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });

  // Determine which image to use
  const imageSource = customImage || "/floorplan.png";

  // Handle image load to get actual dimensions
  const handleImageLoad = () => {
    if (imageRef.current) {
      const { naturalWidth, naturalHeight } = imageRef.current;
      setImageDimensions({ width: naturalWidth, height: naturalHeight });
      setImageLoaded(true);
      
      if (onImageLoad) {
        onImageLoad({ width: naturalWidth, height: naturalHeight });
      }
      
      console.log(`🖼️ Floor plan loaded: ${naturalWidth}x${naturalHeight}px`);
    }
  };

  // Reset image loaded state when image source changes
  React.useEffect(() => {
    setImageLoaded(false);
  }, [imageSource]);

  return (
    <div 
      ref={ref}
      className={cn(
        "relative w-full bg-gray-100 dark:bg-gray-800 rounded-lg overflow-hidden",
        "aspect-[16/9]", // Fixed aspect ratio for consistency
        className
      )}
      style={style}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      {...props}
    >
      {/* Floor Plan Image - Always the same source and scaling */}
      <img
        ref={imageRef}
        src={imageSource}
        alt="Floor Plan"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
        onLoad={handleImageLoad}
        draggable={false}
      />
      
      {/* Overlay content (beacons, zones, pet, etc.) */}
      {imageLoaded && children}
      
      {/* Loading indicator */}
      {!imageLoaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-2"></div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Loading floor plan...</p>
          </div>
        </div>
      )}
    </div>
  );
});

UnifiedFloorPlan.displayName = 'UnifiedFloorPlan';

/**
 * Hook to get consistent coordinate conversion functions
 * 
 * This ensures that percentage coordinates (0-100%) are consistently
 * mapped to pixel coordinates across all components using the floor plan.
 */
export function useFloorPlanCoordinates(containerRef: React.RefObject<HTMLDivElement>) {
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });

  // Update container dimensions
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [containerRef]);

  // Convert percentage coordinates to pixel coordinates
  const percentToPixels = (position: { x: number; y: number }) => {
    return {
      x: (position.x / 100) * containerDimensions.width,
      y: (position.y / 100) * containerDimensions.height
    };
  };

  // Convert pixel coordinates to percentage coordinates
  const pixelsToPercent = (position: { x: number; y: number }) => {
    return {
      x: (position.x / containerDimensions.width) * 100,
      y: (position.y / containerDimensions.height) * 100
    };
  };

  // Convert mouse event to percentage coordinates
  const mouseEventToPercent = (e: React.MouseEvent, targetElement?: HTMLElement) => {
    const element = targetElement || containerRef.current;
    if (!element) return { x: 0, y: 0 };

    const rect = element.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    };
  };

  return {
    containerDimensions,
    percentToPixels,
    pixelsToPercent,
    mouseEventToPercent
  };
} 