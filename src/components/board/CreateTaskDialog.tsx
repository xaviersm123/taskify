import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTaskStore } from '../../lib/store/task';
import { TaskForm, TaskFormData } from './TaskForm';
import { formatDateForStorage } from '../../lib/utils/date-format';

interface CreateTaskDialogProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  status: 'todo' | 'in_progress' | 'complete';
  columnId: string;
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
  isOpen,
  onClose,
  projectId,
  status,
  columnId,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { createTask } = useTaskStore();

  if (!isOpen) return null;

  const handleSubmit = async (data: TaskFormData) => {
    if (!data.title?.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setError(null);
      setIsSubmitting(true);

      await createTask({
        title: data.title.trim(),
        description: data.description?.trim(),
        project_id: projectId,
        status,
        column_id: columnId,
        priority: data.priority,
        assignee_id: data.assignee_id || null,
        due_date: data.due_date ? formatDateForStorage(data.due_date) : null,
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to create task:', err);
      setError(err.message || 'Failed to create task');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-medium">Create New Task</h3>
            <button 
              onClick={onClose}
              disabled={isSubmitting}
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

          <div className="p-4">
            <TaskForm
              onSubmit={handleSubmit}
              onCancel={onClose}
              isSubmitting={isSubmitting}
            />
          </div>
        </div>
      </div>
    </div>
  );
};