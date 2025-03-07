import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Task } from '../lib/store/task';
import { BoardColumn } from '../lib/store/board';
import { withRetry } from '../lib/utils/retry';
import { useBoardStore } from '../lib/store/board';

interface UseBoardDragAndDropProps {
  tasks: Task[];
  columns: BoardColumn[];
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
}

export function useBoardDragAndDrop({ tasks, columns, updateTask }: UseBoardDragAndDropProps) {
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  }, [tasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over || !active || isUpdating) return;

    // Handle column drag
    if (active.data.current?.type === 'column') {
      const oldIndex = columns.findIndex(col => col.id === active.id);
      const newIndex = columns.findIndex(col => col.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        const newColumns = arrayMove(columns, oldIndex, newIndex);
        const updatedColumns = newColumns.map((col, index) => ({ ...col, position: index }));
        await useBoardStore.getState().reorderColumns(updatedColumns);
      }
    }
    // Handle task drag
    else if (active.data.current?.type === 'task') {
      const draggedTask = tasks.find(task => task.id === active.id);
      if (!draggedTask) return;

      const targetColumnId =
        over.data.current?.type === 'column'
          ? (over.id as string)
          : (over.data.current?.columnId as string);

      if (!targetColumnId) return;

      const targetColumn = columns.find(col => col.id === targetColumnId);
      if (!targetColumn) return;

      if (draggedTask.column_id !== targetColumn.id) {
        setIsUpdating(true);
        try {
          await withRetry(() =>
            updateTask(draggedTask.id, {
              column_id: targetColumn.id,
              status: getStatusFromColumnName(targetColumn.name),
            })
          );
        } catch (error) {
          console.error('Failed to update task:', error);
        } finally {
          setIsUpdating(false);
        }
      }
    }

    setActiveTask(null);
  }, [tasks, columns, updateTask, isUpdating]);

  return {
    activeTask,
    isUpdating,
    handleDragStart,
    handleDragEnd,
  };
}

function getStatusFromColumnName(name: string): 'todo' | 'in_progress' | 'complete' {
  const normalized = name.toLowerCase();
  if (normalized.includes('progress')) return 'in_progress';
  if (normalized.includes('complete') || normalized.includes('done')) return 'complete';
  return 'todo';
}