import React, { useState } from 'react';
import { useBoardStore } from '../../lib/store/board';
import { BoardToolbar } from './BoardToolbar';
import { TaskFilter } from './BoardFilters';

interface BoardHeaderProps {
  projectId: string;
  filters: TaskFilter;
  onFilterChange: (filters: TaskFilter) => void;
}

export const BoardHeader: React.FC<BoardHeaderProps> = ({ 
  projectId, 
  filters,
  onFilterChange 
}) => {
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumnName, setNewColumnName] = useState('');
  const { createColumn } = useBoardStore();

  const handleAddColumn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newColumnName.trim()) return;

    try {
      await createColumn(projectId, newColumnName.trim());
      setNewColumnName('');
      setIsAddingColumn(false);
    } catch (error) {
      console.error('Failed to create column:', error);
    }
  };

  return (
    <div>
      <BoardToolbar
        filters={filters}
        onFilterChange={onFilterChange}
        onAddSection={() => setIsAddingColumn(true)}
      />

      {isAddingColumn && (
        <div className="p-4 border-b">
          <form onSubmit={handleAddColumn} className="flex items-center space-x-2">
            <input
              type="text"
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              placeholder="Section name"
              className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button
              type="submit"
              className="px-3 py-1 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
            >
              Add
            </button>
            <button
              type="button"
              onClick={() => setIsAddingColumn(false)}
              className="px-3 py-1 text-gray-600 text-sm hover:text-gray-800"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </div>
  );
};