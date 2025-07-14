/**
 * Global setup for Jest tests
 * This file runs once before all test suites
 */

module.exports = async () => {
  // Set timezone to UTC for consistent date/time testing
  process.env.TZ = 'UTC';
  
  // Set NODE_ENV to test
  process.env.NODE_ENV = 'test';
  
  // Mock environment variables for testing
  process.env.NEXTAUTH_URL = 'http://localhost:3000';
  process.env.NEXTAUTH_SECRET = 'test-secret';
  
  // Mock database URLs
  process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
  process.env.SUPABASE_URL = 'https://test.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon-key';
  
  // Mock Clerk keys
  process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = 'pk_test_mock';
  process.env.CLERK_SECRET_KEY = 'sk_test_mock';
  
  // Mock WebSocket and MQTT settings
  process.env.MQTT_BROKER_URL = 'ws://localhost:1883';
  process.env.WEBSOCKET_URL = 'ws://localhost:3001';
  
  // Mock API keys
  process.env.OPENAI_API_KEY = 'test-openai-key';
  
  console.log('🧪 Jest Global Setup Complete');
}; 