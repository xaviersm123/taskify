import React from 'react';
import { Trash2, ArrowDownUp } from 'lucide-react';

interface ColumnContextMenuProps {
  x: number;
  y: number;
  onDelete: () => void;
  onPositionChange: () => void;
  onClose: () => void;
}

export const ColumnContextMenu: React.FC<ColumnContextMenuProps> = ({
  x,
  y,
  onDelete,
  onPositionChange,
  onClose,
}) => {
  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this column? All tasks in this column will also be deleted.')) {
      onDelete();
    }
    onClose();
  };

  const handlePositionChange = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onPositionChange();
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />
      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg py-1 min-w-[160px]"
        style={{ top: y, left: x }}
      >
        <button
          onClick={handlePositionChange}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
        >
          <ArrowDownUp className="h-4 w-4" />
          <span>Change Position</span>
        </button>
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete column</span>
        </button>
      </div>
    </>
  );
};