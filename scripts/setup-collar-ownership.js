#!/usr/bin/env node

/**
 * Comprehensive Collar Ownership Setup Script
 * 
 * This script handles collar ownership setup with multiple scenarios:
 * 1. User exists: Assigns collar to zarsko2@gmail.com
 * 2. User doesn't exist: Creates placeholder collar and provides instructions
 * 3. Updates existing collars to use user-scoped MQTT topics
 */

require('dotenv').config({ path: '.env.local' });
const { clerkClient } = require('@clerk/clerk-sdk-node');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const TARGET_EMAIL = 'zarsko2@gmail.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Demo collar data
const DEMO_COLLAR = {
  mac_addr: '00:1B:44:11:3A:B7',
  name: 'Buddy\'s Smart Collar',
  device_id: 'pet-collar-001',
  firmware_ver: '1.0.0',
  status: 'online',
  battery_level: 85,
  ip_address: '192.168.1.35', // Your ESP32 IP
  settings: {
    alert_mode: 'BUZZER',
    sensitivity: 75,
    battery_threshold: 20,
    heartbeat_interval: 30,
    location_accuracy: 'MEDIUM'
  }
};

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkClerkUser() {
  try {
    const users = await clerkClient.users.getUserList({
      emailAddress: [TARGET_EMAIL]
    });

    if (users.data && users.data.length > 0) {
      return users.data[0];
    }
    return null;
  } catch (error) {
    console.warn('⚠️ Could not check Clerk users:', error.message);
    return null;
  }
}

async function createPlaceholderCollar() {
  console.log('🔨 Creating placeholder collar in database...');
  
  // Use a placeholder UUID that we'll update later
  const placeholderUserId = '00000000-0000-0000-0000-000000000000';
  
  const collarData = {
    ...DEMO_COLLAR,
    owner_id: placeholderUserId,
    last_seen: new Date().toISOString(),
  };

  const { data: collar, error } = await supabase
    .from('collars')
    .insert(collarData)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create collar: ${error.message}`);
  }

  return collar;
}

async function assignCollarToUser(userId) {
  console.log('🔄 Assigning/updating collar ownership...');
  
  // First, check if collar already exists
  const { data: existingCollar, error: fetchError } = await supabase
    .from('collars')
    .select('*')
    .eq('mac_addr', DEMO_COLLAR.mac_addr)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw new Error(`Database error: ${fetchError.message}`);
  }

  if (existingCollar) {
    // Update existing collar
    const { data: updatedCollar, error: updateError } = await supabase
      .from('collars')
      .update({
        owner_id: userId,
        ...DEMO_COLLAR,
        last_seen: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existingCollar.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Failed to update collar: ${updateError.message}`);
    }

    return updatedCollar;
  } else {
    // Create new collar
    const collarData = {
      ...DEMO_COLLAR,
      owner_id: userId,
      last_seen: new Date().toISOString(),
    };

    const { data: newCollar, error: createError } = await supabase
      .from('collars')
      .insert(collarData)
      .select()
      .single();

    if (createError) {
      throw new Error(`Failed to create collar: ${createError.message}`);
    }

    return newCollar;
  }
}

async function updateCollarOwnership(newUserId) {
  console.log('🔄 Updating collar ownership to new user...');
  
  const { data: updatedCollar, error } = await supabase
    .from('collars')
    .update({
      owner_id: newUserId,
      updated_at: new Date().toISOString(),
    })
    .eq('mac_addr', DEMO_COLLAR.mac_addr)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update collar ownership: ${error.message}`);
  }

  return updatedCollar;
}

async function verifySetup(userId) {
  console.log('✅ Verifying collar setup...');
  
  const { data: userCollars, error } = await supabase
    .from('collars')
    .select('*')
    .eq('owner_id', userId);

  if (error) {
    throw new Error(`Verification failed: ${error.message}`);
  }

  return userCollars;
}

function displayMQTTTopics(collar, userId) {
  console.log('\n📡 MQTT Topic Structure:');
  console.log('The collar firmware should publish to these user-scoped topics:');
  console.log('');
  console.log(`📊 Collar: ${collar.name} (${collar.mac_addr})`);
  console.log(`   Status:    users/${userId}/collars/${collar.id}/status`);
  console.log(`   Telemetry: users/${userId}/collars/${collar.id}/telemetry`);
  console.log(`   Location:  users/${userId}/collars/${collar.id}/location`);
  console.log(`   Alerts:    users/${userId}/collars/${collar.id}/alerts`);
  console.log(`   Commands:  users/${userId}/collars/${collar.id}/commands`);
}

function displayFirmwareUpdate(collar, userId) {
  console.log('\n🔧 Firmware Configuration:');
  console.log('Update your ESP32 firmware with these settings:');
  console.log('');
  console.log('```cpp');
  console.log('// User-scoped MQTT topics');
  console.log(`String COLLAR_OWNER_ID = "${userId}";`);
  console.log(`String COLLAR_ID = "${collar.id}";`);
  console.log(`String DEVICE_ID = "${collar.device_id}";`);
  console.log('');
  console.log('// Topic building function');
  console.log('String buildTopic(String suffix) {');
  console.log('  return "users/" + COLLAR_OWNER_ID + "/collars/" + COLLAR_ID + "/" + suffix;');
  console.log('}');
  console.log('');
  console.log('// Usage in firmware:');
  console.log('// mqtt.publish(buildTopic("telemetry").c_str(), payload);');
  console.log('// mqtt.publish(buildTopic("status").c_str(), statusJson);');
  console.log('```');
}

