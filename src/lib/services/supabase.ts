
import { createClient } from '@supabase/supabase-js';

// Environment variables containing Supabase configuration
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Initialize the Supabase client with environment variables
export const supabase = createClient(supabaseUrl, supabaseKey, {
  persistSession: true,
  autoRefreshToken: true,
});

// Set up the Supabase channel to listen for changes on the 'subtasks' table
const channel = supabase.channel('custom-update-channel')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'subtasks' }, async (payload) => {
    console.log('Change received!', payload);

    // Determine the action based on the event type
    let action;
    switch (payload.eventType) {
      case 'INSERT':
        action = 'Subtask Created';
        break;
      case 'UPDATE':
        action = 'Subtask Updated';
        break;
      case 'DELETE':
        action = 'Subtask Deleted';
        break;
      default:
        action = 'Unknown Action';
    }

    // Insert a new record into the 'activity_logs' table
    const { error } = await supabase
      .from('activity_logs')
      .insert({
        ticket_id: payload.new.ticket_id,
        action,
        details: payload.new,
      });

    if (error) {
      console.error('Error logging activity:', error);
    }
  })
  .subscribe();

/**
 * Get the currently authenticated user
 * @returns The current user or null if not authenticated
 */
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error('Error getting current user:', error);
    return null;
  }
  return data.user;
};

/**
 * General error handler for Supabase operations
 * @param error The error object from Supabase
 * @param operation Description of the operation that failed
 */
export const handleSupabaseError = (error: any, operation: string) => {
  console.error(`Supabase ${operation} error:`, error);
  throw new Error(`Error during ${operation}: ${error.message || 'Unknown error'}`);
};
