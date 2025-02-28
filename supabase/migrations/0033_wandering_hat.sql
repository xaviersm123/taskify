/*
  # Fix User Profile Setup

  1. Changes
    - Drop existing trigger and function with CASCADE to handle dependencies
    - Recreate user profile table with proper constraints
    - Add simplified policies
    - Create robust trigger function
*/

-- Drop existing objects with CASCADE to handle dependencies
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_profile() CASCADE;

-- Ensure user_profiles table exists with proper structure
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT user_profiles_email_unique UNIQUE (email)
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "allow_select_profiles" ON user_profiles;
DROP POLICY IF EXISTS "allow_update_own_profile" ON user_profiles;

-- Create simplified policies
CREATE POLICY "profiles_select_policy"
  ON public.user_profiles
  FOR SELECT TO public
  USING (true);

CREATE POLICY "profiles_update_policy"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create simplified profile creation function
CREATE OR REPLACE FUNCTION public.handle_new_user_profile_v2()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in handle_new_user_profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger with unique name
CREATE TRIGGER on_auth_user_created_profile_v2
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile_v2();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;