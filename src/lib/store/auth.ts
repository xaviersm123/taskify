import { create } from 'zustand';
import { supabase } from '../supabase/client';
import { User } from '@supabase/supabase-js';

interface SignUpData {
  /**
   * Email address of the user
   */
  email: string;
  
  /**
   * Password for the user account
   */
  password: string;
  
  /**
   * First name of the user (optional)
   */
  firstName?: string;
  
  /**
   * Last name of the user (optional)
   */
  lastName?: string;
}

interface AuthState {
  /**
   * The currently authenticated user or null if not authenticated
   */
  user: User | null;
  
  /**
   * Loading state to indicate if an authentication request is in progress
   */
  loading: boolean;
  
  /**
   * Function to sign in a user with email and password
   */
  signIn: (email: string, password: string) => Promise<void>;
  
  /**
   * Function to sign up a new user with email, password, and optional profile data
   */
  signUp: (data: SignUpData) => Promise<void>;
  
  /**
   * Function to sign out the currently authenticated user
   */
  signOut: () => Promise<void>;
}

/**
 * Zustand store for managing authentication state
 * Provides actions to sign in, sign up, and sign out users
 */
export const useAuthStore = create<AuthState>((set) => ({
  /**
   * The currently authenticated user or null if not authenticated
   */
  user: null,
  
  /**
   * Loading state to indicate if an authentication request is in progress
   */
  loading: true,

  /**
   * Sign in a user with email and password
   * 
   * @param email - Email address of the user
   * @param password - Password for the user account
   */
  signIn: async (email: string, password: string) => {
    try {
      // Sign in the user with email and password using Supabase
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      // Throw an error if the sign-in request fails
      if (error) throw error;
      
      // Update the user state with the authenticated user
      set({ user: data.user });
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  },

  /**
   * Sign up a new user with email, password, and optional profile data
   * 
   * @param data - Object containing the sign-up data
   */
  signUp: async ({ email, password, firstName, lastName }) => {
    try {
      // Sign up the user with email, password, and optional profile data using Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            firstName,
            lastName,
          },
        },
      });
      
      // Throw an error if the sign-up request fails
      if (error) throw error;
      
      // Throw an error if no user data is returned
      if (!data.user) throw new Error('No user data returned');
      
      // Update the user state with the authenticated user
      set({ user: data.user });
    } catch (error) {
      console.error('Sign up error:', error);
      throw error;
    }
  },

  /**
   * Sign out the currently authenticated user
   */
  signOut: async () => {
    try {
      // Sign out the user using Supabase
      const { error } = await supabase.auth.signOut();
      
      // Throw an error if the sign-out request fails
      if (error) throw error;
      
      // Update the user state to null
      set({ user: null });
    } catch (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  },
}));

// Initialize auth state
supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
    // Update the user state when the user signs in or the initial session is loaded
    useAuthStore.setState({ user: session?.user || null });
  } else if (event === 'SIGNED_OUT') {
    // Update the user state to null when the user signs out
    useAuthStore.setState({ user: null });
  }
});

// Get initial session
supabase.auth.getSession().then(({ data: { session } }) => {
  // Update the user state with the initial session and set loading to false
  useAuthStore.setState({ user: session?.user || null, loading: false });
});