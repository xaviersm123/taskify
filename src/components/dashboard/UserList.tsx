import React from 'react';
import { UserAvatar } from '../common/UserAvatar';
import { User } from '../../lib/store/user';

interface UserListProps {
  /**
   * Array of user objects to display
   */
  users: User[];
  
  /**
   * ID of the current user (optional)
   * Used to filter out the current user from the list
   */
  currentUserId?: string;
}

/**
 * UserList Component
 * Displays a list of users, excluding the current user if provided
 */
export const UserList: React.FC<UserListProps> = ({ users, currentUserId }) => {
  // Filter out the current user and sort the remaining users by name
  const sortedUsers = users
    .filter(user => user.id !== currentUserId) // Exclude the current user
    .sort((a, b) => {
      // Sort users by their full name or email if the name is not available
      const aName = `${a.first_name || ''} ${a.last_name || ''}`.trim() || a.email;
      const bName = `${b.first_name || ''} ${b.last_name || ''}`.trim() || b.email;
      return aName.localeCompare(bName);
    });

  // If no other users are found, display a message
  if (sortedUsers.length === 0) {
    return (
      <div className="px-6 py-8 text-center">
        <p className="text-sm text-gray-500">No other users found</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {/* Render each user in the sorted list */}
      {sortedUsers.map(user => (
        <div key={user.id} className="flex items-center px-6 py-4">
          {/* Display the user's avatar */}
          <UserAvatar userId={user.id} size="md" />
          
          {/* Display the user's name and email */}
          <div className="ml-4 flex-1 min-w-0">
            <h4 className="text-sm font-medium text-gray-900">
              {user.first_name && user.last_name 
                ? `${user.first_name} ${user.last_name}` // Display full name if available
                : user.email.split('@')[0] // Otherwise, display the part of the email before the '@'
              }
            </h4>
            <p className="text-sm text-gray-500 truncate">{user.email}</p>
          </div>
        </div>
      ))}
    </div>
  );
};