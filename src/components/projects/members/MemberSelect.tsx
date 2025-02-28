import React from 'react';
import { Plus } from 'lucide-react';
import { formatUserDisplay } from '../../../lib/utils/user-display';

interface MemberSelectProps {
  users: Array<{
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  }>;
  selectedUserId: string;
  onUserSelect: (userId: string) => void;
  onAddMember: () => void;
  disabled?: boolean;
}

export const MemberSelect: React.FC<MemberSelectProps> = ({
  users,
  selectedUserId,
  onUserSelect,
  onAddMember,
  disabled
}) => {
  return (
    <div className="flex items-center space-x-2">
      <select
        value={selectedUserId}
        onChange={(e) => onUserSelect(e.target.value)}
        className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        disabled={disabled}
      >
        <option value="">Add new member...</option>
        {users.map(user => (
          <option key={user.id} value={user.id}>
            {formatUserDisplay(user)}
          </option>
        ))}
      </select>
      <button
        onClick={onAddMember}
        disabled={!selectedUserId || disabled}
        className="inline-flex items-center p-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};