'use client';

import { useState } from 'react';
import { usePetgStore } from '@/lib/store';
import { Volume2, Zap, Bell, BellOff, Settings as SettingsIcon } from 'lucide-react';
import { Switch } from "@/components/ui/switch";
import { SimpleCollarConnection } from '@/components/simple-collar-connection';
import { MinimalManualConnection } from '@/components/minimal-manual-connection';
import { 
  defaultVibrationIntensity, 
  defaultSoundIntensity, 
  defaultNotifications 
} from '@/lib/mock-data';
import { PageLayout } from '@/components/page-layout';

export default function SettingsPage() {
  const { 
    alertMode, 
    setAlertMode
  } = usePetgStore();
  
  const [vibrationIntensity, setVibrationIntensity] = useState(defaultVibrationIntensity);
  const [soundIntensity, setSoundIntensity] = useState(defaultSoundIntensity);
  const [notifications, setNotifications] = useState(defaultNotifications);
  
  const handleAlertModeChange = (mode: 'none' | 'buzzer' | 'vibration' | 'both') => {
    setAlertMode(mode);
  };

  const handleVibrationChange = (value: number) => {
    setVibrationIntensity(value);
  };

  const handleSoundChange = (value: number) => {
    setSoundIntensity(value);
  };

  return (
    <PageLayout background="bg-white dark:bg-gray-900">
      <h1 className="text-2xl font-bold mb-6">Petg Settings</h1>

      {/* Simple Collar Connection */}
      <div className="mb-8">
        <SimpleCollarConnection />
        <MinimalManualConnection />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collar Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <SettingsIcon className="h-5 w-5 text-orange-500" />
            Collar Settings
          </h2>
          
          <div className="space-y-6">
            {/* Vibration Intensity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 dark:text-gray-400">Vibration Intensity</span>
                <span className="text-purple-600 dark:text-purple-400">{vibrationIntensity}%</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vibrationIntensity}
                  onChange={(e) => handleVibrationChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-purple"
                />
                <Zap className="absolute -top-1 left-0 h-4 w-4 text-purple-400" />
              </div>
            </div>

            {/* Sound Intensity */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-gray-500 dark:text-gray-400">Sound Intensity</span>
                <span className="text-blue-600 dark:text-blue-400">{soundIntensity}%</span>
              </div>
              <div className="relative">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundIntensity}
                  onChange={(e) => handleSoundChange(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider-blue"
                />
                <Volume2 className="absolute -top-1 left-0 h-4 w-4 text-blue-400" />
              </div>
            </div>

            {/* Alert Mode Selection */}
            <div>
              <h3 className="text-sm font-medium mb-3 text-gray-500 dark:text-gray-400">Alert Mode</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'none', label: 'None', icon: BellOff },
                  { key: 'buzzer', label: 'Sound', icon: Volume2 },
                  { key: 'vibration', label: 'Vibration', icon: Zap },
                  { key: 'both', label: 'Both', icon: Bell }
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => handleAlertModeChange(key as any)}
                    className={`p-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                      alertMode === key
                        ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700 border-2'
                        : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-700/50">
          <h2 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Notifications
          </h2>
          
          <div className="space-y-4">
            {Object.entries(notifications).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300 capitalize">
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </span>
                <Switch
                  checked={value}
                  onCheckedChange={(checked) => 
                    setNotifications(prev => ({ ...prev, [key]: checked }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
} 