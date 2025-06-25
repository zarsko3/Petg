'use client';

import { Wifi, WifiOff, Activity, AlertCircle } from 'lucide-react';
import { usePetgStore } from '@/lib/store';

export function CollarStatusIndicator() {
  const isConnected = usePetgStore((state) => state.isCollarConnected);
  const connectionStatus = usePetgStore((state) => state.connectionStatus);

  // Determine the status to display
  const getStatus = () => {
    if (isConnected) return 'connected';
    if (connectionStatus === 'Connecting') return 'connecting';
    if (connectionStatus === 'Failed') return 'error';
    return 'disconnected';
  };

  const status = getStatus();

  // Get appropriate icon and styling
  const getStatusDisplay = () => {
    switch (status) {
      case 'connected':
        return {
          icon: <Wifi className="h-4 w-4" />,
          text: 'Connected',
          className: 'text-green-600 dark:text-green-400'
        };
      case 'connecting':
        return {
          icon: <Activity className="h-4 w-4 animate-pulse" />,
          text: 'Connecting',
          className: 'text-yellow-600 dark:text-yellow-400'
        };
      case 'error':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: 'Error',
          className: 'text-red-600 dark:text-red-400'
        };
      default:
        return {
          icon: <WifiOff className="h-4 w-4" />,
          text: 'Disconnected',
          className: 'text-gray-500 dark:text-gray-400'
        };
    }
  };

  const statusDisplay = getStatusDisplay();

  return (
    <div className={`hidden lg:flex items-center gap-2 ${statusDisplay.className}`}>
      {statusDisplay.icon}
      <span className="text-xs font-medium">{statusDisplay.text}</span>
    </div>
  );
} 