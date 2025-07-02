import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { CollarSchema } from '@/lib/types'
import { supabaseAdmin, supabaseConfig } from '@/lib/supabase'

// Mock data for demo when Supabase not configured
const DEMO_COLLARS = [
  {
    id: 'demo-collar-1',
    user_id: 'demo-user',
    name: 'Buddy\'s Collar',
    mac_address: '00:1B:44:11:3A:B7',
    paired_at: new Date().toISOString(),
    last_seen: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
    battery_level: 85,
    is_active: true,
    settings: {
      alert_mode: 'BUZZER_VIBRATION',
      sensitivity: 75,
      auto_alerts: true
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

export async function GET(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!supabaseConfig.hasServiceKey || !supabaseAdmin) {
      console.log('⚠️ Supabase admin not configured, using mock data')
      return NextResponse.json(DEMO_COLLARS)
    }

    // Check authentication
    let userId = null
    try {
      const authResult = auth()
      userId = authResult.userId
    } catch (error) {
      console.log('⚠️ Auth not available, using demo data')
    }

    // If no authenticated user, return demo data
    if (!userId) {
      console.log('📋 No authenticated user, returning demo collars')
      return NextResponse.json(DEMO_COLLARS)
    }

    console.log('📋 Fetching collars for user:', userId)

    // Fetch user's collars
    const { data: collars, error: fetchError } = await supabaseAdmin
      .from('collars')
      .select('*')
      .eq('owner_id', userId) // Updated to match new schema
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Collars fetch error:', fetchError)
      // Fallback to demo data
      return NextResponse.json(DEMO_COLLARS)
    }

    console.log(`✅ Found ${collars?.length || 0} collars for user`)

    // If no collars found, return demo collars
    if (!collars || collars.length === 0) {
      console.log('📋 No collars found, returning demo collars')
      return NextResponse.json(DEMO_COLLARS)
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

    return NextResponse.json(
      { 
        error: 'CollarsFetchFailed', 
        message: error.message || 'Failed to fetch collars' 
      },
      { status: 500 }
    )
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