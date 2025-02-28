import React from 'react';

interface AuthErrorProps {
  message: string | null;
}

export const AuthError: React.FC<AuthErrorProps> = ({ message }) => {
  if (!message) return null;

  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative" role="alert">
      <span className="block sm:inline">{message}</span>
    </div>
  );
};