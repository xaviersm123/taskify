/*
  # Add project members support
  
  1. New Tables
    - `project_members`: Links users to projects with roles
      - `project_id` (uuid, references projects)
      - `user_id` (uuid, references auth.users)
      - `role` (text, member roles)
      - `created_at` (timestamp)
  
  2. Security
    - Enable RLS on project_members table
    - Add policies for project member access
*/

-- Create project members table
CREATE TABLE project_members (
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

-- Enable RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "project_members_select"
  ON project_members FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "project_members_insert"
  ON project_members FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE created_by = auth.uid()
    )
  );

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_project_created ON projects;
DROP FUNCTION IF EXISTS handle_project_creation();

-- Create new function with a unique name
CREATE OR REPLACE FUNCTION handle_new_project_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, auth.uid(), 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger with a unique name
CREATE TRIGGER on_project_created_add_member
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_project_member();

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);