'use client';

import { useState, useEffect } from 'react';
import { 
  Edit, Save, X, Plus, Trash, Settings, AlertTriangle, 
  MapPin, Clock, Wifi, Battery, Shield, Volume2, 
  Vibrate, VolumeX, Target, Timer, Zap, Home, Play,
  Circle, CheckCircle, XCircle, AlertCircle, Radio,
  Info,
  Trash2,
  Eye,
  EyeOff,
  Search,
  Filter,
  Download,
  Upload,
  RotateCcw,
  ExternalLink
} from 'lucide-react';
import { ChevronDown, Square, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { BeaconSettingsDrawer } from '@/components/beacon-settings-drawer';

// Enhanced Beacon Configuration interface with Live Proximity Alerts
interface BeaconConfiguration {
  id: string;
  name: string;
  location: string;
  zone?: string;
  macAddress?: string;
  alertMode: 'none' | 'buzzer' | 'vibration' | 'both';
  
  // Enhanced proximity settings
  proximitySettings: {
    triggerDistance: number; // Distance in cm (e.g., 2, 5, 10, 20)
    alertDuration: number;   // Alert duration in milliseconds
    alertIntensity: number;  // Alert intensity 1-5
    enableProximityDelay: boolean;
    proximityDelayTime: number; // Time in ms to stay within range before triggering
    cooldownPeriod: number;     // Minimum time between alerts in ms
  };
  
  // Legacy fields (for backward compatibility)
  proximityThreshold: number;
  alertDelay: number;
  alertTimeout: number;
  
  safeZone: boolean;
  boundaryAlert: boolean;
  position: { x: number; y: number };
  isAutoDetected?: boolean;
  lastSeen?: string;
  batteryLevel?: number;
  signalStrength?: number;
  status?: 'online' | 'offline' | 'low-battery';
  createdAt?: string;
  updatedAt?: string;
}

// Configuration Templates
interface BeaconTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  config: Partial<BeaconConfiguration>;
}

const BEACON_TEMPLATES: BeaconTemplate[] = [
  {
    id: 'kitchen',
    name: 'Kitchen Zone',
    description: 'Medium sensitivity for food areas',
    icon: Home,
    config: {
      alertMode: 'vibration',
      proximitySettings: {
        triggerDistance: 8,
        alertDuration: 1500,
        alertIntensity: 2,
        enableProximityDelay: true,
        proximityDelayTime: 2000,
        cooldownPeriod: 5000
      },
      safeZone: false,
      boundaryAlert: true
    }
  },
  {
    id: 'safe-zone',
    name: 'Safe Zone',
    description: 'Low sensitivity for allowed areas',
    icon: Shield,
    config: {
      alertMode: 'none',
      proximitySettings: {
        triggerDistance: 3,
        alertDuration: 1000,
        alertIntensity: 1,
        enableProximityDelay: true,
        proximityDelayTime: 5000,
        cooldownPeriod: 10000
      },
      safeZone: true,
      boundaryAlert: false
    }
  },
  {
    id: 'danger-zone',
    name: 'Danger Zone',
    description: 'High sensitivity for dangerous areas',
    icon: AlertTriangle,
    config: {
      alertMode: 'both',
      proximitySettings: {
        triggerDistance: 15,
        alertDuration: 3000,
        alertIntensity: 5,
        enableProximityDelay: false,
        proximityDelayTime: 0,
        cooldownPeriod: 2000
      },
      safeZone: false,
      boundaryAlert: true
    }
  },
  {
    id: 'garden',
    name: 'Garden Area',
    description: 'Outdoor monitoring with weather resistance',
    icon: Home,
    config: {
      alertMode: 'buzzer',
      proximitySettings: {
        triggerDistance: 12,
        alertDuration: 2500,
        alertIntensity: 4,
        enableProximityDelay: true,
        proximityDelayTime: 3000,
        cooldownPeriod: 4000
      },
      safeZone: true,
      boundaryAlert: false
    }
  }
];

interface BeaconConfigurationPanelProps {
  realBeacons: any[];
  isConnected: boolean;
  onConfigurationUpdate?: (configurations: BeaconConfiguration[]) => void;
}

