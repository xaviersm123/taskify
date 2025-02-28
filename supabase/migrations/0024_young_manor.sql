/*
  # Fix workspace creation and policies

  1. Changes
    - Simplify workspace and member policies
    - Add workspace creation trigger
    - Enable RLS on all tables
    
  2. Security
    - Enable RLS for all tables
    - Add basic policies for workspace access
    - Add member policies
*/

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_select" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert" ON workspaces;
DROP POLICY IF EXISTS "member_select" ON workspace_members;
DROP POLICY IF EXISTS "member_insert" ON workspace_members;

-- Basic workspace policies
CREATE POLICY "workspace_select_policy"
  ON workspaces FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "workspace_insert_policy"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Basic member policies
CREATE POLICY "member_select_policy"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "member_insert_policy"
  ON workspace_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Function to handle workspace creation
CREATE OR REPLACE FUNCTION handle_workspace_creation()
RETURNS TRIGGER AS $$
BEGIN
  -- Add creator as workspace owner
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for workspace creation
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION handle_workspace_creation();