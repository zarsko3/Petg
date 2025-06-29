import { create } from 'zustand';

interface User {
  name: string;
}

interface PetgState {
  systemState: 'normal' | 'alert' | 'lowBattery';
  batteryLevel: number;
  alertActive: boolean;
  alertMode: 'none' | 'buzzer' | 'vibration' | 'both';
  user: User | null;
  
  // Demo mode state
  demoMode: boolean;
  
  // Connection state
  isCollarConnected: boolean;
  collarConnectionUrl: string;
  connectionStatus: 'Ready' | 'Connecting' | 'Connected' | 'Failed';
  connectionMessage: string;
  lastConnectionAttempt: number;
  lastDataReceived: number;
  
  // Last collar data for real-time sharing
  lastCollarData: any | null;
  
  // Live beacon detections
  beacons: Array<{
    id: string;
    name: string;
    rssi: number;
    distance: number;
    confidence: number;
    timestamp: number;
    address?: string;
    collarId: string;
  }>;
  
  setSystemState: (state: 'normal' | 'alert' | 'lowBattery') => void;
  setBatteryLevel: (level: number) => void;
  setAlertActive: (active: boolean) => void;
  setAlertMode: (mode: 'none' | 'buzzer' | 'vibration' | 'both') => void;
  setUser: (user: User | null) => void;
  
  // Demo mode actions
  setDemoMode: (demoMode: boolean) => void;
  
  // Connection actions
  setCollarConnected: (connected: boolean) => void;
  setConnectionStatus: (status: 'Ready' | 'Connecting' | 'Connected' | 'Failed') => void;
  setConnectionMessage: (message: string) => void;
  setLastConnectionAttempt: (timestamp: number) => void;
  setLastDataReceived: (timestamp: number) => void;
  setConnectionUrl: (url: string) => void;
  
  // Collar data actions
  setLastCollarData: (data: any) => void;
  
  // Beacon actions
  addOrUpdateBeacon: (beacon: {
    id: string;
    name: string;
    rssi: number;
    distance: number;
    confidence: number;
    timestamp: number;
    address?: string;
    collarId: string;
  }) => void;
  removeBeacon: (id: string) => void;
  clearBeacons: () => void;
  cleanupOldBeacons: (maxAgeMs?: number) => void;
}

export const usePetgStore = create<PetgState>((set) => ({
  systemState: 'normal',
  batteryLevel: 100,
  alertActive: false,
  alertMode: 'none',
  user: null,
  
  // Demo mode (starts as true, switches to false when collar comes online)
  demoMode: true,
  
  // Connection state
  isCollarConnected: false,
  collarConnectionUrl: '',
  connectionStatus: 'Ready',
  connectionMessage: 'Ready to connect',
  lastConnectionAttempt: 0,
  lastDataReceived: 0,
  
  // Last collar data for real-time sharing
  lastCollarData: null,
  
  // Live beacon detections
  beacons: [],
  
  setSystemState: (state) => set({ systemState: state }),
  setBatteryLevel: (level) => set({ batteryLevel: level }),
  setAlertActive: (active) => set({ alertActive: active }),
  setAlertMode: (mode) => set({ alertMode: mode }),
  setUser: (user) => set({ user }),
  
  // Demo mode actions
  setDemoMode: (demo) => set({ demoMode: demo }),
  
  // Connection actions
  setCollarConnected: (connected) => set({ isCollarConnected: connected }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setConnectionMessage: (message) => set({ connectionMessage: message }),
  setLastConnectionAttempt: (timestamp) => set({ lastConnectionAttempt: timestamp }),
  setLastDataReceived: (timestamp) => set({ lastDataReceived: timestamp }),
  setConnectionUrl: (url) => set({ collarConnectionUrl: url }),
  
  // Collar data actions
  setLastCollarData: (data) => set({ lastCollarData: data, lastDataReceived: Date.now() }),
  
  // Beacon actions
  addOrUpdateBeacon: (beacon) => set((state) => {
    const existingIndex = state.beacons.findIndex(b => 
      b.id === beacon.id || b.name === beacon.name
    );
    
    if (existingIndex >= 0) {
      // Update existing beacon
      const updatedBeacons = [...state.beacons];
      updatedBeacons[existingIndex] = beacon;
      return {
        beacons: updatedBeacons,
        lastDataReceived: Date.now(),
      };
    } else {
      // Add new beacon
      return {
        beacons: [...state.beacons, beacon],
        lastDataReceived: Date.now(),
      };
    }
  }),
  removeBeacon: (id) => set((state) => ({
    beacons: state.beacons.filter((b) => b.id !== id),
    lastDataReceived: Date.now(),
  })),
  clearBeacons: () => set({ beacons: [] }),
  cleanupOldBeacons: (maxAgeMs = 300000) => set((state) => ({
    beacons: state.beacons.filter((b) => Date.now() - b.timestamp < maxAgeMs),
    lastDataReceived: Date.now(),
  })),
})); 