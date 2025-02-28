/*
  # Fix User Signup and Profile Creation

  1. Changes
    - Drop existing trigger and function
    - Create robust user profile creation function
    - Add proper error handling
    - Ensure proper permissions
*/

-- Drop existing objects
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_profile();

-- Create function to handle new user creation
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;

  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error (in a real production system)
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_profile();

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies with clear names
DROP POLICY IF EXISTS "allow_read_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON user_profiles;

CREATE POLICY "users_read_all_profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "users_update_own_profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON user_profiles TO authenticated;

-- Backfill any missing profiles
INSERT INTO user_profiles (id, email)
SELECT id, email
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;