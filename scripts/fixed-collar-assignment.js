#!/usr/bin/env node

/**
 * Fixed Collar Assignment Script
 * 
 * Works with the actual database schema and includes debugging for Clerk user lookup
 */

require('dotenv').config({ path: '.env.local' });
const { clerkClient } = require('@clerk/clerk-sdk-node');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const TARGET_EMAIL = 'zarsko2@gmail.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('🔧 Environment Check:');
console.log(`   - Supabase URL: ${SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
console.log(`   - Supabase Service Key: ${SUPABASE_SERVICE_KEY ? '✅ Set' : '❌ Missing'}`);
console.log(`   - Clerk Secret Key: ${process.env.CLERK_SECRET_KEY ? '✅ Set' : '❌ Missing'}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Collar data matching the actual schema
const COLLAR_DATA = {
  mac_addr: '00:1B:44:11:3A:B7',
  name: 'Buddy\'s Smart Collar',
  device_id: 'pet-collar-001',
  firmware_ver: '1.0.0',
  status: 'online',
  battery_level: 85,
  ip_address: '192.168.1.35',
  last_seen: new Date().toISOString()
};

async function debugClerkUsers() {
  console.log('\n🔍 Debugging Clerk Users...');
  
  try {
    // First, try to list all users to see what's available
    console.log('📋 Listing all users...');
    const allUsers = await clerkClient.users.getUserList({
      limit: 20,
      orderBy: '-created_at'
    });

    console.log(`📊 Found ${allUsers.data?.length || 0} total users:`);
    allUsers.data?.forEach((user, index) => {
      const email = user.emailAddresses[0]?.emailAddress || 'No email';
      console.log(`   ${index + 1}. ${user.id} - ${email}`);
    });

    // Now try to find the specific user
    console.log(`\n🎯 Searching for ${TARGET_EMAIL}...`);
    const targetUsers = await clerkClient.users.getUserList({
      emailAddress: [TARGET_EMAIL],
      limit: 10
    });

    if (targetUsers.data && targetUsers.data.length > 0) {
      const user = targetUsers.data[0];
      console.log(`✅ Found target user:`);
      console.log(`   - ID: ${user.id}`);
      console.log(`   - Email: ${user.emailAddresses[0]?.emailAddress}`);
      console.log(`   - Verified: ${user.emailAddresses[0]?.verification?.status}`);
      return user;
    } else {
      console.log(`❌ No user found with email: ${TARGET_EMAIL}`);
      
      // Try different search variations
      console.log('\n🔄 Trying alternative searches...');
      
      // Try searching without array
      try {
        const altSearch = await clerkClient.users.getUserList({
          query: TARGET_EMAIL,
          limit: 10
        });
        console.log(`📋 Query search found ${altSearch.data?.length || 0} users`);
        altSearch.data?.forEach(user => {
          const email = user.emailAddresses[0]?.emailAddress;
          console.log(`   - ${user.id}: ${email}`);
        });
      } catch (error) {
        console.log(`❌ Query search failed: ${error.message}`);
      }

      return null;
    }

  } catch (error) {
    console.error('❌ Clerk API error:', error.message);
    console.error('   - Check your CLERK_SECRET_KEY in .env.local');
    console.error('   - Verify the Clerk application is set up correctly');
    return null;
  }
}

async function createOrUpdateCollar(userId) {
  console.log('\n🔧 Creating/updating collar...');
  
  try {
    // Check if collar already exists
    const { data: existingCollar, error: fetchError } = await supabase
      .from('collars')
      .select('*')
      .eq('mac_addr', COLLAR_DATA.mac_addr)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error(`Database error: ${fetchError.message}`);
    }

    const collarData = {
      ...COLLAR_DATA,
      owner_id: userId,
      updated_at: new Date().toISOString()
    };

    if (existingCollar) {
      // Update existing collar
      console.log(`🔄 Updating existing collar: ${existingCollar.id}`);
      const { data: updatedCollar, error: updateError } = await supabase
        .from('collars')
        .update(collarData)
        .eq('id', existingCollar.id)
        .select()
        .single();

      if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`);
      }

      return updatedCollar;
    } else {
      // Create new collar
      console.log('🆕 Creating new collar...');
      const { data: newCollar, error: createError } = await supabase
        .from('collars')
        .insert(collarData)
        .select()
        .single();

      if (createError) {
        throw new Error(`Creation failed: ${createError.message}`);
      }

      return newCollar;
    }

  } catch (error) {
    console.error('❌ Database operation failed:', error.message);
    throw error;
  }
}

async function verifyCollarOwnership(userId) {
  console.log('\n✅ Verifying collar ownership...');
  
  const { data: userCollars, error } = await supabase
    .from('collars')
    .select('*')
    .eq('owner_id', userId);

  if (error) {
    throw new Error(`Verification failed: ${error.message}`);
  }

  console.log(`📊 User ${userId} owns ${userCollars.length} collar(s):`);
  userCollars.forEach((collar, index) => {
    console.log(`   ${index + 1}. ${collar.name} (${collar.mac_addr}) - ID: ${collar.id}`);
  });

  return userCollars;
}

function displayMQTTConfiguration(collar, userId) {
  console.log('\n📡 MQTT Configuration:');
  console.log('Update your ESP32 firmware to use these user-scoped topics:');
  console.log('');
  console.log('```cpp');
  console.log(`// User and collar identifiers`);
  console.log(`String OWNER_ID = "${userId}";`);
  console.log(`String COLLAR_ID = "${collar.id}";`);
  console.log(`String DEVICE_ID = "${collar.device_id}";`);
  console.log('');
  console.log('// Topic building function');
  console.log('String buildMQTTTopic(String suffix) {');
  console.log('  return "users/" + OWNER_ID + "/collars/" + COLLAR_ID + "/" + suffix;');
  console.log('}');
  console.log('');
  console.log('// Example usage:');
  console.log('// String statusTopic = buildMQTTTopic("status");');
  console.log('// String telemetryTopic = buildMQTTTopic("telemetry");');
  console.log('// String alertsTopic = buildMQTTTopic("alerts");');
  console.log('```');
  console.log('');
  console.log('📋 Topics for this collar:');
  console.log(`   Status:    users/${userId}/collars/${collar.id}/status`);
  console.log(`   Telemetry: users/${userId}/collars/${collar.id}/telemetry`);
  console.log(`   Location:  users/${userId}/collars/${collar.id}/location`);
  console.log(`   Alerts:    users/${userId}/collars/${collar.id}/alerts`);
  console.log(`   Commands:  users/${userId}/collars/${collar.id}/commands`);
}

async function main() {
  console.log('🚀 Fixed Collar Assignment Script');
  console.log(`📧 Target: ${TARGET_EMAIL}\n`);

  try {
    // Step 1: Debug and find Clerk user
    const clerkUser = await debugClerkUsers();
    
    if (!clerkUser) {
      console.log('\n❌ Cannot proceed without finding the Clerk user.');
      console.log('\n💡 Solutions:');
      console.log('   1. Verify zarsko2@gmail.com has signed up at http://localhost:3000/sign-up');
      console.log('   2. Check if the email is verified in Clerk dashboard');
      console.log('   3. Ensure CLERK_SECRET_KEY is correct in .env.local');
      console.log('   4. Try running: node scripts/list-clerk-users.js');
      return { success: false, error: 'User not found' };
    }

    // Step 2: Create/update collar
    const collar = await createOrUpdateCollar(clerkUser.id);
    console.log(`✅ Collar operation successful: ${collar.id}`);

    // Step 3: Verify ownership
    const userCollars = await verifyCollarOwnership(clerkUser.id);

    // Step 4: Display configuration
    displayMQTTConfiguration(collar, clerkUser.id);

    console.log('\n🎉 Collar assignment completed successfully!');
    console.log('\n🔥 Testing steps:');
    console.log(`   1. Sign in as ${TARGET_EMAIL} at http://localhost:3000`);
    console.log('   2. Navigate to dashboard - collar should appear');
    console.log('   3. Sign in with different account - collar should NOT appear');
    console.log('   4. Update ESP32 firmware with the MQTT topics above');

    return {
      success: true,
      userId: clerkUser.id,
      collar,
      totalCollars: userCollars.length
    };

  } catch (error) {
    console.error('\n💥 Script failed:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  main()
    .then(result => {
      if (!result.success) {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Execution failed:', error);
      process.exit(1);
    });
}

module.exports = { main }; 