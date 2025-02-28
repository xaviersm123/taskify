import React from 'react';
import { Filter, MoreHorizontal } from 'lucide-react';

export const TaskListHeader = () => {
  return (
    <div className="border-b border-gray-200 p-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-medium text-gray-900">My Tasks</h2>
        <div className="flex items-center space-x-2">
          <button className="p-1 text-gray-400 hover:text-gray-500">
            <Filter className="h-5 w-5" />
          </button>
          <button className="p-1 text-gray-400 hover:text-gray-500">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};