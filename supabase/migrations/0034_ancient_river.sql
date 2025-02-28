/*
  # Fix User Profile Creation

  1. Changes
    - Drop existing triggers and functions with proper CASCADE
    - Recreate user profile table with proper structure
    - Add simplified policies
    - Create new trigger function with proper error handling
*/

-- Drop ALL existing profile-related objects with CASCADE
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users CASCADE;
DROP TRIGGER IF EXISTS on_auth_user_created_profile_v2 ON auth.users CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_profile() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user_profile_v2() CASCADE;

-- Recreate user profiles table
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

-- Create simplified policies
CREATE POLICY "profiles_select"
  ON public.user_profiles
  FOR SELECT TO public
  USING (true);

CREATE POLICY "profiles_update"
  ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Create new profile handler function
CREATE OR REPLACE FUNCTION public.handle_user_profile_creation()
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
    RAISE WARNING 'Error creating user profile: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create new trigger with unique name
CREATE TRIGGER on_auth_user_created_2024
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_user_profile_creation();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;