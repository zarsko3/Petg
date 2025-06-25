import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { CollarSchema } from '@/lib/types'
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

    console.log('📋 Fetching collars for user:', userId)

    // Fetch user's collars
    const { data: collars, error: fetchError } = await supabase
      .from('collars')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (fetchError) {
      console.error('❌ Collars fetch error:', fetchError)
      throw new Error('Database error occurred')
    }

    console.log(`✅ Found ${collars?.length || 0} collars for user`)

    // Validate and return collars
    const validatedCollars = (collars || []).map(collar => {
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
    // Check authentication
    const { userId } = auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

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