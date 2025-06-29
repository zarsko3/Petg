import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { CollarSettingsUpdateSchema, BLEMessage } from '@/lib/types'
import { supabase } from '@/lib/supabase'

interface RouteParams {
  params: {
    id: string
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    const collarId = params.id
    console.log('⚙️ Updating collar settings for:', collarId)

    // Parse and validate request body
    const body = await request.json()
    const { settings: settingsUpdate } = CollarSettingsUpdateSchema.parse(body)

    // Verify collar ownership
    const { data: collar, error: fetchError } = await supabase
      .from('collars')
      .select('id, user_id, ble_mac, nickname, settings')
      .eq('id', collarId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('❌ Collar fetch error:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'CollarNotFound', message: 'Collar not found or access denied' },
          { status: 404 }
        )
      }
      throw new Error('Database error occurred')
    }

    // Merge settings
    const currentSettings = collar.settings || {}
    const newSettings = { ...currentSettings, ...settingsUpdate }

    // Update collar settings in database
    const { data: updatedCollar, error: updateError } = await supabase
      .from('collars')
      .update({
        settings: newSettings,
        updated_at: new Date().toISOString(),
      })
      .eq('id', collarId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Settings update error:', updateError)
      throw new Error('Failed to update collar settings')
    }

    console.log('✅ Collar settings updated:', updatedCollar)

    // Prepare BLE messages for downlink
    const bleMessages: BLEMessage[] = []
    
    if (settingsUpdate.alert_mode !== undefined) {
      bleMessages.push({
        type: 'ALERT_MODE',
        value: settingsUpdate.alert_mode
      })
    }

    if (settingsUpdate.sensitivity !== undefined) {
      bleMessages.push({
        type: 'SENSITIVITY',
        value: settingsUpdate.sensitivity
      })
    }

    if (settingsUpdate.heartbeat_interval !== undefined) {
      bleMessages.push({
        type: 'HEARTBEAT_INTERVAL',
        value: settingsUpdate.heartbeat_interval
      })
    }

    // Send BLE messages via WebSocket or direct connection
    // This will be handled by the collar service or WebSocket server
    if (bleMessages.length > 0) {
      console.log('📡 Sending BLE messages to collar:', collar.ble_mac, bleMessages)
      
      // Broadcast to WebSocket clients for real-time collar communication
      try {
        // This would typically go through a WebSocket server or collar service
        const wsPayload = {
          type: 'collarSettingsUpdated',
          data: {
            collar_id: collarId,
            ble_mac: collar.ble_mac,
            messages: bleMessages,
            settings: newSettings
          }
        }

        // Log for development - in production this would use a proper message queue
        console.log('🔄 WebSocket broadcast payload:', wsPayload)
        
        // TODO: Implement actual WebSocket broadcast or collar service call
        // await broadcastToCollarService(wsPayload)
        
      } catch (wsError) {
        console.warn('⚠️ Failed to broadcast settings to collar service:', wsError)
        // Don't fail the request if WebSocket broadcast fails
      }
    }

    return NextResponse.json({
      collar: updatedCollar,
      bleMessages,
      message: 'Settings updated successfully'
    })

  } catch (error: any) {
    console.error('❌ Collar settings API error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'ValidationError', 
          message: 'Invalid settings data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'SettingsUpdateFailed', 
        message: error.message || 'Failed to update collar settings' 
      },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    const collarId = params.id
    console.log('📋 Fetching collar settings for:', collarId)

    // Fetch collar settings
    const { data: collar, error: fetchError } = await supabase
      .from('collars')
      .select('id, nickname, settings, status, battery_level, last_seen')
      .eq('id', collarId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('❌ Collar fetch error:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'CollarNotFound', message: 'Collar not found or access denied' },
          { status: 404 }
        )
      }
      throw new Error('Database error occurred')
    }

    return NextResponse.json({
      collar,
      settings: collar.settings || {}
    })

  } catch (error: any) {
    console.error('❌ Get collar settings error:', error)

    return NextResponse.json(
      { 
        error: 'SettingsFetchFailed', 
        message: error.message || 'Failed to fetch collar settings' 
      },
      { status: 500 }
    )
  }
} 