import { create } from 'zustand';
import { supabase } from '../../supabase/client';
import { NotificationState, Notification } from './types';

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  loading: false,
  error: null,

  fetchNotifications: async (page = 1, pageSize = 8) => {
    set({ loading: true });
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.id) {
        throw authError || new Error('User not authenticated');
      }
      const userId = authData.user.id;
  
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range((page - 1) * pageSize, page * pageSize - 1);
  
      if (error) throw error;
  
      const newNotifications = data || [];
  
      set(state => {
        // Reset notifications on page 1, append on subsequent pages
        const allNotifications = page === 1 ? newNotifications : [...state.notifications, ...newNotifications];
        // Recalculate unreadCount from all notifications
        const unreadCount = allNotifications.filter(n => !n.read).length;
        return {
          notifications: allNotifications,
          unreadCount, // Replace, don’t add
          loading: false
        };
      });
  
      return newNotifications;
    } catch (error: any) {
      set({ 
        error: error.message, 
        loading: false 
      });
      return [];
    }
  },

  markAsRead: async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        notifications: state.notifications.map(n =>
          n.id === id ? { ...n, read: true } : n
        ),
        unreadCount: state.unreadCount - 1
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  markAllAsRead: async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.id) {
        throw authError || new Error('User not authenticated');
      }
      const userId = authData.user.id;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('read', false)
        .eq('user_id', userId); // Ensure we only mark the current user's notifications

      if (error) throw error;

      set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true })),
        unreadCount: 0
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  subscribeToNotifications: (userId: string) => {
    const subscription = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          const { eventType, new: newNotification, old: oldNotification } = payload;
          set(state => {
            let updatedNotifications = [...state.notifications];
            let updatedUnreadCount = state.unreadCount;
  
            if (eventType === 'INSERT') {
              updatedNotifications = [newNotification, ...updatedNotifications];
              if (!newNotification.read) {
                updatedUnreadCount += 1;
              }
            } else if (eventType === 'UPDATE') {
              updatedNotifications = updatedNotifications.map(n =>
                n.id === newNotification.id ? newNotification : n
              );
              if (oldNotification.read && !newNotification.read) {
                updatedUnreadCount += 1;
              } else if (!oldNotification.read && newNotification.read) {
                updatedUnreadCount -= 1;
              }
            } else if (eventType === 'DELETE') {
              updatedNotifications = updatedNotifications.filter(n => n.id !== oldNotification.id);
              if (!oldNotification.read) {
                updatedUnreadCount -= 1;
              }
            }
  
            return {
              notifications: updatedNotifications,
              unreadCount: updatedUnreadCount
            };
          });
        }
      )
      .subscribe();
  
    return () => {
      supabase.removeChannel(subscription);
    };
  },
}));

// Remove the automatic subscription here; we'll handle it in the component
// useNotificationStore.getState().subscribeToNotifications();