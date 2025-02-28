import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { X, Loader2 } from 'lucide-react';
import { useWorkspaceStore } from '../../lib/store/workspace';
import type { CreateWorkspaceData } from '../../lib/store/workspace';

interface CreateWorkspaceFormData {
  name: string;
}

interface CreateWorkspaceDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateWorkspaceDialog: React.FC<CreateWorkspaceDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<CreateWorkspaceFormData>();
  const workspaceStore = useWorkspaceStore();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const onSubmit = async (data: CreateWorkspaceFormData) => {
    try {
      setError(null);
      setIsLoading(true);

      const workspaceData: CreateWorkspaceData = {
        name: data.name.trim()
      };

      await workspaceStore.createWorkspace(workspaceData);
      reset();
      onClose();
    } catch (err: any) {
      console.error('Workspace creation error:', err);
      setError(err.message || 'Failed to create workspace');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium">Create New Workspace</h3>
            <button 
              onClick={onClose}
              disabled={isLoading}
              className="text-gray-400 hover:text-gray-500 disabled:opacity-50"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border-b border-red-100">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Workspace Name
              </label>
              <input
                {...register('name', { 
                  required: 'Workspace name is required',
                  minLength: {
                    value: 3,
                    message: 'Workspace name must be at least 3 characters'
                  }
                })}
                type="text"
                disabled={isLoading}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm disabled:opacity-50 disabled:bg-gray-100"
                placeholder="My Workspace"
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50 flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Workspace'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};