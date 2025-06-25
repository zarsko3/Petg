'use client';

import { useState, useEffect } from 'react';
import { 
  Edit, Save, X, Plus, Trash, Settings, AlertTriangle, 
  MapPin, Clock, Wifi, Battery, Shield, Volume2, 
  Vibrate, VolumeX, Target, Timer, Zap, Home, Play,
  Circle, CheckCircle, XCircle, AlertCircle, Radio
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Define the BeaconConfiguration type locally
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

  // Test alert function
  const testAlert = async (beaconId: string, alertMode: string) => {
    if (!isConnected) {
      alert('Collar not connected. Please connect your collar to test alerts.');
      return;
    }

    try {
      setTestingAlert(beaconId);
      
      // Map alert modes to collar commands
      let collarCommand: string;
      switch (alertMode.toLowerCase()) {
        case 'buzzer':
          collarCommand = 'test_buzzer';
          break;
        case 'vibration':
          collarCommand = 'test_vibration';
          break;
        case 'both':
          collarCommand = 'test_buzzer'; // Start with buzzer
          break;
        default:
          collarCommand = 'test_buzzer';
      }

      console.log(`🔊 Sending WebSocket command: ${collarCommand}`);

      // First discover the collar IP
      const discoveryResponse = await fetch('/api/collar-proxy?endpoint=/api/discover');
      if (!discoveryResponse.ok) {
        const errorData = await discoveryResponse.json().catch(() => ({}));
        
        // Provide specific error messages based on the response
        if (errorData.troubleshooting) {
          const troubleshooting = errorData.troubleshooting;
          const message = [
            '❌ Collar Discovery Failed',
            '',
            '🔍 Possible causes:',
            ...troubleshooting.possible_causes?.map((cause: string) => `• ${cause}`) || [],
            '',
            '🛠️ Solutions:',
            ...troubleshooting.steps?.map((step: string) => `${step}`) || [],
            '',
            '💡 Quick check: Look at your collar\'s display for the current IP address.',
            'Then go to Settings → Advanced Connection to update the configuration.'
          ].join('\n');
          
          alert(message);
          return;
        }
        
        throw new Error('Could not discover collar IP - please configure manually in Settings → Advanced Connection Settings');
      }
      
      const discoveryData = await discoveryResponse.json();
      
      // Get collar IP and construct WebSocket URL
      const collarIP = discoveryData.local_ip || discoveryData.ip_address;
      if (!collarIP) {
        throw new Error('No collar IP found in discovery response');
      }
      
      // Use WebSocket URL directly from collar if available, otherwise construct it
      let wsUrl: string;
      if (discoveryData.websocket_url && discoveryData.websocket_url.trim()) {
        wsUrl = discoveryData.websocket_url;
        console.log(`✅ Using WebSocket URL from collar: ${wsUrl}`);
      } else {
        // Construct WebSocket URL (most common case)
        wsUrl = `ws://${collarIP}:8080`;
        console.log(`🔧 Constructed WebSocket URL: ${wsUrl}`);
      }
      
      console.log(`📡 Connecting to collar WebSocket: ${wsUrl}`);

      // Create WebSocket connection with improved error handling
      const ws = new WebSocket(wsUrl);
      
      const commandPromise = new Promise<void>((resolve, reject) => {
        let commandSent = false;
        let responseReceived = false;
        let connected = false;
        
        // Increased timeout for better reliability
        const timeout = setTimeout(() => {
          console.warn(`⏰ WebSocket timeout after 8s. Connected: ${connected}, CommandSent: ${commandSent}, ResponseReceived: ${responseReceived}`);
          if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
            ws.close();
          }
          reject(new Error(`WebSocket timeout (connected: ${connected}, sent: ${commandSent}, received: ${responseReceived})`));
        }, 8000);

        ws.onopen = () => {
          connected = true;
          console.log('✅ WebSocket connected to collar successfully');
          
          try {
            const command = { command: collarCommand };
            ws.send(JSON.stringify(command));
            commandSent = true;
            console.log(`📤 Sent command:`, command);
            
            // Auto-resolve after 3 seconds if no response (collar might not respond)
            setTimeout(() => {
              if (!responseReceived) {
                console.log('🔄 No response received after 3s, assuming command executed successfully');
                clearTimeout(timeout);
                if (ws.readyState === WebSocket.OPEN) {
                  ws.close();
                }
                resolve();
              }
            }, 3000);
          } catch (sendError) {
            console.error('❌ Failed to send command:', sendError);
            clearTimeout(timeout);
            reject(new Error(`Failed to send WebSocket command: ${sendError instanceof Error ? sendError.message : 'Unknown error'}`));
          }
        };

        ws.onmessage = (event) => {
          console.log(`📥 Received response:`, event.data);
          responseReceived = true;
          try {
            const response = JSON.parse(event.data);
            if (response.type === 'response' && response.command === collarCommand) {
              console.log('✅ Command confirmed by collar');
              clearTimeout(timeout);
              if (ws.readyState === WebSocket.OPEN) {
                ws.close();
              }
              resolve();
            } else if (response.type === 'error') {
              console.error('❌ Collar returned error:', response);
              clearTimeout(timeout);
              reject(new Error(`Collar error: ${response.message || 'Unknown collar error'}`));
            }
          } catch (e) {
            // Non-JSON response is also acceptable
            console.log('✅ Received non-JSON response, assuming success');
            clearTimeout(timeout);
            if (ws.readyState === WebSocket.OPEN) {
              ws.close();
            }
            resolve();
          }
        };

        ws.onerror = (error) => {
          console.error('❌ WebSocket error details:', {
            error,
            readyState: ws.readyState,
            url: wsUrl,
            connected,
            commandSent,
            responseReceived
          });
          clearTimeout(timeout);
          
          // Provide more detailed error messages
          let errorMessage = `WebSocket connection failed to ${wsUrl}`;
          if (!connected) {
            errorMessage += '. The collar may be offline, on a different network, or the WebSocket port (8080) may be blocked.';
          } else {
            errorMessage += '. Connection was established but an error occurred during communication.';
          }
          
          reject(new Error(errorMessage));
        };

        ws.onclose = (event) => {
          console.log(`🔌 WebSocket closed:`, {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean,
            connected,
            commandSent,
            responseReceived
          });
          
          clearTimeout(timeout);
          
          // Handle different close codes
          if (event.code !== 1000 && !responseReceived && !commandSent) {
            let closeReason = 'Connection closed unexpectedly';
            switch (event.code) {
              case 1006:
                closeReason = 'Connection lost (abnormal closure) - collar may be offline or network issue';
                break;
              case 1002:
                closeReason = 'Protocol error - collar may not support WebSocket properly';
                break;
              case 1003:
                closeReason = 'Unsupported data type';
                break;
              case 1011:
                closeReason = 'Server error on collar';
                break;
              default:
                closeReason = `Connection closed with code ${event.code}: ${event.reason || 'No reason provided'}`;
            }
            console.warn(`⚠️ ${closeReason}`);
          }
        };
      });

      try {
        await commandPromise;
        console.log(`✅ Test alert sent successfully for beacon ${beaconId} (${alertMode})`);
        
        // Test both modes if selected
        if (alertMode === 'both') {
          setTimeout(async () => {
            try {
              console.log('🔄 Sending follow-up vibration command...');
              const ws2 = new WebSocket(wsUrl);
              ws2.onopen = () => {
                ws2.send(JSON.stringify({ command: 'test_vibration' }));
                setTimeout(() => {
                  if (ws2.readyState === WebSocket.OPEN) {
                    ws2.close();
                  }
                }, 2000);
              };
              ws2.onerror = (error) => {
                console.warn('Follow-up vibration command failed:', error);
              };
            } catch (e) {
              console.warn('Failed to send vibration test:', e);
            }
          }, 2000);
        }
        
        // Brief success indication
        setTimeout(() => setTestingAlert(null), 4000);
        
      } catch (wsError) {
        const wsErrorMessage = wsError instanceof Error ? wsError.message : 'Unknown WebSocket error';
        console.warn('WebSocket approach failed, trying HTTP fallback...', wsError);
        
        // Enhanced HTTP fallback attempt
        try {
          console.log('🔄 Attempting HTTP fallback method...');
          const httpResponse = await fetch('/api/test-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              beaconId,
              alertMode,
              duration: 2000,
              intensity: 2000,
              fallback: true
            })
          });
          
          if (httpResponse.ok) {
            const result = await httpResponse.json();
            console.log('✅ HTTP fallback successful:', result);
            setTimeout(() => setTestingAlert(null), 3000);
          } else {
            const errorText = await httpResponse.text();
            throw new Error(`HTTP fallback failed: ${httpResponse.status} - ${errorText}`);
          }
        } catch (httpError) {
          console.error('Both WebSocket and HTTP failed:', httpError);
          
          // Provide comprehensive troubleshooting guidance
          const message = [
            '❌ Test Alert Failed',
            '',
            '🔌 WebSocket Error:',
            wsErrorMessage,
            '',
            '🛠️ Troubleshooting Steps:',
            '1. Check collar OLED display - confirm IP address is ' + collarIP,
            '2. Ensure collar and computer are on the same WiFi network',
            '3. Check if collar is responding: go to http://' + collarIP + ' in browser',
            '4. Try the direct WebSocket test at: /test-websocket.html',
            '5. Go to Settings → Advanced Connection to reconfigure',
            '',
            '💡 If collar shows 192.168.4.1, it\'s in setup mode.',
            'Connect to "PetCollar-Setup" WiFi and configure at http://192.168.4.1',
            '',
            '🔧 Advanced: Check firewall settings for WebSocket port 8080'
          ].join('\n');
          
          alert(message);
        }
      }
      
    } catch (error) {
      console.error('Failed to send test alert:', error);
      
      // Provide user-friendly error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const friendlyMessage = [
        '❌ Test Alert Failed',
        '',
        `Error: ${errorMessage}`,
        '',
        '🛠️ Quick Solutions:',
        '1. Check collar power and WiFi status on OLED display',
        '2. Go to Settings → Advanced Connection',
        '3. Use Auto-Discover to find collar',
        '4. Try the WebSocket test page: /test-websocket.html',
        '5. Verify collar IP on OLED display matches discovered IP'
      ].join('\n');
      
      alert(friendlyMessage);
      setTestingAlert(null);
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
      if (!realBeacon.name || !realBeacon.name.startsWith('PetZone-Home-')) continue;

      const existingConfig = updatedConfigurations.find(
        config => config.name === realBeacon.name || 
        (config.macAddress && config.macAddress === realBeacon.address)
      );

      if (existingConfig) {
        // Update existing configuration with real data
        existingConfig.batteryLevel = realBeacon.battery_level || existingConfig.batteryLevel;
        existingConfig.signalStrength = rssiToSignalStrength(realBeacon.rssi);
        existingConfig.status = getBeaconStatus(realBeacon.rssi, realBeacon.last_seen);
        existingConfig.lastSeen = new Date().toISOString();
        existingConfig.macAddress = realBeacon.address || existingConfig.macAddress;
        hasChanges = true;
      } else {
        // Create new auto-detected configuration
        const newConfig: BeaconConfiguration = {
          id: `auto-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: realBeacon.name,
          location: extractLocationFromName(realBeacon.name),
          zone: extractZoneFromName(realBeacon.name),
          macAddress: realBeacon.address,
          
          // Default configuration parameters
          alertMode: 'buzzer',
          proximitySettings: {
            triggerDistance: 5,           // Default 5cm trigger distance
            alertDuration: 2000,          // Default 2 second alert duration
            alertIntensity: 3,            // Default medium intensity
            enableProximityDelay: false,  // Default disabled for immediate alerts
            proximityDelayTime: 0,        // No delay by default
            cooldownPeriod: 3000          // 3 second cooldown between alerts
          },
          proximityThreshold: -65,
          alertDelay: 3000,
          alertTimeout: 10000,
          
          // Default zone settings
          safeZone: false,
          boundaryAlert: false,
          
          // Default positioning
          position: { x: 50, y: 50 },
          
          // Metadata from real beacon
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
            console.log(`✅ Auto-detected beacon added: ${newConfig.name}`);
          }
        } catch (error) {
          console.error('Failed to save auto-detected beacon:', error);
        }
      }
    }

    if (hasChanges) {
      setConfigurations(updatedConfigurations);
      onConfigurationUpdate?.(updatedConfigurations);
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
        
        // Show collar sync status
        if (data.collarUpdated) {
          console.log('✅ Configuration synced to collar');
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

  const saveEdit = async () => {
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
      }
    }
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

      {/* Enhanced Configuration Cards */}
      {configurations.length > 0 && (
        <div className="grid gap-6">
          {configurations.map(config => {
            const realtimeStatus = getRealtimeStatus(config);
            const alertDisplay = getAlertModeDisplay(config.alertMode);
            const StatusIcon = realtimeStatus.icon;
            const AlertIcon = alertDisplay.icon;

            return (
              <div key={config.id} className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-xl transition-all duration-300">
                {/* Header Section */}
                <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 dark:from-gray-700 dark:to-gray-800 border-b border-gray-200 dark:border-gray-600">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
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
                            <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded-md font-medium">
                              Auto-detected
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => startEdit(config)}
                        className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        disabled={editingId === config.id}
                      >
                        <Edit className="h-5 w-5" />
                      </button>
                      
                      <button
                        onClick={() => deleteConfiguration(config.id)}
                        className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        disabled={config.isAutoDetected && realtimeStatus.status === 'active'}
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
                          <div className="space-y-3">
                            {/* Alert Mode Selection */}
                            <div>
                              <label className="block text-sm font-medium mb-1">Alert Type</label>
                              <select
                                value={formData.alertMode || 'buzzer'}
                                onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                  ...prev, 
                                  alertMode: e.target.value as 'none' | 'buzzer' | 'vibration' | 'both' 
                                }))}
                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                              >
                                <option value="none">No Alert</option>
                                <option value="buzzer">Buzzer Only</option>
                                <option value="vibration">Vibration Only</option>
                                <option value="both">Buzzer + Vibration</option>
                              </select>
                            </div>
                            
                            {/* Trigger Distance */}
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Trigger Distance: {formData.proximitySettings?.triggerDistance || 5}cm
                              </label>
                              <input
                                type="range"
                                min="2"
                                max="20"
                                value={formData.proximitySettings?.triggerDistance || 5}
                                onChange={(e) => setFormData((prev: Partial<BeaconConfiguration>) => ({ 
                                  ...prev, 
                                  proximitySettings: {
                                    ...prev.proximitySettings!,
                                    triggerDistance: parseInt(e.target.value)
                                  }
                                }))}
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>2cm</span>
                                <span>20cm</span>
                              </div>
                            </div>
                            
                            {/* Alert Intensity */}
                            <div>
                              <label className="block text-sm font-medium mb-1">
                                Alert Intensity: {formData.proximitySettings?.alertIntensity || 3}/5
                              </label>
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
                                className="w-full"
                              />
                              <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>Light</span>
                                <span>Strong</span>
                              </div>
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
                          onClick={() => testAlert(config.id, config.alertMode)}
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
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
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
      {configurations.length === 0 && (
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
      )}
    </div>
  );
} 