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
  // Fetch user safely
  const userResponse = await supabase.auth.getUser();
  const userId = userResponse.data.user?.id;

  if (!userId) {
      console.error("Create Project Error: User not authenticated.");
      throw new Error("User must be authenticated to create a project.");
  }

  const { data: project, error } = await supabase
    .from('projects')
    .insert([{
      name: data.name,
      description: data.description,
      created_by: userId // Use safely fetched user ID
    }])
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    throw new Error('Failed to create project');
  }

  // .single() should throw if !project, but check is fine
  if (!project) {
    throw new Error('Failed to create project (no data returned).');
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

// --- ADDED FUNCTION ---
export async function fetchProjectById(projectId: string): Promise<Project> {
  if (!projectId) {
    console.error("fetchProjectById Error: projectId is required.");
    throw new Error("Project ID is required to fetch a project.");
  }

  const { data, error } = await supabase
    .from('projects') // Make sure 'projects' is your correct table name
    .select('*')      // Select all columns, or specify needed ones
    .eq('id', projectId) // Filter by the provided project ID
    .single();        // Expect exactly one row

  if (error) {
    console.error(`Error fetching project with ID ${projectId}:`, error);
    if (error.code === 'PGRST116') {
        throw new Error(`Project with ID ${projectId} not found.`);
    }
    throw new Error(`Failed to fetch project (ID: ${projectId}).`);
  }

  if (!data) {
    // This case should ideally be covered by .single() erroring, but good failsafe
    throw new Error(`Project with ID ${projectId} not found, despite no Supabase error.`);
  }

  return data as Project;
}
// --- END OF ADDED FUNCTION ---