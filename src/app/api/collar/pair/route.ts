import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs'
import { CollarPairRequestSchema, CollarSchema } from '@/lib/types'
import { supabase } from '@/lib/supabase'

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
    const validatedData = CollarPairRequestSchema.parse(body)

    console.log('🔗 Pairing collar for user:', userId, 'MAC:', validatedData.ble_mac)

    // Check if collar is already paired to another user
    const { data: existingCollar, error: checkError } = await supabase
      .from('collars')
      .select('id, user_id, nickname')
      .eq('ble_mac', validatedData.ble_mac)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      console.error('❌ Database check error:', checkError)
      throw new Error('Database error occurred')
    }

    if (existingCollar && existingCollar.user_id !== userId) {
      return NextResponse.json(
        { 
          error: 'CollarAlreadyPaired', 
          message: 'This collar is already paired to another account' 
        },
        { status: 409 }
      )
    }

    // If collar exists for same user, update it
    if (existingCollar && existingCollar.user_id === userId) {
      const { data: updatedCollar, error: updateError } = await supabase
        .from('collars')
        .update({
          nickname: validatedData.nickname,
          status: 'CONNECTED',
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
      user_id: userId,
      ble_mac: validatedData.ble_mac,
      nickname: validatedData.nickname,
      status: 'CONNECTED' as const,
      last_seen: new Date().toISOString(),
      settings: {
        alert_mode: 'BUZZER' as const,
        sensitivity: 50,
        battery_threshold: 20,
        heartbeat_interval: 30,
        location_accuracy: 'MEDIUM' as const,
      },
    }

    const { data: collar, error: insertError } = await supabase
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
    const validatedCollar = CollarSchema.parse(collar)

    return NextResponse.json(validatedCollar, { status: 201 })

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