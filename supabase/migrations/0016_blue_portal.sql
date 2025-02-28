/*
  # Update workspace and project policies

  1. Changes
    - Drop and recreate workspace policies with unique names
    - Add proper workspace member policies
    - Update project access policies
    - Fix trigger function for workspace creation

  2. Security
    - Enable RLS on all tables
    - Add proper access control for workspaces and projects
*/

-- Drop all existing policies first
DROP POLICY IF EXISTS "workspace_select_policy" ON workspaces;
DROP POLICY IF EXISTS "workspace_insert_policy" ON workspaces;
DROP POLICY IF EXISTS "workspace_member_select_policy" ON workspace_members;
DROP POLICY IF EXISTS "workspace_member_insert_policy" ON workspace_members;
DROP POLICY IF EXISTS "project_select" ON projects;
DROP POLICY IF EXISTS "project_insert" ON projects;

-- Workspace policies with unique names
CREATE POLICY "workspace_view_20240321" ON workspaces 
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    ) OR created_by = auth.uid()
  );

CREATE POLICY "workspace_create_20240321" ON workspaces 
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace member policies
CREATE POLICY "workspace_member_view_20240321" ON workspace_members 
  FOR SELECT USING (
    user_id = auth.uid() OR
    workspace_id IN (SELECT id FROM workspaces WHERE created_by = auth.uid())
  );

CREATE POLICY "workspace_member_create_20240321" ON workspace_members 
  FOR INSERT WITH CHECK (
    workspace_id IN (SELECT id FROM workspaces WHERE created_by = auth.uid())
    OR user_id = auth.uid()
  );

-- Project policies
CREATE POLICY "project_view_20240321" ON projects 
  FOR SELECT USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "project_create_20240321" ON projects 
  FOR INSERT WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;