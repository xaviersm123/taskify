import React from 'react';
import { useWorkspaceStore } from '../../lib/store/workspace';
import { Plus } from 'lucide-react';

interface WorkspaceSelectorProps {
  onCreateNew: () => void;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ onCreateNew }) => {
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();

  return (
    <div className="flex items-center space-x-2">
      <select
        value={currentWorkspace?.id || ''}
        onChange={(e) => {
          const workspace = workspaces.find(w => w.id === e.target.value);
          if (workspace) setCurrentWorkspace(workspace);
        }}
        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
      >
        {workspaces.map(workspace => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name}
          </option>
        ))}
      </select>
      <button
        onClick={onCreateNew}
        className="p-2 text-gray-400 hover:text-gray-500"
        title="Create new workspace"
      >
        <Plus className="h-5 w-5" />
      </button>
    </div>
  );
};