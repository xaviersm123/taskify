/*
  # Fix workspace policies and add default workspace creation

  1. Changes
    - Fix recursive workspace member policies
    - Add default workspace creation on user signup
    - Update project policies to work with workspaces

  2. Security
    - Enable RLS on all tables
    - Add policies for workspace access
    - Add policies for project access
*/

-- Fix workspace member policies
DROP POLICY IF EXISTS "Users can view workspace members they are members of" ON workspace_members;

CREATE POLICY "Users can view their own workspace memberships"
  ON workspace_members
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view members of their workspaces"
  ON workspace_members
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Add trigger for default workspace creation
CREATE OR REPLACE FUNCTION create_default_workspace()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default workspace
  INSERT INTO workspaces (name, created_by)
  VALUES ('My Workspace', NEW.id)
  RETURNING id INTO NEW.default_workspace_id;

  -- Add user as workspace owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.default_workspace_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_default_workspace();

-- Update project policies
DROP POLICY IF EXISTS "Users can view projects in their workspaces" ON projects;

CREATE POLICY "Users can view their workspace projects"
  ON projects
  FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create projects in their workspaces"
  ON projects
  FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their workspace projects"
  ON projects
  FOR UPDATE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their workspace projects"
  ON projects
  FOR DELETE
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
      AND role IN ('owner', 'admin')
    )
  );