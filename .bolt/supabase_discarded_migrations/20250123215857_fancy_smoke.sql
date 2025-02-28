-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('mention', 'assignment', 'comment')),
  content text NOT NULL,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  metadata jsonb DEFAULT '{}'::jsonb
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Create notification policies
CREATE POLICY "users_can_view_own_notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "users_can_update_own_notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

-- Add mentions array to task_comments if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'task_comments' AND column_name = 'mentioned_users'
  ) THEN
    ALTER TABLE task_comments 
    ADD COLUMN mentioned_users uuid[] DEFAULT '{}';
  END IF;
END $$;

-- Create or replace function to handle mentions
CREATE OR REPLACE FUNCTION handle_comment_mentions()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notifications for mentioned users
  INSERT INTO notifications (user_id, type, content, link, created_by, metadata)
  SELECT 
    mentioned_user,
    'mention',
    format('%s mentioned you in a comment', (SELECT email FROM user_profiles WHERE id = NEW.created_by)),
    '/projects/' || (SELECT project_id FROM tickets WHERE id = NEW.ticket_id) || '?task=' || NEW.ticket_id,
    NEW.created_by,
    jsonb_build_object(
      'comment_id', NEW.id,
      'ticket_id', NEW.ticket_id,
      'comment_content', NEW.content
    )
  FROM unnest(NEW.mentioned_users) AS mentioned_user
  WHERE mentioned_user != NEW.created_by;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists and recreate
DROP TRIGGER IF EXISTS on_comment_mentions ON task_comments;
CREATE TRIGGER on_comment_mentions
  AFTER INSERT OR UPDATE ON task_comments
  FOR EACH ROW
  WHEN (NEW.mentioned_users IS NOT NULL AND array_length(NEW.mentioned_users, 1) > 0)
  EXECUTE FUNCTION handle_comment_mentions();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
CREATE INDEX IF NOT EXISTS idx_task_comments_mentioned_users ON task_comments USING gin(mentioned_users);