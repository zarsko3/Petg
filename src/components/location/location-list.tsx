'use client';

import { useState } from 'react';
import { MapPin, Clock, Wifi } from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data for development - will be replaced with real data
const mockLocations = [
  {
    id: '1',
    name: 'Living Room',
    distance: '2.3m',
    status: 'active',
    lastSeen: '2 min ago',
    signalStrength: 85,
    type: 'beacon'
  },
  {
    id: '2',
    name: 'Kitchen',
    distance: '4.1m',
    status: 'inactive',
    lastSeen: '5 min ago',
    signalStrength: 65,
    type: 'beacon'
  },
  {
    id: '3',
    name: 'Bedroom',
    distance: '6.2m',
    status: 'active',
    lastSeen: '1 min ago',
    signalStrength: 45,
    type: 'beacon'
  }
];

interface LocationListProps {
  className?: string;
}

export function LocationList({ className }: LocationListProps) {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* List Header */}
      <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Locations ({mockLocations.length})
          </h2>
          <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <Wifi className="h-4 w-4" />
            <span>Live tracking</span>
          </div>
        </div>
      </div>

      {/* List Content */}
      <div className="flex-1 overflow-y-auto">
        {mockLocations.length > 0 ? (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {mockLocations.map((location) => (
              <div
                key={location.id}
                className={cn(
                  "p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors",
                  selectedLocation === location.id && "bg-blue-50 dark:bg-blue-900/20 border-r-2 border-blue-500"
                )}
                onClick={() => setSelectedLocation(location.id)}
                role="button"
                tabIndex={0}
                aria-label={`Select ${location.name}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedLocation(location.id);
                  }
                }}
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className={cn(
                      "w-3 h-3 rounded-full",
                      location.status === 'active' ? "bg-green-500 animate-pulse" : "bg-gray-400"
                    )} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {location.name}
                      </h3>
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {location.distance}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{location.lastSeen}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Wifi className="h-3 w-3" />
                        <span>{location.signalStrength}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <MapPin className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No locations found
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Add beacons or check your connection to see location data.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

