import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Get the deviceId from query parameters
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');

    // If no deviceId is provided, return all collars with their latest location
    if (!deviceId) {
      const { data: collars, error } = await supabaseAdmin!
        .from('collars')
        .select(`
          id,
          name,
          device_id,
          battery_level,
          collar_locations (
            x,
            y,
            recorded_at
          )
        `)
        .order('recorded_at', { foreignTable: 'collar_locations', ascending: false })
        .limit(1, { foreignTable: 'collar_locations' });

      if (error) {
        console.error('Error fetching collars:', error);
        return NextResponse.json(
          { success: false, message: 'Failed to fetch collar data', error: error.message },
          { status: 500 }
        );
      }

      // Transform the data to match the expected format
      const transformedData = collars?.map(collar => ({
        name: collar.name,
        deviceId: collar.device_id,
        batteryLevel: collar.battery_level,
        lastLocation: collar.collar_locations?.[0] ? {
          x: collar.collar_locations[0].x,
          y: collar.collar_locations[0].y,
          timestamp: collar.collar_locations[0].recorded_at
        } : undefined
      })) || [];

      return NextResponse.json({ success: true, data: transformedData });
    }

    // Find the collar with the matching deviceId and its latest location
    const { data: collar, error: collarError } = await supabaseAdmin!
      .from('collars')
      .select(`
        id,
        name,
        device_id,
        battery_level,
        collar_locations (
          x,
          y,
          recorded_at
        )
      `)
      .eq('device_id', deviceId)
      .order('recorded_at', { foreignTable: 'collar_locations', ascending: false })
      .limit(1, { foreignTable: 'collar_locations' })
      .single();

    if (collarError || !collar) {
      console.error('Error fetching collar:', collarError);
      return NextResponse.json(
        { success: false, message: 'Collar not found' },
        { status: 404 }
      );
    }

    // Transform the data to match the expected format
    const transformedCollar = {
      name: collar.name,
      deviceId: collar.device_id,
      batteryLevel: collar.battery_level,
      lastLocation: collar.collar_locations?.[0] ? {
        x: collar.collar_locations[0].x,
        y: collar.collar_locations[0].y,
        timestamp: collar.collar_locations[0].recorded_at
      } : undefined
    };

    return NextResponse.json({ success: true, data: transformedCollar });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch location data', error: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { deviceId, x, y } = body;

    if (!deviceId || typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Invalid request data' },
        { status: 400 }
      );
    }

    // First, find the collar by device_id
    const { data: collar, error: findError } = await supabaseAdmin!
      .from('collars')
      .select('id, owner_id')
      .eq('device_id', deviceId)
      .single();

    if (findError || !collar) {
      console.error('Error finding collar:', findError);
      return NextResponse.json(
        { success: false, message: 'Collar not found' },
        { status: 404 }
      );
    }

    // Insert the new location
    const { data: location, error: insertError } = await supabaseAdmin!
      .from('collar_locations')
      .insert({
        collar_id: collar.id,
        owner_id: collar.owner_id,
        x: x,
        y: y,
        recorded_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting location:', insertError);
      return NextResponse.json(
        { success: false, message: 'Failed to update location data', error: insertError.message },
        { status: 500 }
      );
    }

    // Get the updated collar data
    const { data: updatedCollar, error: fetchError } = await supabaseAdmin!
      .from('collars')
      .select(`
        id,
        name,
        device_id,
        battery_level,
        collar_locations (
          x,
          y,
          recorded_at
        )
      `)
      .eq('device_id', deviceId)
      .order('recorded_at', { foreignTable: 'collar_locations', ascending: false })
      .limit(1, { foreignTable: 'collar_locations' })
      .single();

    if (fetchError) {
      console.error('Error fetching updated collar:', fetchError);
      return NextResponse.json(
        { success: false, message: 'Location updated but failed to fetch updated data', error: fetchError.message },
        { status: 500 }
      );
    }

    // Transform the data to match the expected format
    const transformedCollar = {
      name: updatedCollar.name,
      deviceId: updatedCollar.device_id,
      batteryLevel: updatedCollar.battery_level,
      lastLocation: updatedCollar.collar_locations?.[0] ? {
        x: updatedCollar.collar_locations[0].x,
        y: updatedCollar.collar_locations[0].y,
        timestamp: updatedCollar.collar_locations[0].recorded_at
      } : {
        x: x,
        y: y,
        timestamp: new Date().toISOString()
      }
    };

    return NextResponse.json({ success: true, data: transformedCollar });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update location data', error: String(error) },
      { status: 500 }
    );
  }
} 