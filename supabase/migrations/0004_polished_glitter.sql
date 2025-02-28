/*
  # Fix workspace and project policies

  1. Changes
    - Add default workspace creation for new users
    - Fix workspace member policies
    - Update project policies
    - Add workspace initialization trigger

  2. Security
    - Users can only access their own workspaces
    - Workspace owners can manage projects
    - Members can view and create projects
*/

-- Add default_workspace_id to auth.users
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS default_workspace_id uuid;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own workspace memberships" ON workspace_members;
DROP POLICY IF EXISTS "Users can view members of their workspaces" ON workspace_members;
DROP POLICY IF EXISTS "Users can view their workspace projects" ON projects;

-- Workspace member policies
CREATE POLICY "Workspace members can view workspace"
  ON workspaces
  FOR SELECT
  USING (
    id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view workspace members"
  ON workspace_members
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Project policies
CREATE POLICY "Workspace members can view projects"
  ON projects
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Workspace members can create projects"
  ON projects
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Function to initialize workspace
CREATE OR REPLACE FUNCTION initialize_user_workspace()
RETURNS TRIGGER AS $$
DECLARE
  workspace_id uuid;
BEGIN
  -- Create default workspace
  INSERT INTO workspaces (name, created_by)
  VALUES ('My Workspace', NEW.id)
  RETURNING id INTO workspace_id;

  -- Add user as workspace owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (workspace_id, NEW.id, 'owner');

  -- Update user's default workspace
  UPDATE auth.users 
  SET default_workspace_id = workspace_id 
  WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_user_workspace();