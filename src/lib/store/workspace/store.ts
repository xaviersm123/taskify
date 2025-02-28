import { create } from 'zustand';
import { Workspace, CreateWorkspaceData, WorkspaceError } from './types';
import { createWorkspaceApi, fetchWorkspacesApi } from './api';

interface WorkspaceState {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  loading: boolean;
  error: WorkspaceError | null;
  createWorkspace: (data: CreateWorkspaceData) => Promise<Workspace>;
  fetchWorkspaces: () => Promise<void>;
  setCurrentWorkspace: (workspace: Workspace) => void;
  initialize: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  currentWorkspace: null,
  workspaces: [],
  loading: false,
  error: null,

  createWorkspace: async (data: CreateWorkspaceData) => {
    set({ loading: true, error: null });
    try {
      const workspace = await createWorkspaceApi(data);
      
      set(state => ({
        workspaces: [workspace, ...state.workspaces],
        currentWorkspace: workspace,
        loading: false,
        error: null
      }));

      return workspace;
    } catch (err: any) {
      const error: WorkspaceError = {
        message: err.message || 'Failed to create workspace',
        code: 'CREATE_FAILED',
        details: err
      };
      set({ error, loading: false });
      throw error;
    }
  },

  initialize: async () => {
    set({ loading: true, error: null });
    try {
      const workspaces = await fetchWorkspacesApi();
      
      set({ 
        workspaces,
        currentWorkspace: workspaces[0] || null,
        loading: false,
        error: null
      });
    } catch (err: any) {
      const error: WorkspaceError = {
        message: err.message || 'Failed to initialize workspace',
        code: 'INIT_FAILED',
        details: err
      };
      set({ error, loading: false });
      throw error;
    }
  },

  fetchWorkspaces: async () => {
    set({ loading: true, error: null });
    try {
      const workspaces = await fetchWorkspacesApi();
      set({ workspaces, loading: false, error: null });
    } catch (err: any) {
      const error: WorkspaceError = {
        message: err.message || 'Failed to fetch workspaces',
        code: 'FETCH_FAILED',
        details: err
      };
      set({ error, loading: false });
      throw error;
    }
  },

  setCurrentWorkspace: (workspace) => {
    set({ currentWorkspace: workspace });
  },
}));