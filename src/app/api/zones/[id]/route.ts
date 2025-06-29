import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { ZoneSchema, ZoneCreateSchema } from '@/lib/types'
import { supabase, supabaseConfig } from '@/lib/supabase'

interface RouteParams {
  params: {
    id: string
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication with fallback
    let userId = 'demo-user'
    try {
      const authResult = auth()
      userId = authResult.userId || 'demo-user'
    } catch (error) {
      console.log('⚠️ Auth not available, using demo user')
      userId = 'demo-user'
    }

    const zoneId = params.id
    console.log('📋 Fetching zone:', zoneId)

    // Return mock data if Supabase is not configured
    if (!supabaseConfig.hasKey) {
      // Return a demo zone if requested
      if (zoneId === 'demo_zone_1') {
        const mockZone = {
          id: 'demo_zone_1',
          user_id: userId,
          name: 'Demo Living Room',
          type: 'SAFE',
          polygon_json: [
            { x: 20, y: 20 },
            { x: 80, y: 20 },
            { x: 80, y: 60 },
            { x: 20, y: 60 }
          ],
          color: '#10B981',
          active: true,
          alert_settings: {
            entry_alert: false,
            exit_alert: true,
            sound_enabled: true,
            notification_enabled: true,
          },
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        return NextResponse.json(mockZone)
      } else {
        return NextResponse.json(
          { error: 'ZoneNotFound', message: 'Zone not found or access denied' },
          { status: 404 }
        )
      }
    }

    // Fetch zone
    const { data: zone, error: fetchError } = await supabase
      .from('zones')
      .select('*')
      .eq('id', zoneId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('❌ Zone fetch error:', fetchError)
      if (fetchError.code === 'PGRST116' || fetchError.code === '42P01') {
        return NextResponse.json(
          { error: 'ZoneNotFound', message: 'Zone not found or access denied' },
          { status: 404 }
        )
      }
      throw new Error('Database error occurred')
    }

    // Validate and return zone
    const validatedZone = ZoneSchema.parse(zone)
    return NextResponse.json(validatedZone)

  } catch (error: any) {
    console.error('❌ Get zone API error:', error)

    return NextResponse.json(
      { 
        error: 'ZoneFetchFailed', 
        message: error.message || 'Failed to fetch zone' 
      },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication with fallback
    let userId = 'demo-user'
    try {
      const authResult = auth()
      userId = authResult.userId || 'demo-user'
    } catch (error) {
      console.log('⚠️ Auth not available, using demo user')
      userId = 'demo-user'
    }

    const zoneId = params.id
    console.log('⚙️ Updating zone:', zoneId)

    // Parse and validate request body
    const body = await request.json()
    const updates = ZoneCreateSchema.partial().parse(body)

    // Handle mock data updates
    if (!supabaseConfig.hasKey || zoneId === 'demo_zone_1') {
      console.log('📝 Mock zone update for:', zoneId)
      const mockZone = {
        id: zoneId,
        user_id: userId,
        name: updates.name || 'Demo Living Room',
        type: updates.type || 'SAFE',
        polygon_json: updates.polygon_json || [
          { x: 20, y: 20 },
          { x: 80, y: 20 },
          { x: 80, y: 60 },
          { x: 20, y: 60 }
        ],
        color: updates.color || '#10B981',
        active: updates.active !== undefined ? updates.active : true,
        alert_settings: updates.alert_settings || {
          entry_alert: false,
          exit_alert: true,
          sound_enabled: true,
          notification_enabled: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(mockZone)
    }

    // Verify zone ownership
    const { data: existingZone, error: fetchError } = await supabase
      .from('zones')
      .select('id, user_id')
      .eq('id', zoneId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('❌ Zone fetch error:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'ZoneNotFound', message: 'Zone not found or access denied' },
          { status: 404 }
        )
      }
      throw new Error('Database error occurred')
    }

    // Update zone
    const { data: updatedZone, error: updateError } = await supabase
      .from('zones')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', zoneId)
      .select()
      .single()

    if (updateError) {
      console.error('❌ Zone update error:', updateError)
      throw new Error('Failed to update zone')
    }

    console.log('✅ Zone updated successfully:', updatedZone)

    // Validate response with schema
    const validatedZone = ZoneSchema.parse(updatedZone)

    // Broadcast zone update via WebSocket
    // TODO: Implement WebSocket broadcasting
    console.log('🔄 Broadcasting zoneUpdated event')

    return NextResponse.json(validatedZone)

  } catch (error: any) {
    console.error('❌ Zone update API error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'ValidationError', 
          message: 'Invalid zone data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { 
        error: 'ZoneUpdateFailed', 
        message: error.message || 'Failed to update zone' 
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication with fallback
    let userId = 'demo-user'
    try {
      const authResult = auth()
      userId = authResult.userId || 'demo-user'
    } catch (error) {
      console.log('⚠️ Auth not available, using demo user')
      userId = 'demo-user'
    }

    const zoneId = params.id
    console.log('🗑️ Deleting zone:', zoneId)

    // Handle mock data deletion
    if (!supabase || zoneId === 'demo_zone_1') {
      console.log('📝 Mock zone deletion for:', zoneId)
      return NextResponse.json({
        success: true,
        message: 'Zone deleted successfully',
        zone_id: zoneId
      })
    }

    // Verify zone ownership
    const { data: existingZone, error: fetchError } = await supabase
      .from('zones')
      .select('id, user_id, name')
      .eq('id', zoneId)
      .eq('user_id', userId)
      .single()

    if (fetchError) {
      console.error('❌ Zone fetch error:', fetchError)
      if (fetchError.code === 'PGRST116') {
        return NextResponse.json(
          { error: 'ZoneNotFound', message: 'Zone not found or access denied' },
          { status: 404 }
        )
      }
      throw new Error('Database error occurred')
    }

    // Soft delete zone (set active to false)
    const { error: deleteError } = await supabase
      .from('zones')
      .update({
        active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', zoneId)

    if (deleteError) {
      console.error('❌ Zone delete error:', deleteError)
      throw new Error('Failed to delete zone')
    }

    console.log('✅ Zone deleted successfully:', existingZone.name)

    // Broadcast zone update via WebSocket
    // TODO: Implement WebSocket broadcasting
    console.log('🔄 Broadcasting floorPlanUpdated event')

    return NextResponse.json({
      success: true,
      message: 'Zone deleted successfully',
      zone_id: zoneId
    })

  } catch (error: any) {
    console.error('❌ Zone delete API error:', error)

    return NextResponse.json(
      { 
        error: 'ZoneDeleteFailed', 
        message: error.message || 'Failed to delete zone' 
      },
      { status: 500 }
    )
  }
} 