export function BeaconConfigurationPanel({ 
  realBeacons, 
  isConnected, 
  onConfigurationUpdate 
}: BeaconConfigurationPanelProps) {
  // State management
  const [configurations, setConfigurations] = useState<BeaconConfiguration[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [testingAlert, setTestingAlert] = useState<string | null>(null);
  
  // NEW: Priority 2 features
  const [selectedBeacons, setSelectedBeacons] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    alertMode: 'all',
    location: 'all',
    zone: 'all'
  });
  const [showTemplates, setShowTemplates] = useState(false);
  const [showBatchOps, setShowBatchOps] = useState(false);
  
  // Beacon Settings Drawer state
  const [selectedBeaconForSettings, setSelectedBeaconForSettings] = useState<any>(null);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  
  // Form state for editing/adding
  const [formData, setFormData] = useState<Partial<BeaconConfiguration>>({
    name: '',
    location: '',
    zone: '',
    alertMode: 'buzzer',
    proximitySettings: {
      triggerDistance: 5,           // Default 5cm
      alertDuration: 2000,          // Default 2 seconds
      alertIntensity: 3,            // Medium intensity
      enableProximityDelay: false,  // Immediate alerts by default
      proximityDelayTime: 0,        // No delay
      cooldownPeriod: 3000          // 3 second cooldown
    },
    proximityThreshold: -65,
    alertDelay: 3000,
    alertTimeout: 10000,
    safeZone: false,
    boundaryAlert: false,
    position: { x: 50, y: 50 }
  });

  // Load configurations on mount
  useEffect(() => {
    loadConfigurations();
  }, []);

  // Sync with real beacons when collar data updates
  useEffect(() => {
    if (isConnected && realBeacons.length > 0) {
      syncWithRealBeacons();
    }
  }, [isConnected, realBeacons]);

  // NEW: Filter configurations based on current filters
  const filteredConfigurations = configurations.filter(config => {
    if (filters.status !== 'all' && config.status !== filters.status) return false;
    if (filters.alertMode !== 'all' && config.alertMode !== filters.alertMode) return false;
    if (filters.location !== 'all' && config.location !== filters.location) return false;
    if (filters.zone !== 'all' && config.zone !== filters.zone) return false;
    return true;
  });

  // NEW: Get unique filter values
  const getFilterOptions = () => {
    const locations = [...new Set(configurations.map(c => c.location).filter(Boolean))];
    const zones = [...new Set(configurations.map(c => c.zone).filter(Boolean))];
    const alertModes = [...new Set(configurations.map(c => c.alertMode))];
    const statuses = [...new Set(configurations.map(c => c.status).filter(Boolean))];
    
    return { locations, zones, alertModes, statuses };
  };

  // NEW: Batch operations
  const applyTemplateToSelected = async (template: BeaconTemplate) => {
    try {
      setIsSaving(true);
      const updates = [];
      
      for (const configId of selectedBeacons) {
        const config = configurations.find(c => c.id === configId);
        if (config) {
          const updatedConfig = {
            ...config,
            ...template.config,
            updatedAt: new Date().toISOString()
          };
          updates.push(saveConfiguration(updatedConfig));
        }
      }
      
      await Promise.all(updates);
      setSelectedBeacons([]);
      console.log(`✅ Applied ${template.name} template to ${updates.length} beacons`);
    } catch (error) {
      console.error('❌ Failed to apply template to selected beacons:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const batchUpdateAlertMode = async (alertMode: 'none' | 'buzzer' | 'vibration' | 'both') => {
    try {
      setIsSaving(true);
      const updates = [];
      
      for (const configId of selectedBeacons) {
        const config = configurations.find(c => c.id === configId);
        if (config) {
          const updatedConfig = {
            ...config,
            alertMode,
            updatedAt: new Date().toISOString()
          };
          updates.push(saveConfiguration(updatedConfig));
        }
      }
      
      await Promise.all(updates);
      setSelectedBeacons([]);
      console.log(`✅ Updated alert mode for ${updates.length} beacons`);
    } catch (error) {
      console.error('❌ Failed to batch update alert mode:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const batchDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${selectedBeacons.length} selected beacons?`)) {
      return;
    }
    
    try {
      setIsSaving(true);
      const deletions = [];
      
      for (const configId of selectedBeacons) {
        deletions.push(deleteConfiguration(configId));
      }
      
      await Promise.all(deletions);
      setSelectedBeacons([]);
      console.log(`✅ Deleted ${deletions.length} beacons`);
    } catch (error) {
      console.error('❌ Failed to batch delete beacons:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // NEW: Export/Import functionality  
  const exportConfigurations = () => {
    const exportData = {
      version: '1.0',
      timestamp: new Date().toISOString(),
      configurations: configurations
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `beacon-configurations-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Toggle beacon selection
  const toggleBeaconSelection = (beaconId: string) => {
    const newSelection = new Set(selectedBeacons);
    if (newSelection.has(beaconId)) {
      newSelection.delete(beaconId);
    } else {
      newSelection.add(beaconId);
    }
    setSelectedBeacons(Array.from(newSelection));
  };

  const selectAllFiltered = () => {
    const allFilteredIds = new Set(filteredConfigurations.map(c => c.id));
    setSelectedBeacons(Array.from(allFilteredIds));
  };

  const clearSelection = () => {
    setSelectedBeacons([]);
  };

  // Load configurations from API
  const loadConfigurations = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/beacons');
      const data = await response.json();
      
      if (data.success) {
        setConfigurations(data.data);
        onConfigurationUpdate?.(data.data);
        setLastSync(new Date());
      } else {
        console.error('Failed to load beacon configurations:', data.error);
      }
    } catch (error) {
      console.error('Error loading beacon configurations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Test alert function using MQTT
  const testAlert = async (beaconId: string, alertMode: string) => {
    if (!isConnected) {
      alert('Collar not connected. Please connect your collar to test alerts.');
      return;
    }

    try {
      setTestingAlert(beaconId);
      
      // Find the beacon configuration to get transmitter settings
      const beaconConfig = configurations.find(config => config.id === beaconId);
      const safeAlertMode = alertMode && typeof alertMode === 'string' ? alertMode.toLowerCase() : 'buzzer';
      
      if (safeAlertMode === 'none') {
        alert('❌ Cannot test "None" alert mode\nPlease select Buzzer, Vibration, or Both first.');
        setTestingAlert(null);
        return;
      }

      // Use MQTT to send test alert with transmitter settings
      const { getMQTTClient } = await import('@/lib/mqtt-client');
      const mqttClient = getMQTTClient();
      
      const payload = {
        cmd: 'test-alert',
        alertMode: safeAlertMode,
        durationMs: beaconConfig?.proximitySettings?.alertDuration || 1200,
        intensity: Math.min(beaconConfig?.proximitySettings?.alertIntensity || 150, 200) // Cap at 200 for safety
      };
      
      console.log(`📡 Publishing test command to pet-collar/001/command:`, payload);
      
      const success = await mqttClient.publish('pet-collar/001/command', JSON.stringify(payload));
      
      if (success) {
        console.log(`✅ Test alert sent successfully for beacon ${beaconId} (${alertMode})`);
        const { toast } = await import('sonner');
        toast.success('Test Alert Sent', {
          description: `${safeAlertMode.charAt(0).toUpperCase() + safeAlertMode.slice(1)} test sent to collar`
        });
        setTimeout(() => setTestingAlert(null), 3000);
      } else {
        throw new Error('Failed to publish MQTT message');
      }
      
    } catch (error) {
      console.error('Failed to send test alert:', error);
      const { toast } = await import('sonner');
      toast.error('Failed to Send Test Alert', {
        description: 'Please check collar connection and try again'
      });
      setTestingAlert(null);
    }
  };

  // 🚀 COLLAR PROXIMITY SYNCHRONIZATION SYSTEM
  // Send individual beacon configuration to collar via MQTT
  const syncConfigurationToCollar = async (config: BeaconConfiguration, collarId: string = '001'): Promise<boolean> => {
    if (!isConnected) {
      console.warn('⚠️ Cannot sync to collar: Not connected');
      return false;
    }

    try {
      const { getMQTTClient } = await import('@/lib/mqtt-client');
      const mqttClient = getMQTTClient();
      
      const topic = `pet-collar/${collarId}/beacon-config`;
      const payload = {
        cmd: 'configure_beacon',
        device_id: collarId,
        beacon: {
          id: config.id,
          name: config.name,
          macAddress: config.macAddress,
          alertMode: config.alertMode,
          
          // ✨ EXACT TRANSMITTER SETTINGS - The collar will implement these precisely
          triggerDistance: config.proximitySettings.triggerDistance,     // Distance in cm (e.g., 10cm)
          alertDuration: config.proximitySettings.alertDuration,         // Duration in ms (e.g., 2000ms = 2 seconds)
          alertIntensity: config.proximitySettings.alertIntensity,       // Intensity 1-5
          enableProximityDelay: config.proximitySettings.enableProximityDelay,
          proximityDelayTime: config.proximitySettings.proximityDelayTime, // Delay in ms (e.g., 2000ms)
          cooldownPeriod: config.proximitySettings.cooldownPeriod,       // Cooldown in ms
          
          // Zone settings
          safeZone: config.safeZone,
          boundaryAlert: config.boundaryAlert
        }
      };

      console.log(`📡 Syncing beacon config to collar via MQTT (${topic}):`, payload);
      
      const success = await mqttClient.publish(topic, JSON.stringify(payload));
      
      if (success) {
        console.log(`✅ Successfully synced beacon "${config.name}" to collar`);
        const { toast } = await import('sonner');
        toast.success('Configuration Synced', {
          description: `"${config.name}" settings sent to collar`
        });
        return true;
      } else {
        throw new Error('Failed to publish MQTT message');
      }
      
    } catch (error) {
      console.error('Failed to sync beacon configuration to collar:', error);
      const { toast } = await import('sonner');
      toast.error('Sync Failed', {
        description: 'Could not send configuration to collar'
      });
      return false;
    }
  };

  // Send all beacon configurations to collar via MQTT
  const syncAllConfigurationsToCollar = async (collarId: string = '001'): Promise<number> => {
    if (!isConnected) {
      console.warn('⚠️ Cannot sync to collar: Not connected');
      return 0;
    }

    if (configurations.length === 0) {
      console.log('📝 No beacon configurations to sync');
      return 0;
    }

    try {
      const { getMQTTClient } = await import('@/lib/mqtt-client');
      const mqttClient = getMQTTClient();
      
      const topic = `pet-collar/${collarId}/beacon-config-batch`;
      const payload = {
        cmd: 'configure_beacons_batch',
        device_id: collarId,
        beacons: configurations.map(config => ({
          id: config.id,
          name: config.name,
          macAddress: config.macAddress,
          alertMode: config.alertMode,
          
          // ✨ EXACT TRANSMITTER SETTINGS FOR EACH BEACON
          triggerDistance: config.proximitySettings.triggerDistance,
          alertDuration: config.proximitySettings.alertDuration,
          alertIntensity: config.proximitySettings.alertIntensity,
          enableProximityDelay: config.proximitySettings.enableProximityDelay,
          proximityDelayTime: config.proximitySettings.proximityDelayTime,
          cooldownPeriod: config.proximitySettings.cooldownPeriod,
          safeZone: config.safeZone,
          boundaryAlert: config.boundaryAlert
        }))
      };

      console.log(`📡 Syncing ${configurations.length} beacon configurations to collar:`, payload);
      
      const success = await mqttClient.publish(topic, JSON.stringify(payload));
      
      if (success) {
        console.log(`✅ Successfully synced ${configurations.length} beacon configurations to collar`);
        const { toast } = await import('sonner');
        toast.success('All Configurations Synced', {
          description: `${configurations.length} beacon settings sent to collar`
        });
        return configurations.length;
      } else {
        throw new Error('Failed to publish MQTT message');
      }
      
    } catch (error) {
      console.error('Failed to sync all beacon configurations to collar:', error);
      const { toast } = await import('sonner');
      toast.error('Batch Sync Failed', {
        description: 'Could not send configurations to collar'
      });
      return 0;
    }
  };

  // Get real-time status for a beacon
  const getRealtimeStatus = (config: BeaconConfiguration) => {
    if (!isConnected) {
      return {
        status: 'disconnected' as const,
        message: 'Collar disconnected',
        icon: XCircle,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100 dark:bg-gray-800'
      };
    }

    // Find matching real beacon
    const realBeacon = realBeacons.find(beacon => 
      beacon.name === config.name || 
      (beacon.address && config.macAddress === beacon.address)
    );

    if (realBeacon) {
      const now = Date.now();
      const lastSeen = realBeacon.last_seen || 0;
      const timeSinceLastSeen = now - lastSeen;
      const secondsAgo = Math.floor(timeSinceLastSeen / 1000);

      if (timeSinceLastSeen < 10000) { // Less than 10 seconds
        return {
          status: 'active' as const,
          message: 'Active now',
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50 dark:bg-green-900/20'
        };
      } else if (timeSinceLastSeen < 30000) { // Less than 30 seconds
        return {
          status: 'recent' as const,
          message: `Last seen ${secondsAgo}s ago`,
          icon: Circle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50 dark:bg-yellow-900/20'
        };
      }
    }

    return {
      status: 'not_detected' as const,
      message: 'Not detected',
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-50 dark:bg-red-900/20'
    };
  };

  // Sync configurations with real beacon data
  const syncWithRealBeacons = async () => {
    const updatedConfigurations = [...configurations];
    let hasChanges = false;

    for (const realBeacon of realBeacons) {
      // 🔄 ENHANCED: Accept ALL detected beacons, not just "PetZone-Home-" pattern
      // Remove restrictive filtering to enable "ghost mode" for any detected beacon
      if (!realBeacon.name && !realBeacon.address) {
        console.log('⚠️ Skipping beacon with no name or address:', realBeacon);
        continue; // Only skip if we have absolutely no identifier
      }

      // Generate a meaningful identifier and name for the beacon
      const beaconId = realBeacon.address || realBeacon.name || `unknown-${Date.now()}`;
      const beaconName = realBeacon.name || 
                        (realBeacon.address ? `Beacon-${realBeacon.address.slice(-4)}` : '') ||
                        `Unknown-${beaconId.slice(-4)}`;

      const existingConfig = updatedConfigurations.find(
        config => config.name === beaconName || 
        config.id === beaconId ||
        (config.macAddress && config.macAddress === realBeacon.address) ||
        (realBeacon.name && config.name === realBeacon.name)
      );

      if (existingConfig) {
        // Update existing configuration with real data
        existingConfig.batteryLevel = realBeacon.battery_level || existingConfig.batteryLevel;
        existingConfig.signalStrength = rssiToSignalStrength(realBeacon.rssi);
        existingConfig.status = getBeaconStatus(realBeacon.rssi, realBeacon.last_seen);
        existingConfig.lastSeen = new Date().toISOString();
        existingConfig.macAddress = realBeacon.address || existingConfig.macAddress;
        hasChanges = true;
        console.log(`🔄 Updated existing beacon: ${existingConfig.name}`);
      } else {
        // 🆕 ENHANCED: Create new auto-detected configuration in "ghost mode"
        const newConfig: BeaconConfiguration = {
          id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: beaconName,
          location: extractLocationFromName(beaconName) || 'Auto-detected',
          zone: extractZoneFromName(beaconName) || 'Unassigned',
          macAddress: realBeacon.address,
          
          // 👻 GHOST MODE: Default configuration with minimal alerts until user configures
          alertMode: realBeacon.name?.startsWith('PetZone-Home-') ? 'buzzer' : 'none', // Only alert for known patterns initially
          proximitySettings: {
            triggerDistance: 5,           // Conservative 5cm trigger distance
            alertDuration: 1000,          // Short 1 second alert duration
            alertIntensity: 1,            // Low intensity for unknown beacons
            enableProximityDelay: true,   // Enable delay to prevent false positives
            proximityDelayTime: 3000,     // 3 second delay for unknown beacons
            cooldownPeriod: 10000         // Long 10 second cooldown for ghost mode
          },
          proximityThreshold: -65,
          alertDelay: 3000,
          alertTimeout: 5000,
          
          // Default zone settings - conservative for unknown beacons
          safeZone: false,
          boundaryAlert: false,
          
          // Default positioning
          position: { x: 50, y: 50 },
          
          // Metadata from real beacon - marked as auto-detected
          isAutoDetected: true,
          lastSeen: new Date().toISOString(),
          batteryLevel: realBeacon.battery_level || 100,
          signalStrength: rssiToSignalStrength(realBeacon.rssi),
          status: getBeaconStatus(realBeacon.rssi, realBeacon.last_seen),
          
          // Timestamps
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        try {
          // Save to backend
          const response = await fetch('/api/beacons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newConfig)
          });

          if (response.ok) {
            updatedConfigurations.push(newConfig);
            hasChanges = true;
            console.log(`✅ Auto-detected beacon added (Ghost Mode): ${newConfig.name} | Address: ${newConfig.macAddress || 'N/A'}`);
            
            // 🔔 Optional: Show notification for new beacon detection
            if (typeof window !== 'undefined' && window.navigator && 'serviceWorker' in window.navigator) {
              // Could add a subtle notification here for new beacon detection
            }
          } else {
            console.error('❌ Failed to save auto-detected beacon:', await response.text());
          }
        } catch (error) {
          console.error('❌ Failed to save auto-detected beacon:', error);
        }
      }
    }

    if (hasChanges) {
      setConfigurations(updatedConfigurations);
      onConfigurationUpdate?.(updatedConfigurations);
      console.log(`🔄 Beacon sync completed: ${updatedConfigurations.length} total beacons (${updatedConfigurations.filter(c => c.isAutoDetected).length} auto-detected)`);
    }
  };

  // Save configuration to backend
  const saveConfiguration = async (config: BeaconConfiguration, isNew: boolean = false) => {
    try {
      setIsSaving(true);
      
      const method = isNew ? 'POST' : 'PUT';
      const response = await fetch('/api/beacons', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      const data = await response.json();
      
      if (data.success) {
        // Update local state
        if (isNew) {
          setConfigurations(prev => [...prev, data.data]);
        } else {
          setConfigurations(prev => 
            prev.map(c => c.id === config.id ? data.data : c)
          );
        }
        
        onConfigurationUpdate?.(configurations);
        setLastSync(new Date());
        
        // 🚀 AUTOMATIC COLLAR SYNC - Send configuration to collar immediately
        let collarSynced = false;
        if (isConnected) {
          collarSynced = await syncConfigurationToCollar(data.data);
        }
        
        // Show appropriate success message
        if (data.collarUpdated || collarSynced) {
          console.log('✅ Configuration saved and synced to collar');
        } else {
          console.warn('⚠️ Configuration saved but not synced to collar');
        }
        
        return true;
      } else {
        console.error('Failed to save configuration:', data.error);
        return false;
      }
    } catch (error) {
      console.error('Error saving configuration:', error);
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Delete configuration
  const deleteConfiguration = async (id: string) => {
    try {
      const response = await fetch(`/api/beacons?id=${id}`, {
        method: 'DELETE'
      });

      const data = await response.json();
      
      if (data.success) {
        setConfigurations(prev => prev.filter(c => c.id !== id));
        onConfigurationUpdate?.(configurations.filter(c => c.id !== id));
        console.log('✅ Configuration deleted');
      } else {
        console.error('Failed to delete configuration:', data.error);
      }
    } catch (error) {
      console.error('Error deleting configuration:', error);
    }
  };

  // Handle edit mode
  const startEdit = (config: BeaconConfiguration) => {
    setEditingId(config.id);
    setFormData({ ...config });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      name: '',
      location: '',
      zone: '',
      alertMode: 'buzzer',
      proximitySettings: {
        triggerDistance: 5,           // Default 5cm
        alertDuration: 2000,          // Default 2 seconds
        alertIntensity: 3,            // Medium intensity
        enableProximityDelay: false,  // Immediate alerts by default
        proximityDelayTime: 0,        // No delay
        cooldownPeriod: 3000          // 3 second cooldown
      },
      proximityThreshold: -65,
      alertDelay: 3000,
      alertTimeout: 10000,
      safeZone: false,
      boundaryAlert: false,
      position: { x: 50, y: 50 }
    });
  };

  const saveEdit = async (): Promise<boolean> => {
    if (editingId && formData.name && formData.location) {
      const updatedConfig: BeaconConfiguration = {
        ...configurations.find(c => c.id === editingId)!,
        ...formData,
        updatedAt: new Date().toISOString()
      };

      const success = await saveConfiguration(updatedConfig);
      if (success) {
        setEditingId(null);
        cancelEdit();
        return true;
      }
    }
    return false;
  };

  // Handle add mode
  const startAdd = () => {
    setShowAddForm(true);
    setFormData({
      name: '',
      location: '',
      zone: '',
      alertMode: 'buzzer',
      proximitySettings: {
        triggerDistance: 5,           // Default 5cm
        alertDuration: 2000,          // Default 2 seconds
        alertIntensity: 3,            // Medium intensity
        enableProximityDelay: false,  // Immediate alerts by default
        proximityDelayTime: 0,        // No delay
        cooldownPeriod: 3000          // 3 second cooldown
      },
      proximityThreshold: -65,
      alertDelay: 3000,
      alertTimeout: 10000,
      safeZone: false,
      boundaryAlert: false,
      position: { x: 50, y: 50 }
    });
  };

  const saveAdd = async () => {
    if (formData.name && formData.location) {
      const newConfig: BeaconConfiguration = {
        id: `beacon-${Date.now()}`,
        name: formData.name,
        location: formData.location,
        zone: formData.zone || '',
        macAddress: '',
        
        alertMode: formData.alertMode || 'buzzer',
        proximitySettings: formData.proximitySettings || {
          triggerDistance: 5,           // Default 5cm
          alertDuration: 2000,          // Default 2 seconds
          alertIntensity: 3,            // Medium intensity
          enableProximityDelay: false,  // Immediate alerts by default
          proximityDelayTime: 0,        // No delay
          cooldownPeriod: 3000          // 3 second cooldown
        },
        proximityThreshold: formData.proximityThreshold || -65,
        alertDelay: formData.alertDelay || 3000,
        alertTimeout: formData.alertTimeout || 10000,
        
        safeZone: formData.safeZone || false,
        boundaryAlert: formData.boundaryAlert || false,
        
        position: formData.position || { x: 50, y: 50 },
        
        isAutoDetected: false,
        status: 'offline',
        
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const success = await saveConfiguration(newConfig, true);
      if (success) {
        setShowAddForm(false);
        cancelEdit();
      }
    }
  };

  // Helper functions
  const rssiToSignalStrength = (rssi: number): number => {
    return Math.max(0, Math.min(100, ((rssi + 100) / 70) * 100));
  };

  const getBeaconStatus = (rssi: number, lastSeen: number): 'online' | 'offline' | 'low-battery' => {
    const now = Date.now();
    const timeSinceLastSeen = now - lastSeen;
    
    if (timeSinceLastSeen > 30000) return 'offline';
    if (rssi < -85) return 'low-battery';
    return 'online';
  };

  const extractLocationFromName = (name: string): string => {
    // Extract location from PetZone-Home-Location format
    const parts = name.split('-');
    return parts.length >= 3 ? parts[2] : 'Unknown';
  };

  const extractZoneFromName = (name: string): string => {
    // Extract zone if present in PetZone-Home-Location-Zone format
    const parts = name.split('-');
    return parts.length >= 4 ? parts[3] : '';
  };

  const getAlertModeDisplay = (alertMode: string) => {
    switch (alertMode) {
      case 'none':
        return {
          icon: VolumeX,
          label: 'No Alert',
          color: 'text-gray-500',
          bgColor: 'bg-gray-100 dark:bg-gray-700'
        };
      case 'buzzer':
        return {
          icon: Volume2,
          label: 'Buzzer',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100 dark:bg-blue-900/30'
        };
      case 'vibration':
        return {
          icon: Vibrate,
          label: 'Vibration',
          color: 'text-purple-600',
          bgColor: 'bg-purple-100 dark:bg-purple-900/30'
        };
      case 'both':
        return {
          icon: Zap,
          label: 'Both',
          color: 'text-orange-600',
          bgColor: 'bg-orange-100 dark:bg-orange-900/30'
        };
      default:
        return {
          icon: VolumeX,
          label: 'Unknown',
          color: 'text-gray-500',
          bgColor: 'bg-gray-100 dark:bg-gray-700'
        };
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        <span className="ml-3 text-gray-600 dark:text-gray-400">Loading beacon configurations...</span>
      </div>
    );
  }

  const filterOptions = getFilterOptions();

  return (
    <div className="space-y-8">
      {/* Professional Header */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl p-8 border border-blue-200 dark:border-blue-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <Settings className="h-7 w-7 text-blue-600" />
              Beacon Configuration Center
            </h2>
            <p className="text-gray-600 dark:text-gray-300">
              {isConnected 
                ? `Real-time management • ${realBeacons.length} detected • ${configurations.length} configured`
                : `${configurations.length} beacons configured • Connect collar for live features`
              }
            </p>
            {lastSync && (
              <div className="flex items-center gap-2 text-sm">
                <Radio className="h-4 w-4 text-green-500" />
                <span className="text-green-600 dark:text-green-400">
                  Last synchronized: {lastSync.toLocaleTimeString()}
                </span>
              </div>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            {isConnected && (
              <div className="flex items-center gap-2 px-4 py-2 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="text-green-700 dark:text-green-300 font-medium">Live Sync Active</span>
              </div>
            )}
            
            {/* Sync All to Collar Button */}
            {isConnected && configurations.length > 0 && (
              <button
                onClick={() => syncAllConfigurationsToCollar()}
                disabled={isSaving}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                title="Send all beacon configurations to collar for proximity-based triggering"
              >
                <Radio className="h-5 w-5" />
                Sync All to Collar
              </button>
            )}
            
            <button 
              onClick={startAdd}
              className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              <Plus className="h-5 w-5" />
              Add Beacon
            </button>
          </div>
        </div>
      </div>

      {/* NEW: Advanced Controls Bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Filter & Search Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                showFilters 
                  ? "bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-300"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
            >
              <Filter className="h-4 w-4" />
              Filters
              <ChevronDown className={cn("h-4 w-4 transition-transform", showFilters && "rotate-180")} />
            </button>

            <button
              onClick={() => setShowTemplates(!showTemplates)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
                showTemplates 
                  ? "bg-purple-50 border-purple-200 text-purple-700 dark:bg-purple-900/30 dark:border-purple-800 dark:text-purple-300"
                  : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
              )}
            >
              <RotateCcw className="h-4 w-4" />
              Templates
            </button>

            <button
              onClick={exportConfigurations}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
          </div>

          {/* Selection & Batch Operations */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {filteredConfigurations.length} of {configurations.length} beacons
              {selectedBeacons.length > 0 && ` • ${selectedBeacons.length} selected`}
            </span>

            {selectedBeacons.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  onClick={clearSelection}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Clear
                </button>
                <button
                  onClick={() => setShowBatchOps(!showBatchOps)}
                  className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                >
                  Batch Actions
                  <ChevronDown className={cn("h-3 w-3 transition-transform", showBatchOps && "rotate-180")} />
                </button>
              </div>
            )}

            {filteredConfigurations.length > 0 && selectedBeacons.length === 0 && (
              <button
                onClick={selectAllFiltered}
                className="flex items-center gap-2 px-3 py-1 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
              >
                <CheckSquare className="h-4 w-4" />
                Select All
              </button>
            )}
          </div>
        </div>

        {/* Expandable Filter Panel */}
        {showFilters && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Statuses</option>
                  {filterOptions.statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Alert Mode</label>
                <select
                  value={filters.alertMode}
                  onChange={(e) => setFilters(prev => ({ ...prev, alertMode: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Alert Modes</option>
                  {filterOptions.alertModes.map(mode => (
                    <option key={mode} value={mode}>{mode}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Location</label>
                <select
                  value={filters.location}
                  onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Locations</option>
                  {filterOptions.locations.map(location => (
                    <option key={location} value={location}>{location}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Zone</label>
                <select
                  value={filters.zone}
                  onChange={(e) => setFilters(prev => ({ ...prev, zone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Zones</option>
                  {filterOptions.zones.map(zone => (
                    <option key={zone} value={zone}>{zone}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setFilters({ status: 'all', alertMode: 'all', location: 'all', zone: 'all' })}
                className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Expandable Template Panel */}
        {showTemplates && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Configuration Templates</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {BEACON_TEMPLATES.map(template => {
                const TemplateIcon = template.icon;
                return (
                  <div
                    key={template.id}
                    onClick={() => selectedBeacons.length > 0 ? applyTemplateToSelected(template) : null}
                    className={cn(
                      "p-4 border rounded-xl cursor-pointer transition-all",
                      selectedBeacons.length > 0
                        ? "border-blue-200 hover:border-blue-300 hover:bg-blue-50 dark:border-blue-800 dark:hover:border-blue-700 dark:hover:bg-blue-900/20"
                        : "border-gray-200 bg-gray-50 cursor-not-allowed dark:border-gray-600 dark:bg-gray-700/50"
                    )}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <TemplateIcon className={cn(
                        "h-5 w-5",
                        selectedBeacons.length > 0 ? "text-blue-600" : "text-gray-400"
                      )} />
                      <span className={cn(
                        "font-medium",
                        selectedBeacons.length > 0 ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                      )}>
                        {template.name}
                      </span>
                    </div>
                    <p className={cn(
                      "text-sm",
                      selectedBeacons.length > 0 ? "text-gray-600 dark:text-gray-300" : "text-gray-400 dark:text-gray-500"
                    )}>
                      {template.description}
                    </p>
                    {selectedBeacons.length === 0 && (
                      <p className="text-xs text-gray-400 mt-2">Select beacons to apply template</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expandable Batch Operations Panel */}
        {showBatchOps && selectedBeacons.length > 0 && (
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Batch Operations ({selectedBeacons.length} selected)
            </h4>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => batchUpdateAlertMode('none')}
                disabled={isSaving}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
              >
                Disable Alerts
              </button>
              <button
                onClick={() => batchUpdateAlertMode('buzzer')}
                disabled={isSaving}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 disabled:opacity-50 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
              >
                Set Buzzer
              </button>
              <button
                onClick={() => batchUpdateAlertMode('vibration')}
                disabled={isSaving}
                className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 disabled:opacity-50 dark:bg-purple-900/30 dark:text-purple-300 dark:hover:bg-purple-900/50"
              >
                Set Vibration
              </button>
              <button
                onClick={() => batchUpdateAlertMode('both')}
                disabled={isSaving}
                className="px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 disabled:opacity-50 dark:bg-orange-900/30 dark:text-orange-300 dark:hover:bg-orange-900/50"
              >
                Set Both
              </button>
              <button
                onClick={batchDelete}
                disabled={isSaving}
                className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
              >
                Delete Selected
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Enhanced Configuration Cards */}
      {filteredConfigurations.length > 0 && (
        <div className="grid gap-6">
          {filteredConfigurations.map(config => {
            const realtimeStatus = getRealtimeStatus(config);
            const alertDisplay = getAlertModeDisplay(config.alertMode);
            const StatusIcon = realtimeStatus.icon;
            const AlertIcon = alertDisplay.icon;
            const isSelected = selectedBeacons.includes(config.id);

            return (
              <div key={config.id} className={cn(
                "bg-white dark:bg-gray-800 rounded-2xl shadow-lg border overflow-hidden transition-all duration-300",
                isSelected 
                  ? "border-blue-300 ring-2 ring-blue-100 dark:border-blue-600 dark:ring-blue-900/50" 
                  : "border-gray-200 dark:border-gray-700 hover:shadow-xl"
              )}>
                {/* Header Section */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {/* Selection Checkbox */}
                      <button
                        onClick={() => toggleBeaconSelection(config.id)}
                        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Square className="h-5 w-5 text-gray-400" />
                        )}
                      </button>

                      <div className={cn("p-3 rounded-xl", realtimeStatus.bgColor)}>
                        <StatusIcon className={cn("h-6 w-6", realtimeStatus.color)} />
                      </div>
                      
                      <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                          {config.name}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                            <MapPin className="h-4 w-4" />
                            {config.location}
                          </span>
                          {config.zone && (
                            <span className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded-md">
                              {config.zone}
                            </span>
                          )}
                          {config.isAutoDetected && (
                            <span className={cn(
                              "text-xs px-2 py-1 rounded-md font-medium flex items-center gap-1",
                              config.name?.startsWith('PetZone-Home-') 
                                ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300"
                                : "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                            )}>
                              {config.name?.startsWith('PetZone-Home-') ? (
                                <>🔍 Auto-detected</>
                              ) : (
                                <>👻 Ghost Mode</>
                              )}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => {
                          setSelectedBeaconForSettings(config);
                          setIsSettingsDrawerOpen(true);
                        }}
                        className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Configure Alert Settings"
                      >
                        <Settings className="h-5 w-5" />
                      </button>
                      
                      {/* Individual Sync to Collar Button */}
                      {isConnected && (
                        <button
                          onClick={() => syncConfigurationToCollar(config)}
                          disabled={isSaving}
                          className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                          title="Sync this beacon configuration to collar for proximity triggering"
                        >
                          <Radio className="h-5 w-5" />
                        </button>
                      )}
                      
                      <button
                        onClick={() => startEdit(config)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        disabled={editingId === config.id}
                        title="Edit Basic Information"
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => deleteConfiguration(config.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        disabled={config.isAutoDetected && realtimeStatus.status === 'active'}
                        title="Delete Configuration"
                      >
                        <Trash className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6">
                  <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Real-time Status */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Circle className="h-4 w-4 text-blue-500" />
                        Live Status
                      </h4>
                      
                      <div className={cn("p-4 rounded-xl border-2", realtimeStatus.bgColor)}>
                        <div className="flex items-center gap-3">
                          <StatusIcon className={cn("h-5 w-5", realtimeStatus.color)} />
                          <div>
                            <div className={cn("font-medium", realtimeStatus.color)}>
                              {realtimeStatus.message}
                            </div>
                            {config.signalStrength !== undefined && (
                              <div className="text-sm text-gray-600 dark:text-gray-400">
                                Signal: {config.signalStrength}%
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {config.lastSeen && (
                          <div className="mt-2 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(config.lastSeen).toLocaleTimeString()}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Enhanced Proximity Alert Configuration */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-500" />
                        Live Proximity Alerts
                      </h4>
                      
                      <div className="space-y-3">
                        {editingId === config.id ? (
                          <div className="space-y-4">
                            {/* Mobile-Optimized Form Layout */}
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border-2 border-blue-200 dark:border-blue-800">
                              <h5 className="font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Editing: {config.name}
                              </h5>
                              
                              {/* Basic Information */}
                              <div className="space-y-3 mb-4">
                                <div>
                                  <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">
                                    Transmitter Name
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.name || ''}
                                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                      ...prev, 
                                      name: e.target.value 
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                                    placeholder="Enter transmitter name"
                                  />
                                </div>
                                
                                <div>
                                  <label className="block text-sm font-medium mb-1 text-blue-800 dark:text-blue-200">
                                    Location
                                  </label>
                                  <input
                                    type="text"
                                    value={formData.location || ''}
                                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                      ...prev, 
                                      location: e.target.value 
                                    }))}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
                                    placeholder="e.g., Living Room, Kitchen"
                                  />
                                </div>
                              </div>
                            </div>
                            
                            {/* Alert Configuration */}
                            <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border-2 border-orange-200 dark:border-orange-800">
                              <h5 className="font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center gap-2">
                                <Volume2 className="h-4 w-4" />
                                Alert Configuration
                              </h5>
                              
                              {/* Alert Mode Selection */}
                              <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-orange-800 dark:text-orange-200">
                                  Alert Type
                                </label>
                                <select
                                  value={formData.alertMode || 'buzzer'}
                                  onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                    ...prev, 
                                    alertMode: e.target.value as 'none' | 'buzzer' | 'vibration' | 'both' 
                                  }))}
                                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 text-base"
                                >
                                  <option value="none">🚫 No Alert</option>
                                  <option value="buzzer">🔊 Buzzer Only</option>
                                  <option value="vibration">📳 Vibration Only</option>
                                  <option value="both">🔊📳 Buzzer + Vibration</option>
                                </select>
                              </div>
                              
                              {/* Trigger Distance */}
                              <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-orange-800 dark:text-orange-200">
                                  Trigger Distance: <span className="font-bold text-lg">{formData.proximitySettings?.triggerDistance || 5}cm</span>
                                </label>
                                <div className="space-y-2">
                                  <input
                                    type="range"
                                    min="2"
                                    max="30"
                                    value={formData.proximitySettings?.triggerDistance || 5}
                                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                      ...prev, 
                                      proximitySettings: {
                                        ...prev.proximitySettings!,
                                        triggerDistance: parseInt(e.target.value)
                                      }
                                    }))}
                                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <div className="flex justify-between text-xs text-orange-600 dark:text-orange-400">
                                    <span>2cm (Very Close)</span>
                                    <span>15cm (Medium)</span>
                                    <span>30cm (Far)</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Alert Intensity */}
                              <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-orange-800 dark:text-orange-200">
                                  Alert Intensity: <span className="font-bold">{formData.proximitySettings?.alertIntensity || 3}/5</span>
                                </label>
                                <div className="space-y-2">
                                  <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={formData.proximitySettings?.alertIntensity || 3}
                                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                      ...prev, 
                                      proximitySettings: {
                                        ...prev.proximitySettings!,
                                        alertIntensity: parseInt(e.target.value)
                                      }
                                    }))}
                                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <div className="flex justify-between text-xs text-orange-600 dark:text-orange-400">
                                    <span>1 (Gentle)</span>
                                    <span>3 (Medium)</span>
                                    <span>5 (Strong)</span>
                                  </div>
                                </div>
                              </div>
                              
                              {/* Alert Duration */}
                              <div className="mb-4">
                                <label className="block text-sm font-medium mb-2 text-orange-800 dark:text-orange-200">
                                  Alert Duration: <span className="font-bold">{(formData.proximitySettings?.alertDuration || 2000)/1000}s</span>
                                </label>
                                <div className="space-y-2">
                                  <input
                                    type="range"
                                    min="500"
                                    max="10000"
                                    step="500"
                                    value={formData.proximitySettings?.alertDuration || 2000}
                                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                      ...prev, 
                                      proximitySettings: {
                                        ...prev.proximitySettings!,
                                        alertDuration: parseInt(e.target.value)
                                      }
                                    }))}
                                    className="w-full h-2 bg-orange-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <div className="flex justify-between text-xs text-orange-600 dark:text-orange-400">
                                    <span>0.5s</span>
                                    <span>5s</span>
                                    <span>10s</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Advanced Timing Settings */}
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                              <h5 className="font-semibold text-purple-900 dark:text-purple-100 mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Timing Settings
                              </h5>
                              
                              {/* Proximity Delay */}
                              <div className="mb-4">
                                <label className="flex items-center gap-2 cursor-pointer mb-2">
                                  <input
                                    type="checkbox"
                                    checked={formData.proximitySettings?.enableProximityDelay || false}
                                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                      ...prev, 
                                      proximitySettings: {
                                        ...prev.proximitySettings!,
                                        enableProximityDelay: e.target.checked
                                      }
                                    }))}
                                    className="w-4 h-4 text-purple-600"
                                  />
                                  <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                                    Enable Alert Delay (reduces false alerts)
                                  </span>
                                </label>
                                
                                {formData.proximitySettings?.enableProximityDelay && (
                                  <div className="ml-6 space-y-2">
                                    <label className="block text-sm text-purple-700 dark:text-purple-300">
                                      Delay Time: {(formData.proximitySettings?.proximityDelayTime || 0)/1000}s
                                    </label>
                                    <input
                                      type="range"
                                      min="0"
                                      max="10000"
                                      step="500"
                                      value={formData.proximitySettings?.proximityDelayTime || 0}
                                      onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                        ...prev, 
                                        proximitySettings: {
                                          ...prev.proximitySettings!,
                                          proximityDelayTime: parseInt(e.target.value)
                                        }
                                      }))}
                                      className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                                    />
                                    <div className="flex justify-between text-xs text-purple-600 dark:text-purple-400">
                                      <span>Instant</span>
                                      <span>5s</span>
                                      <span>10s</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                              
                              {/* Cooldown Period */}
                              <div>
                                <label className="block text-sm font-medium mb-2 text-purple-800 dark:text-purple-200">
                                  Cooldown Period: {(formData.proximitySettings?.cooldownPeriod || 3000)/1000}s
                                </label>
                                <div className="space-y-2">
                                  <input
                                    type="range"
                                    min="1000"
                                    max="30000"
                                    step="1000"
                                    value={formData.proximitySettings?.cooldownPeriod || 3000}
                                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                      ...prev, 
                                      proximitySettings: {
                                        ...prev.proximitySettings!,
                                        cooldownPeriod: parseInt(e.target.value)
                                      }
                                    }))}
                                    className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                                  />
                                  <div className="flex justify-between text-xs text-purple-600 dark:text-purple-400">
                                    <span>1s</span>
                                    <span>15s</span>
                                    <span>30s</span>
                                  </div>
                                  <p className="text-xs text-purple-600 dark:text-purple-400">
                                    Minimum time between repeated alerts
                                  </p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Save/Cancel Buttons */}
                            <div className="flex gap-3 pt-4">
                              <button 
                                onClick={cancelEdit}
                                className="flex-1 px-4 py-3 border-2 border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                disabled={isSaving}
                              >
                                Cancel
                              </button>
                              <button 
                                onClick={async () => {
                                  const success = await saveEdit();
                                  if (success && isConnected) {
                                    // Auto-sync to collar after successful save
                                    const updatedConfig = configurations.find(c => c.id === editingId);
                                    if (updatedConfig) {
                                      console.log('📱 Auto-syncing updated configuration to collar...');
                                      await syncConfigurationToCollar(updatedConfig);
                                    }
                                  }
                                }}
                                disabled={!formData.name || !formData.location || isSaving}
                                className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                              >
                                {isSaving ? (
                                  <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                    Saving...
                                  </>
                                ) : (
                                  <>
                                    <Save className="h-4 w-4" />
                                    Save & Sync to Collar
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className={cn("p-3 rounded-lg border-2", alertDisplay.bgColor)}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <AlertIcon className={cn("h-4 w-4", alertDisplay.color)} />
                                  <span className={cn("font-medium", alertDisplay.color)}>
                                    {alertDisplay.label}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600 dark:text-gray-400">
                                  {config.proximitySettings?.triggerDistance || 5}cm
                                </div>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-400">
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <div className="font-medium">Intensity</div>
                                <div>{config.proximitySettings?.alertIntensity || 3}/5</div>
                              </div>
                              <div className="bg-gray-50 dark:bg-gray-700 p-2 rounded">
                                <div className="font-medium">Duration</div>
                                <div>{(config.proximitySettings?.alertDuration || 2000)/1000}s</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Zone Settings */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-500" />
                        Zone Settings
                      </h4>
                      
                      <div className="space-y-2">
                        {config.safeZone && (
                          <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded-lg">
                            <Shield className="h-4 w-4" />
                            Safe Zone
                          </div>
                        )}
                        
                        {config.boundaryAlert && (
                          <div className="flex items-center gap-2 text-sm text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-2 rounded-lg">
                            <AlertTriangle className="h-4 w-4" />
                            Boundary Alert
                          </div>
                        )}
                        
                        {!config.safeZone && !config.boundaryAlert && (
                          <div className="text-sm text-gray-500 italic">
                            No special zones configured
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Test Alert */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                        <Play className="h-4 w-4 text-blue-500" />
                        Test Alert
                      </h4>
                      
                      <div className="space-y-2">
                        <button
                          onClick={() => {
                            if (!config.alertMode || config.alertMode === 'none') {
                              alert('❌ Cannot test alert\n\nThis beacon is set to "None" alert mode.\nPlease change the alert mode to Buzzer, Vibration, or Both first.');
                              return;
                            }
                            testAlert(config.id, config.alertMode);
                          }}
                          disabled={!isConnected || config.alertMode === 'none' || testingAlert === config.id}
                          className={cn(
                            "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all duration-200",
                            isConnected && config.alertMode !== 'none' && testingAlert !== config.id
                              ? "bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg"
                              : "bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed"
                          )}
                        >
                          {testingAlert === config.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Testing...
                            </>
                          ) : (
                            <>
                              <Play className="h-4 w-4" />
                              Test {alertDisplay.label}
                            </>
                          )}
                        </button>
                        
                        {!isConnected && (
                          <div className="text-xs text-gray-500 text-center">
                            Connect collar to test
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Edit Mode Controls */}
                  {editingId === config.id && (
                    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={cancelEdit}
                          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                          disabled={isSaving}
                        >
                          Cancel
                        </button>
                        <button 
                          onClick={saveEdit}
                          disabled={!formData.name || !formData.location || isSaving}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                        >
                          {isSaving ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                              Saving...
                            </>
                          ) : (
                            <>
                              <Save className="h-4 w-4" />
                              Save Changes
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enhanced Add Form */}
      {showAddForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 border-b border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Plus className="h-6 w-6 text-blue-600" />
                Add New Beacon Configuration
              </h3>
              <button 
                onClick={() => setShowAddForm(false)}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Basic Information</h4>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Beacon Name</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ ...prev, name: e.target.value }))}
                    placeholder="Living Room Beacon"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Location</label>
                  <input
                    type="text"
                    value={formData.location || ''}
                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ ...prev, location: e.target.value }))}
                    placeholder="Living Room"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">Zone (Optional)</label>
                  <input
                    type="text"
                    value={formData.zone || ''}
                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ ...prev, zone: e.target.value }))}
                    placeholder="Main Floor"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
                  />
                </div>
              </div>

              {/* Alert Configuration */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Alert Configuration</h4>
                
                <div>
                  <label className="block text-sm font-medium mb-2">Alert Mode</label>
                  <select
                    value={formData.alertMode || 'buzzer'}
                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                      ...prev, 
                      alertMode: e.target.value as 'none' | 'buzzer' | 'vibration' | 'both' 
                    }))}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="none">No Alert</option>
                    <option value="buzzer">Buzzer Only</option>
                    <option value="vibration">Vibration Only</option>
                    <option value="both">Buzzer + Vibration</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2">
                    Proximity Threshold: {formData.proximityThreshold}dBm
                  </label>
                  <input
                    type="range"
                    min="-100"
                    max="-30"
                    value={formData.proximityThreshold || -65}
                    onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                      ...prev, 
                      proximityThreshold: parseInt(e.target.value) 
                    }))}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Far (-100)</span>
                    <span>Close (-30)</span>
                  </div>
                </div>
              </div>

              {/* Zone Settings */}
              <div className="space-y-4">
                <h4 className="font-semibold text-gray-900 dark:text-white">Zone Settings</h4>
                
                <div className="space-y-3">
                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.safeZone || false}
                      onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                        ...prev, 
                        safeZone: e.target.checked 
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-green-500" />
                      <div>
                        <div className="font-medium">Safe Zone</div>
                        <div className="text-sm text-gray-500">This area is safe for the pet</div>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center gap-3 p-3 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.boundaryAlert || false}
                      onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                        ...prev, 
                        boundaryAlert: e.target.checked 
                      }))}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-orange-500" />
                      <div>
                        <div className="font-medium">Boundary Alert</div>
                        <div className="text-sm text-gray-500">Alert when pet leaves this area</div>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-600">
              <button 
                onClick={() => setShowAddForm(false)}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button 
                onClick={saveAdd}
                disabled={!formData.name || !formData.location || isSaving}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add Beacon
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Empty State */}
      {configurations.length === 0 ? (
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-900 rounded-2xl p-12 text-center border border-gray-200 dark:border-gray-700">
          <div className="max-w-md mx-auto">
            <Home className="h-16 w-16 text-gray-400 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Beacon Configurations Yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              Start building your smart pet tracking system by adding your first beacon configuration. 
              Set up custom alerts, safe zones, and monitoring parameters.
            </p>
            <button 
              onClick={startAdd}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Add Your First Beacon
            </button>
          </div>
        </div>
      ) : filteredConfigurations.length === 0 ? (
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-2xl p-12 text-center border border-yellow-200 dark:border-yellow-800">
          <div className="max-w-md mx-auto">
            <Filter className="h-16 w-16 text-yellow-500 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              No Beacons Match Filters
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
              No beacon configurations match your current filter criteria. 
              Try adjusting your filters or clearing them to see all beacons.
            </p>
            <button 
              onClick={() => setFilters({ status: 'all', alertMode: 'all', location: 'all', zone: 'all' })}
              className="px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-xl font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      ) : null}

      {/* Ghost Mode Information Section */}
      {configurations.some(c => c.isAutoDetected && !c.name?.startsWith('PetZone-Home-')) && (
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xl">👻</span>
              <AlertTriangle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                Ghost Mode Beacons Detected
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Your collar has detected {configurations.filter(c => c.isAutoDetected && !c.name?.startsWith('PetZone-Home-')).length} beacon(s) 
                in "Ghost Mode". These are automatically added with minimal alert settings until you configure them properly.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <CheckCircle className="h-4 w-4" />
                  <span>Automatically detected and added</span>
                </div>
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <XCircle className="h-4 w-4" />
                  <span>Alerts disabled by default</span>
                </div>
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Settings className="h-4 w-4" />
                  <span>Click "Edit" to configure properly</span>
                </div>
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
                  <Shield className="h-4 w-4" />
                  <span>Conservative settings prevent false alerts</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Beacon Settings Drawer */}
      <BeaconSettingsDrawer
        beacon={selectedBeaconForSettings}
        isOpen={isSettingsDrawerOpen}
        onClose={() => {
          setIsSettingsDrawerOpen(false);
          setSelectedBeaconForSettings(null);
        }}
        collarId="001"
      />
    </div>
  );
} 