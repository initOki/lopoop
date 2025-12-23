-- Create custom_menus table
CREATE TABLE custom_menus (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('group', 'dashboard', 'external_link', 'custom_page', 'project')),
  config JSONB NOT NULL DEFAULT '{}',
  menu_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_user_menu_name UNIQUE (user_id, name)
);

-- Create menu_members table for group menus
CREATE TABLE menu_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_id UUID NOT NULL REFERENCES custom_menus(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  CONSTRAINT unique_menu_member UNIQUE (menu_id, user_id)
);

-- Create indexes for performance
CREATE INDEX idx_custom_menus_user_id ON custom_menus(user_id);
CREATE INDEX idx_custom_menus_type ON custom_menus(type);
CREATE INDEX idx_custom_menus_order ON custom_menus(user_id, menu_order);

CREATE INDEX idx_menu_members_menu_id ON menu_members(menu_id);
CREATE INDEX idx_menu_members_user_id ON menu_members(user_id);

-- Enable Row Level Security
ALTER TABLE custom_menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_members ENABLE ROW LEVEL SECURITY;

-- RLS policies for custom_menus
CREATE POLICY "Users can view their own menus" ON custom_menus
  FOR SELECT USING (user_id = current_user);

CREATE POLICY "Users can insert their own menus" ON custom_menus
  FOR INSERT WITH CHECK (user_id = current_user);

CREATE POLICY "Users can update their own menus" ON custom_menus
  FOR UPDATE USING (user_id = current_user);

CREATE POLICY "Users can delete their own menus" ON custom_menus
  FOR DELETE USING (user_id = current_user);

-- RLS policies for menu_members
CREATE POLICY "Users can view menu members for their menus" ON menu_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM custom_menus 
      WHERE custom_menus.id = menu_members.menu_id 
      AND custom_menus.user_id = current_user
    )
    OR user_id = current_user
  );

CREATE POLICY "Menu owners can manage members" ON menu_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM custom_menus 
      WHERE custom_menus.id = menu_members.menu_id 
      AND custom_menus.user_id = current_user
    )
  );

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for custom_menus
CREATE TRIGGER update_custom_menus_updated_at 
  BEFORE UPDATE ON custom_menus 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();