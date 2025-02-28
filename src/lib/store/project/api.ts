import { supabase } from '../../supabase/client';
import { Project, CreateProjectData } from './types';

export async function deleteProject(projectId: string): Promise<void> {
  if (!projectId) {
    throw new Error('Project ID is required');
  }

  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId);

  if (error) {
    console.error('Error deleting project:', error);
    throw new Error('Failed to delete project');
  }
}

export async function createProject(data: CreateProjectData): Promise<Project> {
  const { data: project, error } = await supabase
    .from('projects')
    .insert([{
      name: data.name,
      description: data.description,
      created_by: (await supabase.auth.getUser()).data.user?.id
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error('Failed to create project');
  }

  if (!project) {
    throw new Error('Failed to create project');
  }

  return project;
}

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching projects:', error);
    throw new Error('Failed to fetch projects');
  }

  return data || [];
}