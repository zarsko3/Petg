import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { CollarPairRequestSchema, CollarSchema } from '@/lib/types'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Authentication required' },
        { status: 401 }
      )
    }

    // Check if Supabase admin is available
    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: 'DatabaseNotConfigured', message: 'Database not properly configured' },
        { status: 500 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const validatedData = CollarPairRequestSchema.parse(body)

    console.log('🔗 Pairing collar for user:', userId, 'MAC:', validatedData.ble_mac)

    // Check if collar is already paired to another user
    const macAddress = validatedData.ble_mac
    const { data: existingCollar, error: checkError } = await supabaseAdmin
      .from('collars')
      .select('id, owner_id, name')
      .eq('mac_addr', macAddress)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Database check error:', checkError)
      throw new Error('Database error occurred')
    }

    if (existingCollar && existingCollar.owner_id !== userId) {
      return NextResponse.json(
        { 
          error: 'CollarAlreadyPaired', 
          message: 'This collar is already paired to another account' 
        },
        { status: 409 }
      )
    }

    // If collar exists for same user, update it
    if (existingCollar && existingCollar.owner_id === userId) {
      const { data: updatedCollar, error: updateError } = await supabaseAdmin
        .from('collars')
        .update({
          name: validatedData.nickname,
          status: 'online',
          last_seen: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingCollar.id)
        .select()
        .single()

      if (updateError) {
        console.error('❌ Collar update error:', updateError)
        throw new Error('Failed to update collar')
      }

      console.log('✅ Collar updated:', updatedCollar)
      return NextResponse.json(updatedCollar)
    }

    // Create new collar record
    const newCollar = {
      owner_id: userId,
      mac_addr: macAddress,
      name: validatedData.nickname || 'Pet Collar',
      device_id: `collar-${Date.now()}`,
      firmware_ver: '1.0.0',
      status: 'online' as const,
      battery_level: 100,
      last_seen: new Date().toISOString(),
      settings: {
        alert_mode: 'BUZZER' as const,
        sensitivity: 50,
        battery_threshold: 20,
        heartbeat_interval: 30,
        location_accuracy: 'MEDIUM' as const,
      },
    }

    const { data: collar, error: insertError } = await supabaseAdmin
      .from('collars')
      .insert(newCollar)
      .select()
      .single()

    if (insertError) {
      console.error('❌ Collar creation error:', insertError)
      throw new Error('Failed to create collar record')
    }

    console.log('✅ Collar paired successfully:', collar)

    // Validate response with schema
    try {
      const validatedCollar = CollarSchema.parse(collar)
      return NextResponse.json(validatedCollar, { status: 201 })
    } catch (validationError) {
      // Return the collar even if schema validation fails for now
      console.warn('⚠️ Schema validation failed, returning raw collar data:', validationError)
      return NextResponse.json(collar, { status: 201 })
    }

  } catch (error: any) {
    console.error('❌ Collar pairing API error:', error)

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { 
          error: 'ValidationError', 
          message: 'Invalid request data',
          details: error.errors 
        },
        { status: 400 }
      )
    }

    const statusCode = error.message?.includes('already paired') ? 409 : 500
    
    return NextResponse.json(
      { 
        error: 'CollarPairingFailed', 
        message: error.message || 'Failed to pair collar' 
      },
      { status: statusCode }
    )
  }
} 