-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS swap_column_positions CASCADE;
DROP FUNCTION IF EXISTS resequence_positions CASCADE;
DROP FUNCTION IF EXISTS handle_column_deletion CASCADE;
DROP TRIGGER IF EXISTS on_column_delete ON board_columns;

-- Create an improved position swapping function that handles the unique constraint
CREATE OR REPLACE FUNCTION swap_column_positions(
  column_id_param uuid,
  new_position_param int
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_position int;
  project_id_val uuid;
  max_position int;
BEGIN
  -- Get current column info
  SELECT position, project_id INTO current_position, project_id_val
  FROM board_columns
  WHERE id = column_id_param;

  IF current_position = new_position_param THEN
    RETURN; -- Nothing to do
  END IF;

  -- Get max position for temporary storage
  SELECT COALESCE(MAX(position), 0) + 1000 INTO max_position
  FROM board_columns
  WHERE project_id = project_id_val;

  -- Move target column to temporary position
  UPDATE board_columns
  SET position = max_position
  WHERE id = column_id_param;

  -- Shift other columns
  IF current_position < new_position_param THEN
    UPDATE board_columns
    SET position = position - 1
    WHERE project_id = project_id_val
    AND position > current_position
    AND position <= new_position_param
    AND id != column_id_param;
  ELSE
    UPDATE board_columns
    SET position = position + 1
    WHERE project_id = project_id_val
    AND position >= new_position_param
    AND position < current_position
    AND id != column_id_param;
  END IF;

  -- Move target column to final position
  UPDATE board_columns
  SET position = new_position_param
  WHERE id = column_id_param;
END;
$$;

-- Function to ensure positions are sequential
CREATE OR REPLACE FUNCTION resequence_positions(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (
      ORDER BY 
        CASE WHEN position >= 1000 THEN 0 ELSE position END,
        created_at
    ) as new_pos
    FROM board_columns
    WHERE project_id = project_id_param
  )
  UPDATE board_columns
  SET position = numbered.new_pos
  FROM numbered
  WHERE board_columns.id = numbered.id;
END;
$$;

-- Trigger function to handle column deletion
CREATE OR REPLACE FUNCTION handle_column_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM resequence_positions(OLD.project_id);
  RETURN OLD;
END;
$$;

-- Create trigger for column deletion
CREATE TRIGGER on_column_delete
  AFTER DELETE ON board_columns
  FOR EACH ROW
  EXECUTE FUNCTION handle_column_deletion();

-- Ensure unique constraint exists
ALTER TABLE board_columns 
DROP CONSTRAINT IF EXISTS board_columns_project_position_unique;

ALTER TABLE board_columns 
ADD CONSTRAINT board_columns_project_position_unique 
UNIQUE (project_id, position);

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_board_columns_project_position 
ON board_columns(project_id, position);

-- Resequence all existing columns to ensure proper ordering
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN SELECT DISTINCT project_id FROM board_columns LOOP
    PERFORM resequence_positions(project_record.project_id);
  END LOOP;
END $$;