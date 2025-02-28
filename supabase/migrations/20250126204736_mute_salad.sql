-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS swap_column_positions CASCADE;
DROP FUNCTION IF EXISTS resequence_column_positions CASCADE;
DROP FUNCTION IF EXISTS handle_column_deletion CASCADE;
DROP TRIGGER IF EXISTS on_column_delete ON board_columns;

-- Create a new function that handles position swapping within a transaction
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
  affected_columns cursor(p_id uuid, old_pos int, new_pos int) FOR
    SELECT id, position
    FROM board_columns
    WHERE project_id = p_id
    AND position BETWEEN LEAST(old_pos, new_pos) AND GREATEST(old_pos, new_pos)
    ORDER BY position;
  temp_pos int;
BEGIN
  -- Start transaction
  BEGIN
    -- Get current column info
    SELECT position, project_id INTO current_position, project_id_val
    FROM board_columns
    WHERE id = column_id_param;
    
    IF current_position = new_position_param THEN
      RETURN; -- Nothing to do
    END IF;

    -- Temporarily move target column out of the way
    UPDATE board_columns
    SET position = -1
    WHERE id = column_id_param;

    -- Move other columns
    IF current_position < new_position_param THEN
      UPDATE board_columns
      SET position = position - 1
      WHERE project_id = project_id_val
      AND position > current_position
      AND position <= new_position_param;
    ELSE
      UPDATE board_columns
      SET position = position + 1
      WHERE project_id = project_id_val
      AND position >= new_position_param
      AND position < current_position;
    END IF;

    -- Move target column to final position
    UPDATE board_columns
    SET position = new_position_param
    WHERE id = column_id_param;

    -- Verify and fix any gaps
    PERFORM resequence_positions(project_id_val);
    
    -- Commit transaction
    COMMIT;
  EXCEPTION WHEN OTHERS THEN
    -- On error, rollback and resequence
    ROLLBACK;
    PERFORM resequence_positions(project_id_val);
    RAISE;
  END;
END;
$$;

-- Helper function to resequence positions
CREATE OR REPLACE FUNCTION resequence_positions(project_id_param uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  WITH numbered AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY position, created_at) as new_pos
    FROM board_columns
    WHERE project_id = project_id_param
  )
  UPDATE board_columns
  SET position = numbered.new_pos
  FROM numbered
  WHERE board_columns.id = numbered.id;
END;
$$;

-- Create trigger for column deletion
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
CREATE INDEX IF NOT EXISTS idx_board_columns_position 
ON board_columns(project_id, position);