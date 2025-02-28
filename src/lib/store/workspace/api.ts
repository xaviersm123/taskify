import { supabase } from '../../supabase/client';
import { Workspace, CreateWorkspaceData } from './types';

export async function createWorkspaceApi(data: CreateWorkspaceData): Promise<Workspace> {
  const user = await supabase.auth.getUser();
  if (!user.data.user) {
    throw new Error('Not authenticated');
  }

  // Create the workspace
  const { data: workspace, error: createError } = await supabase
    .from('workspaces')
    .insert([{
      name: data.name,
      created_by: user.data.user.id
    }])
    .select()
    .single();

  if (createError) {
    console.error('Error creating workspace:', createError);
    throw new Error(createError.message);
  }

  if (!workspace) {
    throw new Error('Failed to create workspace');
  }

  return workspace;
}

export async function fetchWorkspacesApi(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from('workspaces')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching workspaces:', error);
    throw new Error(error.message);
  }

  return data || [];
}