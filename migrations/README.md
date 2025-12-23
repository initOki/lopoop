# Database Migrations

This directory contains SQL migrations for the LOPOOP application.

## Migration 001: Custom Menus

Creates the database schema for the custom menu management system.

### Tables Created:

1. **custom_menus** - Stores user-created custom menus
   - `id` (UUID, Primary Key)
   - `user_id` (TEXT, NOT NULL)
   - `name` (TEXT, NOT NULL)
   - `type` (TEXT, CHECK constraint for valid types)
   - `config` (JSONB, menu configuration)
   - `menu_order` (INTEGER, for ordering menus)
   - `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

2. **menu_members** - Stores members for group-type menus
   - `id` (UUID, Primary Key)
   - `menu_id` (UUID, Foreign Key to custom_menus)
   - `user_id` (TEXT, NOT NULL)
   - `role` (TEXT, CHECK constraint for valid roles)
   - `joined_at` (TIMESTAMP WITH TIME ZONE)

### Features:
- Row Level Security (RLS) policies
- Performance indexes
- Automatic timestamp updates
- Foreign key constraints
- Unique constraints for data integrity

## How to Apply Migration

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of `001_create_custom_menus.sql`
4. Execute the SQL

### Option 2: Using the Migration Script
```bash
# Install ts-node if not already installed
npm install -g ts-node

# Run the migration script
ts-node scripts/apply-migration.ts
```

### Option 3: Using Supabase CLI (if available)
```bash
supabase db push
```

## Verification

After applying the migration, verify the tables exist:

```sql
-- Check if tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('custom_menus', 'menu_members');

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN ('custom_menus', 'menu_members');
```

## Rollback

To rollback this migration:

```sql
DROP TABLE IF EXISTS menu_members CASCADE;
DROP TABLE IF EXISTS custom_menus CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```