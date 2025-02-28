-- First drop ALL existing project-related policies
DROP POLICY IF EXISTS "projects_select" ON projects;
DROP POLICY IF EXISTS "projects_insert" ON projects;
DROP POLICY IF EXISTS "projects_update" ON projects;
DROP POLICY IF EXISTS "projects_delete" ON projects;
DROP POLICY IF EXISTS "project_access_policy" ON projects;
DROP POLICY IF EXISTS "member_insert_policy" ON project_members;

-- Simple project policies
CREATE POLICY "allow_select_projects"
  ON projects FOR SELECT
  USING (
    created_by = auth.uid() OR
    id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())
  );

CREATE POLICY "allow_insert_projects"
  ON projects FOR INSERT
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "allow_update_projects"
  ON projects FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "allow_delete_projects"
  ON projects FOR DELETE
  USING (created_by = auth.uid());

-- Simple project members policies
CREATE POLICY "allow_select_members"
  ON project_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "allow_insert_members"
  ON project_members FOR INSERT
  WITH CHECK (
    project_id IN (SELECT id FROM projects WHERE created_by = auth.uid())
  );

-- Ensure RLS is enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;