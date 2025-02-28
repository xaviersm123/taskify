export interface Notification {
  id: string;
  user_id: string;
  type: 'mention' | 'assignment' | 'comment';
  content: string;
  link?: string;
  read: boolean;
  created_at: string;
  created_by: string;
  metadata: Record<string, any>;
}

export interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  fetchNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
}