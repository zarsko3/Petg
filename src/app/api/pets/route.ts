import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { withErrorHandler, ValidationError, NotFoundError } from '@/lib/api-handlers';

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Get the owner from query parameters
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');

  let query = supabaseAdmin!.from('collars').select(`
    id,
    name,
    device_id,
    battery_level,
    status,
    last_seen,
    created_at,
    updated_at,
    collar_locations (
      x,
      y,
      recorded_at
    )
  `);

  // Filter by owner if provided
  if (owner) {
    query = query.eq('owner_id', owner);
  }

  const { data: collars, error } = await query
    .order('recorded_at', { foreignTable: 'collar_locations', ascending: false })
    .limit(1, { foreignTable: 'collar_locations' });

  if (error) {
    throw new Error(`Failed to fetch collars: ${error.message}`);
  }

  // Transform the data to match the expected format
  const transformedData = collars?.map((collar: any) => ({
    id: collar.id,
    name: collar.name,
    owner: collar.owner_id, // Note: This would need to be populated with actual owner info if needed
    deviceId: collar.device_id,
    batteryLevel: collar.battery_level,
    status: collar.status,
    lastLocation: collar.collar_locations?.[0] ? {
      x: collar.collar_locations[0].x,
      y: collar.collar_locations[0].y,
      timestamp: collar.collar_locations[0].recorded_at
    } : undefined,
    createdAt: collar.created_at,
    updatedAt: collar.updated_at
  })) || [];

  return NextResponse.json({ success: true, data: transformedData });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Parse the request body
  const body = await request.json();

  // Validate required fields
  if (!body.name || !body.owner || !body.deviceId) {
    throw new ValidationError('Missing required fields: name, owner, deviceId');
  }

  // Check if a collar with the same deviceId already exists
  const { data: existingCollar, error: checkError } = await supabaseAdmin!
    .from('collars')
    .select('id')
    .eq('device_id', body.deviceId)
    .single();

  if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows returned
    throw new Error(`Failed to check existing collar: ${checkError.message}`);
  }

  if (existingCollar) {
    throw new ValidationError('A collar with this deviceId already exists');
  }

  // Create a new collar
  const { data: collar, error: insertError } = await supabaseAdmin!
    .from('collars')
    .insert({
      name: body.name,
      owner_id: body.owner,
      device_id: body.deviceId,
      battery_level: body.batteryLevel || 100,
      status: 'offline'
    })
    .select(`
      id,
      name,
      owner_id,
      device_id,
      battery_level,
      status,
      created_at,
      updated_at
    `)
    .single();

  if (insertError) {
    throw new Error(`Failed to create collar: ${insertError.message}`);
  }

  // Transform the data to match the expected format
  const transformedCollar = {
    id: collar.id,
    name: collar.name,
    owner: collar.owner_id,
    deviceId: collar.device_id,
    batteryLevel: collar.battery_level,
    status: collar.status,
    createdAt: collar.created_at,
    updatedAt: collar.updated_at
  };

  return NextResponse.json({ success: true, data: transformedCollar }, { status: 201 });
}); 