-- Add first_name and last_name columns to user_profiles
ALTER TABLE user_profiles 
ADD COLUMN first_name text,
ADD COLUMN last_name text;

-- Update existing profiles with data from auth.users metadata
UPDATE user_profiles
SET 
  first_name = COALESCE(
    (auth.users.raw_user_meta_data->>'firstName')::text,
    ''
  ),
  last_name = COALESCE(
    (auth.users.raw_user_meta_data->>'lastName')::text,
    ''
  )
FROM auth.users
WHERE user_profiles.id = auth.users.id;