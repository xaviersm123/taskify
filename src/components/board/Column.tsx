import React, { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { useBoardStore } from '../../lib/store/board';
import { Task } from '../../lib/store/task';

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  projectId: string;
  totalColumns: number;
  position: number;
}

export const Column: React.FC<ColumnProps> = ({
  id,
  title: initialTitle,
  tasks,
  projectId,
  totalColumns,
  position,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    data: { type: 'column', columnId: id },
    animateLayoutChanges: () => false,
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id,
    data: { type: 'column', columnId: id, accepts: ['task'] },
  });

  const { updateColumn, deleteColumn } = useBoardStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [editedTitle, setEditedTitle] = useState(title);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: isDragging ? transition : 'none',
    opacity: isDragging ? 0.5 : 1,
  };

  // Sort tasks by position
  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);

  const handleSave = async () => {
    if (editedTitle.trim() && editedTitle !== title) {
      try {
        await updateColumn(id, { name: editedTitle.trim() });
        setTitle(editedTitle.trim());
      } catch (error) {
        console.error('Failed to update column name:', error);
        alert('Failed to update column name. Please try again.');
        return;
      }
    }
    setIsRenameModalOpen(false);
  };

  const handleDeleteColumn = async () => {
    try {
      await deleteColumn(id);
    } catch (error) {
      console.error('Failed to delete column:', error);
      alert('Failed to delete column. Please try again.');
    }
    setIsMenuOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    setTitle(initialTitle);
    setEditedTitle(initialTitle);
  }, [initialTitle]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex-shrink-0 w-[320px] bg-gray-50 rounded-lg flex flex-col h-full"
    >
      <div className="p-3 flex items-center justify-between border-b border-gray-200 shrink-0">
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <h3
              {...attributes}
              {...listeners}
              className="font-medium text-gray-900 cursor-grab hover:text-gray-600"
              aria-label={`Drag column ${title}`}
            >
              {title}
            </h3>
            <span className="text-gray-500 text-sm">{tasks.length}</span>
          </div>
        </div>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsMenuOpen(!isMenuOpen);
            }}
            className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none"
            aria-label="Column options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-10"
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditedTitle(title);
                  setIsRenameModalOpen(true);
                  setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
              >
                <Edit2 className="h-4 w-4" />
                <span>Rename Column</span>
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (
                    window.confirm(
                      'Are you sure you want to delete this column? All tasks in this column will also be deleted.'
                    )
                  ) {
                    handleDeleteColumn();
                  }
                }}
                className="w-full px-4 py-2 text-left text-red-600 hover:bg-red-100 flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete Column</span>
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        ref={setDroppableRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 max-h-[calc(100vh-400px)]"
      >
        <SortableContext items={sortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} columnId={id} />
          ))}
        </SortableContext>
      </div>

      <div className="p-2 shrink-0">
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="w-full p-2 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add task
        </button>
      </div>

      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        projectId={projectId}
        status={getStatusFromColumnName(title)}
        columnId={id}
      />

      {isRenameModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Rename Column</h2>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') setIsRenameModalOpen(false);
              }}
            />
            <div className="flex justify-end space-x-2">
              <button
                onClick={() => setIsRenameModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

function getStatusFromColumnName(name: string): 'todo' | 'in_progress' | 'complete' {
  const normalized = name.toLowerCase();
  if (normalized.includes('progress')) return 'in_progress';
  if (normalized.includes('complete') || normalized.includes('done')) return 'complete';
  return 'todo';
}