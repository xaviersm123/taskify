import { create } from 'zustand';
import { Project, CreateProjectData, ProjectState } from './types';
import * as api from './api';

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,
  error: null,

  createProject: async (data) => {
    try {
      const project = await api.createProject(data);
      set(state => ({
        projects: [...state.projects, project],
        error: null
      }));
      return project;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteProject: async (projectId) => {
    if (!projectId) {
      throw new Error('Project ID is required');
    }

    try {
      await api.deleteProject(projectId);
      set(state => ({
        projects: state.projects.filter(p => p.id !== projectId),
        error: null
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const projects = await api.fetchProjects();
      set({ projects, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  }
}));