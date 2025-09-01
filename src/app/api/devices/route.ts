import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { deviceSchema, DeviceStatus } from '@/lib/schema'
import { auth } from '@clerk/nextjs'
import { z } from 'zod'

// GET /api/devices - List devices (with optional filtering)
export async function GET(request: Request) {
  try {
    const { userId } = auth()
    const { searchParams } = new URL(request.url)
    
    // Parse query parameters
    const status = searchParams.get('status')
    const deviceId = searchParams.get('device_id')
    const includeUnclaimed = searchParams.get('include_unclaimed') === 'true'
    
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database client not initialized' }, { status: 500 })
    }

    let query = supabaseAdmin.from('devices').select('*')

    // Apply filters
    if (deviceId) {
      query = query.eq('id', deviceId)
    }
    if (status) {
      query = query.eq('status', status)
    }
    
    // If user is authenticated, show their devices + unclaimed if requested
    if (userId) {
      if (includeUnclaimed) {
        query = query.or(`owner_user_id.eq.${userId},status.eq.${DeviceStatus.UNCLAIMED}`)
      } else {
        query = query.eq('owner_user_id', userId)
      }
    } else {
      // Guest mode - only show unclaimed devices
      query = query.eq('status', DeviceStatus.UNCLAIMED)
    }

    const { data: devices, error } = await query
      .order('last_seen_at', { ascending: false })

    if (error) {
      console.error('Error fetching devices:', error)
      return NextResponse.json({ error: 'Failed to fetch devices' }, { status: 500 })
    }

    return NextResponse.json({ devices })

  } catch (error) {
    console.error('Error in GET /api/devices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/devices/claim - Claim a device
export async function POST(request: Request) {
  try {
    const { userId } = auth()
    
    // Must be authenticated to claim a device
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database client not initialized' }, { status: 500 })
    }

    // Validate request body
    const body = await request.json()
    const claimSchema = z.object({
      device_id: z.string().min(1),
      claim_code: z.string().min(6).max(12)
    })
    
    const { device_id, claim_code } = claimSchema.parse(body)

    // Check if device exists and is unclaimed
    const { data: device, error: fetchError } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .single()

    if (fetchError || !device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    if (device.status !== DeviceStatus.UNCLAIMED) {
      return NextResponse.json({ error: 'Device is already claimed' }, { status: 400 })
    }

    if (device.claim_code !== claim_code) {
      return NextResponse.json({ error: 'Invalid claim code' }, { status: 400 })
    }

    // Update device status and owner
    const { error: updateError } = await supabaseAdmin
      .from('devices')
      .update({
        status: DeviceStatus.CLAIMED,
        owner_user_id: userId,
        claim_code: null // Clear claim code after successful claim
      })
      .eq('id', device_id)

    if (updateError) {
      console.error('Error updating device:', updateError)
      return NextResponse.json({ error: 'Failed to claim device' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Device claimed successfully',
      device_id
    })

  } catch (error) {
    console.error('Error in POST /api/devices/claim:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/devices/:id - Update device name or other user-editable fields
export async function PATCH(request: Request) {
  try {
    const { userId } = auth()
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database client not initialized' }, { status: 500 })
    }

    // Validate request body
    const body = await request.json()
    const updateSchema = z.object({
      device_id: z.string().min(1),
      name: z.string().min(1).max(50)
    })
    
    const { device_id, name } = updateSchema.parse(body)

    // Check if device exists and belongs to user
    const { data: device, error: fetchError } = await supabaseAdmin
      .from('devices')
      .select('*')
      .eq('id', device_id)
      .eq('owner_user_id', userId)
      .single()

    if (fetchError || !device) {
      return NextResponse.json({ error: 'Device not found' }, { status: 404 })
    }

    // Update device name
    const { error: updateError } = await supabaseAdmin
      .from('devices')
      .update({ name })
      .eq('id', device_id)

    if (updateError) {
      console.error('Error updating device:', updateError)
      return NextResponse.json({ error: 'Failed to update device' }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Device updated successfully',
      device_id
    })

  } catch (error) {
    console.error('Error in PATCH /api/devices:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
