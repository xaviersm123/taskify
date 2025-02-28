import { create } from 'zustand';
import { supabase } from '../../supabase/client';
import { ProjectMemberState } from './types';

export const useProjectMemberStore = create<ProjectMemberState>((set, get) => ({
  members: [],
  loading: false,
  error: null,

  fetchMembers: async (projectId: string) => {
    if (!projectId) {
      set({ error: 'Project ID is required' });
      return;
    }

    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      set({ members: data || [], loading: false });
    } catch (error: any) {
      const message = error.message || 'Failed to fetch members';
      set({ error: message, loading: false });
      throw new Error(message);
    }
  },

  addMember: async (projectId: string, userId: string, role = 'member') => {
    if (!projectId || !userId) {
      throw new Error('Project ID and User ID are required');
    }

    try {
      const { error } = await supabase
        .from('project_members')
        .insert([{
          project_id: projectId,
          user_id: userId,
          role
        }]);

      if (error) throw error;
      
      // Refresh members list
      await get().fetchMembers(projectId);
    } catch (error: any) {
      const message = error.message || 'Failed to add member';
      set({ error: message });
      throw new Error(message);
    }
  },

  removeMember: async (projectId: string, userId: string) => {
    if (!projectId || !userId) {
      throw new Error('Project ID and User ID are required');
    }

    try {
      // Check if user is owner before removing
      const isOwner = get().members.some(
        member => member.user_id === userId && member.role === 'owner'
      );

      if (isOwner) {
        throw new Error('Cannot remove project owner');
      }

      const { error } = await supabase
        .from('project_members')
        .delete()
        .eq('project_id', projectId)
        .eq('user_id', userId);

      if (error) throw error;

      // Update local state
      set(state => ({
        members: state.members.filter(m => m.user_id !== userId),
        error: null
      }));
    } catch (error: any) {
      const message = error.message || 'Failed to remove member';
      set({ error: message });
      throw new Error(message);
    }
  }
}));