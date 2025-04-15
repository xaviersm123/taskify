// src/components/tasks/SubtaskList.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Plus, Edit2, Copy, Trash2 } from 'lucide-react'; // Import icons needed for menu
import { useTaskStore } from '../../lib/store/task';
import { Subtask } from '../../lib/store/task/types';
import { SubtaskForm } from './SubtaskForm';
import { SubtaskItem } from './SubtaskItem';
import { createClient } from '@supabase/supabase-js';

// Supabase client initialization (keep as is or move to dedicated file)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Interface for context menu state
interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  subtaskId: string | null;
}

interface SubtaskListProps {
  taskId: string;
  subtasks: Subtask[];
  onUpdate: () => void;
  currentUserId: string;
}

export const SubtaskList: React.FC<SubtaskListProps> = ({ taskId, subtasks, onUpdate, currentUserId }) => {
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const { addSubtask, updateSubtask, toggleSubtask, deleteSubtask } = useTaskStore();

  // --- Context Menu State ---
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    subtaskId: null,
  });
  const contextMenuRef = useRef<HTMLDivElement>(null);
  // ---------------------------

  // --- Context Menu Handlers ---
  const handleContextMenuRequest = useCallback((event: React.MouseEvent, subtaskId: string) => {
    event.preventDefault();
    setContextMenu({
      visible: true,
      x: event.clientX,
      y: event.clientY,
      subtaskId: subtaskId,
    });
    // Ensure adding/editing forms are closed when context menu opens
    setIsAddingSubtask(false);
    setEditingSubtask(null);
  }, []); // No dependencies needed here

  const closeContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, visible: false, subtaskId: null }));
  }, []);

  // Close context menu on outside click or scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (contextMenu.visible && contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
        closeContextMenu();
      }
    };
    const handleScroll = () => {
        if (contextMenu.visible) {
            closeContextMenu();
        }
    };

    if (contextMenu.visible) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('scroll', handleScroll, true); // Listen on capture phase for scroll
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [contextMenu.visible, closeContextMenu]);
  // ---------------------------

  // --- Activity Logging (keep as is) ---
  const logActivity = async (eventType: 'INSERT' | 'UPDATE' | 'DELETE', recordId: string, payload: any) => {
    // ... (your existing logActivity function)
     try {
       const logEntry = {
         event_type: eventType,
         table_name: 'subtasks',
         record_id: recordId, // Use taskId (ticket_id) as record_id
         payload: JSON.stringify(payload),
         created_by: currentUserId, // Use the passed currentUserId for authenticated logging
       };

       const { error } = await supabase
         .from('activity_log')
         .insert([logEntry]);

       if (error) {
         console.error('Failed to log activity:', error);
       } else {
         // console.log('Activity logged successfully:', logEntry); // Optional: reduce console noise
       }
     } catch (error) {
       console.error('Error logging activity:', error);
     }
  };

  // --- CRUD Handlers (keep mostly as is, ensure they close context menu if needed) ---
  const handleAddSubtask = async (data: { title: string; assignee_id?: string; due_date?: string; }) => {
    closeContextMenu(); // Close menu if open
    try {
      // Find a way to get the newly created subtask ID if needed for more precise logging
      // For now, using parent taskId as record_id as before
      await addSubtask(taskId, data);
      logActivity('INSERT', taskId, { ...data, parent_task_id: taskId }); // Log with parent task ID
      setIsAddingSubtask(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  };

  const handleUpdateSubtask = async (subtask: Subtask, data: Partial<Subtask>) => {
    closeContextMenu(); // Close menu if open
    try {
      // Ensure parent task ID (ticket_id) is included if your store/API requires it
      const updatePayload = { ...data, ticket_id: subtask.ticket_id || taskId };
      await updateSubtask(subtask.id, updatePayload);
      logActivity('UPDATE', subtask.id, { ...subtask, ...updatePayload }); // Log with subtask ID
      setEditingSubtask(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to update subtask:', error);
    }
  };

  const handleDuplicateSubtask = async (subtask: Subtask) => {
    closeContextMenu(); // Close menu if open
    try {
      // Exclude fields that shouldn't be copied
      const { id, created_at, completed, completed_at, status, ...subtaskDataToCopy } = subtask;
      const dataToInsert = {
          ...subtaskDataToCopy,
          title: `${subtask.title} (Copy)`, // Add copy suffix
          ticket_id: subtask.ticket_id || taskId, // Ensure parent ID
      };
      await addSubtask(taskId, dataToInsert); // Assuming addSubtask handles parent ID correctly
      logActivity('INSERT', taskId, dataToInsert); // Log with parent task ID
      onUpdate();
    } catch (error) {
      console.error('Failed to duplicate subtask:', error);
    }
  };

  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    // Toggling usually doesn't involve the context menu, but close it just in case
    closeContextMenu();
    try {
      await toggleSubtask(subtaskId, completed);
      const subtask = subtasks.find(s => s.id === subtaskId);
      if (subtask) {
        // Log the specific change
        logActivity('UPDATE', subtaskId, { id: subtaskId, completed: completed });
      }
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    }
  };

  const handleDeleteSubtask = async (subtaskId: string) => {
    // This might be called from inline button OR context menu
    if (!window.confirm('Are you sure you want to delete this subtask?')) {
        closeContextMenu(); // Close menu if user cancels confirm dialog
        return;
    }
    closeContextMenu(); // Ensure menu is closed before proceeding
    try {
      const subtask = subtasks.find(s => s.id === subtaskId); // Find before deleting for logging
      await deleteSubtask(subtaskId);
      if (subtask) {
        logActivity('DELETE', subtaskId, subtask); // Log with subtask ID
      }
      onUpdate();
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  };

  // --- Actions triggered from Context Menu ---
  const handleEditFromMenu = () => {
    const subtaskToEdit = subtasks.find(st => st.id === contextMenu.subtaskId);
    if (subtaskToEdit) {
      setEditingSubtask(subtaskToEdit);
      // Note: We're reusing the SubtaskForm for editing
    }
    closeContextMenu();
  };

  const handleDuplicateFromMenu = () => {
      const subtaskToDuplicate = subtasks.find(st => st.id === contextMenu.subtaskId);
      if (subtaskToDuplicate) {
          handleDuplicateSubtask(subtaskToDuplicate); // Reuse existing duplication logic
      }
      // handleDuplicateSubtask already calls closeContextMenu
  };

  const handleDeleteFromMenu = () => {
    if (contextMenu.subtaskId) {
      handleDeleteSubtask(contextMenu.subtaskId); // Reuse existing delete logic
    }
    // handleDeleteSubtask already calls closeContextMenu if confirmed
  };
  // ---------------------------------------

  return (
    <div className="space-y-3 relative"> {/* Added relative for potential positioning needs */}
      {subtasks.map(subtask => (
        <div key={subtask.id}>
          {editingSubtask?.id === subtask.id ? (
            <SubtaskForm
              // Pass initial values for editing
              defaultValues={{
                title: subtask.title,
                assignee_id: subtask.assignee_id,
                due_date: subtask.due_date ? subtask.due_date.split('T')[0] : undefined // Format date for input
              }}
              onSubmit={(data) => handleUpdateSubtask(subtask, data)}
              onCancel={() => setEditingSubtask(null)}
              isEditing={true} // Indicate editing mode to the form if needed
            />
          ) : (
            <SubtaskItem
              subtask={subtask}
              onToggle={(completed) => handleToggleSubtask(subtask.id, completed)}
              onEdit={() => setEditingSubtask(subtask)} // Keep inline edit button functional
              onDuplicate={() => handleDuplicateSubtask(subtask)} // Keep inline duplicate button functional
              onDelete={() => handleDeleteSubtask(subtask.id)} // Keep inline delete button functional
              // --- Pass context menu handler ---
              onContextMenuRequest={handleContextMenuRequest}
              // ---------------------------------
            />
          )}
        </div>
      ))}

      {/* Add Subtask Form/Button */}
      {isAddingSubtask ? (
        <SubtaskForm
          onSubmit={(data) => handleAddSubtask(data)}
          onCancel={() => setIsAddingSubtask(false)}
        />
      ) : (
        <button
          onClick={() => {
              closeContextMenu(); // Close menu if open before showing add form
              setEditingSubtask(null); // Ensure edit form is closed
              setIsAddingSubtask(true);
          }}
          className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 ml-2 mt-1" // Adjusted style/position slightly
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Subtask
        </button>
      )}

      {/* Context Menu */}
      {contextMenu.visible && contextMenu.subtaskId && (
        <div
          ref={contextMenuRef}
          className="absolute z-20 w-40 bg-white rounded-md shadow-lg border border-gray-200 py-1 text-sm"
          style={{ top: `${contextMenu.y}px`, left: `${contextMenu.x}px` }}
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside closing the menu immediately
        >
          <button
            onClick={handleEditFromMenu}
            className="w-full text-left px-3 py-1.5 hover:bg-gray-100 rounded flex items-center space-x-2 text-gray-700"
          >
            <Edit2 size={14} className="text-gray-500" />
            <span>Edit</span>
          </button>
           <button
             onClick={handleDuplicateFromMenu}
             className="w-full text-left px-3 py-1.5 hover:bg-gray-100 rounded flex items-center space-x-2 text-gray-700"
           >
             <Copy size={14} className="text-gray-500" />
             <span>Duplicate</span>
           </button>
          <div className="my-1 h-px bg-gray-100"></div> {/* Separator */}
          <button
            onClick={handleDeleteFromMenu}
            className="w-full text-left px-3 py-1.5 hover:bg-red-50 rounded flex items-center space-x-2 text-red-600 hover:text-red-700"
          >
            <Trash2 size={14} />
            <span>Delete</span>
          </button>
        </div>
      )}
    </div>
  );
};