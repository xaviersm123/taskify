import React, { useState, useEffect } from 'react';
import { ProjectHeader } from '../components/projects/ProjectHeader';
import { BoardHeader } from '../components/board/BoardHeader';
import { BoardView } from '../components/board/BoardView';
import { BoardContainer } from '../components/board/BoardContainer';
import { useParams, useNavigate } from 'react-router-dom';
import { TaskFilter } from '../components/board/BoardFilters';
import { ensureCompleteUUID } from '../lib/utils/uuid';
import { useProjectStore } from '../lib/store/project';
import { useTaskStore, Task } from '../lib/store/task';
import { useProjectMemberStore } from '../lib/store/project-member';
import { useBoardStore, BoardColumn } from '../lib/store/board';
import {
  DndContext,
  closestCorners, // Keep using closestCorners
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  Active,
  defaultDropAnimationSideEffects,
  DropAnimation,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { TaskCard } from '../components/board/TaskCard'; // Ensure TaskCard passes taskId in its useSortable data

// Configuration for the drop animation
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.5',
      },
    },
  }),
};


export const ProjectBoard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { fetchProjectById } = useProjectStore();
  const { fetchTasks, updateTask, tasks, setSelectedTaskId } = useTaskStore();
  const { fetchMembers } = useProjectMemberStore();
  const { columns, fetchColumns: fetchBoardColumns, updateColumn: updateBoardColumn } = useBoardStore();

  const [filters, setFilters] = useState<TaskFilter>({ /* ... */ });
  const [activeItem, setActiveItem] = useState<Active | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  // Sensors configuration
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  // --- UUID Validation --- (Assuming OK)
  let validProjectId: string;
  try { validProjectId = projectId ? ensureCompleteUUID(projectId) : ''; }
  catch (error) { console.error("Invalid Project ID:", projectId, error); navigate('/dashboard'); return null; }
  if (!validProjectId) { navigate('/dashboard'); return null; }

  // --- Data Fetching Effect --- (Assuming OK)
  useEffect(() => {
      if (!validProjectId) return;
      const fetchData = async () => {
          try {
              console.log(`Fetching data for project ID: ${validProjectId}`);
              await Promise.all([
                  fetchProjectById(validProjectId), fetchTasks(validProjectId),
                  fetchMembers(validProjectId), fetchBoardColumns(validProjectId),
              ]);
              console.log(`Data fetch complete for project ID: ${validProjectId}`);
          } catch (error) { console.error('Error fetching initial project data:', error); }
      };
      fetchData();
  }, [validProjectId, fetchProjectById, fetchTasks, fetchMembers, fetchBoardColumns]);

  // --- Drag Handlers ---
  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag Start:', { id: event.active.id, type: event.active.data.current?.type, data: event.active.data.current });
    setActiveItem(event.active);
    // Check specifically for 'task' type now
    if (event.active.data.current?.type === 'task') {
      setActiveTaskId(event.active.id as string);
    } else {
      setActiveTaskId(null);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null); setActiveTaskId(null);

    if (!over || active.id === over.id) { console.log('Drag End: No change.'); return; }

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;
    console.log('--- Drag End Event ---');
    console.log('Active:', { id: active.id, type: activeType, data: active.data.current });
    console.log('Over:', { id: over.id, type: overType, data: over.data.current });
    console.log('----------------------');

    // === COLUMN DRAG LOGIC === (Keep the working version)
    if (activeType === 'column' && overType === 'column' && active.id !== over.id) {
        console.log('Handling Column Drag...');
        const activeColumnId = active.id as string;
        const overColumnId = over.id as string;
        const currentColumns = useBoardStore.getState().columns;
        const oldIndex = currentColumns.findIndex(col => col.id === activeColumnId);
        const newIndex = currentColumns.findIndex(col => col.id === overColumnId);
        if (oldIndex === -1 || newIndex === -1) { console.warn('Column drag end: Column ID not found.'); return; }
        const reorderedColumns = arrayMove(currentColumns, oldIndex, newIndex);
        const updatedColumnsWithPosition = reorderedColumns.map((col, index) => ({ ...col, position: index }));
        useBoardStore.setState({ columns: updatedColumnsWithPosition });
        const updates = updatedColumnsWithPosition
            .filter((col, index) => {
                const originalColumn = currentColumns.find(c => c.id === col.id);
                return originalColumn && originalColumn.position !== index;
            }).map(col => updateBoardColumn(col.id, { position: col.position }));
        try { await Promise.all(updates); console.log('Column positions updated.'); }
        catch (error) { console.error('Failed to update column positions:', error); alert("Failed to save column order."); fetchBoardColumns(validProjectId); }
    }

    // === TASK DRAG LOGIC === (Reverted to the previous working logic structure)
    else if (activeType === 'task') { // Check if the active item is a task
        console.log('Handling Task Drag...');
        const activeTaskId = active.id as string;
        const overId = over.id as string;

        let targetColumnId: string | null = null;
        let targetPosition: number = 0;

        const currentTasks = useTaskStore.getState().tasks;
        const activeTask = currentTasks.find((task) => task.id === activeTaskId);

        if (!activeTask) {
            console.warn('Task drag end: Active task not found.');
            return;
        }

        // --- Determine Drop Target ---
        // Case 1: Dropping onto another TASK CARD
        // Use optional chaining and check for taskId from TaskCard's data
        if (over.data.current?.type === 'task' && over.data.current?.taskId === overId) {
             console.log(`Drop Target: TASK (${overId})`);
             // Use the columnId from the task being dropped onto
             targetColumnId = over.data.current?.columnId;
             // Calculate position relative to the task being dropped onto
             const tasksInTargetColumn = currentTasks
                .filter(t => t.column_id === targetColumnId && t.id !== activeTaskId)
                .sort((a, b) => a.position - b.position);
             const overTaskIndex = tasksInTargetColumn.findIndex(t => t.id === overId);
             targetPosition = overTaskIndex >= 0 ? overTaskIndex : tasksInTargetColumn.length;
        }
        // Case 2: Dropping onto a COLUMN AREA directly
        // Use optional chaining and check for columnId and accepts from Column's data
        else if (over.data.current?.type === 'column' && over.data.current?.columnId === overId && over.data.current?.accepts?.includes('task')) {
            console.log(`Drop Target: COLUMN (${overId})`);
            targetColumnId = overId;
            const tasksInTargetColumn = currentTasks
                .filter(t => t.column_id === targetColumnId && t.id !== activeTaskId)
                .sort((a, b) => a.position - b.position);
            targetPosition = tasksInTargetColumn.length; // Append to bottom
        }
        // Case 3: Fallback - check if over.id matches a known column ID
        // This might catch drops onto the padding area within a SortableContext if types aren't passed correctly
         else if (useBoardStore.getState().columns.some(col => col.id === overId)) {
            console.log(`Drop Target: COLUMN (inferred from ID ${overId})`);
            targetColumnId = overId;
            const tasksInTargetColumn = currentTasks
               .filter(t => t.column_id === targetColumnId && t.id !== activeTaskId)
               .sort((a, b) => a.position - b.position);
           targetPosition = tasksInTargetColumn.length; // Append to bottom
        }
         else {
             console.warn("Task drag end: Could not determine drop target type or invalid drop.", {overId, overType, overData: over.data.current});
             return; // Exit if we can't determine the target
        }

        // --- Log Determined Target ---
        console.log('Determined Target:', { targetColumnId, targetPosition });

        // Ensure a valid target column was identified
        if (!targetColumnId) { console.warn("Task drag end: No target column ID determined."); return; }


        // --- Optimistic Update & DB Update Logic ---
        // (Using the re-indexing logic from the version you said worked for tasks)
        let optimisticTasks = [...currentTasks];
        const activeTaskIndex = optimisticTasks.findIndex(t => t.id === activeTaskId);
        if (activeTaskIndex === -1) { console.warn("Task drag end: Active task disappeared?"); return; }
        const originalColumnId = activeTask.column_id; // Store original column

        // Update the column ID of the dragged task in our working copy
        optimisticTasks[activeTaskIndex] = { ...optimisticTasks[activeTaskIndex], column_id: targetColumnId };

        // Separate tasks by their *new* column assignments
        const tasksByColumn: { [key: string]: Task[] } = optimisticTasks.reduce((acc, task) => {
            const colId = task.column_id || 'unassigned';
            if (!acc[colId]) acc[colId] = [];
            acc[colId].push(task);
            return acc;
        }, {} as { [key: string]: Task[] });

        // Function to re-sort and re-assign positions within a single column's task list
        // *** THIS IS THE REVERTED VERSION OF THE REINDEX FUNCTION ***
        const reindexColumn = (columnId: string | null, tasks: Task[]): Task[] => {
            if (!columnId) return tasks;

            // Get tasks meant for this column, EXCLUDING the active task for now
            const columnTasks = (tasksByColumn[columnId] || [])
                                .filter(t => t.id !== activeTaskId);

            // If this IS the target column, insert the active task (with updated colId)
            // back into the list at the calculated target position
            if (columnId === targetColumnId) {
                 const updatedActiveTask = optimisticTasks[activeTaskIndex];
                 columnTasks.splice(targetPosition, 0, updatedActiveTask);
            }

            // Re-assign sequential 'position' values
            return columnTasks.map((task, index) => ({ ...task, position: index }));
        };

        // Re-index the target column
        const reindexedTargetTasks = reindexColumn(targetColumnId, optimisticTasks);

        // Re-index the source column IF it's different from the target
        let reindexedSourceTasks: Task[] = [];
        if (originalColumnId && originalColumnId !== targetColumnId) {
            reindexedSourceTasks = reindexColumn(originalColumnId, optimisticTasks);
        }

        // Combine all tasks back together:
        // Tasks from columns that were NOT source or target + reindexed target + reindexed source
        const finalOptimisticTasks = Object.entries(tasksByColumn)
            .filter(([colId]) => colId !== targetColumnId && colId !== originalColumnId) // Tasks from other columns
            .flatMap(([, tasks]) => tasks) // Get the tasks themselves
            .concat(reindexedTargetTasks) // Add updated target column tasks
            .concat(reindexedSourceTasks); // Add updated source column tasks (if it was different)


        // Log final state before setting
        console.log('Final Optimistic Tasks:', JSON.stringify(finalOptimisticTasks.map(t => ({id: t.id, col: t.column_id, pos: t.position})), null, 2));


        // Check if any task's position or column actually changed
        const hasChanged = finalOptimisticTasks.some(task => {
            const originalTask = currentTasks.find(t => t.id === task.id);
            return !originalTask || originalTask.position !== task.position || originalTask.column_id !== task.column_id;
        });

        if (!hasChanged) {
            console.log("Task drag end: No effective change detected after re-indexing.");
            return;
        }

        // Update Zustand store
        console.log('Updating task store state...');
        useTaskStore.setState({ tasks: finalOptimisticTasks });
        setSelectedTaskId(null);

        // Prepare and execute DB updates
        const tasksToUpdateInDB = finalOptimisticTasks.filter(task => {
            const originalTask = currentTasks.find(t => t.id === task.id);
            return !originalTask || originalTask.position !== task.position || originalTask.column_id !== task.column_id;
        }).map(task => updateTask(task.id, { column_id: task.column_id, position: task.position }));

        try {
            await Promise.all(tasksToUpdateInDB);
            console.log('Task updates successful in DB.');
        } catch (error) {
            console.error('Failed to update tasks in DB:', error);
            alert("Failed to save task changes. Please refresh.");
            fetchTasks(validProjectId); // Revert optimistic update
        }
    } else {
         // Log unhandled drag types
         console.log(`Drag End: Unhandled ActiveType: ${activeType}`);
    }
  };

  // --- Find active item details for DragOverlay --- (OK)
  const activeDragItem = activeItem ? (
      activeItem.data.current?.type === 'column'
      ? useBoardStore.getState().columns.find(col => col.id === activeItem.id)
      : useTaskStore.getState().tasks.find(task => task.id === activeItem.id)
  ) : null;

  // --- Render --- (OK)
  return (
    <div className="flex flex-col h-full min-w-0">
      {/* Headers */}
      <div className="flex-shrink-0 w-full sticky top-0 z-30 bg-white"><ProjectHeader /></div>
      <div className="flex-shrink-0 w-full sticky top-16 z-20 bg-white border-b"><BoardHeader projectId={validProjectId} filters={filters} onFilterChange={setFilters} /></div>

      {/* Board Content */}
      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <BoardContainer>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <BoardView projectId={validProjectId} filters={filters} />
            {/* Drag Overlay with Animation */}
            <DragOverlay dropAnimation={dropAnimationConfig}>
               {activeItem?.data.current?.type === 'column' && activeDragItem ? (
                  // Column Overlay Component/Style
                  <div className="w-[320px] bg-gray-100 rounded-lg shadow-xl opacity-95 border border-gray-300 flex flex-col h-[calc(100vh-210px)]">
                    {/* ... content ... */}
                  </div>
               ) : activeItem?.data.current?.type === 'task' && activeDragItem ? (
                   // Task Overlay Component
                   <TaskCard task={activeDragItem as Task} columnId={(activeDragItem as Task).column_id || ''} />
               ) : null}
            </DragOverlay>
          </DndContext>
        </BoardContainer>
      </div>
    </div>
  );
};