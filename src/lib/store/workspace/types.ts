export interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

export interface CreateWorkspaceData {
  name: string;
}

export interface WorkspaceError {
  message: string;
  code?: string;
  details?: unknown;
}