'use client';

import { useState } from 'react';
import { usePetgStore } from '@/lib/store';
import { Volume2, Zap, Bell, BellOff, Wifi, Settings as SettingsIcon, VolumeX, Volume1, Volume } from 'lucide-react';

export default function SettingsPage() {
  const { alertMode, setAlertMode } = usePetgStore();
  const [webSocketUrl, setWebSocketUrl] = useState('ws://localhost:8080');
  const [vibrationIntensity, setVibrationIntensity] = useState(50);
  const [soundIntensity, setSoundIntensity] = useState(50);
  
  const handleAlertModeChange = (mode: 'none' | 'buzzer' | 'vibration' | 'both') => {
    setAlertMode(mode);
    // In a real app, you would also send this to the device via WebSocket
  };

  const handleVibrationChange = (value: number) => {
    setVibrationIntensity(value);
    // Here you would send the new vibration intensity to the device
  };

  const handleSoundChange = (value: number) => {
    setSoundIntensity(value);
    // Here you would send the new sound intensity to the device
  };
  
  return (
    <div className="container mx-auto p-3">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-xl font-bold">Petg Settings</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Collar Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow">
          <h2 className="text-sm font-semibold mb-1.5 flex items-center">
            <SettingsIcon className="h-4 w-4 mr-1.5 text-orange-500" />
            Collar Settings
          </h2>
          <div className="space-y-3">
            {/* Vibration Intensity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Vibration Intensity
                </label>
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  {vibrationIntensity}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={vibrationIntensity}
                  onChange={(e) => handleVibrationChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-500"
                />
                <Zap className="h-5 w-5 text-purple-500" />
              </div>
            </div>
            
            {/* Sound Intensity */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  Sound Intensity
                </label>
                <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                  {soundIntensity}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <VolumeX className="h-4 w-4 text-gray-400" />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundIntensity}
                  onChange={(e) => handleSoundChange(Number(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-purple-500"
                />
                <Volume className="h-5 w-5 text-purple-500" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Alert Mode Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow">
          <h2 className="text-sm font-semibold mb-1.5 flex items-center">
            <Bell className="h-4 w-4 mr-1.5 text-purple-500" />
            Alert Mode
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
            <button
              onClick={() => handleAlertModeChange('none')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                alertMode === 'none' 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <BellOff className="h-5 w-5 mb-1 text-gray-700 dark:text-gray-300" />
              <span className={`text-xs ${alertMode === 'none' ? 'font-medium text-purple-700 dark:text-purple-300' : ''}`}>None</span>
            </button>
            
            <button
              onClick={() => handleAlertModeChange('buzzer')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                alertMode === 'buzzer' 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <Volume2 className="h-5 w-5 mb-1 text-gray-700 dark:text-gray-300" />
              <span className={`text-xs ${alertMode === 'buzzer' ? 'font-medium text-purple-700 dark:text-purple-300' : ''}`}>Buzzer</span>
            </button>
            
            <button
              onClick={() => handleAlertModeChange('vibration')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                alertMode === 'vibration' 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <Zap className="h-5 w-5 mb-1 text-gray-700 dark:text-gray-300" />
              <span className={`text-xs ${alertMode === 'vibration' ? 'font-medium text-purple-700 dark:text-purple-300' : ''}`}>Vibration</span>
            </button>
            
            <button
              onClick={() => handleAlertModeChange('both')}
              className={`flex flex-col items-center justify-center p-2 rounded-lg border ${
                alertMode === 'both' 
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <Bell className="h-5 w-5 mb-1 text-gray-700 dark:text-gray-300" />
              <span className={`text-xs ${alertMode === 'both' ? 'font-medium text-purple-700 dark:text-purple-300' : ''}`}>Both</span>
            </button>
          </div>
        </div>
        
        {/* Connection Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow">
          <h2 className="text-sm font-semibold mb-1.5 flex items-center">
            <Wifi className="h-4 w-4 mr-1.5 text-blue-500" />
            WebSocket Connection
          </h2>
          <div className="space-y-2">
            <div>
              <label htmlFor="websocket-url" className="block text-xs font-medium mb-1 text-gray-600 dark:text-gray-400">
                WebSocket URL
              </label>
              <input
                id="websocket-url"
                type="text"
                value={webSocketUrl}
                onChange={(e) => setWebSocketUrl(e.target.value)}
                className="w-full p-1.5 text-xs border border-gray-200 rounded-md dark:border-gray-600 dark:bg-gray-700"
              />
            </div>
            <div className="flex gap-1.5">
              <button
                onClick={() => {
                  // Here you would use the connectWebSocket function from lib/socket.ts
                  // connectWebSocket(webSocketUrl);
                  alert(`Connecting to WebSocket at ${webSocketUrl}`);
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700"
              >
                Connect
              </button>
              <button
                onClick={() => {
                  // Here you would disconnect the WebSocket
                  // disconnectWebSocket();
                  alert('Disconnecting WebSocket');
                }}
                className="flex-1 px-3 py-1.5 text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>

        {/* Device Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow">
          <h2 className="text-sm font-semibold mb-1.5 flex items-center">
            <SettingsIcon className="h-4 w-4 mr-1.5 text-green-500" />
            Device Settings
          </h2>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
              <span className="text-xs">Device Name</span>
              <span className="text-xs font-medium">Petg Collar #1</span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
              <span className="text-xs">Firmware Version</span>
              <span className="text-xs font-medium">v1.2.0</span>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
              <span className="text-xs">Last Update</span>
              <span className="text-xs font-medium">2 days ago</span>
            </div>
          </div>
        </div>

        {/* Notification Settings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-2 shadow">
          <h2 className="text-sm font-semibold mb-1.5 flex items-center">
            <Bell className="h-4 w-4 mr-1.5 text-yellow-500" />
            Notification Settings
          </h2>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
              <span className="text-xs">Push Notifications</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-purple-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
              <span className="text-xs">Email Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" />
                <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-purple-500"></div>
              </label>
            </div>
            <div className="flex items-center justify-between p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
              <span className="text-xs">Sound Alerts</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" defaultChecked />
                <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all dark:border-gray-600 peer-checked:bg-purple-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 