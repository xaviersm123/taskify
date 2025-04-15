import React, { useState, useCallback, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User, Circle, CheckCircle, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { Task } from '../../lib/store/task/types';
import { useUserStore } from '../../lib/store/user';
import { useTaskStore } from '../../lib/store/task';
import { TaskDetails } from './TaskDetails';
import { formatUserDisplay } from '../../lib/utils/user-display';

interface TaskCardProps {
  task: Task;
  columnId: string;
  isSelected?: boolean; // isSelected might not be used if details open based on local state
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, columnId }) => {
  // isSelected prop might be removed if selection state is managed differently
  const [isDetailsOpen, setIsDetailsOpen] = useState(false); // Details open locally
  const { users, fetchUsers } = useUserStore();
  const { updateTask } = useTaskStore();

  const {
    attributes, // Attributes for accessibility, applied usually to the main div
    listeners,  // Listeners for drag handle, applied to the GripVertical area
    setNodeRef, // Ref for the main draggable element (the card div)
    transform,
    transition,
    isDragging // State: is this specific card being dragged?
  } = useSortable({
    id: task.id, // Unique ID for this sortable item
    data: {
      type: 'task',      // Differentiates from columns in handleDragEnd
      task,              // Pass the full task object if needed by overlay or handleDragEnd
      columnId,          // The current column ID, useful in handleDragEnd
      taskId: task.id    // *** ADDED: Explicitly add taskId for clarity ***
    },
  });

  // Style for positioning and animation during drag
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined, // Use dnd-kit transition
    opacity: isDragging ? 0.5 : 1,     // Dim card while dragging
    willChange: transform ? 'transform' : undefined, // Perf hint
  };

  // --- Handlers ---
  // Toggle task completion status
  const handleCheckClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation(); // Prevent opening details modal
      const newStatus = task.status === 'complete' ? 'todo' : 'complete'; // Or cycle through statuses?
      try {
        // Optimistic update could be added here if needed
        await updateTask(task.id, { status: newStatus });
        // No local state update needed, relies on store re-render
      } catch (error) {
        console.error('Failed to update task status:', error);
        // Revert optimistic update or show error message
      }
    },
    [task.id, task.status, updateTask]
  );

  const handleOpenDetails = () => {
    setIsDetailsOpen(true);
  };

  // --- Effects ---
  // Fetch users (consider fetching only once at a higher level?)
  useEffect(() => {
    // Avoid fetching users on every single card mount if possible
    // Check if users are already loaded in the store?
    if (useUserStore.getState().users.length === 0) {
        fetchUsers();
    }
  }, [fetchUsers]);


  // --- Data processing ---
  const assignee = users.find((u) => u.id === task.assignee_id);
  const assigneeName = formatUserDisplay(assignee);

  // Truncate long titles
  const truncateTitle = (title: string | null, maxLength: number = 100): string => {
    if (!title) return '';
    if (title.length <= maxLength) return title;
    return `${title.substring(0, maxLength)}…`; // Use ellipsis character
  };

  // --- Render ---
  return (
    <>
      {/* Main Card Element - Sortable */}
      <div
        ref={setNodeRef} // Assign ref for dnd-kit sortable
        style={style}
        {...attributes} // Apply accessibility attributes
        data-task-id={task.id} // Optional data attribute for debugging/testing
        className={`bg-white p-3 rounded-md shadow border border-gray-200 hover:shadow-lg group relative space-y-2 transition-all duration-150 ease-in-out ${isDragging ? 'shadow-2xl ring-2 ring-indigo-400' : 'hover:border-indigo-300'}`}
        onClick={handleOpenDetails} // Open details on click anywhere *except* interactive elements
      >
        {/* Content Wrapper */}
        <div className="flex items-start space-x-2">
          {/* Drag Handle Area */}
          <div
            {...listeners} // Apply drag listeners HERE
            onClick={(e) => e.stopPropagation()} // Prevent opening details when grabbing handle
            className="cursor-grab flex-shrink-0 p-1 -ml-1 mt-0.5 text-gray-400 hover:text-gray-700 rounded hover:bg-gray-100 transition-colors"
            aria-label="Drag task"
          >
            <GripVertical className="h-4 w-4" />
          </div>

          {/* Checkbox / Status Toggle */}
          <button
            onClick={handleCheckClick} // Use the specific handler
            className="flex-shrink-0 mt-1 text-gray-400 hover:text-gray-600 focus:outline-none rounded-full focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
            aria-label={task.status === 'complete' ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {task.status === 'complete' ? (
              <CheckCircle className="h-4 w-4 text-green-600" />
            ) : (
              <Circle className="h-4 w-4 hover:text-indigo-500" />
            )}
          </button>

          {/* Main Task Info */}
          <div className="flex-1 min-w-0">
            {/* Task Title (clickable to open details) */}
            <h4
              // Remove onClick here, handled by the main div
              className={`text-sm font-medium cursor-pointer ${task.status === 'complete' ? 'text-gray-500 line-through' : 'text-gray-900 group-hover:text-indigo-700'}`}
              title={task.title ?? undefined} // Show full title on hover
            >
              {truncateTitle(task.title)}
            </h4>

            {/* Meta Info (Assignee, Due Date, Priority) */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600 mt-2">
              {/* Assignee */}
              {assigneeName !== 'Unassigned' && (
                <div className="flex items-center">
                  <User className="h-3 w-3 mr-1 text-gray-500" />
                  <span>{assigneeName}</span>
                </div>
              )}
              {/* Due Date */}
              {task.due_date && (
                <div className="flex items-center">
                  <Calendar className="h-3 w-3 mr-1 text-gray-500" />
                  {/* Add logic for overdue/due soon styling if desired */}
                  <span>{format(new Date(task.due_date), 'MMM d')}</span>
                </div>
              )}
              {/* Priority Badge */}
              {task.priority && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-semibold capitalize leading-none ${
                    task.priority === 'urgent' ? 'bg-red-100 text-red-800' :
                    task.priority === 'high' ? 'bg-orange-100 text-orange-800' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-green-100 text-green-800' // low or default
                  }`}
                >
                  {task.priority}
                </span>
              )}
            </div>

            {/* Custom Fields Section */}
            {task.customFields && task.customFields.length > 0 && (
               <div className="mt-2 pt-1 border-t border-gray-100 space-y-1">
                {task.customFields.map((field) => (
                  <div key={field.field_id} className="text-xs text-gray-700 flex items-center">
                    <span className="font-medium text-gray-500 w-1/3 truncate pr-1">{field.custom_fields.name}:</span>
                    <span className="w-2/3 truncate">{field.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Details Modal/Side Panel */}
      <TaskDetails
        taskId={task.id}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </>
  );
};