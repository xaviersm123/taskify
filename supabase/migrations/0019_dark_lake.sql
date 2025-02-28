/*
  # Fix workspace policies and initialization

  1. Changes
    - Simplify workspace access policies
    - Fix workspace member creation
    - Ensure proper workspace initialization
    - Add missing workspace access policies

  2. Security
    - Maintain RLS security
    - Ensure proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_select_20240322" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert_20240322" ON workspaces;
DROP POLICY IF EXISTS "member_select_20240322" ON workspace_members;
DROP POLICY IF EXISTS "member_insert_20240322" ON workspace_members;

-- Basic workspace access
CREATE POLICY "workspace_select_20240323"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_insert_20240323"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace member access
CREATE POLICY "member_select_20240323"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "member_insert_20240323"
  ON workspace_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to handle workspace creation
CREATE OR REPLACE FUNCTION public.handle_workspace_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Add creator as workspace owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for workspace creation
DROP TRIGGER IF EXISTS workspace_creation_trigger ON workspaces;
CREATE TRIGGER workspace_creation_trigger
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION handle_workspace_creation();

-- Function to create default workspace for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_workspace_id uuid;
BEGIN
  -- Create default workspace
  INSERT INTO workspaces (name, created_by)
  VALUES ('My Workspace', NEW.id)
  RETURNING id INTO new_workspace_id;
  
  -- Add user as workspace owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (new_workspace_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS new_user_trigger ON auth.users;
CREATE TRIGGER new_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();