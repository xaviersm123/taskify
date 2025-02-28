-- Drop existing policies and triggers
DROP POLICY IF EXISTS "workspace_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "member_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "member_insert_policy" ON workspace_members;
DROP TRIGGER IF EXISTS on_workspace_created ON workspaces;

-- Simple workspace policies
CREATE POLICY "workspace_select"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_insert"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Simple member policies
CREATE POLICY "member_select"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "member_insert"
  ON workspace_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Simplified workspace creation trigger
CREATE OR REPLACE FUNCTION handle_new_workspace()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO workspace_members (workspace_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_workspace_created
  AFTER INSERT ON workspaces
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_workspace();