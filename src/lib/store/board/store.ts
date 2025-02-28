import { create } from 'zustand';
import { supabase } from '../../supabase/client';
import { BoardState } from './types';

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

  updateColumn: async (columnId: string, data: { name?: string; position?: number }) => {
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
      // Delete the column - tasks will be deleted automatically via ON DELETE CASCADE
      const { error } = await supabase
        .from('board_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      // Update local state
      set(state => ({
        columns: state.columns.filter(col => col.id !== columnId),
        error: null
      }));
    } catch (error: any) {
      console.error('Failed to delete column:', error);
      set({ error: error.message });
      throw error;
    }
  }
}));