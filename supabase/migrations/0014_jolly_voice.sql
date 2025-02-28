-- Drop existing policies
DROP POLICY IF EXISTS "workspace_access" ON workspaces;
DROP POLICY IF EXISTS "workspace_member_access" ON workspace_members;
DROP POLICY IF EXISTS "project_access" ON projects;

-- Workspace policies
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

-- Workspace member policies
CREATE POLICY "workspace_member_select"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "workspace_member_insert"
  ON workspace_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Project policies
CREATE POLICY "project_select"
  ON projects FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "project_insert"
  ON projects FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;