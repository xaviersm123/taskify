import { useCallback } from 'react';
import { Task } from '../lib/store/task';
import { debounce } from '../lib/utils/debounce';

interface UseTaskUpdatesProps {
  task: Task | null;
  setTask: (task: Task | null | ((prev: Task | null) => Task | null)) => void;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  onError?: () => void;
}

export function useTaskUpdates({ task, setTask, updateTask, onError }: UseTaskUpdatesProps) {
  const debouncedUpdateTask = useCallback(
    debounce((updates: Partial<Task>) => {
      if (!task) return;
      updateTask(task.id, updates).catch(error => {
        console.error('Failed to update task:', error);
        onError?.();
      });
    }, 500),
    [task, updateTask, onError]
  );

  const handleFieldUpdate = useCallback((updates: Partial<Task>) => {
    setTask(prev => prev ? { ...prev, ...updates } : prev);
    debouncedUpdateTask(updates);
  }, [setTask, debouncedUpdateTask]);

  return { handleFieldUpdate };
}