-- Create function to handle column position swapping
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
BEGIN
  -- Get current column's position and project_id
  SELECT position, project_id INTO current_position, project_id_val
  FROM board_columns
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

  -- Update the target column's position
  UPDATE board_columns
  SET position = new_position_param
  WHERE id = column_id_param;
END;
$$;