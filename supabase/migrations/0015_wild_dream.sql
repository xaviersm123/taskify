/*
  # Update workspace policies and triggers

  1. Policies
    - Drop existing policies
    - Add SELECT policy for workspaces
    - Add INSERT policy for workspaces
    - Add automatic member creation trigger

  2. Security
    - Ensure workspace creator becomes owner
    - Maintain RLS
*/

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_select" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert" ON workspaces;

-- Workspace policies
CREATE POLICY "workspace_select_policy"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR created_by = auth.uid()
  );

CREATE POLICY "workspace_insert_policy"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Add workspace member on creation trigger
CREATE OR REPLACE FUNCTION add_workspace_creator_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION add_workspace_creator_as_member();