/*
  # Fix workspace policies and recursion

  1. Changes
    - Simplify workspace access policies
    - Remove circular dependencies in policies
    - Fix workspace member handling
    - Update project access policies

  2. Security
    - Maintain RLS security
    - Ensure proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "workspace_view_20240321" ON workspaces;
DROP POLICY IF EXISTS "workspace_create_20240321" ON workspaces;
DROP POLICY IF EXISTS "workspace_member_view_20240321" ON workspace_members;
DROP POLICY IF EXISTS "workspace_member_create_20240321" ON workspace_members;
DROP POLICY IF EXISTS "project_view_20240321" ON projects;
DROP POLICY IF EXISTS "project_create_20240321" ON projects;

-- Simple workspace access - avoid recursion
CREATE POLICY "workspace_select_20240321"
  ON workspaces FOR SELECT
  USING (created_by = auth.uid());

CREATE POLICY "workspace_member_select_20240321"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "workspace_insert_20240321"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace member policies
CREATE POLICY "member_select_20240321"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "member_insert_20240321"
  ON workspace_members FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM workspaces WHERE created_by = auth.uid()
    )
  );

-- Project policies
CREATE POLICY "project_select_20240321"
  ON projects FOR SELECT
  USING (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "project_insert_20240321"
  ON projects FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
    )
  );

-- Ensure RLS is enabled
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;