'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Home, 
  ArrowRight, 
  ArrowLeft, 
  Check, 
  MapPin, 
  Ruler, 
  Grid,
  Zap,
  Settings,
  ChevronRight
} from 'lucide-react';
import { PageLayout } from '@/components/page-layout';
import { ZoneDrawer, type DrawnZone } from '@/components/zone-drawer';
import { FloorPlanSelector } from '@/components/floor-plan-selector';
import { FloorPlanCalibration } from '@/components/floor-plan-calibration';
import { useCollarIntegration } from '@/lib/collar-integration';
import { usePetgStore } from '@/lib/store';
import { cn } from '@/lib/utils';

// Setup steps configuration
const SETUP_STEPS = [
  { id: 'size', title: 'Apartment Size', icon: Ruler, description: 'Enter your home size for optimal setup' },
  { id: 'calibration', title: 'Floor Plan Calibration', icon: Grid, description: 'Upload and calibrate your floor plan' },
  { id: 'layout', title: 'Beacon Placement', icon: Zap, description: 'Position detected beacons on your floor plan' },
  { id: 'zones', title: 'Active Zones', icon: MapPin, description: 'Select areas to monitor' },
  { id: 'config', title: 'Configuration', icon: Settings, description: 'Configure beacon behaviors' },
] as const;

type SetupStep = typeof SETUP_STEPS[number]['id'];

// Apartment size presets
const SIZE_PRESETS = [
  { size: 30, label: 'Studio (30m²)', template: 'home4', beacons: 2 },
  { size: 50, label: 'Small Apartment (50m²)', template: 'home2', beacons: 3 },
  { size: 80, label: 'Medium Apartment (80m²)', template: 'home', beacons: 4 },
  { size: 120, label: 'Large Apartment (120m²)', template: 'home3', beacons: 6 },
  { size: 200, label: 'House (200m²+)', template: 'home3', beacons: 8 },
];

// Floor plan options
const FLOOR_PLANS = [
  { id: 'home4', name: 'Studio Layout', image: '/images/floorplan-3d-4.png', size: '20-40m²' },
  { id: 'home2', name: 'Apartment Layout', image: '/images/floorplan-3d-2.png', size: '40-70m²' },
  { id: 'home', name: 'Modern Home', image: '/images/floorplan-3d.png', size: '70-120m²' },
  { id: 'home3', name: 'Large House', image: '/images/floorplan-3d-3.png', size: '120m²+' },
];



interface SetupState {
  apartmentSize: number;
  customSize: string;
  selectedTemplate: string;
  // Calibration data
  floorPlanImage?: string; // Base64 or URL of uploaded image
  calibrationData?: {
    anchorPoint: { x: number; y: number }; // Anchor point in percentage coordinates
    realWorldSize: { width: number; height: number }; // Real dimensions in meters
    imageSize: { width: number; height: number }; // Image dimensions in pixels
    pixelsPerMeter: number; // Scale factor
  };
  activeZones: string[]; // Keep for backward compatibility
  drawnZones: DrawnZone[]; // New freeform zones
  beaconPlacements: Array<{
    id: string;
    name: string;
    displayName: string; // User-friendly name (e.g., "Sofa", "Trash Bin")
    position: { x: number; y: number };
    realBeacon: { // Required - no optional beacons
      name: string;
      address: string;
      rssi: number;
      distance: number;
      last_seen: number;
      location: string;
      beaconId: string;
    };
    behavior: {
      triggerRadius: number;
      alertDelay: number;
      alertType: 'vibration' | 'sound' | 'both';
    };
    locked?: boolean; // For locking after setup completion
  }>;
}

