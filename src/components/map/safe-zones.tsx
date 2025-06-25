'use client';

import React from 'react';
import { Home, X } from 'lucide-react';
import { useMapContext } from './map-context';

export function SafeZones() {
  const { safeZones, showSafeZones, deleteSafeZone, isCreatingSafeZone, currentSafeZone } = useMapContext();

  return (
    <>
      {/* Existing Safe Zones */}
      {showSafeZones && safeZones.map(zone => {
        const minX = Math.min(zone.startPoint.x, zone.endPoint.x);
        const maxX = Math.max(zone.startPoint.x, zone.endPoint.x);
        const minY = Math.min(zone.startPoint.y, zone.endPoint.y);
        const maxY = Math.max(zone.startPoint.y, zone.endPoint.y);
        const width = maxX - minX;
        const height = maxY - minY;
        
        return (
          <div 
            key={zone.id} 
            className="absolute z-10"
            style={{
              left: `${minX}%`,
              top: `${minY}%`,
              width: `${width}%`,
              height: `${height}%`,
            }}
          >
            <div 
              className="absolute inset-0 bg-red-500/10 border border-red-500/20"
              style={{ backdropFilter: "blur(1px)" }}
            ></div>
            <div 
              className="absolute top-1 left-1 bg-red-100/80 text-red-800 dark:bg-red-900/60 dark:text-red-200 text-[9px] px-1.5 py-0.5 rounded-md shadow-sm z-20 flex items-center gap-1"
            >
              <Home className="h-2.5 w-2.5 text-red-600" />
              <span className="font-medium">{zone.name}</span>
              <button
                onClick={(e) => { e.stopPropagation(); deleteSafeZone(zone.id); }}
                className="ml-0.5 p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30 rounded transition-colors"
                title="Delete zone"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </div>
          </div>
        );
      })}

      {/* Safe Zone being created */}
      {isCreatingSafeZone && currentSafeZone.startPoint && currentSafeZone.endPoint && (
        <div 
          className="absolute z-20 pointer-events-none"
          style={{
            left: `${Math.min(currentSafeZone.startPoint.x, currentSafeZone.endPoint.x)}%`,
            top: `${Math.min(currentSafeZone.startPoint.y, currentSafeZone.endPoint.y)}%`,
            width: `${Math.abs(currentSafeZone.endPoint.x - currentSafeZone.startPoint.x)}%`,
            height: `${Math.abs(currentSafeZone.endPoint.y - currentSafeZone.startPoint.y)}%`,
            border: '2px dashed rgba(255, 0, 0, 0.7)',
            backgroundColor: 'rgba(255, 0, 0, 0.1)'
          }}
        />
      )}
    </>
  );
} 