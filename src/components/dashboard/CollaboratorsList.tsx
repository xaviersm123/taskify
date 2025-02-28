import React, { useEffect } from 'react';
import { useUserStore } from '../../lib/store/user';
import { useAuthStore } from '../../lib/store/auth';
import { UserList } from './UserList';

export const CollaboratorsList = () => {
  const { user } = useAuthStore();
  const { users, loading, fetchUsers } = useUserStore();

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow mt-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="h-4 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="mt-1 h-3 w-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
        <div className="p-6 space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center space-x-4">
              <div className="h-10 w-10 rounded-full bg-gray-200 animate-pulse"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-3 w-48 bg-gray-100 rounded animate-pulse"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow mt-6">
      <div className="px-6 py-4 border-b border-gray-200">
        <h3 className="text-base font-semibold text-gray-900">Users</h3>
        <p className="mt-1 text-sm text-gray-500">All users in the system</p>
      </div>
      <UserList users={users} currentUserId={user?.id} />
    </div>
  );
};