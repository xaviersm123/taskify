-- Drop existing board column policies
DROP POLICY IF EXISTS "board_columns_select" ON board_columns;
DROP POLICY IF EXISTS "board_columns_insert" ON board_columns;
DROP POLICY IF EXISTS "board_columns_update" ON board_columns;
DROP POLICY IF EXISTS "board_columns_delete" ON board_columns;

-- Create a single comprehensive policy for all operations
CREATE POLICY "board_columns_full_access"
  ON board_columns
  FOR ALL
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
      UNION
      SELECT project_id FROM project_members WHERE user_id = auth.uid()
    )
  );

-- Add index for better performance if not exists
CREATE INDEX IF NOT EXISTS idx_board_columns_project_id ON board_columns(project_id);

-- Ensure RLS is enabled
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;