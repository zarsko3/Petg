'use client'

import { useState, useEffect } from 'react'
import { Plus, MapPin, Edit2, Trash2, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ZoneEditor } from '@/components/mobile/zone-editor'
import { Zone, ZONE_TYPES } from '@/lib/types'

export default function MobileZonesPage() {
  const [zones, setZones] = useState<Zone[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditor, setShowEditor] = useState(false)
  const [editingZone, setEditingZone] = useState<Zone | null>(null)

  const fetchZones = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch('/api/zones', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to fetch zones: ${response.status}`)
      }

      const zonesData: Zone[] = await response.json()
      setZones(zonesData)

    } catch (error: any) {
      console.error('❌ Failed to fetch zones:', error)
      setError(error.message || 'Failed to fetch zones')
    } finally {
      setIsLoading(false)
    }
  }

  const deleteZone = async (zoneId: string) => {
    try {
      const response = await fetch(`/api/zones/${zoneId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error(`Failed to delete zone: ${response.status}`)
      }

      console.log('✅ Zone deleted successfully')
      
      // Remove from local state
      setZones(prev => prev.filter(zone => zone.id !== zoneId))

    } catch (error: any) {
      console.error('❌ Failed to delete zone:', error)
      setError(error.message || 'Failed to delete zone')
    }
  }

  const toggleZoneActive = async (zone: Zone) => {
    try {
      const response = await fetch(`/api/zones/${zone.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          active: !zone.active,
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to update zone: ${response.status}`)
      }

      const updatedZone: Zone = await response.json()
      console.log('✅ Zone updated successfully')
      
      // Update local state
      setZones(prev => prev.map(z => z.id === zone.id ? updatedZone : z))

    } catch (error: any) {
      console.error('❌ Failed to update zone:', error)
      setError(error.message || 'Failed to update zone')
    }
  }

  const handleZoneSaved = (zone: Zone) => {
    if (editingZone) {
      // Update existing zone
      setZones(prev => prev.map(z => z.id === zone.id ? zone : z))
    } else {
      // Add new zone
      setZones(prev => [zone, ...prev])
    }

    setShowEditor(false)
    setEditingZone(null)
  }

  useEffect(() => {
    fetchZones()
  }, [])

  const getZoneTypeColor = (type: string) => {
    switch (type) {
      case 'SAFE': return 'bg-green-100 text-green-700 border-green-200'
      case 'RESTRICTED': return 'bg-red-100 text-red-700 border-red-200'
      case 'ALERT': return 'bg-yellow-100 text-yellow-700 border-yellow-200'
      default: return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  const getZonePoints = (zone: Zone) => {
    if (!zone.polygon_json || zone.polygon_json.length === 0) return 'No points'
    return `${zone.polygon_json.length} points`
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 dark:from-gray-900 dark:to-gray-800 pb-20">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-orange-100 dark:border-gray-700 pt-12 pb-4 px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Safety Zones</h1>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              Create and manage safe areas for your pet
            </p>
          </div>
          <Button
            onClick={() => {
              setEditingZone(null)
              setShowEditor(true)
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Zone
          </Button>
        </div>
      </div>

      <div className="px-6 py-6">
        {/* Loading State */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="p-4">
                <div className="animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-3"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 border-red-200 bg-red-50 dark:bg-red-900/20">
            <div className="text-center">
              <h3 className="text-sm font-medium text-red-900 dark:text-red-100 mb-2">
                Error Loading Zones
              </h3>
              <p className="text-sm text-red-700 dark:text-red-200 mb-4">
                {error}
              </p>
              <Button
                onClick={fetchZones}
                variant="outline"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                Try Again
              </Button>
            </div>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && zones.length === 0 && (
          <Card className="p-8 text-center border-dashed border-2 border-gray-200 dark:border-gray-700">
            <MapPin className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              No Safety Zones
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Create your first safety zone to start monitoring your pet's location
            </p>
            <Button
              onClick={() => {
                setEditingZone(null)
                setShowEditor(true)
              }}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create First Zone
            </Button>
          </Card>
        )}

        {/* Zones List */}
        {!isLoading && !error && zones.length > 0 && (
          <div className="space-y-3">
            {zones.map((zone) => (
              <Card 
                key={zone.id} 
                className={`p-4 border-l-4 transition-all duration-200 ${
                  zone.active ? 'border-l-orange-400' : 'border-l-gray-300 opacity-75'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* Zone Header */}
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className="w-4 h-4 rounded-full border-2"
                        style={{ backgroundColor: zone.color, borderColor: zone.color }}
                      />
                      <h3 className="font-semibold text-gray-900 dark:text-white">
                        {zone.name}
                      </h3>
                      <Badge className={`text-xs px-2 py-1 ${getZoneTypeColor(zone.type)}`}>
                        {zone.type}
                      </Badge>
                    </div>

                    {/* Zone Details */}
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                        <span>{getZonePoints(zone)}</span>
                        <span>•</span>
                        <span>
                          Alerts: {zone.alert_settings?.exit_alert ? 'Exit' : ''}
                          {zone.alert_settings?.entry_alert && zone.alert_settings?.exit_alert ? ' & ' : ''}
                          {zone.alert_settings?.entry_alert ? 'Entry' : ''}
                          {!zone.alert_settings?.exit_alert && !zone.alert_settings?.entry_alert ? 'None' : ''}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        Created: {new Date(zone.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  {/* Zone Actions */}
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleZoneActive(zone)}
                      className="h-8 w-8 p-0"
                    >
                      {zone.active ? (
                        <Eye className="h-4 w-4 text-green-600" />
                      ) : (
                        <EyeOff className="h-4 w-4 text-gray-400" />
                      )}
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingZone(zone)
                        setShowEditor(true)
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm(`Are you sure you want to delete "${zone.name}"?`)) {
                          deleteZone(zone.id)
                        }
                      }}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Zone Editor Modal */}
      {showEditor && (
        <ZoneEditor
          zone={editingZone}
          onSave={handleZoneSaved}
          onCancel={() => {
            setShowEditor(false)
            setEditingZone(null)
          }}
        />
      )}
    </div>
  )
} 