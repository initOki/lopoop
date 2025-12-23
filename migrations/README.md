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

## Migration 002: Menu Archive System

Adds archive functionality for deleted menus with recovery options.

### Tables Created:

1. **archived_menus** - Stores deleted menus for recovery
2. **archived_menu_members** - Stores deleted menu members

### Features:
- 30-day recovery period
- Automatic cleanup of expired archives
- Preserves original menu data and relationships

## Migration 003: Personal Management Tables

Creates tables for individual user management of debts and schedules.

### Tables Created:

1. **personal_debts** - Individual debt management separate from group debts
   - `id` (UUID, Primary Key)
   - `user_id` (TEXT, NOT NULL)
   - `debtor` (TEXT, NOT NULL)
   - `creditor` (TEXT, NOT NULL)
   - `amount` (DECIMAL, nullable)
   - `item` (TEXT, nullable)
   - `description` (TEXT, nullable)
   - `is_paid` (BOOLEAN, default FALSE)
   - `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

2. **personal_schedules** - Individual schedule management
   - `id` (UUID, Primary Key)
   - `user_id` (TEXT, NOT NULL)
   - `title` (TEXT, NOT NULL)
   - `description` (TEXT, nullable)
   - `start_time` (TIMESTAMP WITH TIME ZONE, NOT NULL)
   - `end_time` (TIMESTAMP WITH TIME ZONE, NOT NULL)
   - `type` (TEXT, CHECK constraint: 'raid', 'meeting', 'event', 'personal')
   - `participants` (TEXT[], array of participant names)
   - `is_completed` (BOOLEAN, default FALSE)
   - `created_at`, `updated_at` (TIMESTAMP WITH TIME ZONE)

### Features:
- User-specific RLS policies for data isolation
- Performance indexes on user_id and time-based columns
- Automatic timestamp updates
- Support for multiple schedule types
- Array support for participants

## Migration 004: Personal Menu Type Support

Adds support for 'personal' menu type in the custom_menus table.

### Changes Made:

1. **Updated CHECK constraint** on custom_menus.type column
   - Removes existing constraint
   - Adds new constraint including 'personal' type
   - Supports: 'group', 'personal', 'dashboard', 'external_link', 'custom_page', 'project'

### Features:
- Enables creation of personal menu types
- Maintains backward compatibility
- No data migration required

## How to Apply Migrations

### Option 1: Using Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy and paste the contents of the migration file
4. Execute the SQL

### Option 2: Using the Migration Scripts
```bash
# Install ts-node if not already installed
npm install -g ts-node

# Apply custom menus migration
ts-node scripts/apply-migration.ts

# Apply archive system migration
ts-node scripts/apply-archive-migration.ts

# Apply personal tables migration
ts-node scripts/apply-personal-migration.ts

# Apply menu type support migration
ts-node scripts/apply-menu-type-migration.ts
```

### Option 3: Using Supabase CLI (if available)
```bash
supabase db push
```

## Verification

After applying migrations, verify the tables exist:

```sql
-- Check if all tables were created
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
  'custom_menus', 
  'menu_members', 
  'archived_menus', 
  'archived_menu_members',
  'personal_debts',
  'personal_schedules'
);

-- Check RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE tablename IN (
  'custom_menus', 
  'menu_members', 
  'archived_menus', 
  'archived_menu_members',
  'personal_debts',
  'personal_schedules'
);

-- Check menu type constraint
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'custom_menus_type_check';
```

## Rollback

To rollback migrations:

### Rollback Migration 003 (Personal Tables)
```sql
DROP TABLE IF EXISTS personal_schedules CASCADE;
DROP TABLE IF EXISTS personal_debts CASCADE;
```

### Rollback Migration 002 (Archive System)
```sql
DROP TABLE IF EXISTS archived_menu_members CASCADE;
DROP TABLE IF EXISTS archived_menus CASCADE;
```

### Rollback Migration 001 (Custom Menus)
```sql
DROP TABLE IF EXISTS menu_members CASCADE;
DROP TABLE IF EXISTS custom_menus CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```