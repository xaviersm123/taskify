import { create } from 'zustand';
import { supabase } from '../supabase/client';

export interface User {
  /**
   * Unique identifier for the user
   */
  id: string;
  
  /**
   * Email address of the user
   */
  email: string;
  
  /**
   * First name of the user (optional)
   */
  first_name?: string;
  
  /**
   * Last name of the user (optional)
   */
  last_name?: string;
  
  /**
   * URL of the user's avatar image (optional)
   */
  avatar_url?: string;
  
  /**
   * Timestamp of when the user was created
   */
  created_at: string;
}

interface UserState {
  /**
   * Array of user objects
   */
  users: User[];
  
  /**
   * Loading state to indicate if a request is in progress
   */
  loading: boolean;
  
  /**
   * Error message if any error occurs during a request
   */
  error: string | null;
  
  /**
   * Function to fetch all users from the database
   */
  fetchUsers: () => Promise<void>;
  
  /**
   * Function to update a user's profile in the database and local state
   */
  updateProfile: (id: string, data: { firstName?: string; lastName?: string }) => Promise<void>;
}

/**
 * Zustand store for managing user state
 * Provides actions to fetch users and update user profiles
 */
export const useUserStore = create<UserState>((set) => ({
  /**
   * Array of user objects
   */
  users: [],
  
  /**
   * Loading state to indicate if a request is in progress
   */
  loading: false,
  
  /**
   * Error message if any error occurs during a request
   */
  error: null,

  /**
   * Fetch all users from the database
   */
  fetchUsers: async () => {
    // Set loading state to true before making the request
    set({ loading: true, error: null });
    try {
      // Fetch users from the 'user_profiles' table in Supabase
      const { data: users, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('email');

      // Throw an error if the request fails
      if (error) throw error;

      // Update the users state with the fetched data and set loading to false
      set({ users: users || [], loading: false });
    } catch (error: any) {
      // Set the error message and loading state to false if an error occurs
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Update a user's profile in the database and local state
   * 
   * @param id - ID of the user to update
   * @param data - Object containing the updated profile data
   */
  updateProfile: async (id, { firstName, lastName }) => {
    try {
      // Update the user's auth metadata in Supabase
      const { error: authError } = await supabase.auth.updateUser({
        data: { firstName, lastName }
      });

      // Throw an error if the auth update request fails
      if (authError) throw authError;

      // Update the user's profile in the 'user_profiles' table in Supabase
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', id);

      // Throw an error if the profile update request fails
      if (profileError) throw profileError;

      // Update the local state with the updated profile data
      set(state => ({
        users: state.users.map(user => 
          user.id === id ? { 
            ...user, 
            first_name: firstName,
            last_name: lastName
          } : user
        )
      }));
    } catch (error: any) {
      // Set the error message if an error occurs
      set({ error: error.message });
      throw error;
    }
  }
}));