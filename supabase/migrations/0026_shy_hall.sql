/*
  # Remove workspace dependencies
  
  1. Changes
    - Drop all workspace-related policies
    - Remove workspace_id from projects
    - Add direct user ownership
    
  2. Security
    - Update RLS policies for direct user ownership
    - Maintain referential integrity
*/

-- First drop ALL policies that might reference workspace_id
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON tickets CASCADE;
DROP POLICY IF EXISTS "Users can create tasks in their workspaces" ON tickets CASCADE;
DROP POLICY IF EXISTS "Users can update tasks in their workspaces" ON tickets CASCADE;
DROP POLICY IF EXISTS "Users can delete tasks in their workspaces" ON tickets CASCADE;
DROP POLICY IF EXISTS "Allow project creation for workspace members" ON projects CASCADE;
DROP POLICY IF EXISTS "Users can create projects in their workspaces" ON projects CASCADE;
DROP POLICY IF EXISTS "Users can update their workspace projects" ON projects CASCADE;
DROP POLICY IF EXISTS "Users can delete their workspace projects" ON projects CASCADE;
DROP POLICY IF EXISTS "Users can view tasks in their workspaces" ON projects CASCADE;
DROP POLICY IF EXISTS "Workspace members can create projects" ON projects CASCADE;
DROP POLICY IF EXISTS "Project access" ON projects CASCADE;
DROP POLICY IF EXISTS "project_select_20240321" ON projects CASCADE;
DROP POLICY IF EXISTS "project_insert_20240321" ON projects CASCADE;

-- Add created_by column before dropping workspace_id
ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- Update created_by based on workspace data
UPDATE projects p
SET created_by = (
  SELECT created_by 
  FROM workspaces w 
  WHERE w.id = p.workspace_id
)
WHERE created_by IS NULL;

-- Now we can safely drop the workspace_id column
ALTER TABLE projects DROP COLUMN workspace_id CASCADE;

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Create new project policies
CREATE POLICY "project_access_policy"
  ON projects
  FOR ALL
  USING (auth.uid() = created_by)
  WITH CHECK (auth.uid() = created_by);

-- Create new ticket policies
CREATE POLICY "ticket_access_policy"
  ON tickets
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tickets.project_id
      AND projects.created_by = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = tickets.project_id
      AND projects.created_by = auth.uid()
    )
  );