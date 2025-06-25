import { Beacon, LocationLabel, Pet, SafeZone } from '@/lib/mock-data';

export interface MapDimensions {
  width: number;
  height: number;
}

export interface Position {
  x: number;
  y: number;
}

export interface CurrentSafeZone {
  startPoint: Position | null;
  endPoint: Position | null;
}

export interface MapContextType {
  // Map state
  mapRef: React.RefObject<HTMLDivElement>;
  mapSize: MapDimensions;
  
  // Data
  pet: Pet;
  setPet: (pet: Pet) => void;
  beacons: Beacon[];
  setBeacons: (beacons: Beacon[]) => void;
  realBeacons: any[];
  locationLabels: LocationLabel[];
  setLocationLabels: (labels: LocationLabel[]) => void;
  safeZones: SafeZone[];
  setSafeZones: (zones: SafeZone[]) => void;
  
  // UI state
  showBeacons: boolean;
  showSafeZones: boolean;
  setShowSafeZones: (show: boolean) => void;
  isPetInSafeZone: boolean;
  isTrackingMode: boolean;
  
  // Editing state
  editingLabelId: string | null;
  setEditingLabelId: (id: string | null) => void;
  newLabelName: string;
  setNewLabelName: (name: string) => void;
  
  // Dragging state
  draggingBeaconId: string | null;
  setDraggingBeaconId: (id: string | null) => void;
  beaconDragOffset: Position;
  setBeaconDragOffset: (offset: Position) => void;
  draggingLabelId: string | null;
  setDraggingLabelId: (id: string | null) => void;
  labelDragOffset: Position;
  setLabelDragOffset: (offset: Position) => void;
  
  // Safe zone state
  isCreatingSafeZone: boolean;
  setIsCreatingSafeZone: (creating: boolean) => void;
  currentSafeZone: CurrentSafeZone;
  setCurrentSafeZone: (zone: CurrentSafeZone) => void;
  editingSafeZoneId: string | null;
  setEditingSafeZoneId: (id: string | null) => void;
  safeZoneNameInput: string;
  setSafeZoneNameInput: (name: string) => void;
  
  // Functions
  startEditingLabel: (id: string) => void;
  saveLabel: () => void;
  cancelEditing: () => void;
  deleteLabel: (id: string) => void;
  toggleLabelLock: (id: string) => void;
  toggleBeaconLock: (id: string) => void;
  startDraggingLabel: (e: React.MouseEvent, id: string) => void;
  startDraggingBeacon: (e: React.MouseEvent, id: string) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  addNewLabel: (e: React.MouseEvent) => void;
  startCreatingSafeZone: () => void;
  handleMapClick: (e: React.MouseEvent) => void;
  finishSafeZone: () => void;
  saveSafeZone: () => void;
  cancelSafeZone: () => void;
  deleteSafeZone: (id: string) => void;
  isPointInRectangle: (point: Position, startPoint: Position, endPoint: Position) => boolean;
} 