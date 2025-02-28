import React from 'react';
import { useUserStore } from '../../lib/store/user';
import { formatUserDisplay } from '../../lib/utils/user-display';

interface UserAvatarProps {
  userId: string;
  size?: 'sm' | 'md' | 'lg';
}

export const UserAvatar: React.FC<UserAvatarProps> = ({ userId, size = 'md' }) => {
  const { users } = useUserStore();
  const user = users.find(u => u.id === userId);

  if (!user) return null;

  const getInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  return (
    <div 
      className={`${sizeClasses[size]} rounded-full bg-indigo-100 flex items-center justify-center font-medium text-indigo-700`}
      title={formatUserDisplay(user)}
    >
      {getInitials()}
    </div>
  );
};