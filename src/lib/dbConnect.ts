import mongoose from 'mongoose';

// Define the interface for the global mongoose cache
interface MongooseConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

// Declare mongoose property on global object
declare global {
  var mongooseConnection: MongooseConnection | undefined;
}

// Get MongoDB URI from environment variables or use a fallback for development
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/petg-dev';

// Create the cached connection object if it doesn't exist
// Ensuring that cached is always defined
let cached: MongooseConnection = global.mongooseConnection || { conn: null, promise: null };

// Set the global cache if it doesn't exist
if (!global.mongooseConnection) {
  global.mongooseConnection = cached;
}

async function dbConnect() {
  // If we already have a connection, return it
  if (cached.conn) {
    return cached.conn;
  }

  // No connection exists, create one
  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      // Additional options to handle serverless environments
      serverSelectionTimeoutMS: 5000,
      // Auto create indexes in development, but not in production for performance
      autoIndex: process.env.NODE_ENV !== 'production',
    };

    try {
      cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
        console.log('Connected to MongoDB!');
        // Log information about the database
        const connectionState = mongoose.connection.readyState;
        const stateMap = {
          0: 'disconnected',
          1: 'connected',
          2: 'connecting',
          3: 'disconnecting',
        };
        console.log(`MongoDB connection state: ${stateMap[connectionState as 0 | 1 | 2 | 3]}`);
        console.log(`MongoDB host: ${mongoose.connection.host || 'unknown'}`);
        console.log(`MongoDB database name: ${mongoose.connection.name || 'unknown'}`);

        return mongoose;
      });
    } catch (err) {
      console.error('MongoDB connection error:', err);
      cached.promise = null;
      throw err;
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('Failed to connect to MongoDB:', e);
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
