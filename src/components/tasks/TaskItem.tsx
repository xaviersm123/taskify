// Import necessary modules and components from React, date-fns, and lucide-react
import React from 'react';
import { format } from 'date-fns';
import { Calendar, Circle, CheckCircle } from 'lucide-react';
import { Task } from '../../lib/store/task';

// Define the props interface for TaskItem component
interface TaskItemProps {
  task: Task;
}

// Define the TaskItem component
export const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  // Function to get the appropriate color class based on task priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // Render the task item
  return (
    <div className="flex items-center px-4 py-3 hover:bg-gray-50 group">
      {/* Button to toggle task completion status */}
      <button className="flex-shrink-0 mr-3 text-gray-400 hover:text-gray-500">
        {task.status === 'complete' ? (
          <CheckCircle className="h-5 w-5 text-green-500" />
        ) : (
          <Circle className="h-5 w-5" />
        )}
      </button>

      {/* Task title and priority */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${task.status === 'complete' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
            {task.title}
          </span>
          {task.priority && (
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
              {task.priority}
            </span>
          )}
        </div>
      </div>

      {/* Custom fields */}
      {task.customFields?.map((field) => (
        <div key={field.field_id} className="text-xs text-gray-500">
          <span className="font-medium">{field.custom_fields.name}: </span>
          {field.value}
        </div>
      ))}

      {/* Task due date */}
      {task.due_date && (
        <div className="flex items-center ml-4 text-sm text-gray-500">
          <Calendar className="h-4 w-4 mr-1" />
          <span>{format(new Date(task.due_date), 'MMM d')}</span>
        </div>
      )}
    </div>
  );
};