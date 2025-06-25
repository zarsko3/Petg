'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Trash2, Edit3, Save, X, Plus } from 'lucide-react';
import { UnifiedFloorPlan, useFloorPlanCoordinates } from './unified-floor-plan';

export interface DrawnZone {
  id: string;
  name: string;
  points: Array<{ x: number; y: number }>;
  color: string;
  type: 'safe' | 'restricted' | 'alert';
}

interface ZoneDrawerProps {
  floorplanImage: string;
  zones: DrawnZone[];
  onZonesChange: (zones: DrawnZone[]) => void;
  className?: string;
}

const ZONE_COLORS = [
  { name: 'Green', value: '#10b981', type: 'safe' as const },
  { name: 'Red', value: '#ef4444', type: 'restricted' as const },
  { name: 'Orange', value: '#f59e0b', type: 'alert' as const },
  { name: 'Blue', value: '#3b82f6', type: 'safe' as const },
  { name: 'Purple', value: '#8b5cf6', type: 'safe' as const },
];

export function ZoneDrawer({ floorplanImage, zones, onZonesChange, className }: ZoneDrawerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentZone, setCurrentZone] = useState<DrawnZone | null>(null);
  const [selectedZoneType, setSelectedZoneType] = useState<'safe' | 'restricted' | 'alert'>('safe');
  const [selectedColor, setSelectedColor] = useState(ZONE_COLORS[0].value);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 800, height: 450 });
  const [floorplanLoaded, setFloorplanLoaded] = useState(false);

  // Use unified coordinate system
  const { mouseEventToPercent } = useFloorPlanCoordinates(containerRef);

  // Update canvas dimensions when container resizes
  useEffect(() => {
    const updateCanvasDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasDimensions({ width: rect.width, height: rect.height });
      }
    };

    updateCanvasDimensions();
    window.addEventListener('resize', updateCanvasDimensions);
    return () => window.removeEventListener('resize', updateCanvasDimensions);
  }, []);

  // Update canvas size when dimensions change
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.width = canvasDimensions.width;
      canvasRef.current.height = canvasDimensions.height;
      redrawCanvas();
    }
  }, [canvasDimensions]);

  // Convert percentage coordinates to canvas pixels
  const percentToCanvasPixels = useCallback((pos: { x: number; y: number }) => {
    return {
      x: (pos.x / 100) * canvasDimensions.width,
      y: (pos.y / 100) * canvasDimensions.height
    };
  }, [canvasDimensions]);

  // Redraw all zones on canvas
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw existing zones
    zones.forEach(zone => {
      if (zone.points.length < 3) return;

      ctx.beginPath();
      const firstPoint = percentToCanvasPixels(zone.points[0]);
      ctx.moveTo(firstPoint.x, firstPoint.y);

      zone.points.slice(1).forEach(point => {
        const canvasPoint = percentToCanvasPixels(point);
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
      });

      ctx.closePath();
      
      // Fill zone
      ctx.fillStyle = zone.color + '40'; // 25% opacity
      ctx.fill();
      
      // Stroke zone
      ctx.strokeStyle = zone.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw zone label
      if (zone.points.length > 0) {
        const centerX = zone.points.reduce((sum, p) => sum + p.x, 0) / zone.points.length;
        const centerY = zone.points.reduce((sum, p) => sum + p.y, 0) / zone.points.length;
        const centerCanvas = percentToCanvasPixels({ x: centerX, y: centerY });
        
        ctx.fillStyle = zone.color;
        ctx.font = '14px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(zone.name, centerCanvas.x, centerCanvas.y);
      }
    });

    // Draw current zone being drawn
    if (currentZone && currentZone.points.length > 0) {
      ctx.beginPath();
      const firstPoint = percentToCanvasPixels(currentZone.points[0]);
      ctx.moveTo(firstPoint.x, firstPoint.y);

      currentZone.points.slice(1).forEach(point => {
        const canvasPoint = percentToCanvasPixels(point);
        ctx.lineTo(canvasPoint.x, canvasPoint.y);
      });

      if (currentZone.points.length > 2) {
        ctx.closePath();
        ctx.fillStyle = currentZone.color + '40';
        ctx.fill();
      }
      
      ctx.strokeStyle = currentZone.color;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Draw points
      currentZone.points.forEach(point => {
        const canvasPoint = percentToCanvasPixels(point);
        ctx.beginPath();
        ctx.arc(canvasPoint.x, canvasPoint.y, 4, 0, 2 * Math.PI);
        ctx.fillStyle = currentZone.color;
        ctx.fill();
      });
    }
  }, [zones, currentZone, percentToCanvasPixels]);

  // Redraw when zones change
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!floorplanLoaded) return;

    const position = mouseEventToPercent(e);

    if (!isDrawing) {
      // Start new zone
      const newZone: DrawnZone = {
        id: `zone-${Date.now()}`,
        name: `${selectedZoneType.charAt(0).toUpperCase() + selectedZoneType.slice(1)} Zone ${zones.length + 1}`,
        points: [position],
        color: selectedColor,
        type: selectedZoneType
      };
      setCurrentZone(newZone);
      setIsDrawing(true);
    } else if (currentZone) {
      // Add point to current zone
      const updatedZone = {
        ...currentZone,
        points: [...currentZone.points, position]
      };
      setCurrentZone(updatedZone);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // This could be used for preview line while drawing
    // For now, we'll keep it simple
  };

  const handleMouseLeave = () => {
    // Could finish zone on mouse leave if desired
  };

  const finishZone = () => {
    if (currentZone && currentZone.points.length >= 3) {
      onZonesChange([...zones, currentZone]);
    }
    setCurrentZone(null);
    setIsDrawing(false);
  };

  const cancelZone = () => {
    setCurrentZone(null);
    setIsDrawing(false);
  };

  const deleteZone = (zoneId: string) => {
    onZonesChange(zones.filter(z => z.id !== zoneId));
  };

  const startEditingZone = (zone: DrawnZone) => {
    setEditingZone(zone.id);
    setEditingName(zone.name);
  };

  const saveZoneName = () => {
    if (editingZone) {
      onZonesChange(zones.map(zone =>
        zone.id === editingZone ? { ...zone, name: editingName } : zone
      ));
      setEditingZone(null);
      setEditingName('');
    }
  };

  const cancelEditingZone = () => {
    setEditingZone(null);
    setEditingName('');
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Zone Drawing Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="font-medium text-gray-900 dark:text-white mb-4">Zone Drawing Controls</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Zone Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zone Type
            </label>
            <select
              value={selectedZoneType}
              onChange={(e) => setSelectedZoneType(e.target.value as 'safe' | 'restricted' | 'alert')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              disabled={isDrawing}
            >
              <option value="safe">Safe Zone</option>
              <option value="restricted">Restricted Zone</option>
              <option value="alert">Alert Zone</option>
            </select>
          </div>

          {/* Zone Color */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Zone Color
            </label>
            <div className="flex gap-2">
              {ZONE_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => setSelectedColor(color.value)}
                  className={cn(
                    "w-8 h-8 rounded-full border-2 transition-all",
                    selectedColor === color.value 
                      ? "border-gray-900 dark:border-white scale-110" 
                      : "border-gray-300 dark:border-gray-600 hover:scale-105"
                  )}
                  style={{ backgroundColor: color.value }}
                  disabled={isDrawing}
                  title={color.name}
                />
              ))}
            </div>
          </div>

          {/* Drawing Actions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Actions
            </label>
            <div className="flex gap-2">
              {isDrawing ? (
                <>
                  <button
                    onClick={finishZone}
                    disabled={!currentZone || currentZone.points.length < 3}
                    className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    Finish
                  </button>
                  <button
                    onClick={cancelZone}
                    className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400 py-2">
                  Click on the floor plan to start drawing
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Floor Plan with Zone Drawing */}
      <UnifiedFloorPlan
        ref={containerRef}
        className="border border-gray-200 dark:border-gray-700"
        onImageLoad={() => setFloorplanLoaded(true)}
      >
        {/* Drawing canvas overlay */}
        <canvas
          ref={canvasRef}
          width={canvasDimensions.width}
          height={canvasDimensions.height}
          className={cn(
            "absolute inset-0 w-full h-full",
            isDrawing ? "cursor-crosshair" : "cursor-default"
          )}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
      </UnifiedFloorPlan>

      {/* Zone List */}
      {zones.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900 dark:text-white">
            Active Zones ({zones.length})
          </h4>
          <div className="space-y-2">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: zone.color }}
                  />
                  {editingZone === zone.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveZoneName();
                          if (e.key === 'Escape') cancelEditingZone();
                        }}
                        autoFocus
                      />
                      <button
                        onClick={saveZoneName}
                        className="p-1 text-green-600 hover:text-green-700"
                      >
                        <Save className="h-4 w-4" />
                      </button>
                      <button
                        onClick={cancelEditingZone}
                        className="p-1 text-gray-500 hover:text-gray-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <div>
                      <span className="font-medium text-gray-900 dark:text-white">
                        {zone.name}
                      </span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                        ({zone.points.length} points)
                      </span>
                    </div>
                  )}
                </div>
                
                {editingZone !== zone.id && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => startEditingZone(zone)}
                      className="p-1 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => deleteZone(zone.id)}
                      className="p-1 text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {zones.length === 0 && !isDrawing && (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Plus className="h-8 w-8 text-purple-600 dark:text-purple-400" />
          </div>
          <h4 className="font-medium text-gray-900 dark:text-white mb-2">
            No zones defined yet
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Draw custom zones on your floor plan to define monitoring areas
          </p>
          <button
            onClick={() => {
              setSelectedZoneType('safe');
              setSelectedColor(ZONE_COLORS[0].value);
              setIsDrawing(true);
            }}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
          >
            Draw Your First Zone
          </button>
        </div>
      )}
    </div>
  );
} 