export interface User {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
}

export interface UpdateProfileData {
  firstName?: string;
  lastName?: string;
}

export interface UserState {
  users: User[];
  loading: boolean;
  error: string | null;
  fetchUsers: () => Promise<void>;
  updateProfile: (id: string, data: UpdateProfileData) => Promise<void>;
}