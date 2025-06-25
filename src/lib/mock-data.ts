import { usePetgStore } from './store';

// Pet Data
export interface Pet {
  id: string;
  name: string;
  position: { x: number; y: number };
  isMoving: boolean;
  lastUpdate: string;
}

// Location Map Interfaces
export interface Beacon {
  id: string;
  name: string;
  position: { x: number; y: number };
  strength: number;
  batteryLevel: number;
  locked?: boolean;
}

export interface LocationLabel {
  id: string;
  name: string;
  position: { x: number; y: number };
  locked?: boolean;
}

export interface SafeZone {
  id: string;
  startPoint: { x: number; y: number };
  endPoint: { x: number; y: number };
  name: string;
}

// Beacons Management Interface
export interface BeaconItem {
  id: string;
  name: string;
  position: { x: number; y: number };
  batteryLevel: number;
  signalStrength: number;
  lastUpdate: string;
  location: string;
  status: 'online' | 'offline' | 'low-battery';
  isAutoDetected?: boolean; // Whether this beacon was automatically detected by the collar
  address?: string; // MAC address for auto-detected beacons
  lastSeenTimestamp?: number; // Timestamp of when beacon was last seen
}

// Location Page Interfaces
export interface BeaconStatus {
  id: string;
  name: string;
  batteryLevel: number;
  signalStrength: number;
  lastUpdate: string;
}

export interface LocationHistoryItem {
  id: string;
  timestamp: string;
  location: string;
  duration: string;
  type: 'movement' | 'alert' | 'rest';
  description: string;
}

export interface MapOption {
  id: string;
  name: string;
  image: string;
  thumbnail?: string;
}

// Dashboard Types
export interface Activity {
  type: 'Rest' | 'Active' | 'Sleep';
  location: string;
  duration: string;
  timeAgo: string;
}

// Pet Location Map Data
export const mockPet: Pet = {
  id: '1',
  name: 'Max',
  position: { x: 50, y: 50 },
  isMoving: false,
  lastUpdate: new Date().toISOString(),
};

export const mockBeacons: Beacon[] = [
  { id: '1', name: 'Living Room', position: { x: 25, y: 30 }, strength: 85, batteryLevel: 90, locked: false },
  { id: '2', name: 'Kitchen', position: { x: 75, y: 25 }, strength: 78, batteryLevel: 65, locked: false },
  { id: '3', name: 'Bedroom', position: { x: 30, y: 70 }, strength: 92, batteryLevel: 82, locked: false },
  { id: '4', name: 'Office', position: { x: 70, y: 75 }, strength: 70, batteryLevel: 45, locked: false },
];

export const mockLocationLabels: LocationLabel[] = [
  { id: '1', name: 'Living Room', position: { x: 35, y: 40 }, locked: false },
  { id: '2', name: 'Kitchen', position: { x: 80, y: 30 }, locked: false },
  { id: '3', name: 'Bedroom', position: { x: 25, y: 80 }, locked: false },
  { id: '4', name: 'Office', position: { x: 75, y: 65 }, locked: false },
];

export const mockSafeZones: SafeZone[] = [
  {
    id: 'sz-1',
    name: 'Safe Zone',
    startPoint: { x: 20, y: 60 },
    endPoint: { x: 40, y: 80 },
  }
];

// Location Page Data
export const mockBeaconStatus: BeaconStatus[] = [
  { id: '1', name: 'Living Room', batteryLevel: 85, signalStrength: 92, lastUpdate: '2 mins ago' },
  { id: '2', name: 'Kitchen', batteryLevel: 65, signalStrength: 78, lastUpdate: '5 mins ago' },
  { id: '3', name: 'Bedroom', batteryLevel: 92, signalStrength: 95, lastUpdate: '1 min ago' },
  { id: '4', name: 'Office', batteryLevel: 45, signalStrength: 70, lastUpdate: '10 mins ago' },
];

