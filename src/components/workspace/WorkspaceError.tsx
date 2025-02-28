import React from 'react';
import { AlertTriangle } from 'lucide-react';

interface WorkspaceErrorProps {
  message: string;
  onRetry?: () => void;
}

export const WorkspaceError: React.FC<WorkspaceErrorProps> = ({ 
  message,
  onRetry 
}) => {
  return (
    <div className="h-screen flex flex-col items-center justify-center p-4">
      <div className="bg-red-50 p-4 rounded-lg max-w-md w-full">
        <div className="flex items-center">
          <AlertTriangle className="h-6 w-6 text-red-500 mr-3" />
          <h3 className="text-red-800 font-medium">Workspace Error</h3>
        </div>
        <p className="mt-2 text-sm text-red-700">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-4 w-full bg-red-100 text-red-700 py-2 px-4 rounded hover:bg-red-200"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};