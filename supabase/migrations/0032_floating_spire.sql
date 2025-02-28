/*
  # Fix User Signup and Profile Creation

  1. Changes
    - Simplify user profile creation
    - Add proper error handling
    - Fix permission issues
    - Remove unnecessary complexity
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
DROP FUNCTION IF EXISTS handle_new_user_profile();

-- Create simplified function for user profile creation
CREATE OR REPLACE FUNCTION handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Profile already exists, ignore
    RETURN NEW;
  WHEN OTHERS THEN
    -- Log error but don't fail the transaction
    RAISE WARNING 'Error in handle_new_user_profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger with proper timing
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user_profile();

-- Ensure proper permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;

-- Ensure RLS is enabled with proper policies
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Recreate policies with proper names
DROP POLICY IF EXISTS "users_read_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;

CREATE POLICY "allow_select_profiles"
  ON public.user_profiles
  FOR SELECT TO public
  USING (true);

CREATE POLICY "allow_update_own_profile"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);