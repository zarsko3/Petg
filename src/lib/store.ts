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
  
  setSystemState: (state: 'normal' | 'alert' | 'lowBattery') => void;
  setBatteryLevel: (level: number) => void;
  setAlertActive: (active: boolean) => void;
  setAlertMode: (mode: 'none' | 'buzzer' | 'vibration' | 'both') => void;
  setUser: (user: User | null) => void;
  
  // Demo mode actions
  setDemoMode: (demo: boolean) => void;
  
  // Connection actions
  setCollarConnected: (connected: boolean) => void;
  setConnectionUrl: (url: string) => void;
  setConnectionStatus: (status: 'Ready' | 'Connecting' | 'Connected' | 'Failed') => void;
  setConnectionMessage: (message: string) => void;
  setLastConnectionAttempt: (timestamp: number) => void;
  setLastDataReceived: (timestamp: number) => void;
  setLastCollarData: (data: any | null) => void;
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
  
  setSystemState: (state) => set({ systemState: state }),
  setBatteryLevel: (level) => set({ batteryLevel: level }),
  setAlertActive: (active) => set({ alertActive: active }),
  setAlertMode: (mode) => set({ alertMode: mode }),
  setUser: (user) => set({ user }),
  
  // Demo mode actions
  setDemoMode: (demo) => set({ demoMode: demo }),
  
  // Connection actions
  setCollarConnected: (connected) => set({ isCollarConnected: connected }),
  setConnectionUrl: (url) => set({ collarConnectionUrl: url }),
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setConnectionMessage: (message) => set({ connectionMessage: message }),
  setLastConnectionAttempt: (timestamp) => set({ lastConnectionAttempt: timestamp }),
  setLastDataReceived: (timestamp) => set({ lastDataReceived: timestamp }),
  setLastCollarData: (data) => set({ lastCollarData: data, lastDataReceived: Date.now() }),
})); 