import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Pet from '@/models/Pet';
import { withErrorHandler, ValidationError, NotFoundError } from '@/lib/api-handlers';

export const GET = withErrorHandler(async (request: NextRequest) => {
  // Connect to the database
  await dbConnect();
  
  // Get the owner from query parameters
  const searchParams = request.nextUrl.searchParams;
  const owner = searchParams.get('owner');
  
  // Filter by owner if provided
  const query = owner ? { owner } : {};
  
  // Get all pets
  const pets = await Pet.find(query);
  
  return NextResponse.json({ success: true, data: pets });
});

export const POST = withErrorHandler(async (request: NextRequest) => {
  // Connect to the database
  await dbConnect();
  
  // Parse the request body
  const body = await request.json();
  
  // Validate required fields
  if (!body.name || !body.owner || !body.deviceId) {
    throw new ValidationError('Missing required fields: name, owner, deviceId');
  }
  
  // Check if a pet with the same deviceId already exists
  const existingPet = await Pet.findOne({ deviceId: body.deviceId });
  if (existingPet) {
    throw new ValidationError('A pet with this deviceId already exists');
  }
  
  // Create a new pet
  const pet = await Pet.create(body);
  
  return NextResponse.json({ success: true, data: pet }, { status: 201 });
}); 