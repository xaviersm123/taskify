-- Drop existing policies
DROP POLICY IF EXISTS "workspace_access_policy" ON workspaces;
DROP POLICY IF EXISTS "member_access_policy" ON workspace_members;

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

-- Workspace member policies
CREATE POLICY "member_select_policy"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "member_insert_policy"
  ON workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE created_by = auth.uid()
    ) OR user_id = auth.uid()
  );

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