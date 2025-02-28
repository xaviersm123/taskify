import React, { useEffect, useState } from 'react';
import { useNotificationStore } from '../lib/store/notification';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { supabase } from '../lib/supabase/client';
import { useTaskStore } from '../lib/store/task'; // Import task store

export const InboxPage = () => {
  const { 
    notifications, 
    loading, 
    fetchNotifications, 
    markAsRead,
    markAllAsRead 
  } = useNotificationStore();
  const { setSelectedTaskId } = useTaskStore(); // Method to set the task to open
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const pageSize = 8;

  useEffect(() => {
    const fetchData = async () => {
      const newNotifications = await fetchNotifications(page, pageSize);
      if (newNotifications.length < pageSize) {
        setHasMore(false);
      }
    };
    fetchData();
  }, [page, fetchNotifications]);

  useEffect(() => {
    let unsubscribe;
    const setupSubscription = async () => {
      const { data: authData, error } = await supabase.auth.getUser();
      if (error || !authData.user?.id) {
        console.error('Error getting user:', error);
        return;
      }
      const userId = authData.user.id;
      unsubscribe = useNotificationStore.getState().subscribeToNotifications(userId);
    };

    setupSubscription();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  const handleNotificationClick = async (notification: any) => {
    if (!notification.read) {
      await markAsRead(notification.id);
      // No need to call fetchNotifications here; real-time updates will handle it
    }
    if (notification.link) {
      // Parse the link to extract the task ID
      const url = new URL(notification.link, window.location.origin);
      const taskId = url.searchParams.get('task')
      navigate(notification.link);
      // If a task ID exists, set it to open the task details
      if (taskId) {
        setSelectedTaskId(taskId);
      }
    }
  };

  if (loading && page === 1) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 h-screen overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
        {notifications.some(n => !n.read) && (
          <button
            onClick={markAllAsRead}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Check className="h-4 w-4 mr-2" />
            Mark all as read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No notifications</h3>
          <p className="mt-1 text-sm text-gray-500">
            You're all caught up! New notifications will appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {notifications.map(notification => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                notification.read
                  ? 'bg-white border-gray-200'
                  : 'bg-indigo-50 border-indigo-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className={`text-sm ${notification.read ? 'text-gray-900' : 'text-indigo-900 font-medium'}`}>
                    <span className="font-semibold capitalize">{notification.type}: </span>
                    {notification.content}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                  </p>
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 bg-indigo-400 rounded-full"></div>
                )}
              </div>
            </div>
          ))}
          {hasMore && (
            <div className="text-center py-4">
              <button
                onClick={() => setPage(page + 1)}
                className="px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700"
              >
                Load More
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};