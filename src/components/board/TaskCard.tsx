import React, { useState, useCallback, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Calendar, User, Circle, CheckCircle, GripVertical } from 'lucide-react';
import { format } from 'date-fns';
import { Task } from '../../lib/store/task/types';
import { useUserStore } from '../../lib/store/user';
import { useTaskStore } from '../../lib/store/task'; // Import useTaskStore
import { TaskDetails } from './TaskDetails';
import { formatUserDisplay } from '../../lib/utils/user-display';

interface TaskCardProps {
  task: Task;
  columnId: string;
  isSelected?: boolean;
}

export const TaskCard: React.FC<TaskCardProps> = ({ task, columnId, isSelected }) => {
  const [isDetailsOpen, setIsDetailsOpen] = useState(isSelected);
  const { users, fetchUsers } = useUserStore();
  const { updateTask } = useTaskStore(); // Add updateTask from useTaskStore

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({
    id: task.id,
    data: {
      type: 'task',
      task,
      columnId,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const handleCheckClick = useCallback(
    async (e: React.MouseEvent) => {
      e.stopPropagation();
      const newStatus = task.status === 'complete' ? 'todo' : 'complete';
      try {
        await updateTask(task.id, { status: newStatus });
      } catch (error) {
        console.error('Failed to update task status:', error);
      }
    },
    [task.id, task.status, updateTask]
  );

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const assignee = users.find((u) => u.id === task.assignee_id);
  const assigneeName = formatUserDisplay(assignee);

  const truncateTitle = (title: string, maxLength: number = 150) => {
    if (title.length <= maxLength) return title;
    return `${title.substring(0, maxLength)}...`;
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        {...attributes}
        data-task-id={task.id}
        className={`bg-white p-3 rounded shadow-sm border border-gray-200 hover:shadow-md space-y-2 transition-shadow duration-200 ${
          isSelected ? 'ring-2 ring-indigo-500' : ''
        }`}
      >
        <div className="flex items-start space-x-2">
          <div {...listeners} className="cursor-grab flex-shrink-0 mt-0.5">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
          <button
            onClick={handleCheckClick}
            className="flex-shrink-0 mt-0.5 text-gray-400 hover:text-gray-500 focus:outline-none"
            aria-label={task.status === 'complete' ? 'Mark as incomplete' : 'Mark as complete'}
          >
            {task.status === 'complete' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <Circle className="h-4 w-4" />
            )}
          </button>
          <div className="flex-1 min-w-0">
            <h4
              onClick={() => setIsDetailsOpen(true)}
              className={`text-sm font-medium cursor-pointer hover:underline ${
                task.status === 'complete' ? 'text-gray-400 line-through' : 'text-gray-900'
              }`}
            >
              {truncateTitle(task.title)}
            </h4>
            <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
              <div className="flex items-center space-x-2">
                {assigneeName !== 'Unassigned' && (
                  <div className="flex items-center">
                    <User className="h-3 w-3 mr-1" />
                    <span>{assigneeName}</span>
                  </div>
                )}
                {task.due_date && (
                  <div className="flex items-center">
                    <Calendar className="h-3 w-3 mr-1" />
                    <span>{format(new Date(task.due_date), 'MMM d')}</span>
                  </div>
                )}
              </div>
              {task.priority && (
                <span
                  className={`px-1.5 py-0.5 rounded-full text-xs font-medium capitalize ${
                    task.priority === 'urgent'
                      ? 'bg-red-100 text-red-800'
                      : task.priority === 'high'
                      ? 'bg-orange-100 text-orange-800'
                      : task.priority === 'medium'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {task.priority}
                </span>
              )}
            </div>
            {/* Custom Fields Section */}
            <div className="mt-2 space-y-1">
              {task.customFields?.map((field) => (
                <div key={field.field_id} className="text-xs text-gray-600">
                  <span className="font-semibold">{field.custom_fields.name}: </span>
                  {field.value}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <TaskDetails
        taskId={task.id}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
    </>
  );
};