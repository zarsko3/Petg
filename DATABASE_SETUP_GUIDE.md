# Database Setup Guide - Pet Collar System

This guide walks you through setting up the Supabase database for the Pet Collar System with Clerk authentication integration.

## Prerequisites

- Supabase project created at [https://supabase.com](https://supabase.com)
- Clerk account and application set up
- Node.js and npm installed

## Quick Setup

### 1. Install Dependencies

```bash
npm install @supabase/supabase-js
npm install --save-dev supabase
```

### 2. Environment Configuration

Create a `.env.local` file with your Supabase and Clerk credentials:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Clerk Configuration
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key

# Test User ID (replace with actual Clerk user ID)
TEST_USER_ID=user_xxxxxxxxxx
```

### 3. Apply Database Migration

#### Option A: Via Supabase CLI (Recommended)

```bash
# Initialize Supabase (already done)
npx supabase init

# Link to your remote project
npx supabase link --project-ref your-project-ref

# Push migration to remote database
npx supabase db push
```

#### Option B: Via Supabase Dashboard

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20250207114500_add_owner_tables.sql`
4. Click **Run** to execute the migration

### 4. Verify Setup

Run the test script to verify everything is working:

```bash
node scripts/test-database.js
```

## Database Schema

The migration creates the following tables:

### Tables Created

1. **`collars`** - Pet collar devices
   - `id` (uuid, primary key)
   - `owner_id` (uuid, references auth.users)
   - `mac_addr` (text, unique)
   - `name` (text)
   - `firmware_ver` (text)
   - `device_id` (text, unique)
   - `ip_address` (text)
   - `status` ('online'|'offline'|'maintenance')
   - `battery_level` (integer 0-100)
   - `last_seen` (timestamptz)
   - `created_at`, `updated_at` (timestamptz)

2. **`beacons`** - Proximity beacons
   - `id` (uuid, primary key)
   - `owner_id` (uuid, references auth.users)
   - `collar_id` (uuid, references collars)
   - `uuid` (text)
   - `major`, `minor` (integer)
   - `friendly_name` (text)
   - `room_name` (text)
   - `position_x`, `position_y` (real)
   - `inner_radius`, `outer_radius` (integer)
   - `alert_enabled` (boolean)
   - `alert_mode` ('buzzer'|'vibration'|'both')
   - `created_at`, `updated_at` (timestamptz)

3. **`collar_locations`** - Real-time position data
   - `id` (uuid, primary key)
   - `collar_id` (uuid, references collars)
   - `owner_id` (uuid, references auth.users)
   - `x`, `y` (real)
   - `confidence`, `accuracy` (real)
   - `zone_id` (uuid)
   - `recorded_at` (timestamptz)

4. **`collar_events`** - Alert and event history
   - `id` (uuid, primary key)
   - `collar_id` (uuid, references collars)
   - `owner_id` (uuid, references auth.users)
   - `event_type` (text)
   - `beacon_id` (uuid, references beacons)
   - `message` (text)
   - `metadata` (jsonb)
   - `created_at` (timestamptz)

### Row-Level Security (RLS)

All tables have RLS enabled with policies that ensure users can only access their own data:

```sql
-- Example policy (applied to all tables)
CREATE POLICY "Users can manage their own data" ON public.collars
  FOR ALL USING (owner_id = (auth.jwt() ->> 'sub')::uuid);
```

### Helper Functions

1. **`get_collar_stats(collar_uuid)`** - Returns collar statistics
2. **`log_collar_event(...)`** - Logs collar events with proper owner validation

## Testing the Setup

### Manual Test in Supabase SQL Editor

Replace `YOUR-CLERK-USER-ID` with an actual Clerk user ID:

```sql
-- 1. Insert test collar
INSERT INTO public.collars (owner_id, mac_addr, name, firmware_ver, device_id)
VALUES ('YOUR-CLERK-USER-ID', 'AA:BB:CC:DD:EE:FF', 'Home Collar', '1.0.0', 'pet-collar-001')
RETURNING *;

-- 2. Insert test beacon (replace collar_id with UUID from step 1)
INSERT INTO public.beacons (
    owner_id, collar_id, uuid, friendly_name, room_name, 
    inner_radius, outer_radius, alert_enabled
)
VALUES (
    'YOUR-CLERK-USER-ID',
    'COLLAR-ID-FROM-STEP-1',
    'TEST-BEACON-001',
    'Living Room Beacon',
    'Living Room',
    100, 200, true
)
RETURNING *;

-- 3. Test RLS (should return your data when authenticated)
SELECT * FROM public.collars WHERE owner_id = 'YOUR-CLERK-USER-ID';

-- 4. Test RLS without auth (should return 0 rows)
SELECT * FROM public.collars; -- Run this without JWT token
```

### Automated Testing

The test script `scripts/test-database.js` performs:

✅ Database connection validation  
✅ Table structure verification  
✅ CRUD operations testing  
✅ RLS policy validation  
✅ Clerk user integration testing  

## API Integration

Once the database is set up, your existing API routes will automatically work:

- `GET /api/collars` - List user's collars
- `POST /api/collars` - Create new collar
- `GET /api/beacons` - List user's beacons
- `POST /api/beacons` - Create new beacon

The RLS policies ensure each user only sees their own data.

## Troubleshooting

### Common Issues

1. **Migration fails**: Check your database permissions and Supabase project configuration
2. **RLS blocks everything**: Ensure you're passing proper JWT tokens in API requests
3. **Foreign key errors**: Make sure the referenced `auth.users` table exists

### Verification Checklist

- [ ] Tables created successfully
- [ ] RLS policies active
- [ ] Test data inserted
- [ ] API routes return user-specific data
- [ ] Unauthorized requests return 0 rows

## Security Notes

- All tables use RLS to enforce user data isolation
- Service role key bypasses RLS (use carefully)
- JWT tokens must contain valid Clerk user IDs
- Foreign key constraints maintain data integrity

## Next Steps

1. Apply migration to live Supabase project
2. Update API routes to use new schema
3. Test with real Clerk authentication
4. Monitor RLS performance in production

---

**Status**: Database schema ready for production deployment  
**Last Updated**: 2025-02-07  
**Version**: 1.0.0 