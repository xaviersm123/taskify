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
  // Removed unused props totalColumns, position
}

export const Column: React.FC<ColumnProps> = ({
  id,
  title: initialTitle,
  tasks,
  projectId,
}) => {
  const {
    attributes,
    listeners, // Listeners are provided by useSortable for the drag handle
    setNodeRef, // Ref for the entire sortable element
    transform,
    transition,
    isDragging, // State indicating if this column is being dragged
  } = useSortable({
    id,
    data: { type: 'column', columnId: id },
    // animateLayoutChanges is removed to allow dnd-kit default animations
  });

  const {
    setNodeRef: setDroppableRef, // Ref for the area where tasks can be dropped
    isOver // State indicating if a draggable task is currently over this column
  } = useDroppable({
    id,
    data: { type: 'column', columnId: id, accepts: ['task'] }, // Define what it accepts
  });

  // Zustand store hooks
  const { updateColumn, deleteColumn } = useBoardStore();

  // Local component state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle); // Local title state
  const [editedTitle, setEditedTitle] = useState(initialTitle); // For rename input
  const [isMenuOpen, setIsMenuOpen] = useState(false); // Column options menu
  const menuRef = useRef<HTMLDivElement>(null); // Ref for menu click outside detection

  // Style for the sortable column element
  const style = {
    transform: CSS.Transform.toString(transform), // Apply transform for movement
    transition: transition || undefined, // Use dnd-kit's transition for smooth animation
    opacity: isDragging ? 0.6 : 1, // Make column slightly transparent while dragging
    willChange: transform ? 'transform' : undefined, // Hint browser for smoother animation
  };

  // Sort tasks by their position for rendering within the column
  const sortedTasks = [...tasks].sort((a, b) => a.position - b.position);

  // --- Handlers ---
  const handleSaveRename = async () => {
    const trimmedTitle = editedTitle.trim();
    // Only update if title changed and is not empty
    if (trimmedTitle && trimmedTitle !== title) {
      try {
        await updateColumn(id, { name: trimmedTitle });
        setTitle(trimmedTitle); // Update local state on success
      } catch (error) {
        console.error('Failed to update column name:', error);
        alert('Failed to update column name. Please try again.');
        setEditedTitle(title); // Revert input on failure
        return; // Keep modal open
      }
    }
    setIsRenameModalOpen(false); // Close modal
  };

  const handleDeleteClick = async () => {
    setIsMenuOpen(false); // Close menu first
    if (window.confirm('Are you sure you want to delete this column? All tasks within it will also be deleted.')) {
      try {
        await deleteColumn(id);
        // Component will unmount via parent re-render, no local state update needed
      } catch (error) {
        console.error('Failed to delete column:', error);
        alert('Failed to delete column. Please try again.');
      }
    }
  };

  // --- Effects ---
  // Effect to close the options menu when clicking outside
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

  // Effect to update the local title if the initialTitle prop changes
  useEffect(() => {
    setTitle(initialTitle);
    if (!isRenameModalOpen) { // Only reset edit field if modal is closed
        setEditedTitle(initialTitle);
    }
  }, [initialTitle, isRenameModalOpen]);


  // --- Render ---
  return (
    // Outer div is the sortable element
    <div
      ref={setNodeRef} // Apply sortable ref here
      style={style}
      {...attributes} // Apply sortable attributes here
      className={`flex-shrink-0 w-[320px] bg-gray-100 rounded-lg flex flex-col h-full shadow-md border border-gray-200
                  ${isDragging ? 'z-10 shadow-2xl ring-2 ring-indigo-300' : ''} // Enhanced visual feedback when dragging
                 `}
    >
      {/* Column Header */}
      <div className="p-3 flex items-center justify-between border-b border-gray-300 shrink-0 bg-white rounded-t-lg shadow-sm">
        <div className="flex items-center space-x-2 min-w-0"> {/* min-w-0 allows truncation */}
           {/* Column Title - Acts as the drag handle */}
           <h3
              {...listeners} // Apply drag listeners to the title
              className="font-semibold text-gray-800 truncate cursor-grab hover:text-indigo-600 transition-colors" // Style as draggable
              title={title} // Show full title on hover
              aria-label={`Drag column ${title}`} // Accessibility
            >
              {title}
            </h3>
            {/* Task Count Badge */}
            <span className="text-xs font-medium text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full flex-shrink-0">{tasks.length}</span>
        </div>
        {/* Column Options Menu Trigger */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
            className="p-1 text-gray-500 hover:text-gray-800 focus:outline-none rounded-full hover:bg-gray-200 transition-colors"
            aria-label="Column options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {/* Column Options Dropdown */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50" // High z-index
            >
              <button
                onClick={(e) => {
                  e.stopPropagation(); setEditedTitle(title);
                  setIsRenameModalOpen(true); setIsMenuOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
              >
                <Edit2 className="h-4 w-4 text-gray-500" />
                <span>Rename Column</span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); handleDeleteClick(); }}
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-100 flex items-center space-x-2 transition-colors"
              >
                <Trash2 className="h-4 w-4 text-red-500" />
                <span>Delete Column</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Task List Area (Droppable & Scrollable) */}
      <div
        ref={setDroppableRef} // Apply droppable ref here for tasks
        className={`flex-1 p-3 pt-2 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200
                    ${isOver ? 'bg-indigo-100' : 'bg-gray-100'} {/* Highlight when task dragged over */}
                    transition-colors duration-150 ease-in-out
                   `}
         // Apply max-height using inline style for calculation
         // *** ADJUST `210px` based on your actual combined header/footer height ***
         style={{ maxHeight: 'calc(83vh - 210px)' }}
      >
        {/* Context for sorting tasks vertically within this column */}
        <SortableContext items={sortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} columnId={id} />
          ))}
          {/* Optional: Placeholder when column is empty */}
          {sortedTasks.length === 0 && !isOver && (
             <div className="text-center text-sm text-gray-400 py-6 border-2 border-dashed border-gray-300 rounded-md">
                Drop tasks here
             </div>
          )}
        </SortableContext>
      </div>

      {/* Add Task Button Area */}
      <div className="p-3 border-t border-gray-300 shrink-0 bg-gray-50 rounded-b-lg">
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="w-full p-2 flex items-center justify-center text-sm text-indigo-700 font-medium hover:bg-indigo-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add task
        </button>
      </div>

      {/* Dialogs rendered conditionally */}
      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        projectId={projectId}
        status={getStatusFromColumnName(title)}
        columnId={id}
      />

      {isRenameModalOpen && (
        // Rename Modal (using a portal might be better, but this works)
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-[60]"> {/* High z-index */}
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <h2 className="text-xl font-semibold text-gray-900 mb-5">Rename Column</h2>
            <input
              type="text"
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              className="w-full px-4 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mb-6"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSaveRename();
                if (e.key === 'Escape') setIsRenameModalOpen(false);
              }}
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsRenameModalOpen(false)}
                type="button"
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRename}
                type="button"
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Helper function to determine default task status based on column name
function getStatusFromColumnName(name: string): 'todo' | 'in_progress' | 'complete' {
  const normalized = name.toLowerCase();
  if (normalized.includes('progress')) return 'in_progress';
  if (normalized.includes('complete') || normalized.includes('done')) return 'complete';
  return 'todo'; // Default
}