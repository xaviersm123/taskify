/*
  # Task Management Schema Update
  
  1. Changes
    - Add subtasks table
    - Add comments table
    - Update tickets table with new fields
    
  2. Security
    - Enable RLS on new tables
    - Add policies for subtasks and comments
*/

-- Update tickets table with new fields
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS due_date timestamptz;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assignee_id uuid REFERENCES auth.users(id);
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority text CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Create subtasks table
CREATE TABLE subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  completed_at timestamptz,
  completed_by uuid REFERENCES auth.users(id)
);

-- Create comments table
CREATE TABLE task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

-- Subtasks policies
CREATE POLICY "subtask_access_policy"
  ON subtasks
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = subtasks.ticket_id
      AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = subtasks.ticket_id
      AND p.created_by = auth.uid()
    )
  );

-- Comments policies
CREATE POLICY "comment_access_policy"
  ON task_comments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_comments.ticket_id
      AND p.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tickets t
      JOIN projects p ON p.id = t.project_id
      WHERE t.id = task_comments.ticket_id
      AND p.created_by = auth.uid()
    )
  );