export default function LocationSetupPage() {
  const router = useRouter();
  const { connection, uploadZones, connectToCollar, zoneStatus } = useCollarIntegration();
  
  // Get real-time beacon data from collar
  const isCollarConnected = usePetgStore((state) => state.isCollarConnected);
  const rawCollarData = usePetgStore((state) => state.lastCollarData);
  const connectionStatus = usePetgStore((state) => state.connectionStatus);
  
  const [currentStep, setCurrentStep] = useState<SetupStep>('size');
  const [isCompleting, setIsCompleting] = useState(false);
  const [setupState, setSetupState] = useState<SetupState>({
    apartmentSize: 0,
    customSize: '',
    selectedTemplate: '',
    floorPlanImage: undefined,
    calibrationData: undefined,
    activeZones: [],
    drawnZones: [],
    beaconPlacements: [],
  });

  // Get current step index
  const currentStepIndex = SETUP_STEPS.findIndex(step => step.id === currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === SETUP_STEPS.length - 1;

  // Load existing setup data on mount
  useEffect(() => {
    const savedSetup = localStorage.getItem('petg-location-setup');
    if (savedSetup) {
      try {
        const parsed = JSON.parse(savedSetup);
        setSetupState(prev => ({ ...prev, ...parsed }));
        console.log('📋 Loaded existing setup configuration');
      } catch (error) {
        console.warn('⚠️ Failed to load saved setup:', error);
      }
    }
  }, []);

  // Sync real beacon data from collar with setup state
  useEffect(() => {
    if (!isCollarConnected || !rawCollarData || !rawCollarData.beacons) {
      return;
    }

    // Extract real beacons from collar data
    const realBeacons = Array.isArray(rawCollarData.beacons) 
      ? rawCollarData.beacons 
      : Object.values(rawCollarData.beacons || {});

    // Filter only PetZone beacons
    const petZoneBeacons = realBeacons.filter((beacon: any) => 
      beacon && 
      beacon.name && 
      beacon.name.startsWith('PetZone-Home-') &&
      beacon.address
    );

    if (petZoneBeacons.length === 0) {
      console.log('📡 No PetZone beacons detected yet');
      return;
    }

    console.log(`🔍 Found ${petZoneBeacons.length} real PetZone beacons:`, petZoneBeacons);

    // Update beacon placements with only real beacons
    setSetupState(prev => {
      const updatedPlacements = [...prev.beaconPlacements];
      let hasChanges = false;

      petZoneBeacons.forEach((realBeacon: any, index: number) => {
        const existingPlacement = updatedPlacements.find(p => 
          p.realBeacon?.address === realBeacon.address
        );

        if (!existingPlacement) {
          // Add new real beacon
          const newPlacement = {
            id: `real-beacon-${realBeacon.address}`,
            name: realBeacon.name,
            displayName: `Beacon ${realBeacon.name.split('-').pop()}`,
            position: { 
              x: 20 + (index * 15) % 60,
              y: 20 + (index * 10) % 60 
            },
            realBeacon: {
              name: realBeacon.name,
              address: realBeacon.address,
              rssi: realBeacon.rssi || -50,
              distance: realBeacon.distance || 0,
              last_seen: realBeacon.last_seen || Date.now(),
              location: realBeacon.location || 'Unknown',
              beaconId: realBeacon.beaconId || realBeacon.address
            },
            behavior: {
              triggerRadius: 5,
              alertDelay: 3,
              alertType: 'both' as const
            }
          };

          updatedPlacements.push(newPlacement);
          hasChanges = true;
          console.log(`➕ Added real beacon: ${realBeacon.name}`);
        } else {
          // Update existing beacon with fresh data
          existingPlacement.realBeacon = {
            ...existingPlacement.realBeacon,
            rssi: realBeacon.rssi || existingPlacement.realBeacon.rssi,
            distance: realBeacon.distance || existingPlacement.realBeacon.distance,
            last_seen: realBeacon.last_seen || existingPlacement.realBeacon.last_seen
          };
        }
      });

      // Remove beacons that are no longer detected (but keep manually positioned ones)
      const activeAddresses = petZoneBeacons.map((b: any) => b.address);
      const filteredPlacements = updatedPlacements.filter(placement => {
        if (!placement.realBeacon) return true; // Keep manual beacons
        const isStillActive = activeAddresses.includes(placement.realBeacon.address);
        if (!isStillActive) {
          console.log(`🗑️ Removing disconnected beacon: ${placement.name}`);
        }
        return isStillActive;
      });

      return hasChanges || filteredPlacements.length !== updatedPlacements.length
        ? { ...prev, beaconPlacements: filteredPlacements }
        : prev;
    });
  }, [isCollarConnected, rawCollarData]);

  // Handle apartment size selection
  const handleSizeSelect = (size: number, template: string) => {
    setSetupState(prev => ({
      ...prev,
      apartmentSize: size,
      selectedTemplate: template,
      customSize: '',
    }));
  };

  // Handle custom size input
  const handleCustomSizeChange = (value: string) => {
    const numValue = parseInt(value) || 0;
    setSetupState(prev => ({
      ...prev,
      customSize: value,
      apartmentSize: numValue,
      selectedTemplate: getSuggestedTemplate(numValue),
    }));
  };

  // Get suggested template based on size
  const getSuggestedTemplate = (size: number): string => {
    if (size <= 40) return 'home4';
    if (size <= 70) return 'home2';
    if (size <= 120) return 'home';
    return 'home3';
  };

  // Handle floor plan image upload
  const handleFloorPlanUpload = (imageData: string) => {
    setSetupState(prev => ({
      ...prev,
      floorPlanImage: imageData,
      calibrationData: undefined // Reset calibration when new image is uploaded
    }));
  };

  // Handle calibration data change
  const handleCalibrationChange = (calibrationData: any) => {
    setSetupState(prev => ({
      ...prev,
      calibrationData
    }));
  };

  // Handle beacon behavior change
  const handleBeaconBehaviorChange = (beaconId: string, field: keyof SetupState['beaconPlacements'][0]['behavior'], value: any) => {
    setSetupState(prev => ({
      ...prev,
      beaconPlacements: prev.beaconPlacements.map(beacon =>
        beacon.id === beaconId 
          ? { ...beacon, behavior: { ...beacon.behavior, [field]: value } }
          : beacon
      )
    }));
  };

  // Apply default behavior to all beacons
  const handleApplyDefaultBehavior = () => {
    const defaultBehavior = {
      triggerRadius: 5,
      alertDelay: 3,
      alertType: 'both' as const
    };
    
    setSetupState(prev => ({
      ...prev,
      beaconPlacements: prev.beaconPlacements.map(beacon => ({
        ...beacon,
        behavior: defaultBehavior
      }))
    }));
  };

  // Navigation handlers
  const handleNext = () => {
    if (!isLastStep) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStep(SETUP_STEPS[nextIndex].id);
    } else {
      // Complete setup
      handleCompleteSetup();
    }
  };

  const handlePrevious = () => {
    if (!isFirstStep) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStep(SETUP_STEPS[prevIndex].id);
    }
  };

  const handleCompleteSetup = async () => {
    setIsCompleting(true);
    
    try {
      console.log('🏁 Starting setup completion process...');
      
      // Save setup configuration automatically
      localStorage.setItem('petg-location-setup', JSON.stringify(setupState));
      console.log('💾 Setup configuration saved locally');
      
      // Upload zones to collar if connected (without disconnecting)
      if (isCollarConnected && setupState.drawnZones.length > 0) {
        console.log('📤 Uploading zones to collar...');
        const success = await uploadZones(setupState.drawnZones);
        if (success) {
          console.log('✅ Zones uploaded successfully to collar');
        } else {
          console.warn('⚠️ Failed to upload zones to collar, but setup saved locally');
        }
      }
      
      // Mark setup as complete in beacon placements
      const completedBeacons = setupState.beaconPlacements.map(beacon => ({
        ...beacon,
        locked: true
      }));
      
      // Save completed state with auto-save flag
      const completedSetup = {
        ...setupState,
        beaconPlacements: completedBeacons,
        setupCompleted: true,
        completedAt: new Date().toISOString(),
        autoSaved: true
      };
      
      localStorage.setItem('petg-location-setup', JSON.stringify(completedSetup));
      console.log('🔒 Beacon positions locked and setup marked complete');
      console.log('💾 Auto-save completed - all data preserved');
      
      // Small delay to show saving feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate directly to position page (location page) to show live tracking
      console.log('🧭 Navigating to position page...');
      router.push('/location');
    } catch (error) {
      console.error('❌ Error completing setup:', error);
      // Still redirect even if collar upload fails - ensure user reaches position page
      router.push('/location');
    } finally {
      setIsCompleting(false);
    }
  };

  // Handle drawn zones change
  const handleDrawnZonesChange = (zones: DrawnZone[]) => {
    setSetupState(prev => ({
      ...prev,
      drawnZones: zones
    }));
  };

  // Handle beacon placements change
  const handleBeaconPlacementsChange = (beacons: any[]) => {
    setSetupState(prev => ({
      ...prev,
      beaconPlacements: beacons
    }));
  };

  // Check if current step is valid
  const isCurrentStepValid = (): boolean => {
    switch (currentStep) {
      case 'size':
        return setupState.apartmentSize > 0 && setupState.selectedTemplate !== '';
      case 'calibration':
        return !!setupState.floorPlanImage && !!setupState.calibrationData;
      case 'layout':
        return setupState.beaconPlacements.length > 0; // Require at least one real beacon
      case 'zones':
        return true; // Zones are optional
      case 'config':
        return setupState.beaconPlacements.every(beacon => 
          beacon.behavior && 
          beacon.behavior.triggerRadius > 0 && 
          beacon.behavior.alertDelay >= 0
        );
      default:
        return false;
    }
  };

  // Get step validation message
  const getStepValidationMessage = (): string => {
    switch (currentStep) {
      case 'size':
        if (setupState.apartmentSize === 0) return 'Please select or enter your apartment size';
        if (setupState.selectedTemplate === '') return 'Please select a floor plan template';
        return '';
      case 'calibration':
        if (!setupState.floorPlanImage) return 'Please upload your floor plan image';
        if (!setupState.calibrationData) return 'Please set the anchor point to calibrate your floor plan';
        return '';
      case 'layout':
        if (setupState.beaconPlacements.length === 0) return 'Please place at least one real beacon detected by your collar';
        return '';
      case 'zones':
        return ''; // Zones are optional
      case 'config':
        const invalidBeacons = setupState.beaconPlacements.filter(beacon => 
          !beacon.behavior || beacon.behavior.triggerRadius <= 0 || beacon.behavior.alertDelay < 0
        );
        if (invalidBeacons.length > 0) return 'Please configure all beacon behaviors';
        return '';
      default:
        return '';
    }
  };

  return (
    <PageLayout background="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="inline-flex items-center gap-2 bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-sm border border-gray-200 dark:border-gray-700">
              <Home className="h-5 w-5 text-purple-500" />
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">Location Tracking Setup</span>
            </div>
            
            {/* Collar Connection Status */}
            <div className={cn(
              "inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium",
              isCollarConnected 
                ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
            )}>
              <div className={cn(
                "w-2 h-2 rounded-full",
                isCollarConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              )} />
              {isCollarConnected ? `Collar Connected${connection.ipAddress ? ` (${connection.ipAddress})` : ''}` : 'Collar Offline'}
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Set Up Indoor Tracking
          </h1>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Configure your home layout and beacon placement for accurate pet tracking throughout your space.
          </p>
        </div>

        {/* Progress Steps */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-200 dark:border-gray-700 mb-8">
          <div className="flex items-center justify-between">
            {SETUP_STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = step.id === currentStep;
              const isCompleted = index < currentStepIndex;
              const isAccessible = index <= currentStepIndex;

              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => isAccessible && setCurrentStep(step.id)}
                      disabled={!isAccessible}
                      className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-200",
                        isActive && "bg-purple-600 text-white shadow-lg scale-110",
                        isCompleted && !isActive && "bg-green-500 text-white",
                        !isActive && !isCompleted && isAccessible && "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600",
                        !isAccessible && "bg-gray-50 dark:bg-gray-800 text-gray-300 dark:text-gray-600 cursor-not-allowed"
                      )}
                    >
                      {isCompleted && !isActive ? (
                        <Check className="h-5 w-5" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </button>
                    <div className="mt-2 text-center">
                      <div className={cn(
                        "text-sm font-medium",
                        isActive && "text-purple-600 dark:text-purple-400",
                        isCompleted && !isActive && "text-green-600 dark:text-green-400",
                        !isActive && !isCompleted && "text-gray-500 dark:text-gray-400"
                      )}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 max-w-20">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  {index < SETUP_STEPS.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-gray-300 dark:text-gray-600 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 min-h-[500px]">
          {/* Step 1: Apartment Size */}
          {currentStep === 'size' && (
            <div className="p-8">
              <div className="text-center mb-8">
                <Ruler className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  What's your apartment size?
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  This helps us suggest the optimal floor plan and number of beacons needed.
                </p>
              </div>

              {/* Size Presets */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {SIZE_PRESETS.map((preset) => (
                  <button
                    key={preset.size}
                    onClick={() => handleSizeSelect(preset.size, preset.template)}
                    className={cn(
                      "p-6 rounded-xl border-2 transition-all duration-200 text-left",
                      setupState.apartmentSize === preset.size && !setupState.customSize
                        ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
                        : "border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600"
                    )}
                  >
                    <div className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                      {preset.label}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Recommended: {preset.beacons} beacons
                    </div>
                    <div className="text-xs text-purple-600 dark:text-purple-400">
                      {preset.template === 'home4' && 'Studio Layout'}
                      {preset.template === 'home2' && 'Apartment Layout'}
                      {preset.template === 'home' && 'Modern Home Layout'}
                      {preset.template === 'home3' && 'Large House Layout'}
                    </div>
                  </button>
                ))}
              </div>

              {/* Custom Size Input */}
              <div className="max-w-md mx-auto">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Or enter custom size:
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={setupState.customSize}
                    onChange={(e) => handleCustomSizeChange(e.target.value)}
                    placeholder="Enter size in m²"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-white"
                  />
                  <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400">m²</span>
                </div>
                {setupState.customSize && (
                  <div className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                    Suggested template: {FLOOR_PLANS.find(plan => plan.id === setupState.selectedTemplate)?.name}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Floor Plan Calibration */}
          {currentStep === 'calibration' && (
            <div className="p-8">
              <div className="text-center mb-8">
                <Grid className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Calibrate Your Floor Plan
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Upload your actual floor plan and set an anchor point to ensure accurate positioning and measurements.
                </p>
              </div>

              <FloorPlanCalibration
                apartmentSize={setupState.apartmentSize}
                floorPlanImage={setupState.floorPlanImage}
                calibrationData={setupState.calibrationData}
                onFloorPlanChange={handleFloorPlanUpload}
                onCalibrationChange={handleCalibrationChange}
              />
            </div>
          )}

          {/* Step 3: Beacon Placement */}
          {currentStep === 'layout' && (
            <div className="p-8">
              <div className="text-center mb-8">
                <Zap className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Position Your Beacons
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  The system will automatically detect beacons from your collar. Drag them to match where you physically placed them in your home.
                </p>
              </div>

              {/* Collar Connection Status */}
              <div className="mb-6">
                {!isCollarConnected ? (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-yellow-600"></div>
                      <div>
                        <h3 className="font-medium text-yellow-800 dark:text-yellow-200">
                          Connecting to Collar
                        </h3>
                        <p className="text-sm text-yellow-700 dark:text-yellow-300">
                          Status: {connectionStatus} - Please ensure your collar is powered on and connected to WiFi.
                        </p>
                      </div>
                    </div>
                  </div>
                ) : setupState.beaconPlacements.length === 0 ? (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="animate-pulse rounded-full h-5 w-5 bg-blue-600"></div>
                      <div>
                        <h3 className="font-medium text-blue-800 dark:text-blue-200">
                          Scanning for Beacons
                        </h3>
                        <p className="text-sm text-blue-700 dark:text-blue-300">
                          Collar connected! Waiting for PetZone beacons to be detected...
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 bg-green-600 rounded-full"></div>
                      <div>
                        <h3 className="font-medium text-green-800 dark:text-green-200">
                          {setupState.beaconPlacements.length} Beacon{setupState.beaconPlacements.length !== 1 ? 's' : ''} Detected
                        </h3>
                        <p className="text-sm text-green-700 dark:text-green-300">
                          Drag the beacons below to match their physical locations in your home.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Show FloorPlan only when beacons are detected */}
              {setupState.beaconPlacements.length > 0 ? (
                <FloorPlanSelector
                  beacons={setupState.beaconPlacements}
                  onBeaconsChange={handleBeaconPlacementsChange}
                  isSetupComplete={false}
                  customImage={setupState.floorPlanImage}
                  calibrationData={setupState.calibrationData}
                />
              ) : (
                <div className="text-center py-12">
                  <div className="animate-pulse text-gray-400 dark:text-gray-600">
                    <Zap className="h-16 w-16 mx-auto mb-4" />
                    <p className="text-lg font-medium">Waiting for beacons...</p>
                    <p className="text-sm mt-2">
                      Make sure your PetZone beacons are powered on and within range of the collar.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Active Zone Selection */}
          {currentStep === 'zones' && (
            <div className="p-8">
              <div className="text-center mb-8">
                <MapPin className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Define Active Zones
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Draw custom zones directly on your floor plan to define exactly where you want to monitor your pet.
                </p>
              </div>

              {/* Zone Drawing Interface */}
              <ZoneDrawer
                floorplanImage={setupState.floorPlanImage || "/floorplan.png"}
                zones={setupState.drawnZones}
                onZonesChange={handleDrawnZonesChange}
              />

              {/* Monitoring Features */}
              <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4">
                  Zone Monitoring Features
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <MapPin className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Precise Tracking
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Track your pet's exact position within your custom-defined zones with real-time updates.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Zap className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Zone-Based Alerts
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Receive notifications when your pet enters, exits, or spends time in specific zones.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Grid className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Irregular Shapes
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Create zones of any shape to perfectly match your home's unique layout and furniture.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Settings className="h-4 w-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                        Flexible Configuration
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Each zone can have different monitoring settings and alert behaviors.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Zone Summary */}
              {setupState.drawnZones.length > 0 && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <div className="flex items-center gap-2 mb-2">
                    <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="font-medium text-green-800 dark:text-green-200">
                      {setupState.drawnZones.length} custom zone{setupState.drawnZones.length !== 1 ? 's' : ''} defined
                    </span>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">
                    Zones: {setupState.drawnZones.map(zone => zone.name).join(', ')}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Configuration */}
          {currentStep === 'config' && (
            <div className="p-8">
              <div className="text-center mb-8">
                <Settings className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Configure Beacon Behaviors
                </h2>
                <p className="text-gray-600 dark:text-gray-400">
                  Fine-tune how each beacon responds when your pet approaches. You can customize individual beacons or apply defaults to all.
                </p>
              </div>

              {/* Default Behavior Section */}
              <div className="mb-8 bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                    Default Behavior Settings
                  </h3>
                  <button
                    onClick={handleApplyDefaultBehavior}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    Apply to All Beacons
                  </button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Trigger Radius
                    </label>
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">5cm</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Default distance</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Alert Delay
                    </label>
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">3s</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Before triggering</div>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                      Alert Type
                    </label>
                    <div className="bg-white dark:bg-gray-700 rounded-lg p-3">
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">Both</div>
                      <div className="text-xs text-blue-700 dark:text-blue-300">Vibration + Sound</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Individual Beacon Configuration */}
              {setupState.beaconPlacements.length > 0 ? (
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Individual Beacon Settings
                  </h3>
                  {setupState.beaconPlacements.map((beacon) => (
                    <div
                      key={beacon.id}
                      className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                          <Zap className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {beacon.displayName}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            Position: ({beacon.position.x.toFixed(0)}%, {beacon.position.y.toFixed(0)}%)
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Trigger Radius */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Trigger Radius (cm)
                          </label>
                          <div className="space-y-2">
                            <input
                              type="range"
                              min="1"
                              max="50"
                              value={beacon.behavior.triggerRadius}
                              onChange={(e) => handleBeaconBehaviorChange(beacon.id, 'triggerRadius', Number(e.target.value))}
                              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>1cm</span>
                              <span className="font-medium text-purple-600 dark:text-purple-400">
                                {beacon.behavior.triggerRadius}cm
                              </span>
                              <span>50cm</span>
                            </div>
                          </div>
                        </div>

                        {/* Alert Delay */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Alert Delay (seconds)
                          </label>
                          <div className="space-y-2">
                            <input
                              type="range"
                              min="0"
                              max="10"
                              value={beacon.behavior.alertDelay}
                              onChange={(e) => handleBeaconBehaviorChange(beacon.id, 'alertDelay', Number(e.target.value))}
                              className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                            />
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                              <span>0s</span>
                              <span className="font-medium text-purple-600 dark:text-purple-400">
                                {beacon.behavior.alertDelay}s
                              </span>
                              <span>10s</span>
                            </div>
                          </div>
                        </div>

                        {/* Alert Type */}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Alert Type
                          </label>
                          <div className="space-y-2">
                            {(['vibration', 'sound', 'both'] as const).map((type) => (
                              <button
                                key={type}
                                onClick={() => handleBeaconBehaviorChange(beacon.id, 'alertType', type)}
                                className={cn(
                                  "w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                                  beacon.behavior.alertType === type
                                    ? "bg-purple-600 text-white"
                                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                                )}
                              >
                                {type === 'vibration' && 'Vibration Only'}
                                {type === 'sound' && 'Sound Only'}
                                {type === 'both' && 'Vibration + Sound'}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <Settings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="font-medium text-gray-600 dark:text-gray-300 mb-2">
                    No beacons to configure
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Go back to the previous step to add beacons first
                  </p>
                </div>
              )}

              {/* Setup Summary */}
              {setupState.beaconPlacements.length > 0 && (
                <div className="mt-8 bg-green-50 dark:bg-green-900/20 rounded-xl p-6 border border-green-200 dark:border-green-800">
                  <h3 className="text-lg font-semibold text-green-900 dark:text-green-100 mb-4">
                    Setup Summary
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200">Home Size</div>
                      <div className="text-green-700 dark:text-green-300">{setupState.apartmentSize}m²</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200">Floor Plan</div>
                      <div className="text-green-700 dark:text-green-300">
                        {FLOOR_PLANS.find(plan => plan.id === setupState.selectedTemplate)?.name}
                      </div>
                    </div>
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200">Custom Zones</div>
                      <div className="text-green-700 dark:text-green-300">{setupState.drawnZones.length} defined</div>
                    </div>
                    <div>
                      <div className="font-medium text-green-800 dark:text-green-200">Beacons</div>
                      <div className="text-green-700 dark:text-green-300">{setupState.beaconPlacements.length} configured</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Completion Status */}
        {isCompleting && (
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800 mt-8">
            <div className="flex items-center gap-3">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <div>
                <h3 className="font-medium text-blue-900 dark:text-blue-100">Completing Setup</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  Auto-saving configuration and preparing position tracking...
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between items-center mt-8">
          <button
            onClick={handlePrevious}
            disabled={isFirstStep}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
              isFirstStep
                ? "text-gray-400 dark:text-gray-600 cursor-not-allowed"
                : "text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-white dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700"
            )}
          >
            <ArrowLeft className="h-4 w-4" />
            Previous
          </button>

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Step {currentStepIndex + 1} of {SETUP_STEPS.length}
          </div>

          <button
            onClick={handleNext}
            disabled={!isCurrentStepValid() || isCompleting}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-200",
              isCurrentStepValid() && !isCompleting
                ? "bg-purple-600 text-white hover:bg-purple-700 shadow-lg"
                : "bg-gray-200 dark:bg-gray-700 text-gray-400 dark:text-gray-600 cursor-not-allowed"
            )}
          >
            {isCompleting ? (
              <>
                <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              <>
                {isLastStep ? 'Save & Start Tracking' : 'Next'}
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </PageLayout>
  );
} 