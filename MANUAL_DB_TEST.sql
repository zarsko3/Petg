-- Manual Database Test for Pet Collar System
-- Run this in Supabase Dashboard → SQL Editor to verify setup

-- Step 1: Check if tables exist
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('collars', 'beacons', 'collar_locations', 'collar_events')
ORDER BY tablename;

-- Step 2: Check RLS is enabled
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('collars', 'beacons', 'collar_locations', 'collar_events');

-- Step 3: Insert test collar (REPLACE with your actual Clerk user ID)
-- Get your Clerk user ID from: https://dashboard.clerk.com/apps/[your-app]/users
INSERT INTO public.collars (owner_id, mac_addr, name, firmware_ver, device_id, status, battery_level)
VALUES (
    'user_REPLACE_WITH_YOUR_CLERK_USER_ID', -- Replace this with actual Clerk user ID
    'AA:BB:CC:DD:EE:FF',
    'Test Home Collar',
    '1.0.0',
    'pet-collar-test-001',
    'online',
    85
)
RETURNING id, name, mac_addr, status;

-- Step 4: Insert test beacon (REPLACE collar_id with the UUID from Step 3)
INSERT INTO public.beacons (
    owner_id,
    collar_id,
    uuid,
    friendly_name,
    room_name,
    position_x,
    position_y,
    inner_radius,
    outer_radius,
    alert_enabled,
    alert_mode
)
VALUES (
    'user_REPLACE_WITH_YOUR_CLERK_USER_ID', -- Same Clerk user ID as above
    'REPLACE_WITH_COLLAR_ID_FROM_STEP_3',   -- UUID from Step 3
    'TEST-BEACON-UUID-001',
    'Living Room Test Beacon',
    'Living Room',
    100.5,
    200.0,
    100,
    200,
    true,
    'both'
)
RETURNING id, friendly_name, uuid, inner_radius, outer_radius;

-- Step 5: Test collar statistics function
SELECT * FROM public.get_collar_stats('REPLACE_WITH_COLLAR_ID_FROM_STEP_3');

-- Step 6: Test event logging function
SELECT public.log_collar_event(
    'REPLACE_WITH_COLLAR_ID_FROM_STEP_3'::uuid,
    'online',
    null,
    'Manual test event from SQL editor',
    '{"test": true, "source": "manual"}'::jsonb
);

-- Step 7: Verify data was inserted
SELECT 
    c.id,
    c.name as collar_name,
    c.mac_addr,
    c.status,
    c.battery_level,
    COUNT(b.id) as beacon_count
FROM public.collars c
LEFT JOIN public.beacons b ON c.id = b.collar_id
WHERE c.owner_id = 'user_REPLACE_WITH_YOUR_CLERK_USER_ID'
GROUP BY c.id, c.name, c.mac_addr, c.status, c.battery_level;

-- Step 8: Check recent events
SELECT 
    e.event_type,
    e.message,
    e.metadata,
    e.created_at,
    c.name as collar_name
FROM public.collar_events e
JOIN public.collars c ON e.collar_id = c.id
WHERE e.owner_id = 'user_REPLACE_WITH_YOUR_CLERK_USER_ID'
ORDER BY e.created_at DESC
LIMIT 5;

-- Step 9: Test RLS (this should return 0 rows when run without authentication)
-- To test RLS properly:
-- 1. Run the above queries as admin (service role) - they should work
-- 2. Try to access data via API without JWT - should get 0 rows
-- 3. Try to access data via API with valid Clerk JWT - should get your data

-- Cleanup (run this to remove test data)
/*
DELETE FROM public.collars 
WHERE owner_id = 'user_REPLACE_WITH_YOUR_CLERK_USER_ID' 
    AND device_id = 'pet-collar-test-001';
*/

-- Success indicators:
-- ✅ Step 1: Should show 4 tables (collars, beacons, collar_locations, collar_events)
-- ✅ Step 2: Should show rls_enabled = true for all tables
-- ✅ Step 3: Should return collar UUID and details
-- ✅ Step 4: Should return beacon UUID and details
-- ✅ Step 5: Should return statistics (1 beacon, 1 active beacon, etc.)
-- ✅ Step 6: Should return event UUID
-- ✅ Step 7: Should show your collar with 1 beacon
-- ✅ Step 8: Should show the logged event 