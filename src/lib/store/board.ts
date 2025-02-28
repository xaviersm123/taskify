import { create } from 'zustand';
import { supabase } from '../supabase/client';

export interface BoardColumn {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
}

interface BoardState {
  columns: BoardColumn[];
  loading: boolean;
  error: string | null;
  fetchColumns: (projectId: string) => Promise<void>;
  createColumn: (projectId: string, name: string) => Promise<BoardColumn>;
  updateColumn: (columnId: string, data: Partial<BoardColumn>) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (columns: BoardColumn[]) => Promise<void>;
}

export const useBoardStore = create<BoardState>((set) => ({
  columns: [],
  loading: false,
  error: null,

  fetchColumns: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('board_columns')
        .select('*')
        .eq('project_id', projectId)
        .order('position');

      if (error) throw error;
      set({ columns: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  createColumn: async (projectId: string, name: string) => {
    try {
      // Get the highest position or default to 0 if no columns exist
      const { data: columns } = await supabase
        .from('board_columns')
        .select('position')
        .eq('project_id', projectId)
        .order('position', { ascending: false });

      const position = columns && columns.length > 0 ? columns[0].position + 1 : 0;

      const { data, error } = await supabase
        .from('board_columns')
        .insert([{
          project_id: projectId,
          name,
          position
        }])
        .select()
        .single();

      if (error) throw error;
      
      set(state => ({
        columns: [...state.columns, data],
        error: null
      }));

      return data;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateColumn: async (columnId: string, data: Partial<BoardColumn>) => {
    try {
      const { error } = await supabase
        .from('board_columns')
        .update(data)
        .eq('id', columnId);

      if (error) throw error;

      set(state => ({
        columns: state.columns.map(col => 
          col.id === columnId ? { ...col, ...data } : col
        ),
        error: null
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteColumn: async (columnId: string) => {
    try {
      const { error } = await supabase
        .from('board_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      set(state => ({
        columns: state.columns.filter(col => col.id !== columnId),
        error: null
      }));
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  reorderColumns: async (columns: BoardColumn[]) => {
    try {
      const updates = columns.map((col, index) => ({
        id: col.id,
        position: index
      }));

      const { error } = await supabase
        .from('board_columns')
        .upsert(updates);

      if (error) throw error;

      set({ columns, error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  }
}));