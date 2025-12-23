# Custom Menu Management - Database Migration Instructions

## Overview

This document provides instructions for applying the database migration for the Custom Menu Management system.

## Prerequisites

- Access to your Supabase project dashboard
- Admin privileges on the database

## Migration Steps

### Step 1: Apply Database Schema

1. **Open Supabase Dashboard**
   - Go to your Supabase project: https://supabase.com/dashboard/project/lqouhidmuczumzrkpphc
   - Navigate to the SQL Editor

2. **Execute Migration SQL**
   - Copy the contents of `migrations/001_create_custom_menus.sql`
   - Paste into the SQL Editor
   - Click "Run" to execute

### Step 2: Verify Migration

After running the migration, verify the tables were created:

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('custom_menus', 'menu_members');

-- Verify RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('custom_menus', 'menu_members');
```

### Step 3: Update TypeScript Types

The database types have been automatically updated in `src/types/database.ts`. No manual action required.

## What Was Created

### Tables

1. **custom_menus**
   - Stores user-created custom menus
   - Includes menu type, configuration, and ordering
   - Row Level Security (RLS) enabled

2. **menu_members**
   - Stores members for group-type menus
   - Links users to specific menus with roles
   - RLS enabled for proper access control

### Features

- **Security**: Row Level Security policies ensure users can only access their own menus
- **Performance**: Optimized indexes for common queries
- **Data Integrity**: Foreign key constraints and check constraints
- **Audit Trail**: Automatic timestamp updates

### TypeScript Integration

- **Type Safety**: Full TypeScript support with generated types
- **Validation**: Client-side validation utilities
- **Real-time**: Hooks for real-time menu synchronization

## Testing

Run the test suite to verify everything works:

```bash
pnpm test src/lib/__tests__/custom-menu-utils.test.ts
```

## Next Steps

After applying the migration:

1. The database schema is ready for custom menu functionality
2. TypeScript types are available for development
3. Utility functions and hooks are ready to use
4. You can proceed to implement the UI components

## Rollback (if needed)

To rollback this migration:

```sql
DROP TABLE IF EXISTS menu_members CASCADE;
DROP TABLE IF EXISTS custom_menus CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

## Support

If you encounter any issues:

1. Check the Supabase logs for error details
2. Verify your database permissions
3. Ensure the migration SQL was executed completely
4. Contact support if problems persist