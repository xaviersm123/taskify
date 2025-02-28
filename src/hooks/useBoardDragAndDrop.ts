import { useState, useCallback } from 'react';
import { DragStartEvent, DragEndEvent } from '@dnd-kit/core';
import { Task } from '../lib/store/task';
import { BoardColumn } from '../lib/store/board';
import { withRetry } from '../lib/utils/retry';

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
    console.log('Drag start:', {
      taskId: event.active.id,
      task: task,
      data: event.active.data.current
    });
    setActiveTask(task || null);
  }, [tasks]);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    console.log('Drag end:', {
      active: {
        id: active?.id,
        data: active?.data.current
      },
      over: {
        id: over?.id,
        data: over?.data.current
      }
    });

    if (!over || !active || isUpdating) return;

    const draggedTask = tasks.find(task => task.id === active.id);
    if (!draggedTask) {
      console.log('No dragged task found');
      return;
    }

    // Get the target column ID - either from the column itself or from the task's parent column
    const targetColumnId = over.data.current?.type === 'column' 
      ? over.id as string 
      : over.data.current?.columnId as string;

    console.log('Target column ID:', targetColumnId);
    
    if (!targetColumnId) {
      console.log('No target column ID found');
      return;
    }

    const targetColumn = columns.find(col => col.id === targetColumnId);
    if (!targetColumn) {
      console.log('Target column not found');
      return;
    }

    // Only update if column changed
    if (draggedTask.column_id !== targetColumn.id) {
      console.log('Updating task column:', {
        taskId: draggedTask.id,
        fromColumn: draggedTask.column_id,
        toColumn: targetColumn.id
      });

      setIsUpdating(true);
      try {
        await withRetry(() => 
          updateTask(draggedTask.id, {
            column_id: targetColumn.id,
            status: getStatusFromColumnName(targetColumn.name)
          })
        );
      } catch (error) {
        console.error('Failed to update task:', error);
      } finally {
        setIsUpdating(false);
      }
    } else {
      console.log('Task already in target column');
    }

    setActiveTask(null);
  }, [tasks, columns, updateTask, isUpdating]);

  return {
    activeTask,
    isUpdating,
    handleDragStart,
    handleDragEnd
  };
}

function getStatusFromColumnName(name: string): 'todo' | 'in_progress' | 'complete' {
  const normalized = name.toLowerCase();
  if (normalized.includes('progress')) return 'in_progress';
  if (normalized.includes('complete') || normalized.includes('done')) return 'complete';
  return 'todo';
}