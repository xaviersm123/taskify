-- Create board columns table
CREATE TABLE board_columns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  position float NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE board_columns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "board_columns_access_policy"
  ON board_columns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = board_columns.project_id
      AND projects.created_by = auth.uid()
    )
  );

-- Add column_id to tickets table
ALTER TABLE tickets ADD COLUMN column_id uuid REFERENCES board_columns(id);

-- Create default columns function
CREATE OR REPLACE FUNCTION create_default_board_columns()
RETURNS TRIGGER AS $$
BEGIN
  -- Create default columns
  INSERT INTO board_columns (project_id, name, position, created_by)
  VALUES 
    (NEW.id, 'To do', 0, auth.uid()),
    (NEW.id, 'In progress', 1, auth.uid()),
    (NEW.id, 'Complete', 2, auth.uid());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new project creation
CREATE TRIGGER on_project_created
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION create_default_board_columns();