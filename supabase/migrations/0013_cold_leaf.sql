-- Drop all existing policies
DROP POLICY IF EXISTS "workspace_basic_access" ON workspaces;
DROP POLICY IF EXISTS "workspace_member_view" ON workspaces;
DROP POLICY IF EXISTS "member_access" ON workspace_members;
DROP POLICY IF EXISTS "project_member_access" ON projects;

-- Simple workspace access
CREATE POLICY "workspace_access"
  ON workspaces FOR ALL
  USING (true);

-- Simple workspace member access
CREATE POLICY "workspace_member_access"
  ON workspace_members FOR ALL
  USING (true);

-- Simple project access
CREATE POLICY "project_access"
  ON projects FOR ALL
  USING (true);

-- Ensure RLS is enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;