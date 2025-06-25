'use client'

import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bluetooth, Battery, Wifi, Settings, Volume2, Vibrate, VolumeX } from 'lucide-react'
import { Collar, CollarSettings, ALERT_MODES } from '@/lib/types'

interface CollarSettingsCardProps {
  collar: Collar
  onUpdate?: () => void
}

export function CollarSettingsCard({ collar, onUpdate }: CollarSettingsCardProps) {
  const [isUpdating, setIsUpdating] = useState(false)
  const [settings, setSettings] = useState<CollarSettings>(collar.settings || {
    alert_mode: 'BUZZER',
    sensitivity: 50,
    battery_threshold: 20,
    heartbeat_interval: 30,
    location_accuracy: 'MEDIUM',
  })

  useEffect(() => {
    if (collar.settings) {
      setSettings(collar.settings)
    }
  }, [collar.settings])

  const updateSetting = async (updates: Partial<CollarSettings>) => {
    setIsUpdating(true)
    
    try {
      console.log('🔄 Updating collar settings:', updates)
      
      const response = await fetch(`/api/collar/${collar.id}/settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: updates }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update settings: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Settings updated:', result)

      // Update local state
      setSettings(prev => ({ ...prev, ...updates }))
      onUpdate?.()

    } catch (error: any) {
      console.error('❌ Failed to update settings:', error)
      // Revert optimistic updates
      setSettings(collar.settings || settings)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAlertModeChange = (mode: typeof ALERT_MODES[number]) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, alert_mode: mode }))
    updateSetting({ alert_mode: mode })
  }

  const handleSensitivityChange = (sensitivity: number) => {
    // Optimistic update
    setSettings(prev => ({ ...prev, sensitivity }))
    
    // Debounced update
    const timeoutId = setTimeout(() => {
      updateSetting({ sensitivity })
    }, 300)

    return () => clearTimeout(timeoutId)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CONNECTED': return 'bg-green-100 text-green-700 border-green-200'
      case 'CHARGING': return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'LOW_BATTERY': return 'bg-red-100 text-red-700 border-red-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getAlertModeIcon = (mode: string) => {
    switch (mode) {
      case 'BUZZER': return <Volume2 className="h-3 w-3" />
      case 'VIBRATION': return <Vibrate className="h-3 w-3" />
      case 'BOTH': return <Settings className="h-3 w-3" />
      case 'SILENT': return <VolumeX className="h-3 w-3" />
      default: return <Volume2 className="h-3 w-3" />
    }
  }

  const getBatteryIcon = () => {
    const level = collar.battery_level || 0
    if (level > 60) return 'text-green-500'
    if (level > 30) return 'text-yellow-500'
    return 'text-red-500'
  }

  return (
    <Card className="p-4 border-l-4 border-l-purple-400">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
            <Bluetooth className="h-4 w-4 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              {collar.nickname}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {collar.ble_mac}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Status Badge */}
          <Badge className={`text-xs px-2 py-1 ${getStatusColor(collar.status)}`}>
            {collar.status}
          </Badge>
        </div>
      </div>

      {/* Stats Row */}
      <div className="flex items-center gap-4 mb-4 text-sm">
        {/* Battery */}
        <div className="flex items-center gap-1">
          <Battery className={`h-4 w-4 ${getBatteryIcon()}`} />
          <span className="text-gray-600 dark:text-gray-400">
            {collar.battery_level || 0}%
          </span>
        </div>

        {/* Signal */}
        <div className="flex items-center gap-1">
          <Wifi className="h-4 w-4 text-blue-500" />
          <span className="text-gray-600 dark:text-gray-400">
            Connected
          </span>
        </div>

        {/* Last Seen */}
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Last seen: {collar.last_seen ? new Date(collar.last_seen).toLocaleTimeString() : 'Never'}
        </div>
      </div>

      {/* Alert Mode Selector */}
      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
            Alert Mode
          </label>
          <div className="flex flex-wrap gap-2">
            {ALERT_MODES.map((mode) => (
              <button
                key={mode}
                onClick={() => handleAlertModeChange(mode)}
                disabled={isUpdating}
                className={`
                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
                  ${settings.alert_mode === mode 
                    ? 'bg-purple-600 text-white shadow-md' 
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }
                  ${isUpdating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                {getAlertModeIcon(mode)}
                {mode.charAt(0) + mode.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Sensitivity Slider */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Alert Sensitivity
            </label>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {settings.sensitivity}%
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min="0"
              max="100"
              value={settings.sensitivity}
              onChange={(e) => handleSensitivityChange(parseInt(e.target.value))}
              disabled={isUpdating}
              className="
                w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-600
                [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md
                [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full
                [&::-moz-range-thumb]:bg-purple-600 [&::-moz-range-thumb]:cursor-pointer
                [&::-moz-range-thumb]:border-none [&::-moz-range-thumb]:shadow-md
              "
              style={{
                background: `linear-gradient(to right, rgb(147 51 234) 0%, rgb(147 51 234) ${settings.sensitivity}%, rgb(229 231 235) ${settings.sensitivity}%, rgb(229 231 235) 100%)`
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>

      {/* Loading Indicator */}
      {isUpdating && (
        <div className="mt-3 flex items-center gap-2 text-sm text-purple-600 dark:text-purple-400">
          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-purple-600 dark:border-purple-400"></div>
          Updating settings...
        </div>
      )}
    </Card>
  )
} 