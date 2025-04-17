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
  closestCorners,
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
// Import arrayMove
import { arrayMove } from '@dnd-kit/sortable';
import { TaskCard } from '../components/board/TaskCard';

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

  const [filters, setFilters] = useState<TaskFilter>({ /* initial filters */ });
  const [activeItem, setActiveItem] = useState<Active | null>(null);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor)
  );

  let validProjectId: string;
  try { validProjectId = projectId ? ensureCompleteUUID(projectId) : ''; }
  catch (error) { console.error("Invalid Project ID:", projectId, error); navigate('/dashboard'); return null; }
  if (!validProjectId) { navigate('/dashboard'); return null; }

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

  const handleDragStart = (event: DragStartEvent) => {
    console.log('Drag Start:', { id: event.active.id, type: event.active.data.current?.type, data: event.active.data.current });
    setActiveItem(event.active);
    if (event.active.data.current?.type === 'task') {
      setActiveTaskId(event.active.id as string);
    } else {
      setActiveTaskId(null);
    }
  };

  // ==================================================
  // REVISED handleDragEnd FUNCTION
  // ==================================================
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveItem(null);
    setActiveTaskId(null); // Clear active task ID regardless

    if (!over) { console.log('Drag End: No drop target.'); return; }
    // Ignore drop if it's onto itself
    if (active.id === over.id) { console.log('Drag End: Dropped on self.'); return; }

    const activeType = active.data.current?.type;
    const overType = over.data.current?.type;
    const overId = over.id as string;

    console.log('--- Drag End Event ---');
    console.log('Active:', { id: active.id, type: activeType, data: active.data.current });
    console.log('Over:', { id: overId, type: overType, data: over.data.current }); // Log Over ID explicitly
    console.log('----------------------');


    // === COLUMN DRAG LOGIC === (Keep as is - assumed working)
    if (activeType === 'column' && overType === 'column' && active.id !== overId) {
        console.log('Handling Column Drag...');
        const activeColumnId = active.id as string;
        const overColumnId = overId;
        const currentColumns = useBoardStore.getState().columns;
        const oldIndex = currentColumns.findIndex(col => col.id === activeColumnId);
        const newIndex = currentColumns.findIndex(col => col.id === overColumnId);
        if (oldIndex === -1 || newIndex === -1) { console.warn('Column drag end: Column ID not found.'); return; }

        if (oldIndex === newIndex) { console.log("Column drag end: No change in order."); return; } // Avoid unnecessary updates

        const reorderedColumns = arrayMove(currentColumns, oldIndex, newIndex);
        const updatedColumnsWithPosition = reorderedColumns.map((col, index) => ({ ...col, position: index }));

        useBoardStore.setState({ columns: updatedColumnsWithPosition }); // Optimistic update

        const updates = updatedColumnsWithPosition
            .filter((col, index) => {
                const originalColumn = currentColumns.find(c => c.id === col.id);
                return originalColumn && originalColumn.position !== index;
            }).map(col => updateBoardColumn(col.id, { position: col.position }));

        try {
            await Promise.all(updates);
            console.log('Column positions updated in DB.');
        } catch (error) {
            console.error('Failed to update column positions:', error);
            alert("Failed to save column order.");
            fetchBoardColumns(validProjectId); // Revert
        }
    }

    // === TASK DRAG LOGIC === (Revised)
    else if (activeType === 'task') {
        console.log('Handling Task Drag...');
        const activeTaskId = active.id as string;
        // overId is already defined above

        const currentTasks = useTaskStore.getState().tasks;
        const activeTask = currentTasks.find((task) => task.id === activeTaskId);

        if (!activeTask) {
            console.warn('Task drag end: Active task not found.');
            return;
        }

        // --- Determine Target Column ID ---
        // This logic seems fine, it determines WHICH column the drop happened over/in.
        let targetColumnId: string | null = null;
        if (over.data.current?.type === 'task') {
            // Dropped onto a task card, use its columnId
            targetColumnId = over.data.current?.columnId;
            console.log(`Drop Target: TASK (${overId}) in Column ${targetColumnId}`);
        } else if (over.data.current?.type === 'column' && over.data.current?.accepts?.includes('task')) {
            // Dropped onto a column's droppable area
            targetColumnId = overId; // The column's ID itself
             console.log(`Drop Target: COLUMN (${overId})`);
        } else if (useBoardStore.getState().columns.some(col => col.id === overId)) {
            // Fallback: Dropped somewhere identified only by a column ID (e.g., empty space?)
            targetColumnId = overId;
            console.log(`Drop Target: COLUMN (inferred from ID ${overId})`);
        } else {
            console.warn("Task drag end: Could not determine target column.", { overId, overType, overData: over.data.current });
            return; // Exit if we can't determine the target column
        }

        if (!targetColumnId) { console.warn("Task drag end: No target column ID determined."); return; }


        const originalColumnId = activeTask.column_id;

        // --- Check for Intra-Column vs Inter-Column Move ---

        // CASE 1: Intra-Column Reordering (Moving within the same column)
        if (originalColumnId === targetColumnId) {
            console.log(`Handling Intra-Column Task Drag: ${activeTaskId} moving over ${overId} in ${targetColumnId}`);

            // 1. Get tasks currently in the target column, sorted by position
            const tasksInColumn = currentTasks
                .filter(t => t.column_id === targetColumnId)
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0)); // Sort by current position

            // 2. Find the old and new indices within this specific list
            const oldIndex = tasksInColumn.findIndex(t => t.id === activeTaskId);
            const newIndex = tasksInColumn.findIndex(t => t.id === overId); // Find index of the item being dropped ON

            if (oldIndex === -1) {
                console.error(`Intra-column move error: Active task ${activeTaskId} not found in column ${targetColumnId}.`);
                return; // Should not happen if task exists
            }
            if (newIndex === -1) {
                 console.error(`Intra-column move error: Target task ${overId} not found in column ${targetColumnId}. This might happen if dropping in empty space, check inter-column logic or target detection.`);
                 // If dropping in empty space at the bottom, overId might be the column ID.
                 // arrayMove correctly handles moving to the end if newIndex is length-1.
                 // However, dnd-kit usually gives the ID of the droppable (column) or the nearest item.
                 // Let's assume for now `overId` correctly identifies the task we are "over" according to `closestCorners`.
                 // If this error persists for drops in empty space, the targetColumnId detection needs refinement.
                 return;
            }

            // 3. If indices are the same, no move needed
            if (oldIndex === newIndex) {
                console.log("Intra-column move: No change in order needed.");
                return;
            }

            // 4. Reorder using arrayMove
            const reorderedTasks = arrayMove(tasksInColumn, oldIndex, newIndex);

            // 5. Update positions sequentially for the affected column
            const finalTasksInColumn = reorderedTasks.map((task, index) => ({
                ...task,
                position: index,
                column_id: targetColumnId // Ensure column_id is correct (though it didn't change)
            }));

            // 6. Create the final optimistic state by merging unchanged columns + reordered column
            const finalOptimisticTasks = currentTasks
                .filter(t => t.column_id !== targetColumnId) // Keep tasks from other columns
                .concat(finalTasksInColumn); // Add the reordered tasks for this column

            // 7. Update state and DB
            console.log('Updating task store state (Intra-Column)...');
            useTaskStore.setState({ tasks: finalOptimisticTasks });
            setSelectedTaskId(null); // Clear selection just in case

            // Find only the tasks whose positions actually changed in this column
            const tasksToUpdateInDB = finalTasksInColumn.filter(task => {
                const originalTask = tasksInColumn.find(t => t.id === task.id); // Compare against original sorted order in this column
                // Only need to update if position changed
                return originalTask && originalTask.position !== task.position;
            }).map(task => updateTask(task.id, { position: task.position })); // Only send position update

            if (tasksToUpdateInDB.length === 0) {
                console.log("Intra-column move: No position changes detected after reorder.");
                return;
            }

            try {
                await Promise.all(tasksToUpdateInDB);
                console.log('Intra-column task position updates successful in DB.');
            } catch (error) {
                console.error('Failed to update intra-column task positions in DB:', error);
                alert("Failed to save task order. Please refresh.");
                fetchTasks(validProjectId); // Revert optimistic update
            }

        }
        // CASE 2: Inter-Column Move (Moving task to a different column)
        else {
            console.log(`Handling Inter-Column Task Drag: ${activeTaskId} from ${originalColumnId || 'unknown'} to ${targetColumnId}`);

            // Use the previous re-indexing logic which seemed okay for inter-column moves
            // (Slightly adapted for clarity and ensuring positions are handled correctly)

            let optimisticTasks = [...currentTasks];
            const activeTaskIndex = optimisticTasks.findIndex(t => t.id === activeTaskId);
            if (activeTaskIndex === -1) { console.warn("Inter-column move: Active task disappeared?"); return; }

            // --- Determine Target Position in New Column ---
            let targetPosition: number;
            const tasksInTargetCol = optimisticTasks
                .filter(t => t.column_id === targetColumnId) // Tasks already there
                .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            // If dropped onto a specific task in the target column
            const overTaskIndexInTarget = tasksInTargetCol.findIndex(t => t.id === overId);
            if (over.data.current?.type === 'task' && overTaskIndexInTarget !== -1) {
                targetPosition = overTaskIndexInTarget; // Insert *at* this index (pushes original down)
            } else {
                // Dropped onto column area or inferred column - append to the end
                targetPosition = tasksInTargetCol.length;
            }
            console.log(`Inter-column target position in column ${targetColumnId}: ${targetPosition}`);


            // --- Update Task and Re-index Both Columns ---

            // 1. Create a mutable copy of the task to update
            const taskToMove = { ...optimisticTasks[activeTaskIndex], column_id: targetColumnId };

            // 2. Remove the task from its original position (in the optimistic list)
            optimisticTasks.splice(activeTaskIndex, 1);

            // 3. Separate remaining tasks by column
            const tasksByColumn: { [key: string]: Task[] } = optimisticTasks.reduce((acc, task) => {
                const colId = task.column_id || 'unassigned'; // Handle null column_id if necessary
                if (!acc[colId]) acc[colId] = [];
                acc[colId].push(task);
                return acc;
            }, {} as { [key: string]: Task[] });

            // 4. Get tasks for the target column (excluding the moved task for now)
            const targetColumnTasks = (tasksByColumn[targetColumnId] || [])
                                      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

            // 5. Insert the moved task into the target column list at the calculated position
            targetColumnTasks.splice(targetPosition, 0, taskToMove);

            // 6. Re-assign positions for the target column
            const reindexedTargetTasks = targetColumnTasks.map((task, index) => ({
                ...task,
                position: index,
            }));

            // 7. Re-assign positions for the source column (if it exists)
            let reindexedSourceTasks: Task[] = [];
            if (originalColumnId && tasksByColumn[originalColumnId]) {
                reindexedSourceTasks = (tasksByColumn[originalColumnId] || [])
                    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                    .map((task, index) => ({ ...task, position: index }));
            }

            // 8. Combine all tasks back: other columns + reindexed target + reindexed source
            const finalOptimisticTasks = Object.entries(tasksByColumn)
                .filter(([colId]) => colId !== targetColumnId && colId !== originalColumnId)
                .flatMap(([, tasks]) => tasks) // Tasks from unaffected columns
                .concat(reindexedTargetTasks) // Add updated target column tasks
                .concat(reindexedSourceTasks); // Add updated source column tasks

             // Log final state before setting
             console.log('Final Optimistic Tasks (Inter-Column):', JSON.stringify(finalOptimisticTasks.map(t => ({id: t.id, col: t.column_id, pos: t.position})), null, 2));

            // 9. Check if anything actually changed
            const hasChanged = finalOptimisticTasks.some(task => {
                const originalTask = currentTasks.find(t => t.id === task.id);
                return !originalTask || originalTask.position !== task.position || originalTask.column_id !== task.column_id;
            });

            if (!hasChanged) {
                console.log("Inter-column move: No effective change detected after re-indexing.");
                return;
            }

            // 10. Update Zustand store
            console.log('Updating task store state (Inter-Column)...');
            useTaskStore.setState({ tasks: finalOptimisticTasks });
            setSelectedTaskId(null);

            // 11. Prepare and execute DB updates for all changed tasks
            const tasksToUpdateInDB = finalOptimisticTasks.filter(task => {
                const originalTask = currentTasks.find(t => t.id === task.id);
                return !originalTask || originalTask.position !== task.position || originalTask.column_id !== task.column_id;
            }).map(task => updateTask(task.id, { column_id: task.column_id, position: task.position }));

            if (tasksToUpdateInDB.length === 0) {
                console.log("Inter-column move: No tasks needed DB update.");
                return;
            }

            try {
                await Promise.all(tasksToUpdateInDB);
                console.log('Inter-column task updates successful in DB.');
            } catch (error) {
                console.error('Failed to update inter-column tasks in DB:', error);
                alert("Failed to save task changes. Please refresh.");
                fetchTasks(validProjectId); // Revert optimistic update
            }
        }

    } else {
         // Log unhandled drag types
         console.log(`Drag End: Unhandled ActiveType: ${activeType} or OverType: ${overType}`);
    }
  };
  // ==================================================
  // END OF REVISED handleDragEnd
  // ==================================================


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
            collisionDetection={closestCorners} // Keep using closestCorners
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd} // Use the revised handler
          >
            <BoardView projectId={validProjectId} filters={filters} />
            {/* Drag Overlay with Animation */}
            <DragOverlay dropAnimation={dropAnimationConfig}>
               {activeItem?.data.current?.type === 'column' && activeDragItem ? (
                  // Column Overlay Component/Style (Example)
                  <div className="w-[320px] bg-gray-100 rounded-lg shadow-xl opacity-95 border border-gray-300 flex flex-col h-[calc(100vh-210px)]">
                      <div className="p-3 font-semibold text-gray-800 border-b bg-white rounded-t-lg">{(activeDragItem as BoardColumn).name}</div>
                      <div className="p-3 flex-1 bg-gray-100"> {/* Mimic structure */}
                          {/* Maybe show task count? */}
                      </div>
                      <div className="p-3 border-t bg-gray-50 rounded-b-lg"></div>
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