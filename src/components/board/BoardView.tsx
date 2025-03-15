import React, { useEffect } from 'react';
import { ScrollableColumns } from './ScrollableColumns';
import { useTaskStore } from '../../lib/store/task';
import { useBoardStore } from '../../lib/store/board';
import { TaskFilter } from './BoardFilters';
import { filterTasks } from '../../lib/utils/task-filters';
import { useAuthStore } from '../../lib/store/auth';

interface BoardViewProps {
  projectId: string;
  filters: TaskFilter;
}

export const BoardView: React.FC<BoardViewProps> = ({ projectId, filters }) => {
  const { user } = useAuthStore();
  const { tasks, fetchTasks, selectedTaskId, setSelectedTaskId } = useTaskStore();
  const { columns, fetchColumns } = useBoardStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([fetchTasks(projectId), fetchColumns(projectId)]);
      } catch (error) {
        console.error('Failed to load board data:', error);
      }
    };
    loadData();
  }, [projectId, fetchTasks, fetchColumns]);

  // Filter tasks based on current filters
  const filteredTasks = filterTasks(tasks, filters, user?.id);

  // Open task details when selectedTaskId changes
  useEffect(() => {
    if (selectedTaskId) {
      setSelectedTaskId(null); // Reset after opening details (if needed)
    }
  }, [selectedTaskId, setSelectedTaskId]);

  return (
    <div className="h-full w-full relative">
      <ScrollableColumns
        columns={columns}
        tasks={filteredTasks}
        projectId={projectId}
        selectedTaskId={selectedTaskId}
      />
    </div>
  );
};