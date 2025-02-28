// Import necessary modules and components from React and lucide-react
import React from 'react';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';

// Define the props interface for TaskListFilters component
interface TaskListFiltersProps {
  activeFilter: 'upcoming' | 'overdue' | 'completed';
  onFilterChange: (filter: 'upcoming' | 'overdue' | 'completed') => void;
  counts: {
    upcoming: number;
    overdue: number;
    completed: number;
  };
}

// Define the TaskListFilters component
export const TaskListFilters: React.FC<TaskListFiltersProps> = ({
  activeFilter,
  onFilterChange,
  counts
}) => {
  return (
    <div className="flex border-b border-gray-200">
      {/* Button to filter upcoming tasks */}
      <button
        onClick={() => onFilterChange('upcoming')}
        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 ${
          activeFilter === 'upcoming'
            ? 'border-indigo-500 text-indigo-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        <Clock className="h-4 w-4 mr-2" />
        Upcoming
        <span className="ml-2 text-xs bg-gray-100 text-gray-600 rounded-full px-2 py-0.5">
          {counts.upcoming}
        </span>
      </button>

      {/* Button to filter overdue tasks */}
      <button
        onClick={() => onFilterChange('overdue')}
        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 ${
          activeFilter === 'overdue'
            ? 'border-red-500 text-red-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        <AlertCircle className="h-4 w-4 mr-2" />
        Overdue
        {counts.overdue > 0 && (
          <span className="ml-2 text-xs bg-red-100 text-red-600 rounded-full px-2 py-0.5">
            {counts.overdue}
          </span>
        )}
      </button>

      {/* Button to filter completed tasks */}
      <button
        onClick={() => onFilterChange('completed')}
        className={`flex items-center px-4 py-2 text-sm font-medium border-b-2 ${
          activeFilter === 'completed'
            ? 'border-green-500 text-green-600'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
        }`}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Completed
        <span className="ml-2 text-xs bg-green-100 text-green-600 rounded-full px-2 py-0.5">
          {counts.completed}
        </span>
      </button>
    </div>
  );
};