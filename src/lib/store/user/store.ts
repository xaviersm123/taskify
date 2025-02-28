import { create } from 'zustand';
import { supabase } from '../../supabase/client';
import { UserState, User, UpdateProfileData } from './types';

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
    set({ loading: true });
    try {
      // Fetch users from the 'users' table in Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*');

      // Throw an error if the request fails
      if (error) throw error;

      // Update the users state with the fetched data and set loading to false
      set({ users: data || [], loading: false });
    } catch (error: any) {
      // Set the error message and loading state to false if an error occurs
      set({ error: error.message, loading: false });
    }
  },

  /**
   * Update a user's profile in the database and local state
   * 
   * @param id - ID of the user to update
   * @param data - Object containing the updated profile data
   */
  updateProfile: async (id: string, { firstName, lastName }: UpdateProfileData) => {
    try {
      // Update the user's profile in the 'user_profiles' table in Supabase
      const { error: profileError } = await supabase
        .from('user_profiles')
        .update({
          first_name: firstName,
          last_name: lastName
        })
        .eq('id', id);

      // Throw an error if the request fails
      if (profileError) throw profileError;

      // Update the local state with the updated profile data
      set(state => ({
        users: state.users.map(user => 
          user.id === id ? { 
            ...user, 
            first_name: firstName,
            last_name: lastName
          } : user
        ),
        error: null
      }));
    } catch (error: any) {
      // Set the error message if an error occurs
      set({ error: error.message });
      throw error;
    }
  }
}));