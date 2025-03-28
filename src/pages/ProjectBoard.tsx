import React, { useState, useEffect } from 'react';
import { ProjectHeader } from '../components/projects/ProjectHeader';
import { BoardHeader } from '../components/board/BoardHeader';
import { BoardView } from '../components/board/BoardView';
import { BoardContainer } from '../components/board/BoardContainer';
import { useParams, useNavigate } from 'react-router-dom';
import { TaskFilter } from '../components/board/BoardFilters';
import { ensureCompleteUUID } from '../lib/utils/uuid';
import { useProjectStore } from '../lib/store/project';
import { useTaskStore } from '../lib/store/task';
import { useProjectMemberStore } from '../lib/store/project-member';
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { SortableContext, arrayMove } from '@dnd-kit/sortable';
import { TaskCard } from '../components/board/TaskCard';

export const ProjectBoard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { fetchProjectById } = useProjectStore();
  const { fetchTasks, updateTask, tasks, setSelectedTaskId } = useTaskStore();
  const { fetchMembers } = useProjectMemberStore();
  const [filters, setFilters] = useState<TaskFilter>({
    incomplete: false,
    completed: false,
    assignedToMe: false,
    dueThisWeek: false,
    dueNextWeek: false,
  });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor), useSensor(KeyboardSensor));

  let validProjectId: string;
  try {
    validProjectId = projectId ? ensureCompleteUUID(projectId) : '';
  } catch (error) {
    navigate('/dashboard');
    return null;
  }

  if (!validProjectId) {
    navigate('/dashboard');
    return null;
  }

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          fetchProjectById(validProjectId),
          fetchTasks(validProjectId),
          fetchMembers(validProjectId),
        ]);
      } catch (error) {
        console.error('Error fetching project data:', error);
      }
    };
    fetchData();
  }, [validProjectId, fetchProjectById, fetchTasks, fetchMembers]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveTaskId(event.active.id as string);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTaskId(null);
    if (!over || active.id === over.id) return;
  
    const activeTaskId = active.id as string;
    const activeTask = tasks.find((task) => task.id === activeTaskId);
    if (!activeTask) return;
  
    let updatedTasks = [...tasks];
    const oldIndex = tasks.findIndex((task) => task.id === activeTaskId);
  
    // Check if dropping over a task
    const overTask = tasks.find((task) => task.id === over.id);
    if (overTask) {
      // Existing logic for dropping over a task
      const newIndex = tasks.findIndex((task) => task.id === over.id);
      updatedTasks = arrayMove(tasks, oldIndex, newIndex);
  
      if (activeTask.column_id === overTask.column_id) {
        // Reorder within the same column
        updatedTasks = updatedTasks.map((task) =>
          task.column_id === activeTask.column_id
            ? {
                ...task,
                position: updatedTasks
                  .filter((t) => t.column_id === activeTask.column_id)
                  .indexOf(task),
              }
            : task
        );
      } else {
        // Move to a different column with existing tasks
        updatedTasks = updatedTasks.map((task) => {
          if (task.id === activeTaskId) {
            return { ...task, column_id: overTask.column_id, position: newIndex };
          }
          if (task.column_id === activeTask.column_id) {
            return {
              ...task,
              position: updatedTasks
                .filter((t) => t.column_id === activeTask.column_id && t.id !== activeTaskId)
                .indexOf(task),
            };
          }
          if (task.column_id === overTask.column_id) {
            const targetTasks = updatedTasks.filter((t) => t.column_id === overTask.column_id);
            return { ...task, position: targetTasks.indexOf(task) };
          }
          return task;
        });
      }
    } else {
      // Dropping over an empty column (over.id is a column ID)
      const targetColumnId = over.id as string;
      // Verify it's a valid column ID (you might need to maintain a list of column IDs)
      const columnExists = true; // Replace with actual check if you have column data available
      if (columnExists) {
        updatedTasks = updatedTasks.map((task) => {
          if (task.id === activeTaskId) {
            return { ...task, column_id: targetColumnId, position: 0 }; // New position is 0 in empty column
          }
          if (task.column_id === activeTask.column_id) {
            return {
              ...task,
              position: updatedTasks
                .filter((t) => t.column_id === activeTask.column_id && t.id !== activeTaskId)
                .indexOf(task),
            };
          }
          return task;
        });
      } else {
        return; // Invalid drop target
      }
    }
  
    // Batch update all affected tasks
    const updates = updatedTasks
      .filter((task) => {
        const original = tasks.find((t) => t.id === task.id);
        return (
          original &&
          (original.position !== task.position || original.column_id !== task.column_id)
        );
      })
      .map((task) => updateTask(task.id, { column_id: task.column_id, position: task.position }));
  
    try {
      await Promise.all(updates);
      const sortedTasks = [...updatedTasks].sort((a, b) => {
        if (a.column_id === b.column_id) return a.position - b.position;
        return a.column_id.localeCompare(b.column_id);
      });
      setSelectedTaskId(null);
      useTaskStore.setState({ tasks: sortedTasks });
    } catch (error) {
      console.error('Failed to update tasks:', error);
      await fetchTasks(validProjectId);
    }
  };

  const activeTask = tasks.find((task) => task.id === activeTaskId);

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex-shrink-0 w-full sticky top-0 z-30 bg-white">
        <ProjectHeader />
      </div>
      <div className="flex-shrink-0 w-full sticky top-16 z-20 bg-white border-b">
        <BoardHeader projectId={validProjectId} filters={filters} onFilterChange={setFilters} />
      </div>
      <div className="flex-1 min-h-0 w-full">
        <BoardContainer>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={tasks.map((task) => task.id)}>
              <BoardView projectId={validProjectId} filters={filters} />
            </SortableContext>
            <DragOverlay>
              {activeTask ? <TaskCard task={activeTask} columnId={activeTask.column_id || ''} /> : null}
            </DragOverlay>
          </DndContext>
          <div className="p-4 shrink-0">
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              onClick={() => console.log('Add task clicked')}
            >
              + Add task
            </button>
          </div>
        </BoardContainer>
      </div>
    </div>
  );
};