-- Create task activities table
CREATE TABLE task_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id),
  type text NOT NULL CHECK (type IN ('create', 'update', 'comment', 'subtask', 'attachment')),
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;

-- Create policy for task activity access
CREATE POLICY "task_activities_access_policy_v2"
  ON task_activities FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tickets
      WHERE project_id IN (
        SELECT id FROM projects WHERE created_by = auth.uid()
      ) OR assignee_id = auth.uid() OR
      auth.uid() = ANY(collaborator_ids) OR
      project_id IN (
        SELECT project_id FROM project_members WHERE user_id = auth.uid()
      )
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX idx_task_activities_created_at ON task_activities(created_at);