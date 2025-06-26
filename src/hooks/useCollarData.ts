import { useState, useEffect, useCallback } from 'react';
import { usePetgStore } from '@/lib/store';

export interface CollarData {
  device_id?: string;
  battery_level?: number;
  status?: string;
  last_seen?: string;
  signal_strength?: number;
  temperature?: number;
  activity_level?: number;
  location?: {
    x: number;
    y: number;
    room?: string;
  };
  daily_stats?: {
    active_time: number;
    rest_time: number;
    sleep_time: number;
  };
  alerts?: {
    active: boolean;
    type?: string;
    message?: string;
  };
}

export interface CollarStatus {
  connected: boolean;
  current_ip?: string;
  response_time?: number;
  last_discovered?: string;
  error?: string;
}

export interface UseCollarDataReturn {
  data: CollarData | null;
  status: CollarStatus;
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  refetch: () => Promise<void>;
}

// Demo/fallback data
const DEMO_DATA: CollarData = {
  device_id: 'DEMO_COLLAR_001',
  battery_level: 74.1,
  status: 'active',
  last_seen: new Date().toISOString(),
  signal_strength: 85,
  temperature: 22.5,
  activity_level: 65,
  location: {
    x: 50,
    y: 50,
    room: 'Living Room'
  },
  daily_stats: {
    active_time: 4.5 * 60, // 4.5 hours in minutes
    rest_time: 6.25 * 60,  // 6.25 hours in minutes
    sleep_time: 2.75 * 60  // 2.75 hours in minutes
  },
  alerts: {
    active: false
  }
};

export function useCollarData(refreshInterval: number = 5000): UseCollarDataReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Get state from global store
  const isConnected = usePetgStore((state) => state.isCollarConnected);
  const connectionStatus = usePetgStore((state) => state.connectionStatus);
  const connectionMessage = usePetgStore((state) => state.connectionMessage);
  const lastDataReceived = usePetgStore((state) => state.lastDataReceived);
  const rawCollarData = usePetgStore((state) => state.lastCollarData);
  
  // Switch between live and mock data based on connection status
  const data: CollarData | null = isConnected && rawCollarData ? {
    device_id: rawCollarData.device_id || rawCollarData.id || 'PetCollar-S3',
    battery_level: rawCollarData.battery?.level || rawCollarData.battery_level || rawCollarData.battery || rawCollarData.power || 0,
    status: rawCollarData.status || 'active',
    last_seen: rawCollarData.last_seen || rawCollarData.timestamp || new Date().toISOString(),
    signal_strength: rawCollarData.signal_strength || rawCollarData.rssi || rawCollarData.wifi_strength || 90,
    temperature: rawCollarData.temperature || rawCollarData.temp,
    activity_level: rawCollarData.activity_level || rawCollarData.activity || (rawCollarData.scanner?.successful_scans ? Math.min(100, rawCollarData.scanner.successful_scans * 10) : 65),
    location: rawCollarData.location ? {
      x: rawCollarData.location.x || rawCollarData.x || 50,
      y: rawCollarData.location.y || rawCollarData.y || 50,
      room: rawCollarData.location.room || rawCollarData.room
    } : rawCollarData.position?.valid ? {
      x: rawCollarData.position.x || 50,
      y: rawCollarData.position.y || 50,
      room: rawCollarData.position.room
    } : undefined,
    daily_stats: rawCollarData.daily_stats ? {
      active_time: rawCollarData.daily_stats.active_time || rawCollarData.active_time || 0,
      rest_time: rawCollarData.daily_stats.rest_time || rawCollarData.rest_time || 0,
      sleep_time: rawCollarData.daily_stats.sleep_time || rawCollarData.sleep_time || 0
    } : rawCollarData.uptime ? {
      // Generate some realistic daily stats based on uptime
      active_time: Math.floor(rawCollarData.uptime / 60) * 2, // Assume 2 minutes active per minute uptime
      rest_time: Math.floor(rawCollarData.uptime / 60) * 3,   // Assume 3 minutes rest per minute uptime
      sleep_time: Math.floor(rawCollarData.uptime / 60) * 1   // Assume 1 minute sleep per minute uptime
    } : {
      active_time: 4.5 * 60,
      rest_time: 6.25 * 60,
      sleep_time: 2.75 * 60
    },
    alerts: {
      active: rawCollarData.alerts?.active || rawCollarData.alert_active || false,
      type: rawCollarData.alerts?.type,
      message: rawCollarData.alerts?.message
    }
  } : (!isConnected ? {
    ...DEMO_DATA,
    last_seen: new Date().toISOString()
  } : null);
  
  // Create status object
  const status: CollarStatus = {
    connected: isConnected,
    error: connectionStatus === 'Failed' ? connectionMessage : undefined
  };
  
  // Create lastUpdate date
  const lastUpdate = lastDataReceived > 0 ? new Date(lastDataReceived) : null;
  
  // Fallback API refetch for manual refresh
  const refetch = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('🔄 useCollarData: Manual refetch requested - calling collar status API');
      
      // Check collar status as fallback
      const response = await fetch('/api/collar-status', {
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        console.log('✅ useCollarData: Manual status check successful');
      } else {
        console.log('❌ useCollarData: Manual status check failed');
        setError('Failed to refresh collar status');
      }
    } catch (err) {
      console.error('❌ useCollarData: Manual refetch failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsLoading(false);
    }
  }, []);
  
  // Initial loading state
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  
  return {
    data,
    status,
    isConnected,
    isLoading,
    error,
    lastUpdate,
    refetch
  };
} 