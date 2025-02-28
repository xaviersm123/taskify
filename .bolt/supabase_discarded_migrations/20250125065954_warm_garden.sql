-- Drop existing policies
DROP POLICY IF EXISTS "project_access_policy" ON projects;

-- Create separate policies for different operations
CREATE POLICY "projects_select"
  ON projects FOR SELECT
  USING (
    created_by = auth.uid() OR
    id IN (
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "projects_insert"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "projects_update"
  ON projects FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "projects_delete"
  ON projects FOR DELETE
  USING (created_by = auth.uid());

-- Update project members policy to avoid recursion
DROP POLICY IF EXISTS "member_insert_policy" ON project_members;
CREATE POLICY "member_insert_policy"
  ON project_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE id = project_id
      AND created_by = auth.uid()
    )
  );