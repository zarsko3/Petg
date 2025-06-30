'use client';

import React, { useState, useEffect } from 'react';
import { X, Wifi, Clock, Zap, Volume2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getMQTTClient } from '@/lib/mqtt-client';
import { toast } from 'sonner';

interface BeaconConfig {
  alertMode: 'buzzer' | 'vibration' | 'both';
  alertIntensity: number; // 0-255
  triggerDistance: number; // cm (10-300)
  enableProximityDelay: boolean;
  proximityDelayMs: number;
  cooldownPeriodMs: number;
}

interface BeaconSettingsDrawerProps {
  beacon: {
    id: string;
    name: string;
    rssi?: number;
    lastSeen?: number;
    timestamp?: number;
  } | null;
  isOpen: boolean;
  onClose: () => void;
  collarId?: string;
}

export function BeaconSettingsDrawer({ beacon, isOpen, onClose, collarId = "001" }: BeaconSettingsDrawerProps) {
  const [config, setConfig] = useState<BeaconConfig>({
    alertMode: 'buzzer',
    alertIntensity: 180,
    triggerDistance: 150,
    enableProximityDelay: true,
    proximityDelayMs: 5000,
    cooldownPeriodMs: 8000
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<keyof BeaconConfig, string>>>({});

  // Validation
  const validateConfig = (): boolean => {
    const newErrors: Partial<Record<keyof BeaconConfig, string>> = {};
    
    if (config.triggerDistance < 10 || config.triggerDistance > 300) {
      newErrors.triggerDistance = 'Distance must be between 10-300 cm';
    }
    
    if (config.alertIntensity < 0 || config.alertIntensity > 255) {
      newErrors.alertIntensity = 'Intensity must be between 0-255';
    }
    
    if (config.proximityDelayMs < 0) {
      newErrors.proximityDelayMs = 'Delay cannot be negative';
    }
    
    if (config.cooldownPeriodMs < 0) {
      newErrors.cooldownPeriodMs = 'Cooldown cannot be negative';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Save configuration to collar via MQTT
  const handleSave = async () => {
    if (!beacon || !validateConfig()) return;
    
    setIsSaving(true);
    try {
      const mqttClient = getMQTTClient();
      const topic = `pet-collar/${collarId}/beacon-config`;
      const payload = {
        device_id: collarId,
        beacon_id: beacon.id,
        config: {
          alertMode: config.alertMode,
          alertIntensity: config.alertIntensity,
          triggerDistance: config.triggerDistance,
          enableProximityDelay: config.enableProximityDelay,
          proximityDelayMs: config.proximityDelayMs,
          cooldownPeriodMs: config.cooldownPeriodMs
        }
      };
      
      console.log(`📡 Publishing beacon config to ${topic}:`, payload);
      
      const success = await mqttClient.publish(topic, JSON.stringify(payload));
      
      if (success) {
        toast.success('Beacon Configuration Saved', {
          description: `Settings for ${beacon.name} have been updated`
        });
        
        // TODO: Optimistic update to local store
      } else {
        throw new Error('Failed to publish MQTT message');
      }
      
    } catch (error) {
      console.error('Failed to save beacon config:', error);
      toast.error('Failed to Save Configuration', {
        description: 'Please check your connection and try again'
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Test alert (immediate buzz/vibration)
  const handleTest = async (testMode?: 'buzzer' | 'vibration' | 'both') => {
    if (!beacon) return;
    
    const mode = testMode || config.alertMode;
    setIsTesting(true);
    
    try {
      const mqttClient = getMQTTClient();
      const topic = `pet-collar/${collarId}/command`;
      const payload = {
        cmd: 'test-alert',
        alertMode: mode,
        durationMs: 1200,
        intensity: Math.min(config.alertIntensity, 200) // Cap at 200 for safety
      };
      
      console.log(`📡 Publishing test command to ${topic}:`, payload);
      
      const success = await mqttClient.publish(topic, JSON.stringify(payload));
      
      if (success) {
        toast.success('Test Alert Sent', {
          description: `${mode.charAt(0).toUpperCase() + mode.slice(1)} test sent to collar`
        });
      } else {
        throw new Error('Failed to publish MQTT message');
      }
      
    } catch (error) {
      console.error('Failed to send test alert:', error);
      toast.error('Failed to Send Test Alert', {
        description: 'Please check your connection and try again'
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Format last seen time
  const formatLastSeen = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 60000) {
      return 'Just now';
    } else if (diff < 3600000) {
      return `${Math.floor(diff / 60000)}m ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)}h ago`;
    } else {
      return new Date(timestamp).toLocaleDateString();
    }
  };

  // Get RSSI color
  const getRSSIColor = (rssi?: number) => {
    if (!rssi) return 'text-gray-500';
    if (rssi > -50) return 'text-green-500';
    if (rssi > -70) return 'text-yellow-500';
    return 'text-red-500';
  };

  if (!isOpen || !beacon) return null;

  const isValid = Object.keys(errors).length === 0 && 
                  config.triggerDistance > 0 && 
                  config.alertIntensity <= 255;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Beacon Settings</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">{beacon.name}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Beacon Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Current Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Wifi className={`h-4 w-4 ${getRSSIColor(beacon.rssi)}`} />
                  <span className="text-sm">RSSI</span>
                </div>
                <Badge variant="outline">
                  {beacon.rssi ? `${beacon.rssi} dBm` : 'Unknown'}
                </Badge>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">Last Seen</span>
                </div>
                <Badge variant="outline">
                  {formatLastSeen(beacon.lastSeen || beacon.timestamp)}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Configuration Form */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Alert Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Trigger Distance */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Trigger Distance: {config.triggerDistance} cm
                </label>
                <input
                  type="range"
                  min="10"
                  max="300"
                  step="5"
                  value={config.triggerDistance}
                  onChange={(e) => setConfig(prev => ({ ...prev, triggerDistance: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>10 cm</span>
                  <span>300 cm</span>
                </div>
                {errors.triggerDistance && (
                  <p className="text-red-500 text-xs mt-1">{errors.triggerDistance}</p>
                )}
              </div>

              {/* Alert Mode */}
              <div>
                <label className="block text-sm font-medium mb-2">Alert Mode</label>
                <div className="space-y-2">
                  {[
                    { value: 'buzzer', label: 'Buzzer', icon: Volume2 },
                    { value: 'vibration', label: 'Vibration', icon: RotateCcw },
                    { value: 'both', label: 'Both', icon: Zap }
                  ].map(({ value, label, icon: Icon }) => (
                    <label key={value} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="alertMode"
                        value={value}
                        checked={config.alertMode === value}
                        onChange={(e) => setConfig(prev => ({ ...prev, alertMode: e.target.value as any }))}
                        className="w-4 h-4"
                      />
                      <Icon className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Alert Intensity */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Alert Intensity: {config.alertIntensity}
                </label>
                <input
                  type="range"
                  min="0"
                  max="255"
                  step="5"
                  value={config.alertIntensity}
                  onChange={(e) => setConfig(prev => ({ ...prev, alertIntensity: parseInt(e.target.value) }))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>0 (Off)</span>
                  <span>255 (Max)</span>
                </div>
                {errors.alertIntensity && (
                  <p className="text-red-500 text-xs mt-1">{errors.alertIntensity}</p>
                )}
              </div>

              {/* Proximity Delay */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={config.enableProximityDelay}
                    onChange={(e) => setConfig(prev => ({ ...prev, enableProximityDelay: e.target.checked }))}
                    className="w-4 h-4"
                  />
                  <span className="text-sm font-medium">Enable Alert Delay</span>
                </label>
                
                {config.enableProximityDelay && (
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">
                      Delay Time (seconds)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="60"
                      value={Math.floor(config.proximityDelayMs / 1000)}
                      onChange={(e) => setConfig(prev => ({ 
                        ...prev, 
                        proximityDelayMs: parseInt(e.target.value || '0') * 1000 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                    />
                  </div>
                )}
              </div>

              {/* Cooldown Period */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Cooldown Period (seconds)
                </label>
                <input
                  type="number"
                  min="0"
                  max="300"
                  value={Math.floor(config.cooldownPeriodMs / 1000)}
                  onChange={(e) => setConfig(prev => ({ 
                    ...prev, 
                    cooldownPeriodMs: parseInt(e.target.value || '0') * 1000 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Minimum time between alerts
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-3">
            {/* Test Buttons */}
            <div>
              <p className="text-sm font-medium mb-2">Test Alert</p>
              <div className="grid grid-cols-3 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest('buzzer')}
                  disabled={isTesting}
                  className="text-xs"
                >
                  <Volume2 className="h-3 w-3 mr-1" />
                  Buzzer
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest('vibration')}
                  disabled={isTesting}
                  className="text-xs"
                >
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Vibration
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleTest('both')}
                  disabled={isTesting}
                  className="text-xs"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Both
                </Button>
              </div>
            </div>

            {/* Save Button */}
            <Button
              onClick={handleSave}
              disabled={!isValid || isSaving}
              className="w-full"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </Button>
            
            {!isValid && (
              <p className="text-red-500 text-xs text-center">
                Please fix validation errors before saving
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  );
} 