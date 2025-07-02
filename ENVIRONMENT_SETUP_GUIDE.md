# Environment Setup Guide

This guide covers the concrete steps to configure Supabase environment variables for both client-side and server-side usage.

## Overview

The system uses separate Supabase clients for different contexts:

- **Client-side (browser)**: Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` - safe for browser, respects RLS
- **Server-side (API routes)**: Uses `SUPABASE_SERVICE_ROLE_KEY` - bypasses RLS, admin operations only

## Step 1: Create Environment Variable Placeholders

### Local Development

Create `.env.local` in your project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://ytambeoajiuacrfjcrvx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<paste the ANON/PUBLIC key here>
SUPABASE_SERVICE_ROLE_KEY=<paste the SECRET/SERVICE_ROLE key here>
SUPABASE_JWT_SECRET=<paste the JWT secret here>

# Clerk Configuration (for auth integration)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<your-clerk-publishable-key>
CLERK_SECRET_KEY=<your-clerk-secret-key>
CLERK_WEBHOOK_SECRET=<your-clerk-webhook-secret>

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

**Important**: `.env.local` is already in `.gitignore` and should NEVER be committed to version control.

### Template File

Use `env.example` as a template for new team members:

```bash
cp env.example .env.local
# Then fill in your actual values
```

## Step 2: Add Values to GitHub & Vercel

### GitHub Secrets

Navigate to **GitHub → Repository Settings → Secrets → Actions** and add:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` 
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET`

### Vercel Environment Variables

Navigate to **Vercel → Project Settings → Environment Variables** and add the same four keys for:

- **Production** environment
- **Preview** environment

## Step 3: Supabase Client Configuration

The system automatically configures two separate clients:

### Client-side Usage (Browser-safe)

```typescript
import { supabase } from '@/lib/supabase'

// Safe for browser - respects RLS policies
const { data: userCollars } = await supabase
  .from('collars')
  .select('*')
  .eq('owner_id', userId)
```

### Server-side Usage (API Routes Only)

```typescript
import { supabaseAdmin } from '@/lib/supabase'

// Server-only - bypasses RLS, admin operations
const { data: allCollars } = await supabaseAdmin
  .from('collars')
  .select('*')
  .eq('owner_id', userId)
```

**Critical**: Never import `supabaseAdmin` in components that can reach the browser bundle.

## Step 4: Verification

### Local Testing

```bash
# Start development server with environment loaded
npm run dev

# Check the console for environment status
# Visit http://localhost:3000 and check DevTools → Network
# API calls to /api/collars should return data instead of mock responses
```

### Database Connection Test

```bash
# Run the database test suite
node scripts/test-database.js

# Should show successful connections for both anon and service roles
```

## Step 5: Database Schema

Ensure the database migration has been applied:

```bash
# Apply the migration via Supabase CLI
supabase db push

# Or apply manually via Supabase Dashboard → SQL Editor
# Run the contents of supabase/migrations/20250207114500_add_owner_tables.sql
```

## Security Notes

### Key Types and Usage

| Key Type | Usage | Security Level | RLS |
|----------|--------|----------------|-----|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client-side, browser | Safe for public | ✅ Respects |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-side, API routes | **High security** | ❌ Bypasses |

### Best Practices

1. **Never log sensitive keys**: The config object only shows key prefixes
2. **Separate client usage**: Use appropriate client for each context
3. **RLS policies**: Service role bypasses RLS, ensure proper auth checks in API routes
4. **Environment isolation**: Use different Supabase projects for dev/staging/prod

## Troubleshooting

### Common Issues

1. **"Database not configured" errors**:
   - Check `SUPABASE_SERVICE_ROLE_KEY` is set correctly
   - Verify key has proper permissions in Supabase Dashboard

2. **RLS policy violations**:
   - Ensure client-side code uses `supabase` (not `supabaseAdmin`)
   - Check auth is working properly with Clerk

3. **Build failures**:
   - Verify all `NEXT_PUBLIC_*` variables are set in build environment
   - Check Vercel environment variable configuration

### Debug Configuration

```typescript
import { supabaseConfig } from '@/lib/supabase'

console.log('Supabase Config:', {
  url: supabaseConfig.url,
  hasAnonKey: supabaseConfig.hasAnonKey,
  hasServiceKey: supabaseConfig.hasServiceKey,
  // Keys are safely prefixed, not exposed
})
```

## Migration from Old Setup

If migrating from the previous configuration:

1. **Update environment variables**:
   - `SUPABASE_KEY` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Add `SUPABASE_SERVICE_ROLE_KEY`

2. **Update imports**:
   - API routes: `import { supabaseAdmin }` instead of `import { supabase }`
   - Client components: Continue using `import { supabase }`

3. **Database schema**:
   - Apply the new migration for multi-tenant support
   - Update field names: `user_id` → `owner_id`, `ble_mac` → `mac_addr`

## Deployment Checklist

- [ ] `.env.local` created and configured locally
- [ ] GitHub Actions secrets configured
- [ ] Vercel environment variables set for Production and Preview
- [ ] Database migration applied
- [ ] Local testing completed successfully
- [ ] API routes return real data (not mock)
- [ ] Authentication working with Clerk integration

## Support

For additional help:

- **Supabase**: [Documentation](https://supabase.com/docs)
- **Clerk**: [Auth Integration Guide](https://clerk.com/docs)
- **Environment Variables**: Check Next.js documentation for environment variable best practices 