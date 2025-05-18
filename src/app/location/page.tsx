'use client';

import { useState, useEffect, useRef } from 'react';
import { usePetgStore } from '@/lib/store';
import { Eye, EyeOff, PawPrint, Clock, Bell, MapPin, Thermometer, Video, Camera, Lock, Unlock, Edit2, Trash2, MoreVertical } from 'lucide-react';
import { StatusChip } from '@/components/ui/status-chip';
import Image from 'next/image';
import { initMockData } from '@/lib/mock-data';

// Room label type definition
type RoomLabel = {
  id: string;
  name: string;
  position: { x: number; y: number };
  locked: boolean;
};

const initialRoomLabels: RoomLabel[] = [
  { id: 'living-room', name: 'Living Room', position: { x: 15, y: 20 }, locked: false },
  { id: 'kitchen', name: 'Kitchen', position: { x: 65, y: 20 }, locked: false },
  { id: 'dining', name: 'Dining', position: { x: 65, y: 40 }, locked: false },
  { id: 'bedroom-1', name: 'Bedroom 1', position: { x: 20, y: 70 }, locked: false },
  { id: 'bedroom-2', name: 'Bedroom 2', position: { x: 65, y: 70 }, locked: false },
  { id: 'bath-1', name: 'Bath 1', position: { x: 85, y: 20 }, locked: false },
  { id: 'bath-2', name: 'Bath 2', position: { x: 85, y: 40 }, locked: false },
  { id: 'balcony', name: 'Balcony', position: { x: 85, y: 60 }, locked: false },
];

const initialHotspots = [
  { id: 'living-room', room: 'Living Room', percentage: 35, duration: '4.2 hours' },
  { id: 'kitchen', room: 'Kitchen', percentage: 25, duration: '3 hours' },
  { id: 'bedroom-1', room: 'Bedroom 1', percentage: 20, duration: '2.4 hours' },
  { id: 'balcony', room: 'Balcony', percentage: 10, duration: '1.2 hours' },
];

// Floor plan types
const floorPlanTypes = [
  { id: 'plan1', name: 'Floor Plan 1', image: '/images/floorplan-3d.png' },
  { id: 'plan2', name: 'Floor Plan 2', image: '/images/floorplan-3d-2.png' },
  { id: 'plan3', name: 'Floor Plan 3', image: '/images/floorplan-3d-3.png' },
  { id: 'plan4', name: 'Floor Plan 4', image: '/images/floorplan-3d-4.png' },
];

