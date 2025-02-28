import React from 'react';
import { Copy, Trash2, Pencil } from 'lucide-react';

interface SubtaskContextMenuProps {
  x: number;
  y: number;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onClose: () => void;
}

export const SubtaskContextMenu: React.FC<SubtaskContextMenuProps> = ({
  x,
  y,
  onEdit,
  onDuplicate,
  onDelete,
  onClose,
}) => {
  const handleClick = (action: () => void) => {
    action();
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
          onClick={() => handleClick(onEdit)}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
        >
          <Pencil className="h-4 w-4" />
          <span>Edit subtask</span>
        </button>
        <button
          onClick={() => handleClick(onDuplicate)}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
        >
          <Copy className="h-4 w-4" />
          <span>Duplicate subtask</span>
        </button>
        <button
          onClick={() => handleClick(onDelete)}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete subtask</span>
        </button>
      </div>
    </>
  );
};