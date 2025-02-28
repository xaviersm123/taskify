import { supabase } from '../../supabase/client';
import { ProjectMember } from './types';

export async function fetchProjectMembers(projectId: string): Promise<ProjectMember[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select('*')
    .eq('project_id', projectId);

  if (error) {
    console.error('Error fetching project members:', error);
    throw new Error('Failed to fetch project members');
  }

  return data || [];
}

export async function addProjectMember(
  projectId: string,
  userId: string,
  role: 'admin' | 'member' = 'member'
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .insert([{
      project_id: projectId,
      user_id: userId,
      role
    }]);

  if (error) {
    console.error('Error adding project member:', error);
    throw new Error('Failed to add project member');
  }
}

export async function removeProjectMember(
  projectId: string,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error removing project member:', error);
    throw new Error('Failed to remove project member');
  }
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: 'admin' | 'member'
): Promise<void> {
  const { error } = await supabase
    .from('project_members')
    .update({ role })
    .eq('project_id', projectId)
    .eq('user_id', userId);

  if (error) {
    console.error('Error updating project member role:', error);
    throw new Error('Failed to update project member role');
  }
}