export const mockLocationHistory: LocationHistoryItem[] = [
  { id: '1', timestamp: '15:45', location: 'Living Room', duration: '45 min', type: 'rest', description: 'Max was resting in the Living Room' },
  { id: '2', timestamp: '14:30', location: 'Kitchen', duration: '25 min', type: 'movement', description: 'Max moved to the Kitchen' },
  { id: '3', timestamp: '13:20', location: 'Bedroom', duration: '65 min', type: 'rest', description: 'Max took a nap in the Bedroom' },
  { id: '4', timestamp: '11:45', location: 'Office', duration: '30 min', type: 'alert', description: 'Alert triggered in Office area' },
  { id: '5', timestamp: '10:30', location: 'Living Room', duration: '55 min', type: 'movement', description: 'Max returned to Living Room' },
];

export const mockMapOptions: MapOption[] = [
  { id: 'home', name: 'Modern Home', image: '/images/floorplan-3d.png', thumbnail: '/images/floorplan-3d.png' },
  { id: 'home2', name: 'Apartment', image: '/images/floorplan-3d-2.png', thumbnail: '/images/floorplan-3d-2.png' },
  { id: 'home3', name: 'Large House', image: '/images/floorplan-3d-3.png', thumbnail: '/images/floorplan-3d-3.png' },
  { id: 'home4', name: 'Studio', image: '/images/floorplan-3d-4.png', thumbnail: '/images/floorplan-3d-4.png' },
];

// Beacons Management Data
export const mockBeaconItems: BeaconItem[] = [
  { 
    id: '1', 
    name: 'Living Room Beacon', 
    position: { x: 25, y: 30 }, 
    batteryLevel: 85, 
    signalStrength: 92, 
    lastUpdate: '2 mins ago',
    location: 'Living Room',
    status: 'online'
  },
  { 
    id: '2', 
    name: 'Kitchen Beacon', 
    position: { x: 75, y: 25 }, 
    batteryLevel: 65, 
    signalStrength: 78, 
    lastUpdate: '5 mins ago',
    location: 'Kitchen',
    status: 'online'
  },
  { 
    id: '3', 
    name: 'Bedroom Beacon', 
    position: { x: 30, y: 70 }, 
    batteryLevel: 92, 
    signalStrength: 95, 
    lastUpdate: '1 min ago',
    location: 'Bedroom',
    status: 'online'
  },
  { 
    id: '4', 
    name: 'Office Beacon', 
    position: { x: 70, y: 75 }, 
    batteryLevel: 15, 
    signalStrength: 70, 
    lastUpdate: '10 mins ago',
    location: 'Office',
    status: 'low-battery'
  },
  { 
    id: '5', 
    name: 'Garage Beacon', 
    position: { x: 50, y: 90 }, 
    batteryLevel: 56, 
    signalStrength: 0, 
    lastUpdate: '3 hours ago',
    location: 'Garage',
    status: 'offline'
  }
];

// Dashboard Data
export const mockRecentActivities: Activity[] = [
  { type: 'Rest', location: 'Living Room', duration: '45 min', timeAgo: '2h ago' },
  { type: 'Active', location: 'Kitchen', duration: '15 min', timeAgo: '4h ago' },
  { type: 'Sleep', location: 'Bedroom', duration: '2h 30min', timeAgo: '6h ago' },
];

// Settings Page Data
export const defaultWebSocketUrl = 'ws://192.168.1.100:8080';
export const defaultVibrationIntensity = 50;
export const defaultSoundIntensity = 50;
export const defaultNotifications = {
  push: true,
  email: false,
  sound: true,
  sms: false
};

// Original mock data initialization
export function initMockData() {
  const store = usePetgStore.getState();
  
  // Initialize battery level
  store.setBatteryLevel(100);

  // Initialize other mock data
  const updateData = () => {
    const store = usePetgStore.getState();
    
    // Random battery drain
    const newBatteryLevel = Math.max(0, store.batteryLevel - Math.random() * 0.1);
    store.setBatteryLevel(newBatteryLevel);

    // Random alert simulation
    if (Math.random() < 0.05) { // 5% chance of alert
      store.setAlertActive(true);
      store.setSystemState('alert');
    } else {
      store.setAlertActive(false);
      store.setSystemState('normal');
    }
  };

  // Update data every 2 seconds
  const interval = setInterval(updateData, 2000);

  // Cleanup function
  return () => {
    clearInterval(interval);
  };
} 