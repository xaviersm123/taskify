-- Drop ALL existing policies
DROP POLICY IF EXISTS "allow_select_projects" ON projects;
DROP POLICY IF EXISTS "allow_insert_projects" ON projects;
DROP POLICY IF EXISTS "allow_update_projects" ON projects;
DROP POLICY IF EXISTS "allow_delete_projects" ON projects;
DROP POLICY IF EXISTS "allow_select_members" ON project_members;
DROP POLICY IF EXISTS "allow_insert_members" ON project_members;

-- Project creator policies (no recursion possible)
CREATE POLICY "creator_access_projects"
  ON projects FOR ALL
  USING (created_by = auth.uid());

-- Project member read access (simple join, no recursion)
CREATE POLICY "member_read_projects"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 
      FROM project_members 
      WHERE project_members.project_id = projects.id 
      AND project_members.user_id = auth.uid()
    )
  );

-- Project member policies (direct checks only)
CREATE POLICY "member_access"
  ON project_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 
      FROM projects 
      WHERE id = project_members.project_id 
      AND created_by = auth.uid()
    )
  );

CREATE POLICY "creator_manage_members"
  ON project_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 
      FROM projects 
      WHERE id = project_members.project_id 
      AND created_by = auth.uid()
    )
  );

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);

-- Ensure RLS is enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;