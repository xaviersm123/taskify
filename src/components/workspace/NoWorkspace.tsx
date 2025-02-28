import React, { useState } from 'react';
import { CreateWorkspaceDialog } from './CreateWorkspaceDialog';

export const NoWorkspace = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome to Taskify</h2>
        <p className="text-gray-600 mb-8">
          Create a workspace to get started with your projects and tasks.
        </p>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          Create Workspace
        </button>
      </div>

      <CreateWorkspaceDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
};