async function main() {
  console.log('🚀 Starting comprehensive collar ownership setup...');
  console.log(`📧 Target email: ${TARGET_EMAIL}\n`);

  try {
    // Step 1: Check if target user exists in Clerk
    console.log('📋 Step 1: Checking for existing Clerk user...');
    const clerkUser = await checkClerkUser();

    if (clerkUser) {
      console.log(`✅ Found Clerk user: ${clerkUser.id}`);
      console.log(`   Email: ${clerkUser.emailAddresses[0]?.emailAddress}`);
      
      // Step 2: Assign collar to existing user
      const collar = await assignCollarToUser(clerkUser.id);
      console.log(`✅ Collar assigned to user successfully!`);
      console.log(`   Collar ID: ${collar.id}`);
      
      // Step 3: Verify setup
      const userCollars = await verifySetup(clerkUser.id);
      console.log(`✅ User now owns ${userCollars.length} collar(s)`);
      
      // Display MQTT topics and firmware config
      displayMQTTTopics(collar, clerkUser.id);
      displayFirmwareUpdate(collar, clerkUser.id);

      return { success: true, action: 'assigned', collar, userId: clerkUser.id };
    } else {
      console.log('❌ No Clerk user found with that email.');
      console.log('\n🎯 Creating placeholder collar setup...');
      
      // Step 2: Create placeholder collar
      const collar = await createPlaceholderCollar();
      console.log(`✅ Placeholder collar created: ${collar.id}`);
      console.log(`   MAC: ${collar.mac_addr}`);
      console.log(`   Device ID: ${collar.device_id}`);

      // Instructions for the user
      console.log('\n📋 Next Steps:');
      console.log('1. Sign up for an account:');
      console.log(`   → Visit: http://localhost:3000/sign-up`);
      console.log(`   → Sign up with: ${TARGET_EMAIL}`);
      console.log('   → Complete email verification');
      console.log('');
      console.log('2. Run the ownership update:');
      console.log(`   → node scripts/assign-collar-owner.js`);
      console.log('');
      console.log('3. Alternative - Manual Assignment:');
      console.log('   → If you have a different email/user, update TARGET_EMAIL in the script');
      
      // Create update script for later use
      console.log('\n💡 Or run this command after signing up:');
      console.log(`   node -e "require('./scripts/setup-collar-ownership.js').updateExistingCollar('${TARGET_EMAIL}')"`);

      return { success: true, action: 'placeholder', collar };
    }

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    return { success: false, error: error.message };
  }
}

// Export function to update existing collar when user signs up
async function updateExistingCollar(email) {
  console.log(`🔄 Updating collar ownership for ${email}...`);
  
  try {
    const clerkUser = await checkClerkUser();
    if (!clerkUser) {
      throw new Error(`User ${email} not found in Clerk`);
    }

    const collar = await updateCollarOwnership(clerkUser.id);
    const userCollars = await verifySetup(clerkUser.id);
    
    console.log(`✅ Collar ownership updated successfully!`);
    console.log(`   User: ${clerkUser.id}`);
    console.log(`   Collars: ${userCollars.length}`);
    
    displayMQTTTopics(collar, clerkUser.id);
    displayFirmwareUpdate(collar, clerkUser.id);
    
    return { success: true, collar, userId: clerkUser.id };
  } catch (error) {
    console.error('❌ Update failed:', error.message);
    return { success: false, error: error.message };
  }
}

if (require.main === module) {
  main()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Collar setup completed successfully!');
        
        if (result.action === 'assigned') {
          console.log('\n🔥 Ready to test:');
          console.log('   1. Sign in to the app as zarsko2@gmail.com');
          console.log('   2. The collar should appear in the dashboard');
          console.log('   3. Other accounts will NOT see this collar');
        } else if (result.action === 'placeholder') {
          console.log('\n🔥 Next: Sign up with zarsko2@gmail.com to complete setup');
        }
      } else {
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { main, updateExistingCollar }; 