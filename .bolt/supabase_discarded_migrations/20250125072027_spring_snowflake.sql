-- Drop ALL existing policies
DROP POLICY IF EXISTS "project_creator_access" ON projects;
DROP POLICY IF EXISTS "project_member_read" ON projects;
DROP POLICY IF EXISTS "member_select" ON project_members;
DROP POLICY IF EXISTS "member_manage" ON project_members;
DROP POLICY IF EXISTS "ticket_access" ON tickets;
DROP POLICY IF EXISTS "column_access" ON board_columns;
DROP POLICY IF EXISTS "comment_access" ON task_comments;
DROP POLICY IF EXISTS "subtask_access" ON subtasks;

-- Simplest possible project policies
CREATE POLICY "projects_basic_access"
  ON projects FOR ALL
  USING (created_by = auth.uid());

-- Separate read policy for members
CREATE POLICY "projects_member_read"
  ON projects FOR SELECT
  USING (
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Simple member policies
CREATE POLICY "members_basic_access"
  ON project_members FOR ALL
  USING (user_id = auth.uid());

-- Simple ticket policies
CREATE POLICY "tickets_basic_access"
  ON tickets FOR ALL
  USING (
    assignee_id = auth.uid() OR
    created_by = auth.uid()
  );

-- Simple board column policies
CREATE POLICY "columns_basic_access"
  ON board_columns FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Simple comment policies
CREATE POLICY "comments_basic_access"
  ON task_comments FOR ALL
  USING (created_by = auth.uid());

-- Simple subtask policies
CREATE POLICY "subtasks_basic_access"
  ON subtasks FOR ALL
  USING (created_by = auth.uid());

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_by ON task_comments(created_by);
CREATE INDEX IF NOT EXISTS idx_subtasks_created_by ON subtasks(created_by);

-- Ensure RLS is enabled
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;