#!/usr/bin/env node

/**
 * Collar Ownership Assignment Script
 * 
 * This script:
 * 1. Gets the Clerk user ID for zarsko2@gmail.com
 * 2. Finds existing collars in the database
 * 3. Assigns collar ownership to the specified user
 * 4. Verifies the assignment
 * 
 * Usage: node scripts/assign-collar-owner.js
 */

require('dotenv').config({ path: '.env.local' });
const { clerkClient } = require('@clerk/clerk-sdk-node');
const { createClient } = require('@supabase/supabase-js');

// Configuration
const TARGET_EMAIL = 'zarsko2@gmail.com';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('🔍 Starting collar ownership assignment...');
  console.log(`📧 Target email: ${TARGET_EMAIL}`);

  try {
    // Step 1: Get Clerk user ID for zarsko2@gmail.com
    console.log('\n📋 Step 1: Getting Clerk user ID...');
    
    const users = await clerkClient.users.getUserList({
      emailAddress: [TARGET_EMAIL]
    });

    if (!users.data || users.data.length === 0) {
      throw new Error(`❌ No Clerk user found with email: ${TARGET_EMAIL}`);
    }

    const user = users.data[0];
    const userId = user.id;
    
    console.log(`✅ Found Clerk user:`);
    console.log(`   - User ID: ${userId}`);
    console.log(`   - Email: ${user.emailAddresses[0]?.emailAddress}`);
    console.log(`   - Created: ${user.createdAt}`);

    // Step 2: Check existing collars in database
    console.log('\n📋 Step 2: Checking existing collars...');
    
    const { data: allCollars, error: fetchError } = await supabase
      .from('collars')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) {
      throw new Error(`❌ Failed to fetch collars: ${fetchError.message}`);
    }

    console.log(`📊 Found ${allCollars?.length || 0} total collars in database`);

    if (!allCollars || allCollars.length === 0) {
      console.log('ℹ️ No collars found in database. Creating a test collar...');
      
      // Create a test collar for the user
      const testCollar = {
        owner_id: userId,
        mac_addr: '00:1B:44:11:3A:B7', // Demo MAC address
        name: 'Buddy\'s Collar',
        device_id: 'pet-collar-001',
        firmware_ver: '1.0.0',
        status: 'online',
        battery_level: 85,
        last_seen: new Date().toISOString(),
        settings: {
          alert_mode: 'BUZZER',
          sensitivity: 75,
          battery_threshold: 20,
          heartbeat_interval: 30,
          location_accuracy: 'MEDIUM'
        }
      };

      const { data: newCollar, error: createError } = await supabase
        .from('collars')
        .insert(testCollar)
        .select()
        .single();

      if (createError) {
        throw new Error(`❌ Failed to create test collar: ${createError.message}`);
      }

      console.log(`✅ Created test collar: ${newCollar.id}`);
      console.log(`   - Name: ${newCollar.name}`);
      console.log(`   - MAC: ${newCollar.mac_addr}`);
      console.log(`   - Device ID: ${newCollar.device_id}`);
      
      return { success: true, action: 'created', collar: newCollar, userId };
    }

    // Step 3: Assign existing collars to the user
    console.log('\n📋 Step 3: Assigning collar ownership...');
    
    // Find collars not owned by our target user
    const unownedCollars = allCollars.filter(collar => collar.owner_id !== userId);
    const ownedCollars = allCollars.filter(collar => collar.owner_id === userId);

    console.log(`📊 Collar ownership status:`);
    console.log(`   - Already owned by ${TARGET_EMAIL}: ${ownedCollars.length}`);
    console.log(`   - Not owned by ${TARGET_EMAIL}: ${unownedCollars.length}`);

    if (ownedCollars.length > 0) {
      console.log('\n✅ Collars already owned by target user:');
      ownedCollars.forEach((collar, index) => {
        console.log(`   ${index + 1}. ${collar.name} (${collar.mac_addr}) - ID: ${collar.id}`);
      });
    }

    if (unownedCollars.length === 0) {
      console.log('\n🎉 All collars are already owned by the target user!');
      return { success: true, action: 'already_owned', collars: ownedCollars, userId };
    }

    // Assign the first unowned collar to our user
    const collarToAssign = unownedCollars[0];
    
    console.log(`\n🔄 Assigning collar to ${TARGET_EMAIL}:`);
    console.log(`   - Collar: ${collarToAssign.name} (${collarToAssign.mac_addr})`);
    console.log(`   - Current owner: ${collarToAssign.owner_id || 'none'}`);
    console.log(`   - New owner: ${userId}`);

    const { data: updatedCollar, error: updateError } = await supabase
      .from('collars')
      .update({
        owner_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', collarToAssign.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(`❌ Failed to update collar ownership: ${updateError.message}`);
    }

    console.log(`✅ Successfully assigned collar ownership!`);
    console.log(`   - Collar ID: ${updatedCollar.id}`);
    console.log(`   - New owner: ${updatedCollar.owner_id}`);

    // Step 4: Verify assignment
    console.log('\n📋 Step 4: Verifying collar assignment...');
    
    const { data: userCollars, error: verifyError } = await supabase
      .from('collars')
      .select('*')
      .eq('owner_id', userId);

    if (verifyError) {
      throw new Error(`❌ Failed to verify assignment: ${verifyError.message}`);
    }

    console.log(`✅ Verification complete:`);
    console.log(`   - User ${userId} now owns ${userCollars.length} collar(s)`);
    userCollars.forEach((collar, index) => {
      console.log(`   ${index + 1}. ${collar.name} (${collar.mac_addr})`);
    });

    // Step 5: Display MQTT topic structure
    console.log('\n📋 Step 5: MQTT Topic Structure:');
    console.log(`📡 The collar should publish to user-scoped topics:`);
    userCollars.forEach(collar => {
      console.log(`\n   🔗 Collar: ${collar.name}`);
      console.log(`      - Status: users/${userId}/collars/${collar.id}/status`);
      console.log(`      - Telemetry: users/${userId}/collars/${collar.id}/telemetry`);
      console.log(`      - Location: users/${userId}/collars/${collar.id}/location`);
      console.log(`      - Alerts: users/${userId}/collars/${collar.id}/alerts`);
    });

    return {
      success: true,
      action: 'assigned',
      userId,
      collar: updatedCollar,
      totalUserCollars: userCollars.length
    };

  } catch (error) {
    console.error('\n❌ Error during collar assignment:', error.message);
    return { success: false, error: error.message };
  }
}

// Export for use in other scripts
if (require.main === module) {
  main()
    .then(result => {
      if (result.success) {
        console.log('\n🎉 Collar ownership assignment completed successfully!');
        console.log('\n🔥 Next steps:');
        console.log('   1. Sign in to the app as zarsko2@gmail.com');
        console.log('   2. Check the dashboard - the collar should appear');
        console.log('   3. Verify MQTT topics use the user-scoped format');
        console.log('   4. Test that other accounts cannot see this collar');
      } else {
        console.log('\n💥 Collar assignment failed!');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('💥 Script execution failed:', error);
      process.exit(1);
    });
}

module.exports = { main }; 