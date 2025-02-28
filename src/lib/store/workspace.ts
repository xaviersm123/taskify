import { create } from 'zustand';
import { supabase } from '../supabase/client';

interface Workspace {
  id: string;
  name: string;
  created_at: string;
}

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  error: string | null;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace) => void;
  initialize: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set) => ({
  currentWorkspace: null,
  workspaces: [],
  loading: false,
  error: null,

  initialize: async () => {
    set({ loading: true });
    try {
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (workspaces && workspaces.length > 0) {
        set({ 
          workspaces,
          currentWorkspace: workspaces[0],
          loading: false 
        });
      }
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchWorkspaces: async () => {
    set({ loading: true });
    try {
      const { data: workspaces, error } = await supabase
        .from('workspaces')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      set({ workspaces, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  setCurrentWorkspace: (workspace) => {
    set({ currentWorkspace: workspace });
  },
}));