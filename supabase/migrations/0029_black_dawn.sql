/*
  # Fix User Profiles Permissions

  1. Changes
    - Grant necessary permissions to the trigger function
    - Add missing indexes
    - Add email uniqueness constraint
*/

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Add missing indexes
CREATE INDEX IF NOT EXISTS idx_user_profiles_email ON user_profiles(email);

-- Add email uniqueness constraint
ALTER TABLE user_profiles
ADD CONSTRAINT user_profiles_email_unique UNIQUE (email);

-- Revoke function to fix permissions
DROP FUNCTION IF EXISTS handle_new_user_profile() CASCADE;

-- Recreate function with proper permissions
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$;

-- Recreate trigger
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_profile();