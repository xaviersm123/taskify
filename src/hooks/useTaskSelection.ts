import { useEffect } from 'react';
import { useTaskStore } from '../lib/store/task';
import { useNavigate } from 'react-router-dom';

export function useTaskSelection() {
  const { selectedTaskId, setSelectedTaskId } = useTaskStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedTaskId) {
      // Open task details dialog
      const taskDialog = document.querySelector(`[data-task-id="${selectedTaskId}"]`) as HTMLElement;
      if (taskDialog) {
        taskDialog.click();
      }
      // Clear selection after handling
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, setSelectedTaskId]);

  const selectTask = (taskId: string, projectId: string) => {
    // First navigate to the project if needed
    navigate(`/projects/${projectId}`);
    // Then set the selected task
    setSelectedTaskId(taskId);
  };

  return { selectTask };
}