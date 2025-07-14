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
        return mongoose;
      });
    } catch (err) {
      cached.promise = null;
      throw err;
    }
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;
