export interface ProjectMember {
  project_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
}

export interface ProjectMemberState {
  members: ProjectMember[];
  loading: boolean;
  error: string | null;
  fetchMembers: (projectId: string) => Promise<void>;
  addMember: (projectId: string, userId: string, role?: 'admin' | 'member') => Promise<void>;
  removeMember: (projectId: string, userId: string) => Promise<void>;
  updateMemberRole: (projectId: string, userId: string, role: 'admin' | 'member') => Promise<void>;
}