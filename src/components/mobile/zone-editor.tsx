'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { X, MapPin, Save } from 'lucide-react'
import { Zone, ZoneCreate, ZONE_TYPES } from '@/lib/types'

interface ZoneEditorProps {
  zone?: Zone | null
  onSave: (zone: Zone) => void
  onCancel: () => void
}

export function ZoneEditor({ zone, onSave, onCancel }: ZoneEditorProps) {
  const [name, setName] = useState(zone?.name || '')
  const [type, setType] = useState(zone?.type || 'SAFE')
  const [color, setColor] = useState(zone?.color || '#10B981')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const colors = [
    '#10B981', '#3B82F6', '#F59E0B', '#EF4444', 
    '#8B5CF6', '#06B6D4', '#84CC16', '#F97316'
  ]

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Zone name is required')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // For now, create a mock polygon - this will be replaced with canvas drawing
      const mockPolygon = [
        { x: 20, y: 20 },
        { x: 80, y: 20 },
        { x: 80, y: 80 },
        { x: 20, y: 80 }
      ]

      const zoneData: ZoneCreate = {
        name: name.trim(),
        type: type as any,
        polygon_json: mockPolygon,
        color,
        alert_settings: {
          entry_alert: false,
          exit_alert: true,
          sound_enabled: true,
          notification_enabled: true,
        }
      }

      const url = zone ? `/api/zones/${zone.id}` : '/api/zones'
      const method = zone ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zoneData),
      })

      if (!response.ok) {
        throw new Error(`Failed to ${zone ? 'update' : 'create'} zone: ${response.status}`)
      }

      const savedZone: Zone = await response.json()
      console.log(`✅ Zone ${zone ? 'updated' : 'created'} successfully:`, savedZone)

      onSave(savedZone)

    } catch (error: any) {
      console.error(`❌ Failed to ${zone ? 'update' : 'create'} zone:`, error)
      setError(error.message || `Failed to ${zone ? 'update' : 'create'} zone`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-md bg-white dark:bg-gray-900 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
              <MapPin className="h-5 w-5 text-orange-600 dark:text-orange-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {zone ? 'Edit Zone' : 'Create Zone'}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {zone ? 'Update zone settings' : 'Define a new safety zone'}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Zone Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zone Name
            </Label>
            <Input
              id="name"
              type="text"
              placeholder="e.g., Living Room, Backyard"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSaving}
              className="w-full"
              maxLength={50}
            />
          </div>

          {/* Zone Type */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zone Type
            </Label>
            <div className="flex gap-2">
              {ZONE_TYPES.map((zoneType) => (
                <button
                  key={zoneType}
                  onClick={() => setType(zoneType)}
                  disabled={isSaving}
                  className={`
                    px-3 py-2 rounded-lg text-sm font-medium transition-all
                    ${type === zoneType 
                      ? 'bg-orange-600 text-white shadow-md' 
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }
                    ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  {zoneType}
                </button>
              ))}
            </div>
          </div>

          {/* Zone Color */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zone Color
            </Label>
            <div className="flex flex-wrap gap-2">
              {colors.map((colorOption) => (
                <button
                  key={colorOption}
                  onClick={() => setColor(colorOption)}
                  disabled={isSaving}
                  className={`
                    w-8 h-8 rounded-full transition-all
                    ${color === colorOption ? 'ring-2 ring-offset-2 ring-gray-400' : ''}
                    ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-110'}
                  `}
                  style={{ backgroundColor: colorOption }}
                />
              ))}
            </div>
          </div>

          {/* Canvas Placeholder */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Zone Area
            </Label>
            <div className="w-full h-40 bg-gray-100 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <MapPin className="h-8 w-8 mx-auto mb-2" />
                <p className="text-sm">Canvas editor coming soon</p>
                <p className="text-xs">Rectangle zone will be created</p>
              </div>
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-200">
                {error}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex gap-3">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isSaving}
            className="flex-1"
          >
            Cancel
          </Button>
          
          <Button
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {zone ? 'Update' : 'Create'} Zone
              </>
            )}
          </Button>
        </div>
      </Card>
    </div>
  )
} 