import React from 'react';
import { X } from 'lucide-react';
import { ProjectMember } from '../../../lib/store/project-member';
import { User } from '../../../lib/store/user';
import { UserAvatar } from '../../common/UserAvatar';
import { formatUserDisplay } from '../../../lib/utils/user-display';

interface MemberListProps {
  members: ProjectMember[];
  users: User[];
  onRemoveMember: (userId: string) => void;
}

export const MemberList: React.FC<MemberListProps> = ({
  members,
  users,
  onRemoveMember,
}) => {
  return (
    <div className="space-y-2 max-h-64 overflow-y-auto">
      {members.map(member => {
        const user = users.find(u => u.id === member.user_id);
        if (!user) return null;

        return (
          <div 
            key={member.user_id} 
            className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-md group"
          >
            <div className="flex items-center space-x-3">
              <UserAvatar userId={user.id} size="sm" />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {formatUserDisplay(user)}
                </div>
                <div className="text-xs text-gray-500">{user.email}</div>
              </div>
            </div>

            {member.role !== 'owner' && (
              <button
                onClick={() => onRemoveMember(member.user_id)}
                className="p-1 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                title="Remove member"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}

      {members.length === 0 && (
        <div className="text-center py-4 text-gray-500 text-sm">
          No members yet
        </div>
      )}
    </div>
  );
};