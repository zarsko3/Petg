'use client';

import React from 'react';
import { useMapContext } from './map-context';

export function SafeZoneEditor() {
  const { 
    isCreatingSafeZone, 
    currentSafeZone, 
    finishSafeZone, 
    cancelSafeZone, 
    editingSafeZoneId, 
    safeZoneNameInput, 
    setSafeZoneNameInput, 
    saveSafeZone 
  } = useMapContext();

  return (
    <>
      {/* Controls for Safe Zone Drawing */}
      {isCreatingSafeZone && (
        <div className="absolute top-0 left-0 right-0 flex items-center justify-center bg-black/50 text-white p-2 z-30">
          <div className="text-sm">
            {!currentSafeZone.startPoint 
              ? "Click to set first corner of Safe Zone" 
              : "Click to set opposite corner and finish"}
          </div>
          <div className="flex ml-4 gap-2">
            {currentSafeZone.startPoint && (
              <button 
                onClick={finishSafeZone}
                className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs"
              >
                Finish
              </button>
            )}
            <button 
              onClick={cancelSafeZone}
              className="px-2 py-1 bg-red-500 hover:bg-red-600 rounded text-xs"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Safe Zone Name Input Dialog */}
      {editingSafeZoneId && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 w-72">
            <h3 className="text-sm font-medium mb-3">Name your safe zone</h3>
            <input
              type="text"
              value={safeZoneNameInput}
              onChange={(e) => setSafeZoneNameInput(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 mb-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="e.g. Safe Zone"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button 
                onClick={cancelSafeZone}
                className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded text-xs hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={saveSafeZone}
                className="px-3 py-1.5 bg-purple-500 text-white rounded text-xs hover:bg-purple-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 