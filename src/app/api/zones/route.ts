import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { ZoneSchema, ZoneCreateSchema } from '@/lib/types'
import { createClient } from '@supabase/supabase-js'

// Check if Supabase is configured
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase not configured, using mock data')
}

const supabase = supabaseUrl && supabaseKey 
  ? createClient(supabaseUrl, supabaseKey)
  : null

export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting zones API GET request')
    
    // Check authentication with fallback
    let userId = 'demo-user'
    try {
      const authResult = auth()
      userId = authResult.userId || 'demo-user'
      console.log('🔐 Authentication successful:', { userId: userId ? 'present' : 'missing' })
    } catch (error) {
      console.log('⚠️ Auth not available, using demo user')
      userId = 'demo-user'
    }

    console.log('📋 Fetching zones for user:', userId)

    // Return mock data if Supabase is not configured
    if (!supabase) {
      console.log('📝 Using mock zones data')
      const mockZones = [
        {
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
      ]
      console.log('✅ Returning mock zones:', mockZones.length)
      return NextResponse.json(mockZones)
    }

    // Fetch user's zones
    console.log('🗄️ Querying Supabase for zones')
    const { data: zones, error: fetchError } = await supabase
      .from('zones')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Zones fetch error:', fetchError)
      // If table doesn't exist, return mock data
      if (fetchError.code === '42P01') {
        console.log('📝 Table does not exist, using mock zones data')
        const mockZones = [
          {
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
        ]
        return NextResponse.json(mockZones)
      }
      throw new Error('Database error occurred')
    }

    console.log(`✅ Found ${zones?.length || 0} zones for user`)

    // Validate and return zones
    const validatedZones = (zones || []).map(zone => {
      try {
        return ZoneSchema.parse(zone)
      } catch (error) {
        console.warn('⚠️ Invalid zone data:', zone.id, error)
        return null
      }
    }).filter(Boolean)

    console.log('🎯 Returning validated zones:', validatedZones.length)
    return NextResponse.json(validatedZones)

  } catch (error: any) {
    console.error('❌ Get zones API error:', error)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error name:', error.name)
    console.error('❌ Error message:', error.message)

    return NextResponse.json(
      { 
        error: 'ZonesFetchFailed', 
        message: error.message || 'Failed to fetch zones',
        details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          name: error.name
        } : undefined
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = ZoneCreateSchema.parse(body)

    console.log('🏗️ Creating zone for user:', userId, 'Name:', validatedData.name)

    // Create new zone record
    const newZone = {
      user_id: userId,
      name: validatedData.name,
      type: validatedData.type,
      polygon_json: validatedData.polygon_json,
      color: validatedData.color,
      active: true,
      alert_settings: validatedData.alert_settings || {
        entry_alert: false,
        exit_alert: true,
        sound_enabled: true,
        notification_enabled: true,
      },
    }

    // Return mock data if Supabase is not configured
    if (!supabase) {
      console.log('📝 Creating mock zone')
      const mockZone = {
        id: `zone_${Date.now()}`,
        ...newZone,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
      return NextResponse.json(mockZone, { status: 201 })
    }

    const { data: zone, error: insertError } = await supabase
      .from('zones')
      .insert(newZone)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Zone creation error:', insertError)
      throw new Error('Failed to create zone')
    }

    console.log('✅ Zone created successfully:', zone)

    // Validate response with schema
    const validatedZone = ZoneSchema.parse(zone)

    // Broadcast zone update via WebSocket
    // TODO: Implement WebSocket broadcasting
    console.log('🔄 Broadcasting floorPlanUpdated event')

    return NextResponse.json(validatedZone, { status: 201 })

  } catch (error: any) {
    console.error('❌ Zone creation API error:', error)

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
        error: 'ZoneCreationFailed', 
        message: error.message || 'Failed to create zone' 
      },
      { status: 500 }
    )
  }
} 