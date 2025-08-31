import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { CollarSchema } from '@/lib/types'
import { supabaseAdmin, supabaseConfig } from '@/lib/supabase'
import { GUEST_DEVICE_ID } from '@/lib/constants'

// Guest mode collar data
const GUEST_COLLAR = {
  id: GUEST_DEVICE_ID,
  device_id: GUEST_DEVICE_ID,
  name: 'Guest Collar',
  mac_addr: '00:00:00:00:00:01',
  owner_id: 'guest',
  status: 'offline',
  battery_level: 100,
  firmware_ver: '1.0.0',
  last_seen: new Date().toISOString(),
  settings: {
    alert_mode: 'BUZZER',
    sensitivity: 50,
    battery_threshold: 20,
    heartbeat_interval: 30,
    location_accuracy: 'MEDIUM',
  },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
}

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabaseConfig.hasServiceKey || !supabaseAdmin) {
      console.log('⚠️ Supabase admin not configured, using guest mode')
      return NextResponse.json([GUEST_COLLAR])
    }

    // Check authentication with Next.js 15 compatible approach
    let userId = null
    try {
      const authResult = await auth()
      userId = authResult?.userId || null
    } catch (error) {
      console.log('⚠️ Auth not available, using guest mode')
    }

    // If no authenticated user, return guest collar
    if (!userId) {
      console.log('📋 No authenticated user, returning guest collar')
      return NextResponse.json([GUEST_COLLAR])
    }

    console.log('📋 Fetching collars for user:', userId)

    // Fetch user's collars
    const { data: collars, error: fetchError } = await supabaseAdmin
      .from('collars')
      .select('*')
      .eq('owner_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Collars fetch error:', fetchError)
      // Fallback to guest mode
      return NextResponse.json([GUEST_COLLAR])
    }

    console.log(`✅ Found ${collars?.length || 0} collars for user`)

    // If no collars found, return guest collar
    if (!collars || collars.length === 0) {
      console.log('📋 No collars found, returning guest collar')
      return NextResponse.json([GUEST_COLLAR])
    }

    // Validate and return collars
    const validatedCollars = (collars || []).map((collar: any) => {
      try {
        return CollarSchema.parse(collar)
      } catch (error) {
        console.warn('⚠️ Invalid collar data:', collar.id, error)
        return null
      }
    }).filter(Boolean)

    return NextResponse.json(validatedCollars)

  } catch (error: any) {
    console.error('❌ Get collars API error:', error)
    // Fallback to guest mode on error
    return NextResponse.json([GUEST_COLLAR])
  }
}

export async function POST(request: NextRequest) {
  try {
    // This endpoint is handled by /api/collar/pair for new collar creation
    return NextResponse.json(
      { 
        error: 'UseCollarPairEndpoint', 
        message: 'Use /api/collar/pair endpoint to pair new collars' 
      },
      { status: 400 }
    )

  } catch (error: any) {
    console.error('❌ Post collars API error:', error)

    return NextResponse.json(
      { 
        error: 'InvalidRequest', 
        message: error.message || 'Invalid request' 
      },
      { status: 400 }
    )
  }
}