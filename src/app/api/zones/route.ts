import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { ZoneSchema, ZoneCreateSchema } from '@/lib/types'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    console.log('📋 Fetching zones for user:', userId)

    // Fetch user's zones
    const { data: zones, error: fetchError } = await supabase
      .from('zones')
      .select('*')
      .eq('user_id', userId)
      .eq('active', true)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Zones fetch error:', fetchError)
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

    return NextResponse.json(validatedZones)

  } catch (error: any) {
    console.error('❌ Get zones API error:', error)

    return NextResponse.json(
      { 
        error: 'ZonesFetchFailed', 
        message: error.message || 'Failed to fetch zones' 
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