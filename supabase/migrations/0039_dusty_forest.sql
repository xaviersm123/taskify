-- Ensure proper cascade deletion for projects
ALTER TABLE tickets
  DROP CONSTRAINT IF EXISTS tickets_project_id_fkey,
  ADD CONSTRAINT tickets_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES projects(id)
    ON DELETE CASCADE;

ALTER TABLE board_columns
  DROP CONSTRAINT IF EXISTS board_columns_project_id_fkey,
  ADD CONSTRAINT board_columns_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES projects(id)
    ON DELETE CASCADE;

ALTER TABLE project_members
  DROP CONSTRAINT IF EXISTS project_members_project_id_fkey,
  ADD CONSTRAINT project_members_project_id_fkey
    FOREIGN KEY (project_id)
    REFERENCES projects(id)
    ON DELETE CASCADE;

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tickets_project_id ON tickets(project_id);
CREATE INDEX IF NOT EXISTS idx_tickets_assignee_id ON tickets(assignee_id);
CREATE INDEX IF NOT EXISTS idx_board_columns_project_id ON board_columns(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);