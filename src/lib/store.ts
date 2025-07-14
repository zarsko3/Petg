import { create } from 'zustand';

// 🔍 STEP 5: localStorage persistence helpers
const BEACON_STORAGE_KEY = 'petg-detected-beacons';
const BEACON_MAX_AGE_MS = 600000; // 10 minutes

const loadBeaconsFromStorage = () => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(BEACON_STORAGE_KEY);
    if (!stored) return [];
    
    const beacons = JSON.parse(stored);
    const now = Date.now();
    
    // Filter out expired beacons
    const validBeacons = beacons.filter((beacon: any) => 
      beacon.timestamp && (now - beacon.timestamp) < BEACON_MAX_AGE_MS
    );
    
    return validBeacons;
  } catch (error) {
    return [];
  }
};

const saveBeaconsToStorage = (beacons: any[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(BEACON_STORAGE_KEY, JSON.stringify(beacons));
  } catch (error) {
  }
};

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
    timestamp: number; // Local time (Date.now())
    deviceTimestamp?: number; // Original device uptime for debugging
    address?: string;
    collarId: string;
  }>;
  
  // Device status tracking (prevents toast spam)
  deviceStatusMap: Record<string, string>; // collarId -> last known status
  lastOnlineToastAt: Record<string, number>; // collarId -> timestamp of last "online" toast
  
  // Recent Updates (replaces spammy toasts)
  recentUpdates: Array<{
    id: string;
    type: 'status' | 'connection' | 'battery' | 'alert' | 'beacon';
    title: string;
    message: string;
    timestamp: number;
    collarId?: string;
    severity: 'info' | 'success' | 'warning' | 'error';
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
    deviceTimestamp?: number;
    address?: string;
    collarId: string;
  }) => void;
  removeBeacon: (id: string) => void;
  clearBeacons: () => void;
  cleanupOldBeacons: (maxAgeMs?: number) => void;

  // Recent Updates actions
  addRecentUpdate: (update: {
    type: 'status' | 'connection' | 'battery' | 'alert' | 'beacon';
    title: string;
    message: string;
    collarId?: string;
    severity: 'info' | 'success' | 'warning' | 'error';
  }) => void;
  clearRecentUpdates: () => void;

  // Device status actions (prevents toast spam)
  updateDeviceStatus: (collarId: string, status: string) => void;
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
  beacons: loadBeaconsFromStorage(),
  
  // Device status tracking (prevents toast spam)
  deviceStatusMap: {},
  lastOnlineToastAt: {},
  
  // Recent Updates (replaces spammy toasts)
  recentUpdates: [],
  
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
      
      saveBeaconsToStorage(updatedBeacons);
      
      return {
        beacons: updatedBeacons,
        lastDataReceived: Date.now(),
      };
    } else {
      // Add new beacon (ghost mode)
      const newBeacons = [...state.beacons, beacon];
      
      saveBeaconsToStorage(newBeacons);
      
      return {
        beacons: newBeacons,
        lastDataReceived: Date.now(),
      };
    }
  }),
  removeBeacon: (id) => set((state) => {
    const beforeCount = state.beacons.length;
    const filtered = state.beacons.filter((b) => b.id !== id);
    
    saveBeaconsToStorage(filtered);
    
    return {
      beacons: filtered,
      lastDataReceived: Date.now(),
    };
  }),
  clearBeacons: () => set((state) => {
    return { beacons: [] };
  }),
  cleanupOldBeacons: (maxAgeMs = 300000) => set((state) => {
    const beforeCount = state.beacons.length;
    const now = Date.now();
    const filtered = state.beacons.filter((b) => now - b.timestamp < maxAgeMs);
    
    if (beforeCount !== filtered.length) {
      saveBeaconsToStorage(filtered);
    }
    
    return {
      beacons: filtered,
      lastDataReceived: Date.now(),
    };
  }),

  // Recent Updates actions
  addRecentUpdate: (update) => set((state) => {
    const newUpdate = {
      id: `update-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...update
    };
    
    // Keep only last 20 updates
    const newUpdates = [newUpdate, ...state.recentUpdates].slice(0, 20);
    
    return { recentUpdates: newUpdates };
  }),
  
  clearRecentUpdates: () => set({ recentUpdates: [] }),

  // Device status actions (prevents toast spam)
  updateDeviceStatus: (collarId, status) => set((state) => {
    const previousStatus = state.deviceStatusMap[collarId];
    const now = Date.now();
    const lastToast = state.lastOnlineToastAt[collarId] || 0;
    
    // Determine if we should show a toast (only on real state transitions)
    const shouldShowToast = previousStatus !== status;
    
    // Debounce check: don't show another "online" toast for 5 minutes
    const shouldDebounce = status === 'online' && (now - lastToast) < 300000; // 5 minutes
    
    // Update the status map
    const newDeviceStatusMap = { ...state.deviceStatusMap, [collarId]: status };
    const newLastOnlineToastAt = status === 'online' && shouldShowToast && !shouldDebounce 
      ? { ...state.lastOnlineToastAt, [collarId]: now }
      : state.lastOnlineToastAt;
    
    return { 
      deviceStatusMap: newDeviceStatusMap,
      lastOnlineToastAt: newLastOnlineToastAt
    };
     })
})); 