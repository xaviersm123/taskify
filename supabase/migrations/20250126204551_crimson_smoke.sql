-- First drop the existing position constraint if it exists
ALTER TABLE board_columns 
DROP CONSTRAINT IF EXISTS board_columns_position_key;

-- Add a composite unique constraint for position within each project
ALTER TABLE board_columns 
ADD CONSTRAINT board_columns_project_position_unique 
UNIQUE (project_id, position);

-- Update the swap positions function to handle the constraint properly
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
  -- Get current column's position and project_id
  SELECT position, project_id INTO current_position, project_id_val
  FROM board_columns
  WHERE id = column_id_param;

  -- Use a temporary position outside normal range to avoid conflicts
  temp_position := -1;

  -- First move the target column to temporary position
  UPDATE board_columns
  SET position = temp_position
  WHERE id = column_id_param;

  -- Update positions of columns in between
  IF current_position < new_position_param THEN
    -- Moving forward: shift affected columns backward
    UPDATE board_columns
    SET position = position - 1
    WHERE project_id = project_id_val
      AND position > current_position
      AND position <= new_position_param;
  ELSIF current_position > new_position_param THEN
    -- Moving backward: shift affected columns forward
    UPDATE board_columns
    SET position = position + 1
    WHERE project_id = project_id_val
      AND position >= new_position_param
      AND position < current_position;
  END IF;

  -- Finally update the target column to its new position
  UPDATE board_columns
  SET position = new_position_param
  WHERE id = column_id_param;
END;
$$;