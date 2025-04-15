// lib/store/project/types.ts

export interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  created_by: string;
}

export interface CreateProjectData {
  name: string;
  description?: string;
}

export interface ProjectState {
  projects: Project[];
  currentProject: Project | null; // <-- ADD THIS LINE (Recommended)
  loading: boolean;
  error: string | null;
  createProject: (data: CreateProjectData) => Promise<Project>;
  deleteProject: (id: string) => Promise<void>;
  fetchProjects: () => Promise<void>;
  fetchProjectById: (projectId: string) => Promise<void>; // <-- ADD THIS LINE (Required)
}