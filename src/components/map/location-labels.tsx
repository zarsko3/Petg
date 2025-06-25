'use client';

import React from 'react';
import { Edit, Check, X, Trash, Lock, Unlock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMapContext } from './map-context';

export function LocationLabels() {
  const { 
    locationLabels, 
    editingLabelId, 
    newLabelName, 
    setNewLabelName, 
    saveLabel, 
    cancelEditing, 
    startEditingLabel, 
    deleteLabel, 
    toggleLabelLock, 
    startDraggingLabel, 
    draggingLabelId 
  } = useMapContext();

  return (
    <>
      {locationLabels.map(label => (
        <div 
          key={label.id} 
          className={cn(
            "absolute",
            editingLabelId === label.id && "z-50"
          )}
          style={{
            left: `${label.position.x}%`,
            top: `${label.position.y}%`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          {editingLabelId === label.id ? (
            <div className="flex items-center gap-1 bg-white dark:bg-gray-800 shadow-md rounded-lg p-1.5" onClick={e => e.stopPropagation()}>
              <input
                type="text"
                value={newLabelName}
                onChange={(e) => setNewLabelName(e.target.value)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 w-28 focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <div className="flex gap-1">
                <button 
                  onClick={(e) => { e.stopPropagation(); saveLabel(); }} 
                  className="p-1 text-green-500 hover:text-green-600 bg-green-50 dark:bg-green-900/30 rounded"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button 
                  onClick={(e) => { e.stopPropagation(); cancelEditing(); }} 
                  className="p-1 text-gray-500 hover:text-gray-600 bg-gray-50 dark:bg-gray-700 rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="group relative">
                {/* Toolbar that appears above the label on hover */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 transition-opacity flex bg-white/95 dark:bg-gray-800/95 rounded-md shadow-md p-0.5 gap-1 z-10">
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleLabelLock(label.id); }}
                    className="p-1 text-blue-500 hover:text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    title={label.locked ? "Unlock" : "Lock"}
                  >
                    {label.locked ? (
                      <Lock className="h-3.5 w-3.5" />
                    ) : (
                      <Unlock className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); startEditingLabel(label.id); }} 
                    className="p-1 text-blue-500 hover:text-blue-600 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30"
                    title="Edit"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteLabel(label.id); }} 
                    className="p-1 text-red-500 hover:text-red-600 rounded hover:bg-red-50 dark:hover:bg-red-900/30"
                    title="Delete"
                  >
                    <Trash className="h-3.5 w-3.5" />
                  </button>
                </div>
                
                {/* The label itself */}
                <div 
                  className={cn(
                    "relative flex items-center bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm py-1.5 px-3 text-xs rounded-md shadow-md min-w-20 justify-center",
                    label.locked ? "cursor-default border-l-2 border-blue-500" : "cursor-move hover:bg-white hover:dark:bg-gray-800"
                  )}
                  onMouseDown={(e) => startDraggingLabel(e, label.id)}
                >
                  <span className="font-medium">{label.name}</span>
                </div>
              </div>
              
              <div 
                className={cn(
                  "w-1 h-4 mt-0.5 transition-colors",
                  label.locked ? "bg-blue-500" : "bg-gray-300 dark:bg-gray-600"
                )}
                onMouseDown={(e) => startDraggingLabel(e, label.id)}
              />
            </div>
          )}
        </div>
      ))}
    </>
  );
} 