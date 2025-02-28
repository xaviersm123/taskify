-- First drop ALL existing policies
DROP POLICY IF EXISTS "creator_access_projects" ON projects;
DROP POLICY IF EXISTS "member_read_projects" ON projects;
DROP POLICY IF EXISTS "member_access" ON project_members;
DROP POLICY IF EXISTS "creator_manage_members" ON project_members;
DROP POLICY IF EXISTS "tickets_access_policy" ON tickets;

-- Atomic project policies
CREATE POLICY "project_creator_access"
  ON projects FOR ALL
  USING (created_by = auth.uid());

CREATE POLICY "project_member_read"
  ON projects FOR SELECT
  USING (
    id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Atomic project member policies
CREATE POLICY "member_select"
  ON project_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "member_manage"
  ON project_members FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id 
      FROM projects 
      WHERE created_by = auth.uid()
    )
  );

-- Atomic ticket policies
CREATE POLICY "ticket_access"
  ON tickets FOR ALL
  USING (
    assignee_id = auth.uid() OR
    project_id IN (
      SELECT id 
      FROM projects 
      WHERE created_by = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Atomic board column policies
CREATE POLICY "column_access"
  ON board_columns FOR ALL
  USING (
    project_id IN (
      SELECT id 
      FROM projects 
      WHERE created_by = auth.uid()
    ) OR
    project_id IN (
      SELECT project_id 
      FROM project_members 
      WHERE user_id = auth.uid()
    )
  );

-- Atomic comment policies
CREATE POLICY "comment_access"
  ON task_comments FOR ALL
  USING (
    ticket_id IN (
      SELECT id 
      FROM tickets 
      WHERE assignee_id = auth.uid() OR
      project_id IN (
        SELECT id 
        FROM projects 
        WHERE created_by = auth.uid()
      ) OR
      project_id IN (
        SELECT project_id 
        FROM project_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Atomic subtask policies
CREATE POLICY "subtask_access"
  ON subtasks FOR ALL
  USING (
    ticket_id IN (
      SELECT id 
      FROM tickets 
      WHERE assignee_id = auth.uid() OR
      project_id IN (
        SELECT id 
        FROM projects 
        WHERE created_by = auth.uid()
      ) OR
      project_id IN (
        SELECT project_id 
        FROM project_members 
        WHERE user_id = auth.uid()
      )
    )
  );

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_project_id ON board_columns(project_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_ticket_id ON task_comments(ticket_id);
CREATE INDEX IF NOT EXISTS idx_subtasks_ticket_id ON subtasks(ticket_id);

-- Ensure RLS is enabled on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;