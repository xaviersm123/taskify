/*
  # Fix workspace creation and access

  1. Changes
    - Simplify workspace policies
    - Add automatic workspace member creation
    - Fix workspace access control
    - Ensure proper initialization

  2. Security
    - Maintain RLS security
    - Ensure proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_select_20240321" ON workspaces;
DROP POLICY IF EXISTS "workspace_member_select_20240321" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert_20240321" ON workspaces;
DROP POLICY IF EXISTS "member_select_20240321" ON workspace_members;
DROP POLICY IF EXISTS "member_insert_20240321" ON workspace_members;

-- Workspace policies
CREATE POLICY "workspace_select_20240322"
  ON workspaces FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "workspace_insert_20240322"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace member policies
CREATE POLICY "member_select_20240322"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "member_insert_20240322"
  ON workspace_members FOR INSERT
  WITH CHECK (
    (workspace_id IN (SELECT id FROM workspaces WHERE created_by = auth.uid()))
    OR
    (user_id = auth.uid())
  );

-- Function to add workspace creator as member
CREATE OR REPLACE FUNCTION public.handle_workspace_creation()
RETURNS TRIGGER AS $$
BEGIN
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

-- Function to create initial workspace for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id uuid;
BEGIN
  INSERT INTO workspaces (name, created_by)
  VALUES ('My Workspace', NEW.id)
  RETURNING id INTO workspace_id;
  
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (workspace_id, NEW.id, 'owner');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user creation
DROP TRIGGER IF EXISTS new_user_trigger ON auth.users;
CREATE TRIGGER new_user_trigger
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();