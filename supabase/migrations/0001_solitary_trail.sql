/*
  # Initial Schema Setup for Project Management System

  1. Tables
    - users (handled by Supabase Auth)
    - workspaces
    - projects
    - tickets
    - custom_fields
    - ticket_custom_fields
    - comments
    - attachments

  2. Security
    - Enable RLS on all tables
    - Add policies for workspace members
*/

-- Workspaces
CREATE TABLE workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Workspace Members
CREATE TABLE workspace_members (
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  created_at timestamptz DEFAULT now(),
  PRIMARY KEY (workspace_id, user_id)
);

-- Projects
CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'archived')),
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Project Views
CREATE TABLE project_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('kanban', 'list', 'calendar', 'timeline')),
  config jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Tickets
CREATE TABLE tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'review', 'done')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  assignee_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date timestamptz,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  position float DEFAULT 0
);

-- Custom Fields
CREATE TABLE custom_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('text', 'number', 'date', 'select', 'multiselect')),
  options jsonb DEFAULT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Ticket Custom Field Values
CREATE TABLE ticket_custom_fields (
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  field_id uuid REFERENCES custom_fields(id) ON DELETE CASCADE,
  value jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (ticket_id, field_id)
);

-- Comments
CREATE TABLE comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Attachments
CREATE TABLE attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid REFERENCES tickets(id) ON DELETE CASCADE,
  name text NOT NULL,
  url text NOT NULL,
  size integer NOT NULL,
  type text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Workspace Policies
CREATE POLICY "Users can view workspaces they are members of"
  ON workspaces FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = workspaces.id
    AND workspace_members.user_id = auth.uid()
  ));

CREATE POLICY "Users can create workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- Workspace Members Policies
CREATE POLICY "Users can view workspace members they are members of"
  ON workspace_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members members
    WHERE members.workspace_id = workspace_members.workspace_id
    AND members.user_id = auth.uid()
  ));

-- Project Policies
CREATE POLICY "Users can view projects in their workspaces"
  ON projects FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = projects.workspace_id
    AND workspace_members.user_id = auth.uid()
  ));

-- Ticket Policies
CREATE POLICY "Users can view tickets in their workspaces"
  ON tickets FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM workspace_members
    WHERE workspace_members.workspace_id = (
      SELECT workspace_id FROM projects WHERE id = tickets.project_id
    )
    AND workspace_members.user_id = auth.uid()
  ));