import React from 'react';
import { Loader2 } from 'lucide-react';

interface WorkspaceLoaderProps {
  message?: string;
}

export const WorkspaceLoader: React.FC<WorkspaceLoaderProps> = ({ 
  message = 'Loading workspace...' 
}) => {
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-4" />
      <p className="text-gray-600">{message}</p>
    </div>
  );
};