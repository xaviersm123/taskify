import React, { useState, useRef, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
// Added Award and X icons for ruler status
import { Plus, MoreVertical, Edit2, Trash2, Award, X } from 'lucide-react';
import { useBoardStore, BoardColumn } from '../../lib/store/board'; // Ensure BoardColumn type is imported
import { Task } from '../../lib/store/task'; // Ensure Task type is imported

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  projectId: string;
  isRuler: boolean;
}

export const Column: React.FC<ColumnProps> = ({
  id,
  title: initialTitle,
  tasks,
  projectId,
  isRuler,
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
  });

  const {
    setNodeRef: setDroppableRef,
    isOver
  } = useDroppable({
    id,
    data: { type: 'column', columnId: id, accepts: ['task'] },
  });

  // --- DEBUGGING: Log the entire store object ---
  const boardStoreStateAndActions = useBoardStore();
  console.log(`[Column ${id} (${initialTitle})] Board Store Object:`, boardStoreStateAndActions);
  // ---------------------------------------------

  // Get actions from the board store (destructure AFTER logging)
  const { updateColumn, deleteColumn, setRulerColumn, removeRulerColumn } = boardStoreStateAndActions;

  // Local component state
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
  const [title, setTitle] = useState(initialTitle);
  const [editedTitle, setEditedTitle] = useState(initialTitle);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Style for the sortable column element
  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || undefined,
    opacity: isDragging ? 0.6 : 1,
    willChange: transform ? 'transform' : undefined,
  };

  // Sort tasks by their position for rendering
  const sortedTasks = [...tasks].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  // --- Handlers ---

  const handleSaveRename = async () => {
    const trimmedTitle = editedTitle.trim();
    if (trimmedTitle && trimmedTitle !== title) {
      try {
        if (typeof updateColumn !== 'function') {
             console.error("updateColumn is not a function!", boardStoreStateAndActions);
             alert("Error saving rename: updateColumn function unavailable.");
             return;
        }
        await updateColumn(id, { name: trimmedTitle });
        setTitle(trimmedTitle);
        setIsRenameModalOpen(false);
      } catch (error) {
        console.error('Failed to update column name:', error);
        alert('Failed to update column name. Please try again.');
        setEditedTitle(title);
      }
    } else {
        setIsRenameModalOpen(false);
    }
  };

  const handleDeleteClick = async () => {
    setIsMenuOpen(false);
    if (window.confirm(`Are you sure you want to delete the column "${title}"? All tasks within it will also be deleted.`)) {
      try {
        if (typeof deleteColumn !== 'function') {
             console.error("deleteColumn is not a function!", boardStoreStateAndActions);
             alert("Error deleting column: deleteColumn function unavailable.");
             return;
        }
        await deleteColumn(id);
      } catch (error) {
        console.error('Failed to delete column:', error);
        alert('Failed to delete column. Please try again.');
      }
    }
  };

  // --- Ruler Handlers ---
  const handleSetRuler = async () => {
      setIsMenuOpen(false);
      if (!window.confirm(`Set "${title}" as the ruler column for this project?\n\nCompleted tasks will automatically move here.`)) return;

      // *** DEBUGGING Check before calling ***
      if (typeof setRulerColumn !== 'function') {
           console.error("handleSetRuler Error: setRulerColumn is not a function!", boardStoreStateAndActions);
           alert("Error: Cannot set ruler column, the function is missing from the store.");
           return; // Stop execution
      }
      // ***********************************

      try {
          console.log(`Calling setRulerColumn for projectId: ${projectId}, columnId: ${id}`);
          await setRulerColumn(projectId, id); // Call the function now we know it exists (or think it does)
          console.log(`Successfully called setRulerColumn (or at least the call didn't throw immediately)`);
          // alert(`"${title}" is now the ruler column.`); // Optional feedback
      } catch (error) {
          // This catch block will now primarily catch errors from *inside* setRulerColumn (like DB errors)
          console.error('Failed inside setRulerColumn call:', error);
          alert(`Failed to set "${title}" as ruler column. Please try again.\nError: ${(error as Error).message}`);
      }
  };

  const handleRemoveRuler = async () => {
      setIsMenuOpen(false);
      if (!window.confirm(`Remove ruler status from "${title}"?\n\nCompleted tasks will no longer automatically move here.`)) return;

       // *** DEBUGGING Check before calling ***
      if (typeof removeRulerColumn !== 'function') {
           console.error("handleRemoveRuler Error: removeRulerColumn is not a function!", boardStoreStateAndActions);
           alert("Error: Cannot remove ruler status, the function is missing from the store.");
           return; // Stop execution
      }
       // ***********************************

      try {
          console.log(`Calling removeRulerColumn for projectId: ${projectId}, columnId: ${id}`);
          await removeRulerColumn(projectId, id);
          console.log(`Successfully called removeRulerColumn`);
          // alert(`"${title}" is no longer the ruler column.`); // Optional feedback
      } catch (error) {
          console.error('Failed inside removeRulerColumn call:', error);
           alert(`Failed to remove ruler status from "${title}". Please try again.\nError: ${(error as Error).message}`);
      }
  };


  // --- Effects ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setTitle(initialTitle);
    if (!isRenameModalOpen) {
        setEditedTitle(initialTitle);
    }
  }, [initialTitle, isRenameModalOpen]);


  // --- Render ---
  return (
    // Outer div
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex-shrink-0 w-[320px] bg-gray-50 rounded-lg flex flex-col h-full shadow-md border relative
                  ${isRuler ? 'border-yellow-400 ring-1 ring-yellow-300 ring-offset-0' : 'border-gray-200'}
                  ${isDragging ? 'z-10 shadow-2xl ring-2 ring-indigo-400 opacity-95' : ''}
                 `}
    >
      {/* Column Header */}
      <div
         {...listeners}
         className={`p-3 flex items-center justify-between border-b shrink-0 rounded-t-lg shadow-sm cursor-grab
                     ${isRuler ? 'bg-yellow-50 border-yellow-300' : 'bg-white border-gray-300'}
                    `}
         aria-label={`Column ${title}${isRuler ? ' (Ruler Column)' : ''}. ${tasks.length} tasks.`}
      >
        {/* Left side */}
        <div className="flex items-center space-x-2 min-w-0">
           {isRuler && (
               <Award className="h-4 w-4 text-yellow-600 flex-shrink-0" title="Ruler Column: Completed tasks move here automatically." />
           )}
           <h3
              className={`font-semibold truncate transition-colors select-none ${isRuler ? 'text-yellow-800' : 'text-gray-800'}`}
              title={title}
            >
              {title}
            </h3>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 select-none ${isRuler ? 'bg-yellow-200 text-yellow-800' : 'bg-gray-200 text-gray-500'}`}>{tasks.length}</span>
        </div>

        {/* Right side: Options Menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(!isMenuOpen); }}
            className={`p-1 rounded-full transition-colors cursor-pointer ${isRuler ? 'text-yellow-700 hover:bg-yellow-100' : 'text-gray-500 hover:text-gray-800 hover:bg-gray-200'} focus:outline-none focus:ring-1 focus:ring-indigo-500`}
            aria-label="Column options"
            title="Column options"
          >
            <MoreVertical className="h-5 w-5" />
          </button>

          {/* Column Options Dropdown */}
          {isMenuOpen && (
            <div
              ref={menuRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 mt-2 w-52 bg-white border border-gray-200 rounded-lg shadow-xl py-1 z-50 cursor-default"
            >
              {/* Rename */}
              <button
                onClick={(e) => { e.stopPropagation(); setEditedTitle(title); setIsRenameModalOpen(true); setIsMenuOpen(false); }}
                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2 transition-colors"
              >
                <Edit2 className="h-4 w-4 text-gray-500" />
                <span>Rename Column</span>
              </button>

              {/* Ruler Options */}
              <div className="my-1 border-t border-gray-100"></div>
              {!isRuler ? (
                   <button
                       onClick={(e) => { e.stopPropagation(); handleSetRuler(); }} // Calls the debugged handler
                       className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-yellow-50 flex items-center space-x-2 transition-colors"
                       title="Set as destination for completed tasks"
                   >
                       <Award className="h-4 w-4 text-yellow-600" />
                       <span>Set as Ruler Column</span>
                   </button>
               ) : (
                   <button
                       onClick={(e) => { e.stopPropagation(); handleRemoveRuler(); }} // Calls the debugged handler
                       className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-red-50 flex items-center space-x-2 transition-colors"
                        title="Disable automatic move of completed tasks here"
                   >
                       <X className="h-4 w-4 text-red-500" />
                       <span>Remove Ruler Status</span>
                   </button>
               )}
               <div className="my-1 border-t border-gray-100"></div>

              {/* Delete */}
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

      {/* Task List Area */}
      <div
        ref={setDroppableRef}
        className={`flex-1 p-3 pt-2 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200
                    ${isOver ? (isRuler ? 'bg-yellow-100' : 'bg-indigo-100') : (isRuler ? 'bg-yellow-50' : 'bg-gray-100')}
                    transition-colors duration-150 ease-in-out
                   `}
         style={{ maxHeight: 'calc(80vh - 200px)' }}
      >
        <SortableContext items={sortedTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <TaskCard key={task.id} task={task} columnId={id} />
          ))}
          {sortedTasks.length === 0 && !isOver && (
             <div className={`text-center text-sm py-6 border-2 border-dashed rounded-md select-none ${isRuler ? 'border-yellow-300 text-yellow-600' : 'border-gray-300 text-gray-400'}`}>
                 {isRuler ? 'Completed tasks move here' : 'Drop tasks here'}
             </div>
          )}
           {isOver && (
               <div className="absolute inset-0 bg-indigo-200 bg-opacity-50 rounded-lg border-2 border-dashed border-indigo-400 pointer-events-none"></div>
           )}
        </SortableContext>
      </div>

      {/* Add Task Button Area */}
      <div className={`p-3 border-t shrink-0 rounded-b-lg ${isRuler ? 'bg-yellow-50 border-yellow-300' : 'bg-gray-50 border-gray-300'}`}>
        <button
          onClick={() => setIsCreateDialogOpen(true)}
          className="w-full p-2 flex items-center justify-center text-sm text-indigo-700 font-medium hover:bg-indigo-100 rounded-md transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add task
        </button>
      </div>

      {/* Dialogs */}
      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        projectId={projectId}
        status={isRuler ? 'complete' : getStatusFromColumnName(title)}
        columnId={id}
      />

      {/* Rename Modal */}
      {isRenameModalOpen && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-60 z-[60]" onClick={() => setIsRenameModalOpen(false)}>
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
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
               <button onClick={() => setIsRenameModalOpen(false)} type="button" className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">Cancel</button>
               <button onClick={handleSaveRename} type="button" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors">Save Changes</button>
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