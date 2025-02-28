import React from 'react';
import { Plus } from 'lucide-react';

export const CreateTaskButton = () => {
  return (
    <button className="w-full flex items-center px-4 py-3 text-sm text-gray-500 hover:bg-gray-50">
      <Plus className="h-4 w-4 mr-2" />
      Create task
    </button>
  );
};