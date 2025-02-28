import { create } from 'zustand';
import { supabase } from '../supabase/client';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'active' | 'archived';
  created_at: string;
  created_by: string;
}

interface ProjectState {
  projects: Project[];
  loading: boolean;
  error: string | null;
  createProject: (data: { name: string; description?: string }) => Promise<Project>;
  fetchProjects: () => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  loading: false,
  error: null,

  createProject: async (data) => {
    try {
      const { data: project, error } = await supabase
        .from('projects')
        .insert([{
          name: data.name,
          description: data.description,
          status: 'active',
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        projects: [...state.projects, project],
        error: null
      }));

      return project;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to create project';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  fetchProjects: async () => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ projects: data || [], loading: false });
    } catch (error: any) {
      set({ 
        error: error.message || 'Failed to fetch projects', 
        loading: false 
      });
    }
  },

  updateProject: async (id, data) => {
    try {
      const { error } = await supabase
        .from('projects')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        projects: state.projects.map(p => 
          p.id === id ? { ...p, ...data } : p
        ),
        error: null,
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to update project';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  deleteProject: async (id) => {
    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        projects: state.projects.filter(p => p.id !== id),
        error: null,
      }));
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to delete project';
      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },
}));