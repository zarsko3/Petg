'use client'

import React, { useState, useEffect } from 'react'
import { ArrowLeft, Wifi, Zap, Settings, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { BeaconConfigurationPanel } from '@/components/beacon-configuration-panel'
import { useCollarConnection } from '@/components/collar-service-provider'
import { usePetgStore } from '@/lib/store'

export default function MobileBeaconsPage() {
  const [realBeacons, setRealBeacons] = useState<any[]>([])
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  
  // Get connection state from global store
  const isConnected = usePetgStore((state) => state.isCollarConnected)
  const connectionStatus = usePetgStore((state) => state.connectionStatus)
  const rawCollarData = usePetgStore((state) => state.lastCollarData)
  
  // Get live beacon detections from the store
  const liveBeacons = usePetgStore((state) => state.beacons)
  const demoMode = usePetgStore((state) => state.demoMode)

  // Extract beacon data from live store and collar data
  useEffect(() => {
    if (isConnected && !demoMode) {
      // Primary source: Live beacon detections from MQTT
      if (liveBeacons && liveBeacons.length > 0) {
        console.log(`📱 Mobile Beacons: Processing ${liveBeacons.length} live beacons:`, liveBeacons);
        
        // Convert live beacons to expected format
        const formattedBeacons = liveBeacons.map(beacon => ({
          name: beacon.name,
          rssi: beacon.rssi,
          distance: beacon.distance,
          address: beacon.address,
          last_seen: beacon.timestamp,
          confidence: beacon.confidence,
          collarId: beacon.collarId
        }))
        
        console.log(`📱 Mobile Beacons: Formatted ${formattedBeacons.length} beacons:`, formattedBeacons);
        
        setRealBeacons(formattedBeacons)
        setLastUpdate(new Date())
        console.log('📱 Mobile Beacons: Updated from live beacon store', formattedBeacons.length, 'beacons')
        
      } 
      // Fallback: Legacy rawCollarData beacons
      else if (rawCollarData && rawCollarData.beacons && Array.isArray(rawCollarData.beacons)) {
        setRealBeacons(rawCollarData.beacons)
        setLastUpdate(new Date())
        console.log('📱 Mobile Beacons: Updated from legacy collar data', rawCollarData.beacons.length, 'beacons')
      } else {
        setRealBeacons([])
        setLastUpdate(new Date())
      }
    } else if (!isConnected || demoMode) {
      setRealBeacons([])
      setLastUpdate(null)
      console.log('📱 Mobile Beacons: Cleared data due to disconnection or demo mode')
    }
  }, [isConnected, liveBeacons, rawCollarData, demoMode])

  const goBack = () => {
    window.history.back()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      {/* Mobile Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-blue-100 dark:border-gray-700 pt-12 pb-4 px-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={goBack}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <Wifi className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Beacon Network
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Manage your tracking beacons
              </p>
            </div>
          </div>
        </div>

        {/* Connection Status Banner */}
        {isConnected ? (
          <div className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Live Connection Active
              </p>
              <p className="text-xs text-green-600 dark:text-green-300">
                {realBeacons.length} beacons detected • Real-time updates enabled
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                Offline Mode
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-300">
                Connect collar for live beacon detection and real-time updates
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile-Optimized Beacon Configuration */}
      <div className="px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <BeaconConfigurationPanel 
            realBeacons={realBeacons}
            isConnected={isConnected}
            onConfigurationUpdate={(configs) => {
              console.log('📱 Mobile Beacons: Configuration updated', configs.length, 'total configs')
            }}
          />
        </div>
      </div>

      {/* Mobile Quick Actions */}
      <div className="px-4 pb-6">
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
              <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                Quick Setup Tips
              </h3>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
                <li>• Use templates for consistent configurations</li>
                <li>• Enable filters to find specific beacons quickly</li>
                <li>• Batch operations save time with multiple beacons</li>
                <li>• Export configurations for backup and sharing</li>
              </ul>
            </div>
          </div>
        </Card>
        
        {/* Enhanced Setup Guide for Proximity Detection */}
        <Card className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-xl">
                <Settings className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Proximity Detection Setup
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  Configure your transmitters for proximity alerts
                </p>
              </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">1</span>
                Add Your Transmitters
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 ml-8">
                <li>• Turn on your BLE transmitters/beacons near the collar</li>
                <li>• They will appear in the list above automatically</li>
                <li>• Works with ANY BLE device: AirTags, Tiles, custom beacons</li>
                <li>• Click "Edit" (✏️) to configure each transmitter</li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">2</span>
                Configure Alert Settings
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 ml-8">
                <li>• <strong>Trigger Distance:</strong> 2-30cm (how close before alert)</li>
                <li>• <strong>Alert Type:</strong> Buzzer, Vibration, or Both</li>
                <li>• <strong>Intensity:</strong> 1-5 (gentle to strong)</li>
                <li>• <strong>Duration:</strong> 0.5-10 seconds per alert</li>
                <li>• <strong>Delay:</strong> Optional wait time to reduce false alerts</li>
              </ul>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-green-700">
              <h4 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <span className="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold">3</span>
                Test & Verify
              </h4>
              <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2 ml-8">
                <li>• Use the "Test Alert" button to verify collar response</li>
                <li>• Move transmitter close to collar (within trigger distance)</li>
                <li>• Collar should buzz/vibrate according to your settings</li>
                <li>• Check cooldown period to avoid alert spam</li>
              </ul>
            </div>
            
            {/* Troubleshooting Section */}
            <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4 border border-yellow-200 dark:border-yellow-700">
              <h4 className="font-medium text-yellow-800 dark:text-yellow-200 mb-3 flex items-center gap-2">
                <span className="text-yellow-600 dark:text-yellow-400">⚠️</span>
                Troubleshooting
              </h4>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
                <div><strong>No transmitters detected?</strong></div>
                <ul className="ml-4 space-y-1">
                  <li>• Ensure transmitters are powered on and nearby</li>
                  <li>• Check collar connection status above</li>
                  <li>• Restart collar if needed</li>
                </ul>
                
                <div className="mt-3"><strong>Alerts not triggering?</strong></div>
                <ul className="ml-4 space-y-1">
                  <li>• Verify transmitter is configured (not just detected)</li>
                  <li>• Check trigger distance is appropriate</li>
                  <li>• Ensure alert mode is not set to "None"</li>
                  <li>• Wait for cooldown period between tests</li>
                </ul>
              </div>
            </div>
            
            {isConnected && (
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-sm font-medium">
                    Collar Connected - Real-time proximity detection active
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      </div>

    </div>
  )
} 