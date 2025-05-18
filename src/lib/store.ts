import { create } from 'zustand';

interface Beacon {
  name: string;
  rssi: number;
  distance: number;
}

interface PetgState {
  systemState: 'normal' | 'alert' | 'lowBattery';
  batteryLevel: number;
  alertActive: boolean;
  alertMode: 'none' | 'buzzer' | 'vibration' | 'both';
  position: {
    x: number;
    y: number;
    valid: boolean;
  };
  beacons: Beacon[];
  user: {
    name: string;
    email: string;
    avatar?: string;
  } | null;
  setSystemState: (state: 'normal' | 'alert' | 'lowBattery') => void;
  setBatteryLevel: (level: number) => void;
  setAlertActive: (active: boolean) => void;
  setAlertMode: (mode: 'none' | 'buzzer' | 'vibration' | 'both') => void;
  setPosition: (position: { x: number; y: number; valid: boolean }) => void;
  setBeacons: (beacons: Beacon[]) => void;
  setUser: (user: { name: string; email: string; avatar?: string } | null) => void;
}

export const usePetgStore = create<PetgState>((set) => ({
  systemState: 'normal',
  batteryLevel: 100,
  alertActive: false,
  alertMode: 'none',
  position: {
    x: 0,
    y: 0,
    valid: false,
  },
  beacons: [],
  user: null,
  setSystemState: (state) => set({ systemState: state }),
  setBatteryLevel: (level) => set({ batteryLevel: level }),
  setAlertActive: (active) => set({ alertActive: active }),
  setAlertMode: (mode) => set({ alertMode: mode }),
  setPosition: (position) => set({ position }),
  setBeacons: (beacons) => set({ beacons }),
  setUser: (user) => set({ user }),
})); 