const FloorPlanMap = ({ 
  showLabels = true, 
  onLabelUpdate,
  selectedPlan 
}: { 
  showLabels?: boolean;
  onLabelUpdate?: (labels: RoomLabel[]) => void;
  selectedPlan: string;
}) => {
  const [roomLabels, setRoomLabels] = useState<RoomLabel[]>(initialRoomLabels);
  const [draggedLabel, setDraggedLabel] = useState<string | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const [menuOpenFor, setMenuOpenFor] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(true);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpenFor && !(e.target as Element).closest('.label-menu')) {
        setMenuOpenFor(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenFor]);

  // Focus input when editing starts
  useEffect(() => {
    if (editingLabel && editInputRef.current) {
      editInputRef.current.focus();
    }
  }, [editingLabel]);

  const handleEditStart = (labelId: string) => {
    setEditingLabel(labelId);
    setMenuOpenFor(null);
  };

  const handleEditSubmit = (labelId: string, newName: string) => {
    if (newName.trim()) {
      const updatedLabels = roomLabels.map(label =>
        label.id === labelId
          ? { ...label, name: newName.trim() }
          : label
      );
      setRoomLabels(updatedLabels);
      onLabelUpdate?.(updatedLabels);
    }
    setEditingLabel(null);
  };

  const handleDeleteLabel = (labelId: string) => {
    const updatedLabels = roomLabels.filter(label => label.id !== labelId);
    setRoomLabels(updatedLabels);
    onLabelUpdate?.(updatedLabels);
    setMenuOpenFor(null);
  };

  const handleDragStart = (e: React.DragEvent, labelId: string) => {
    const label = roomLabels.find(l => l.id === labelId);
    if (label && !label.locked) {
      setDraggedLabel(labelId);
      // Set initial drag position
      setDragPosition(label.position);
      // Required to enable dragging
      e.dataTransfer.setData('text/plain', labelId);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedLabel) return;
    
    const container = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - container.left) / container.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - container.top) / container.height) * 100));
    
    setDragPosition({ x, y });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!draggedLabel || !dragPosition) return;

    setRoomLabels(prev => prev.map(label =>
      label.id === draggedLabel
        ? { ...label, position: dragPosition }
        : label
    ));

    setDraggedLabel(null);
    setDragPosition(null);
  };

  const handleDragEnd = () => {
    if (!draggedLabel || !dragPosition) return;

    setRoomLabels(prev => prev.map(label =>
      label.id === draggedLabel
        ? { ...label, position: dragPosition }
        : label
    ));

    setDraggedLabel(null);
    setDragPosition(null);
  };

  const toggleLock = (labelId: string) => {
    setRoomLabels(prev => prev.map(label =>
      label.id === labelId
        ? { ...label, locked: !label.locked }
        : label
    ));
  };

  return (
    <div 
      className="relative w-full aspect-[4/3] max-w-3xl mx-auto"
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {imageError ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
          <p className="text-gray-500 dark:text-gray-400">Floor plan image not available</p>
        </div>
      ) : (
        <>
          <div className="relative w-full h-full">
            <Image
              src={floorPlanTypes.find(plan => plan.id === selectedPlan)?.image || '/images/floorplan-3d.png'}
              alt="Floor Plan"
              fill
              className={`object-contain rounded-lg transition-opacity duration-300 ${isImageLoading ? 'opacity-0' : 'opacity-100'}`}
              priority
              quality={100}
              onError={(e) => {
                console.error('Failed to load floor plan image:', e);
                setImageError(true);
              }}
              onLoad={() => {
                console.log('Floor plan image loaded successfully');
                setIsImageLoading(false);
              }}
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          </div>

          {isImageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 rounded-lg">
              <p className="text-gray-500 dark:text-gray-400">Loading floor plan...</p>
            </div>
          )}
          
          {showLabels && !imageError && !isImageLoading && (
            <div className="absolute inset-0">
              {roomLabels.map((label) => (
                <div
                  key={label.id}
                  draggable={!label.locked}
                  onDragStart={(e) => handleDragStart(e, label.id)}
                  onDragEnd={handleDragEnd}
                  className={`absolute cursor-${label.locked ? 'default' : 'move'} flex items-center gap-1`}
                  style={{
                    left: `${draggedLabel === label.id && dragPosition ? dragPosition.x : label.position.x}%`,
                    top: `${draggedLabel === label.id && dragPosition ? dragPosition.y : label.position.y}%`,
                    transform: 'translate(-50%, -50%)',
                    opacity: draggedLabel === label.id ? '0.7' : '1',
                    zIndex: draggedLabel === label.id || menuOpenFor === label.id ? '50' : '1'
                  }}
                >
                  <div className="bg-white/80 dark:bg-gray-900/80 px-1.5 py-0.5 rounded text-xs flex items-center gap-1 group">
                    {editingLabel === label.id ? (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const input = editInputRef.current;
                          if (input) handleEditSubmit(label.id, input.value);
                        }}
                      >
                        <input
                          ref={editInputRef}
                          type="text"
                          defaultValue={label.name}
                          className="w-20 px-1 py-0.5 bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none focus:border-blue-500"
                          onBlur={(e) => handleEditSubmit(label.id, e.target.value)}
                        />
                      </form>
                    ) : (
                      <>
                        <span>{label.name}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleLock(label.id)}
                            className="opacity-50 hover:opacity-100 transition-opacity"
                          >
                            {label.locked ? (
                              <Lock className="h-3 w-3" />
                            ) : (
                              <Unlock className="h-3 w-3" />
                            )}
                          </button>
                          <button
                            onClick={() => setMenuOpenFor(menuOpenFor === label.id ? null : label.id)}
                            className="opacity-50 hover:opacity-100 transition-opacity ml-1"
                          >
                            <MoreVertical className="h-3 w-3" />
                          </button>
                        </div>
                      </>
                    )}
                    
                    {/* Popup Menu */}
                    {menuOpenFor === label.id && (
                      <div className="label-menu absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 min-w-[100px]">
                        <button
                          onClick={() => handleEditStart(label.id)}
                          className="w-full px-3 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2"
                        >
                          <Edit2 className="h-3 w-3" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteLabel(label.id)}
                          className="w-full px-3 py-1 text-left text-xs hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-red-500"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Mock data for historical information
const recentAlerts = [
  { id: 1, type: 'Left Safe Zone', time: '10 min ago', room: 'Balcony' },
  { id: 2, type: 'Unusual Activity', time: '1 hour ago', room: 'Kitchen' },
  { id: 3, type: 'Long Inactivity', time: '2 hours ago', room: 'Bedroom 1' },
];

const dailyStats = {
  activeTime: '8.5 hours',
  restTime: '6.2 hours',
  avgTemp: '22°C',
};

// Furniture categories
const furnitureCategories = [
  { id: 'seating', name: 'Seating', items: ['Sofa', 'Chair', 'Dining Chair'] },
  { id: 'tables', name: 'Tables', items: ['Coffee Table', 'Dining Table', 'Side Table'] },
  { id: 'storage', name: 'Storage', items: ['Cabinet', 'Shelf', 'Wardrobe'] },
  { id: 'beds', name: 'Beds', items: ['Single Bed', 'Double Bed', 'Bunk Bed'] },
];

export default function LocationPage() {
  const { position } = usePetgStore();
  const [showLabels, setShowLabels] = useState(true);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState('plan1');
  const [showFloorPlanSelector, setShowFloorPlanSelector] = useState(false);
  const [hotspots, setHotspots] = useState(initialHotspots);
  
  useEffect(() => {
    // Initialize mock data and get cleanup function
    const cleanup = initMockData();
    
    // Cleanup on unmount
    return () => cleanup();
  }, []); // Empty dependency array means this runs once on mount
  
  // Convert position coordinates to image space
  const getPositionInImage = () => {
    if (!position.valid) return { x: 0, y: 0 };
    
    // Convert the x,y coordinates to percentage positions on the image
    const x = (position.x / 10) * 100; // Convert to percentage (0-100%)
    const y = (position.y / 8) * 100;  // Convert to percentage (0-100%)
    
    return { x, y };
  };
  
  const imagePos = getPositionInImage();
  
  const handleLabelUpdate = (updatedLabels: RoomLabel[]) => {
    setHotspots(prevHotspots => {
      return prevHotspots.map(hotspot => {
        const matchingLabel = updatedLabels.find(label => label.id === hotspot.id);
        if (matchingLabel) {
          return { ...hotspot, room: matchingLabel.name };
        }
        return hotspot;
      }).filter(hotspot => updatedLabels.some(label => label.id === hotspot.id));
    });
  };
  
  return (
    <div className="container mx-auto p-3 h-screen">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold">Pet Location</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFloorPlanSelector(!showFloorPlanSelector)}
            className="inline-flex items-center px-2 py-1 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            <span className="text-xs bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded-full mr-1.5">Beta</span>
            Customize Layout
          </button>
        <button
          onClick={() => setShowLabels(!showLabels)}
            className="inline-flex items-center px-2 py-1 rounded-full bg-white dark:bg-gray-800 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
        >
          {showLabels ? (
            <>
              <EyeOff className="h-3.5 w-3.5 mr-1.5" />
              <span>Hide Labels</span>
            </>
          ) : (
            <>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              <span>Show Labels</span>
            </>
          )}
        </button>
      </div>
      </div>

      {showFloorPlanSelector && (
        <div className="mb-4 bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-semibold mb-2">Select Floor Plan</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {floorPlanTypes.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => setSelectedFloorPlan(plan.id)}
                  className={`relative aspect-video rounded-lg border-2 overflow-hidden ${
                    selectedFloorPlan === plan.id
                      ? 'border-purple-500'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Image
                    src={plan.image}
                    alt={plan.name}
                    fill
                    className="object-cover"
                  />
                  <div className={`absolute inset-0 flex items-center justify-center ${
                    selectedFloorPlan === plan.id
                      ? 'bg-purple-500/10'
                      : 'bg-gray-900/20 hover:bg-gray-900/30'
                  } transition-colors`}>
                    <span className="text-xs font-medium text-white drop-shadow-md">{plan.name}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-2">Furniture (Coming Soon)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {furnitureCategories.map((category) => (
                <div
                  key={category.id}
                  className="p-2 rounded-lg border border-gray-200 dark:border-gray-700 opacity-50"
                >
                  <p className="text-xs font-medium mb-1">{category.name}</p>
                  <p className="text-[10px] text-gray-500">{category.items.join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-2 h-[calc(100vh-5rem)]">
        {/* Map Section - Takes up 3 columns */}
        <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-xl p-2 shadow flex flex-col">
          <div className="mb-1">
            <StatusChip
              label="Position"
              value={position.valid ? `${position.x.toFixed(1)}m, ${position.y.toFixed(1)}m` : 'Unavailable'}
              variant={position.valid ? 'success' : 'warning'}
              icon={<PawPrint className="h-3.5 w-3.5" />}
            />
          </div>
          
          <div className="relative rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 flex-grow">
            <FloorPlanMap 
              showLabels={showLabels} 
              onLabelUpdate={handleLabelUpdate}
              selectedPlan={selectedFloorPlan}
            />
            
            {position.valid && (
              <div 
                className="absolute w-6 h-6 transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300 ease-in-out"
                style={{
                  left: `${imagePos.x}%`,
                  top: `${imagePos.y}%`,
                }}
              >
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-50"></div>
                  <div className="relative bg-blue-500 text-white rounded-full p-1">
                    <PawPrint className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )}
            
            {!position.valid && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
                <p className="text-sm text-gray-500 dark:text-gray-400">Waiting for position data...</p>
              </div>
            )}
          </div>

          {/* Daily Statistics - Below map with optimized spacing */}
          <div className="mt-1 bg-white dark:bg-gray-800 rounded-lg p-2">
            <h2 className="text-xs font-semibold mb-1.5 flex items-center">
              <Clock className="h-3.5 w-3.5 mr-1 text-blue-500" />
              Daily Statistics
            </h2>
            <div className="grid grid-cols-3 gap-1">
              <div className="text-center p-1 bg-gray-50 dark:bg-gray-700/50 rounded">
                <Clock className="h-3 w-3 mx-auto mb-0.5 text-blue-500" />
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Active Time</p>
                <p className="text-xs font-semibold">{dailyStats.activeTime}</p>
              </div>
              <div className="text-center p-1 bg-gray-50 dark:bg-gray-700/50 rounded">
                <PawPrint className="h-3 w-3 mx-auto mb-0.5 text-green-500" />
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Rest Time</p>
                <p className="text-xs font-semibold">{dailyStats.restTime}</p>
              </div>
              <div className="text-center p-1 bg-gray-50 dark:bg-gray-700/50 rounded">
                <Thermometer className="h-3 w-3 mx-auto mb-0.5 text-red-500" />
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Avg. Temp</p>
                <p className="text-xs font-semibold">{dailyStats.avgTemp}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side Information Panel - Adjusted spacing */}
        <div className="space-y-1">
          {/* Recent Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow">
            <h2 className="text-sm font-semibold mb-1.5 flex items-center">
              <Bell className="h-4 w-4 mr-1.5 text-orange-500" />
              Recent Alerts
            </h2>
            <div className="space-y-1">
              {recentAlerts.map(alert => (
                <div key={alert.id} className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
                  <div>
                    <p className="text-xs font-medium">{alert.type}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{alert.room}</p>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{alert.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Activity Hotspots */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow">
            <h2 className="text-sm font-semibold mb-1.5 flex items-center">
              <MapPin className="h-4 w-4 mr-1.5 text-red-500" />
              Activity Hotspots
            </h2>
            <div className="space-y-1">
              {hotspots.map(spot => (
                <div key={spot.id} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span>{spot.room}</span>
                    <span className="text-gray-500 dark:text-gray-400">{spot.duration}</span>
                  </div>
                  <div className="w-full h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${spot.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pet Status */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow">
            <h2 className="text-sm font-semibold mb-1.5 flex items-center">
              <PawPrint className="h-4 w-4 mr-1.5 text-purple-500" />
              Pet Status
            </h2>
            <div className="space-y-1">
              <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-green-500 mr-2"></div>
                  <span className="text-xs">Activity Level</span>
                </div>
                <span className="text-xs font-medium">Normal</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-blue-500 mr-2"></div>
                  <span className="text-xs">Last Meal</span>
                </div>
                <span className="text-xs font-medium">2 hours ago</span>
              </div>
              <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
                <div className="flex items-center">
                  <div className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></div>
                  <span className="text-xs">Sleep Quality</span>
                </div>
                <span className="text-xs font-medium">Good</span>
              </div>
            </div>
          </div>

          {/* Live Camera - Beta */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-sm font-semibold flex items-center">
                <Video className="h-4 w-4 mr-1.5 text-pink-500" />
                Live Camera
              </h2>
              <span className="px-1.5 py-0.5 text-[10px] font-medium bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 rounded-full">
                BETA
              </span>
            </div>
            <div className="relative aspect-video bg-gray-50 dark:bg-gray-700/50 rounded overflow-hidden">
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-3">
                <Camera className="h-8 w-8 text-gray-400 dark:text-gray-500 mb-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Live camera feed coming soon!
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  Monitor your pet in real-time
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 