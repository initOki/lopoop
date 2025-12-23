-- Create archived_menus table for data recovery
CREATE TABLE archived_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  original_menu_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  menu_order INTEGER NOT NULL DEFAULT 0,
  original_created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  original_updated_at TIMESTAMP WITH TIME ZONE NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  recovery_expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '30 days'),
  deleted_by TEXT NOT NULL
);

-- Create archived_menu_members table
CREATE TABLE archived_menu_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  archived_menu_id UUID NOT NULL REFERENCES archived_menus(id) ON DELETE CASCADE,
  original_member_id UUID NOT NULL,
  menu_id UUID NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL,
  archived_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for archived tables
CREATE INDEX idx_archived_menus_user_id ON archived_menus(user_id);
CREATE INDEX idx_archived_menus_original_id ON archived_menus(original_menu_id);
CREATE INDEX idx_archived_menus_recovery_expires ON archived_menus(recovery_expires_at);

CREATE INDEX idx_archived_menu_members_archived_menu_id ON archived_menu_members(archived_menu_id);
CREATE INDEX idx_archived_menu_members_user_id ON archived_menu_members(user_id);

-- Enable Row Level Security for archived tables
ALTER TABLE archived_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE archived_menu_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for archived_menus
CREATE POLICY "Users can view their own archived menus" ON archived_menus
  FOR SELECT USING (user_id = current_user);

CREATE POLICY "Users can insert their own archived menus" ON archived_menus
  FOR INSERT WITH CHECK (user_id = current_user);

-- RLS policies for archived_menu_members
CREATE POLICY "Users can view archived menu members for their menus" ON archived_menu_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM archived_menus 
      WHERE archived_menus.id = archived_menu_members.archived_menu_id 
      AND archived_menus.user_id = current_user
    )
    OR user_id = current_user
  );

CREATE POLICY "Users can insert archived menu members for their menus" ON archived_menu_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM archived_menus 
      WHERE archived_menus.id = archived_menu_members.archived_menu_id 
      AND archived_menus.user_id = current_user
    )
  );

-- Function to archive a menu before deletion
CREATE OR REPLACE FUNCTION archive_menu_before_delete()
RETURNS TRIGGER AS $
BEGIN
  -- Insert the menu into archived_menus
  INSERT INTO archived_menus (
    original_menu_id,
    user_id,
    name,
    type,
    config,
    menu_order,
    original_created_at,
    original_updated_at,
    deleted_by
  ) VALUES (
    OLD.id,
    OLD.user_id,
    OLD.name,
    OLD.type,
    OLD.config,
    OLD.menu_order,
    OLD.created_at,
    OLD.updated_at,
    current_user
  );

  -- Archive associated menu members
  INSERT INTO archived_menu_members (
    archived_menu_id,
    original_member_id,
    menu_id,
    user_id,
    role,
    joined_at
  )
  SELECT 
    (SELECT id FROM archived_menus WHERE original_menu_id = OLD.id ORDER BY deleted_at DESC LIMIT 1),
    mm.id,
    mm.menu_id,
    mm.user_id,
    mm.role,
    mm.joined_at
  FROM menu_members mm
  WHERE mm.menu_id = OLD.id;

  RETURN OLD;
END;
$ language 'plpgsql';

-- Create trigger to archive menu before deletion
CREATE TRIGGER archive_menu_before_delete_trigger
  BEFORE DELETE ON custom_menus
  FOR EACH ROW
  EXECUTE FUNCTION archive_menu_before_delete();

-- Function to clean up expired archived menus
CREATE OR REPLACE FUNCTION cleanup_expired_archived_menus()
RETURNS INTEGER AS $
BEGIN
  DELETE FROM archived_menus 
  WHERE recovery_expires_at < NOW();
  
  RETURN (SELECT COUNT(*) FROM archived_menus WHERE recovery_expires_at < NOW());
END;
$ language 'plpgsql';

-- Function to restore an archived menu
CREATE OR REPLACE FUNCTION restore_archived_menu(archived_menu_id UUID)
RETURNS UUID AS $
DECLARE
  restored_menu_id UUID;
  archived_menu RECORD;
BEGIN
  -- Get the archived menu data
  SELECT * INTO archived_menu FROM archived_menus WHERE id = archived_menu_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Archived menu not found';
  END IF;
  
  -- Check if recovery period has expired
  IF archived_menu.recovery_expires_at < NOW() THEN
    RAISE EXCEPTION 'Recovery period has expired';
  END IF;
  
  -- Restore the menu
  INSERT INTO custom_menus (
    user_id,
    name,
    type,
    config,
    menu_order,
    created_at,
    updated_at
  ) VALUES (
    archived_menu.user_id,
    archived_menu.name || ' (복구됨)',  -- Add suffix to avoid name conflicts
    archived_menu.type,
    archived_menu.config,
    archived_menu.menu_order,
    archived_menu.original_created_at,
    NOW()
  ) RETURNING id INTO restored_menu_id;
  
  -- Restore menu members
  INSERT INTO menu_members (
    menu_id,
    user_id,
    role,
    joined_at
  )
  SELECT 
    restored_menu_id,
    amm.user_id,
    amm.role,
    amm.joined_at
  FROM archived_menu_members amm
  WHERE amm.archived_menu_id = archived_menu_id;
  
  -- Remove from archive
  DELETE FROM archived_menus WHERE id = archived_menu_id;
  
  RETURN restored_menu_id;
END;
$ language 'plpgsql';

-- Function to get user archived menus
CREATE OR REPLACE FUNCTION get_user_archived_menus(user_id TEXT)
RETURNS TABLE (
  id UUID,
  original_menu_id UUID,
  user_id TEXT,
  name TEXT,
  type TEXT,
  config JSONB,
  menu_order INTEGER,
  original_created_at TIMESTAMP WITH TIME ZONE,
  original_updated_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE,
  recovery_expires_at TIMESTAMP WITH TIME ZONE,
  deleted_by TEXT
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    am.id,
    am.original_menu_id,
    am.user_id,
    am.name,
    am.type,
    am.config,
    am.menu_order,
    am.original_created_at,
    am.original_updated_at,
    am.deleted_at,
    am.recovery_expires_at,
    am.deleted_by
  FROM archived_menus am
  WHERE am.user_id = get_user_archived_menus.user_id
  ORDER BY am.deleted_at DESC;
END;
$ language 'plpgsql';

-- Function to get archived menu members
CREATE OR REPLACE FUNCTION get_archived_menu_members(archived_menu_id UUID)
RETURNS TABLE (
  id UUID,
  archived_menu_id UUID,
  original_member_id UUID,
  menu_id UUID,
  user_id TEXT,
  role TEXT,
  joined_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE
) AS $
BEGIN
  RETURN QUERY
  SELECT 
    amm.id,
    amm.archived_menu_id,
    amm.original_member_id,
    amm.menu_id,
    amm.user_id,
    amm.role,
    amm.joined_at,
    amm.archived_at
  FROM archived_menu_members amm
  WHERE amm.archived_menu_id = get_archived_menu_members.archived_menu_id
  ORDER BY amm.joined_at ASC;
END;
$ language 'plpgsql';