-- Drop existing function and recreate with a better approach
DROP FUNCTION IF EXISTS swap_column_positions;

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
  -- Get current column's position and project_id
  SELECT position, project_id INTO current_position, project_id_val
  FROM board_columns
  WHERE id = column_id_param;

  -- Get max position for this project
  SELECT MAX(position) INTO max_position
  FROM board_columns
  WHERE project_id = project_id_val;

  -- Use a position way outside our range as temporary
  UPDATE board_columns
  SET position = max_position + 1000
  WHERE id = column_id_param;

  -- Shift other columns in a single update
  UPDATE board_columns
  SET position = 
    CASE 
      WHEN current_position < new_position_param AND position > current_position AND position <= new_position_param 
        THEN position - 1
      WHEN current_position > new_position_param AND position >= new_position_param AND position < current_position 
        THEN position + 1
      ELSE position
    END
  WHERE project_id = project_id_val
    AND id != column_id_param
    AND position BETWEEN LEAST(current_position, new_position_param) AND GREATEST(current_position, new_position_param);

  -- Finally set the target column to its new position
  UPDATE board_columns
  SET position = new_position_param
  WHERE id = column_id_param;
END;
$$;

-- Ensure positions are sequential for each project
CREATE OR REPLACE FUNCTION resequence_column_positions(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position) as new_pos
    FROM board_columns
    WHERE project_id = project_id_param
  )
  UPDATE board_columns
  SET position = numbered.new_pos
  FROM numbered
  WHERE board_columns.id = numbered.id;
END;
$$;

-- Add trigger to resequence positions after column deletion
CREATE OR REPLACE FUNCTION handle_column_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  PERFORM resequence_column_positions(OLD.project_id);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_column_delete ON board_columns;
CREATE TRIGGER on_column_delete
  AFTER DELETE ON board_columns
  FOR EACH ROW
  EXECUTE FUNCTION handle_column_deletion();