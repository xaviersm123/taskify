/*
  # Fix workspace initialization and policies
  
  1. Changes
    - Add workspace initialization trigger
    - Update workspace access policies
    - Add workspace member policies
*/

-- Create or replace the workspace initialization function
CREATE OR REPLACE FUNCTION initialize_workspace_for_new_user()
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

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION initialize_workspace_for_new_user();

-- Update workspace policies
DROP POLICY IF EXISTS "Users can access their workspaces" ON workspaces;
DROP POLICY IF EXISTS "Members can view workspaces" ON workspaces;

CREATE POLICY "Workspace access policy"
  ON workspaces FOR ALL
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Update workspace member policies
DROP POLICY IF EXISTS "Workspace member access" ON workspace_members;

CREATE POLICY "Workspace member access policy"
  ON workspace_members FOR ALL
  USING (
    user_id = auth.uid() OR
    workspace_id IN (
      SELECT id 
      FROM workspaces 
      WHERE created_by = auth.uid()
    )
  );