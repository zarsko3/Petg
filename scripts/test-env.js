#!/usr/bin/env node

/**
 * Environment Variables Test Script
 * Tests if .env.local is loading properly
 */

require('dotenv').config({ path: '.env.local' });

console.log('🔧 Environment Variables Test\n');

console.log('📋 Environment Variables:');
console.log('   NODE_ENV:', process.env.NODE_ENV);
console.log('   NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('   NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET ✅' : 'MISSING ❌');
console.log('   SUPABASE_SERVICE_ROLE_KEY:', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET ✅' : 'MISSING ❌');
console.log('   SUPABASE_JWT_SECRET:', process.env.SUPABASE_JWT_SECRET ? 'SET ✅' : 'MISSING ❌');

console.log('\n🔐 Clerk Configuration:');
console.log('   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:', process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? 'SET ✅' : 'MISSING ❌');
console.log('   CLERK_SECRET_KEY:', process.env.CLERK_SECRET_KEY ? 'SET ✅' : 'MISSING ❌');

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n🧪 Testing Supabase Connection...');
  
  const { createClient } = require('@supabase/supabase-js');
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  
  supabase.from('collars').select('count').limit(0)
    .then(({ data, error }) => {
      if (error) {
        if (error.code === '42P01') {
          console.log('❌ Tables not found - need to apply migration');
        } else {
          console.log('✅ Connection successful - database reachable');
        }
      } else {
        console.log('✅ Connection successful - tables exist');
      }
    })
    .catch(err => {
      console.log('❌ Connection failed:', err.message);
    });
} else {
  console.log('\n❌ Cannot test connection - missing environment variables');
} 