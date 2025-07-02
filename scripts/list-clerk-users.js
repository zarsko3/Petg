#!/usr/bin/env node

/**
 * List Clerk Users Script
 * 
 * Lists all existing Clerk users to help identify available users
 * for collar assignment.
 */

require('dotenv').config({ path: '.env.local' });
const { clerkClient } = require('@clerk/clerk-sdk-node');

async function listUsers() {
  console.log('👥 Listing existing Clerk users...\n');

  try {
    const users = await clerkClient.users.getUserList({
      limit: 20,
      orderBy: '-created_at'
    });

    if (!users.data || users.data.length === 0) {
      console.log('📭 No Clerk users found.');
      console.log('\n💡 To create a user:');
      console.log('   1. Visit your app at http://localhost:3000/sign-up');
      console.log('   2. Sign up with zarsko2@gmail.com');
      console.log('   3. Then run the collar assignment script again');
      return;
    }

    console.log(`📊 Found ${users.data.length} users:\n`);

    users.data.forEach((user, index) => {
      const email = user.emailAddresses[0]?.emailAddress || 'No email';
      const firstName = user.firstName || '';
      const lastName = user.lastName || '';
      const name = `${firstName} ${lastName}`.trim() || 'No name';
      
      console.log(`${index + 1}. User ID: ${user.id}`);
      console.log(`   📧 Email: ${email}`);
      console.log(`   👤 Name: ${name}`);
      console.log(`   📅 Created: ${new Date(user.createdAt).toLocaleDateString()}`);
      console.log(`   ✅ Verified: ${user.emailAddresses[0]?.verification?.status === 'verified' ? 'Yes' : 'No'}`);
      console.log('');
    });

    console.log('💡 To assign a collar to one of these users:');
    console.log('   1. Update TARGET_EMAIL in scripts/assign-collar-owner.js');
    console.log('   2. Run: node scripts/assign-collar-owner.js');

  } catch (error) {
    console.error('❌ Error listing users:', error.message);
    
    if (error.message.includes('Invalid API key')) {
      console.log('\n🔑 Clerk API key issue detected.');
      console.log('   Check your .env.local file for:');
      console.log('   - CLERK_SECRET_KEY');
      console.log('   - NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY');
    }
  }
}

if (require.main === module) {
  listUsers();
}

module.exports = { listUsers }; 