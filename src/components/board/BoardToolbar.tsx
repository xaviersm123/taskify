import React from 'react';
import { Plus, Filter } from 'lucide-react';
import { BoardFilters, TaskFilter } from './BoardFilters';

interface BoardToolbarProps {
  filters: TaskFilter;
  onFilterChange: (filters: TaskFilter) => void;
  onAddSection: () => void;
}

export const BoardToolbar: React.FC<BoardToolbarProps> = ({
  filters,
  onFilterChange,
  onAddSection,
}) => {
  return (
    <div className="flex items-center justify-between px-6 py-2 bg-white border-b">
      <button
        onClick={onAddSection}
        className="flex items-center space-x-1 text-gray-600 hover:text-gray-800 px-3 py-1.5 rounded-md hover:bg-gray-50"
      >
        <Plus className="h-4 w-4" />
        <span>Add section</span>
      </button>

      <BoardFilters
        filters={filters}
        onFilterChange={onFilterChange}
        onClearFilters={() => onFilterChange({
          incomplete: false,
          completed: false,
          assignedToMe: false,
          dueThisWeek: false,
          dueNextWeek: false
        })}
      />
    </div>
  );
};