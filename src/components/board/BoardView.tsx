import React, { useEffect } from 'react';
import { ScrollableColumns } from './ScrollableColumns'; // Assuming this component renders the Columns
import { useTaskStore } from '../../lib/store/task';
import { useBoardStore } from '../../lib/store/board';
import { TaskFilter } from './BoardFilters'; // Assuming this type exists
import { filterTasks } from '../../lib/utils/task-filters'; // Assuming this util exists
import { useAuthStore } from '../../lib/store/auth';

interface BoardViewProps {
  projectId: string;
  filters: TaskFilter; // Use your defined filter type
}

export const BoardView: React.FC<BoardViewProps> = ({ projectId, filters }) => {
  const { user } = useAuthStore(); // Get current user for filtering
  const { tasks, fetchTasks } = useTaskStore(); // Removed selectedTaskId handling as it seems related to TaskDetails opening
  const { columns, fetchColumns } = useBoardStore(); // Fetching columns here

  // Fetch initial data when projectId changes
  useEffect(() => {
    console.log(`BoardView useEffect: Fetching data for project ${projectId}`);
    const loadData = async () => {
      try {
        // Fetch columns and tasks for the current project
        // ProjectBoard might also fetch, consider coordinating fetching logic
        await Promise.all([
            fetchColumns(projectId),
            fetchTasks(projectId)
        ]);
        console.log(`BoardView useEffect: Data fetched for project ${projectId}`);
      } catch (error) {
        console.error('Failed to load board data in BoardView:', error);
        // Handle error state appropriately in UI
      }
    };
    if (projectId) { // Only fetch if projectId is valid
        loadData();
    }
  }, [projectId, fetchTasks, fetchColumns]); // Dependencies for fetching

  // Memoize or calculate filtered tasks based on props and state
  // Ensure filterTasks handles potentially null user.id
  const filteredTasks = React.useMemo(() => {
      console.log("Filtering tasks with filters:", filters, "User ID:", user?.id);
      return filterTasks(tasks, filters, user?.id ?? undefined);
  }, [tasks, filters, user?.id]);


  // Ensure columns are sorted by position before passing down
  const sortedColumns = React.useMemo(() => {
      return [...columns].sort((a, b) => a.position - b.position);
  }, [columns]);

  return (
    <div className="h-full w-full relative">
      {/* Pass the sorted columns (including is_ruler_column flag) and filtered tasks */}
      {/* ScrollableColumns is now responsible for mapping columns and passing isRuler to Column */}
      <ScrollableColumns
        columns={sortedColumns}
        tasks={filteredTasks}
        projectId={projectId}
        // selectedTaskId={selectedTaskId} // Pass if ScrollableColumns needs it
      />
      {/* Add loading/error states here if needed */}
      {/* e.g., if (columnsLoading || tasksLoading) return <LoadingSpinner />; */}
      {/* e.g., if (columnsError || tasksError) return <ErrorMessage />; */}
    </div>
  );
};