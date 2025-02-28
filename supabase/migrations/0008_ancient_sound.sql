/*
  # Fix project creation policies

  1. Changes
    - Simplify project creation policy
    - Add explicit workspace access check
*/

-- Drop existing project creation policy
DROP POLICY IF EXISTS "Project creation" ON projects;

-- Simplified project creation policy
CREATE POLICY "Allow project creation for workspace members"
  ON projects FOR INSERT
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id 
      FROM workspace_members 
      WHERE user_id = auth.uid()
    )
  );