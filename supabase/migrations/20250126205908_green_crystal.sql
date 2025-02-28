-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS swap_column_positions CASCADE;
DROP FUNCTION IF EXISTS resequence_positions CASCADE;
DROP FUNCTION IF EXISTS handle_column_deletion CASCADE;
DROP TRIGGER IF EXISTS on_column_delete ON board_columns;

-- Create a new function that handles position swapping atomically
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
  temp_position int;
BEGIN
  -- Lock the affected rows to prevent concurrent updates
  PERFORM 1 FROM board_columns 
  WHERE project_id = (SELECT project_id FROM board_columns WHERE id = column_id_param)
  FOR UPDATE;

  -- Get current column info
  SELECT position, project_id INTO current_position, project_id_val
  FROM board_columns
  WHERE id = column_id_param;

  -- Exit if no change needed
  IF current_position = new_position_param THEN
    RETURN;
  END IF;

  -- Use a temporary position that's guaranteed to be unique
  SELECT COALESCE(MAX(position), 0) + 1000 INTO temp_position
  FROM board_columns
  WHERE project_id = project_id_val;

  -- First move our target column out of the way
  UPDATE board_columns
  SET position = temp_position
  WHERE id = column_id_param;

  -- Then shift other columns in a single update
  UPDATE board_columns
  SET position = 
    CASE 
      WHEN position > current_position AND position <= new_position_param THEN position - 1
      WHEN position >= new_position_param AND position < current_position THEN position + 1
      ELSE position
    END
  WHERE project_id = project_id_val
    AND id != column_id_param
    AND position BETWEEN LEAST(current_position, new_position_param) 
                    AND GREATEST(current_position, new_position_param);

  -- Finally move our target column to its new position
  UPDATE board_columns
  SET position = new_position_param
  WHERE id = column_id_param;

  -- Ensure positions are sequential
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 as new_pos
    FROM board_columns
    WHERE project_id = project_id_val
  )
  UPDATE board_columns bc
  SET position = n.new_pos
  FROM numbered n
  WHERE bc.id = n.id;

EXCEPTION WHEN OTHERS THEN
  -- If anything fails, resequence positions
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 as new_pos
    FROM board_columns
    WHERE project_id = project_id_val
  )
  UPDATE board_columns bc
  SET position = n.new_pos
  FROM numbered n
  WHERE bc.id = n.id;
  
  RAISE;
END;
$$;

-- Create trigger function for column deletion
CREATE OR REPLACE FUNCTION handle_column_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Resequence positions after deletion
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) - 1 as new_pos
    FROM board_columns
    WHERE project_id = OLD.project_id
  )
  UPDATE board_columns bc
  SET position = n.new_pos
  FROM numbered n
  WHERE bc.id = n.id;
  
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

-- Resequence all existing columns
DO $$
DECLARE
  project_record RECORD;
BEGIN
  FOR project_record IN SELECT DISTINCT project_id FROM board_columns LOOP
    WITH numbered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) - 1 as new_pos
      FROM board_columns
      WHERE project_id = project_record.project_id
    )
    UPDATE board_columns bc
    SET position = n.new_pos
    FROM numbered n
    WHERE bc.id = n.id;
  END LOOP;
END $$;