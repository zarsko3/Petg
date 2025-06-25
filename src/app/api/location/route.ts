import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/dbConnect';
import Pet from '@/models/Pet';

export async function GET(request: NextRequest) {
  try {
    // Connect to the database
    await dbConnect();
    
    // Get the deviceId from query parameters
    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');
    
    // If no deviceId is provided, return all pets
    if (!deviceId) {
      const pets = await Pet.find({}, 'name deviceId lastLocation batteryLevel');
      return NextResponse.json({ success: true, data: pets });
    }
    
    // Find the pet with the matching deviceId
    const pet = await Pet.findOne({ deviceId }, 'name lastLocation batteryLevel');
    
    if (!pet) {
      return NextResponse.json(
        { success: false, message: 'Pet not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: pet });
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
    // Connect to the database
    await dbConnect();
    
    // Parse the request body
    const body = await request.json();
    const { deviceId, x, y } = body;
    
    if (!deviceId || typeof x !== 'number' || typeof y !== 'number') {
      return NextResponse.json(
        { success: false, message: 'Invalid request data' },
        { status: 400 }
      );
    }
    
    // Update the pet's location
    const pet = await Pet.findOneAndUpdate(
      { deviceId },
      { 
        lastLocation: {
          x,
          y,
          timestamp: new Date()
        }
      },
      { new: true }
    );
    
    if (!pet) {
      return NextResponse.json(
        { success: false, message: 'Pet not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({ success: true, data: pet });
  } catch (error) {
    console.error('Error updating location:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update location data', error: String(error) },
      { status: 500 }
    );
  }
} 