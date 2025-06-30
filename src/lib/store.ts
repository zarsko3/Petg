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
    
    console.log(`📦 Store: [STEP 5] Loaded ${validBeacons.length}/${beacons.length} valid beacons from localStorage`);
    return validBeacons;
  } catch (error) {
    console.error('❌ Store: [STEP 5] Failed to load beacons from localStorage:', error);
    return [];
  }
};

const saveBeaconsToStorage = (beacons: any[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(BEACON_STORAGE_KEY, JSON.stringify(beacons));
    console.log(`💾 Store: [STEP 5] Saved ${beacons.length} beacons to localStorage`);
  } catch (error) {
    console.error('❌ Store: [STEP 5] Failed to save beacons to localStorage:', error);
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
  beacons: loadBeaconsFromStorage(),
  
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
    // 🔍 STEP 3: Enhanced logging for ghost mode creation
    console.log(`🏪 Store: [STEP 3] addOrUpdateBeacon called with:`, beacon);
    console.log(`🏪 Store: [STEP 3] Current store has ${state.beacons.length} beacons`);
    
    const existingIndex = state.beacons.findIndex(b => 
      b.id === beacon.id || b.name === beacon.name
    );
    
    if (existingIndex >= 0) {
      // Update existing beacon
      console.log(`🔄 Store: [STEP 3] Updating existing beacon at index ${existingIndex}:`, state.beacons[existingIndex]);
      const updatedBeacons = [...state.beacons];
      updatedBeacons[existingIndex] = beacon;
      
      console.log(`✅ Store: [STEP 3] Beacon updated:`, beacon);
      console.log(`📊 Store: [STEP 3] Total beacons after update: ${updatedBeacons.length}`);
      
      // 🔍 STEP 5: Save to localStorage
      saveBeaconsToStorage(updatedBeacons);
      
      return {
        beacons: updatedBeacons,
        lastDataReceived: Date.now(),
      };
    } else {
      // Add new beacon (ghost mode)
      console.log(`🆕 Store: [STEP 3] Adding NEW beacon (ghost mode):`, beacon);
      const newBeacons = [...state.beacons, beacon];
      
      console.log(`✅ Store: [STEP 3] New beacon added. Total beacons: ${newBeacons.length}`);
      console.log(`📋 Store: [STEP 3] All beacons now:`, newBeacons.map(b => ({
        id: b.id,
        name: b.name,
        rssi: b.rssi,
        age_seconds: Math.floor((Date.now() - b.timestamp) / 1000)
      })));
      
      // 🔍 STEP 5: Save to localStorage
      saveBeaconsToStorage(newBeacons);
      
      return {
        beacons: newBeacons,
        lastDataReceived: Date.now(),
      };
    }
  }),
  removeBeacon: (id) => set((state) => {
    console.log(`🗑️ Store: Removing beacon with id: ${id}`);
    const beforeCount = state.beacons.length;
    const filtered = state.beacons.filter((b) => b.id !== id);
    console.log(`📊 Store: Removed ${beforeCount - filtered.length} beacon(s). Remaining: ${filtered.length}`);
    
    // 🔍 STEP 5: Save to localStorage
    saveBeaconsToStorage(filtered);
    
    return {
      beacons: filtered,
      lastDataReceived: Date.now(),
    };
  }),
  clearBeacons: () => set((state) => {
    console.log(`🧹 Store: Clearing all ${state.beacons.length} beacons`);
    return { beacons: [] };
  }),
  cleanupOldBeacons: (maxAgeMs = 300000) => set((state) => {
    const beforeCount = state.beacons.length;
    const now = Date.now();
    const filtered = state.beacons.filter((b) => now - b.timestamp < maxAgeMs);
    
    if (beforeCount !== filtered.length) {
      console.log(`🧹 Store: Cleanup removed ${beforeCount - filtered.length} old beacons (older than ${maxAgeMs/1000}s). Remaining: ${filtered.length}`);
      console.log(`📋 Store: Remaining beacons:`, filtered.map(b => ({
        name: b.name,
        age_seconds: Math.floor((now - b.timestamp) / 1000)
      })));
      
      // 🔍 STEP 5: Save to localStorage after cleanup
      saveBeaconsToStorage(filtered);
    }
    
    return {
      beacons: filtered,
      lastDataReceived: Date.now(),
    };
  })
})); 