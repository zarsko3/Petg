'use client';

import React from 'react';
import { BoneIcon, Home } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapContext } from './map-context';

export function PetMarker() {
  const { pet, isPetInSafeZone } = useMapContext();

  return (
    <div 
      className="absolute"
      style={{
        left: `${pet.position.x}%`,
        top: `${pet.position.y}%`,
        transform: 'translate(-50%, -50%)',
        transition: 'all 0.5s ease-out',
        zIndex: 20,
      }}
    >
      {/* Movement Indicator */}
      <div className={cn(
        "absolute rounded-full z-0",
        pet.isMoving ? "animate-ping" : "",
        isPetInSafeZone ? "bg-red-500/40" : "bg-green-500/20" 
      )}
        style={{
          width: '35px',
          height: '35px',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
      />
      
      {/* Pet Icon */}
      <div className={cn(
        "relative flex items-center justify-center w-7 h-7 rounded-full border-2 z-10 shadow-lg",
        isPetInSafeZone
          ? "bg-red-100 dark:bg-red-900/60 border-red-600"
          : "bg-green-100 dark:bg-green-900/60 border-green-500"
      )}>
        <BoneIcon className={cn(
          "h-3.5 w-3.5", 
          isPetInSafeZone
            ? "text-red-700 dark:text-red-300"
            : "text-green-600 dark:text-green-400"
        )} />

        {/* Safe icon when in safe zone */}
        {isPetInSafeZone && (
          <div className="absolute -top-4 -right-2 bg-red-500 text-white rounded-full p-1">
            <Home className="h-3 w-3" />
          </div>
        )}
      </div>

      {/* Position Label */}
      <div className="absolute top-9 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 shadow-sm rounded-md px-2 py-0.5 text-xs">
        {pet.name}
      </div>
    </div>
  );
} 