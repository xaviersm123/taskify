/*
  # Fix workspace policies recursion
  
  1. Changes
    - Remove circular policy dependencies
    - Simplify access rules
    - Fix infinite recursion in workspace policies
*/

-- Drop existing problematic policies
DROP POLICY IF EXISTS "workspace_access" ON workspaces;
DROP POLICY IF EXISTS "workspace_member_access" ON workspace_members;
DROP POLICY IF EXISTS "project_access" ON projects;

-- Basic workspace access - no recursion
CREATE POLICY "workspace_basic_access"
  ON workspaces FOR SELECT
  USING (created_by = auth.uid());

-- Separate policy for member access to workspaces
CREATE POLICY "workspace_member_view"
  ON workspaces FOR SELECT
  USING (
    id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Simple member access
CREATE POLICY "member_access"
  ON workspace_members FOR SELECT
  USING (user_id = auth.uid());

-- Project access
CREATE POLICY "project_member_access"
  ON projects FOR ALL
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );