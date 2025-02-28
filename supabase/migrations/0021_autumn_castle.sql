-- Drop existing policies
DROP POLICY IF EXISTS "workspace_select_20240324" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert_20240324" ON workspaces;
DROP POLICY IF EXISTS "member_select_20240324" ON workspace_members;
DROP POLICY IF EXISTS "member_insert_20240324" ON workspace_members;

-- Workspace policies
CREATE POLICY "workspace_access_policy"
  ON workspaces FOR ALL
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR created_by = auth.uid()
  );

-- Workspace member policies
CREATE POLICY "member_access_policy"
  ON workspace_members FOR ALL
  USING (user_id = auth.uid());

-- Function to handle workspace creation
CREATE OR REPLACE FUNCTION handle_workspace_creation()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate trigger
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;
CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION handle_workspace_creation();