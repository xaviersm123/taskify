-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_comment_mentions ON task_comments;
DROP FUNCTION IF EXISTS handle_comment_mentions();

-- Create improved function to handle mentions
CREATE OR REPLACE FUNCTION handle_comment_mentions()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  project_id uuid;
  commenter_name text;
BEGIN
  -- Get project ID and commenter name
  SELECT 
    t.project_id,
    COALESCE(up.first_name || ' ' || up.last_name, up.email)
  INTO project_id, commenter_name
  FROM tickets t
  LEFT JOIN user_profiles up ON up.id = NEW.created_by
  WHERE t.id = NEW.ticket_id;

  -- Create notifications for mentioned users
  INSERT INTO notifications (
    user_id,
    type,
    content,
    link,
    created_by,
    metadata,
    read
  )
  SELECT 
    mentioned_user,
    'mention',
    commenter_name || ' mentioned you in a comment',
    '/projects/' || project_id || '?task=' || NEW.ticket_id,
    NEW.created_by,
    jsonb_build_object(
      'comment_id', NEW.id,
      'ticket_id', NEW.ticket_id,
      'project_id', project_id,
      'comment_content', NEW.content
    ),
    false
  FROM unnest(NEW.mentioned_users) AS mentioned_user
  WHERE mentioned_user != NEW.created_by;

  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_comment_mentions
  AFTER INSERT OR UPDATE ON task_comments
  FOR EACH ROW
  WHEN (NEW.mentioned_users IS NOT NULL AND array_length(NEW.mentioned_users, 1) > 0)
  EXECUTE FUNCTION handle_comment_mentions();

-- Ensure notifications have proper policies
DROP POLICY IF EXISTS "users_can_view_own_notifications" ON notifications;
DROP POLICY IF EXISTS "users_can_update_own_notifications" ON notifications;

CREATE POLICY "notifications_select"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);