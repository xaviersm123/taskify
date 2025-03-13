import React, { useEffect } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { TaskCard } from './TaskCard';
import { ScrollableColumns } from './ScrollableColumns';
import { useTaskStore } from '../../lib/store/task';
import { useBoardStore } from '../../lib/store/board';
import { useBoardDragAndDrop } from '../../hooks/useBoardDragAndDrop';
import { TaskFilter } from './BoardFilters';
import { filterTasks } from '../../lib/utils/task-filters';
import { useAuthStore } from '../../lib/store/auth';

interface BoardViewProps {
  projectId: string;
  filters: TaskFilter;
}

export const BoardView: React.FC<BoardViewProps> = ({ projectId, filters }) => {
  const { user } = useAuthStore();
  const { tasks, fetchTasks, updateTask, selectedTaskId, setSelectedTaskId } = useTaskStore();
  const { columns, fetchColumns } = useBoardStore();

  const { activeTask, handleDragStart, handleDragEnd } = useBoardDragAndDrop({
    tasks,
    columns,
    updateTask,
  });

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

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
      setSelectedTaskId(null);
    }
  }, [selectedTaskId, setSelectedTaskId]);

  return (
    <div className="h-full w-full relative">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <ScrollableColumns
          columns={columns}
          tasks={filteredTasks}
          projectId={projectId}
          selectedTaskId={selectedTaskId}
        />

        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} columnId="" /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
};