import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTaskStore } from '../../lib/store/task';
import { Subtask } from '../../lib/store/task/types';
import { SubtaskForm } from './SubtaskForm';
import { SubtaskItem } from './SubtaskItem';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (move this to a separate file in a real app, e.g., ./supabase/client.ts)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface SubtaskListProps {
  /**
   * ID of the parent task this subtask list belongs to
   */
  taskId: string;
  
  /**
   * Array of subtasks to display
   */
  subtasks: Subtask[];
  
  /**
   * Callback function to refresh the parent component when subtasks are updated
   */
  onUpdate: () => void;

  /**
   * ID of the current user
   */
  currentUserId: string; // Keep this prop to log the authenticated user
}

/**
 * SubtaskList Component
 * Displays a list of subtasks and provides functionality to add, edit, duplicate, toggle, and delete subtasks
 */
export const SubtaskList: React.FC<SubtaskListProps> = ({ taskId, subtasks, onUpdate, currentUserId }) => {
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [editingSubtask, setEditingSubtask] = useState<Subtask | null>(null);
  const { addSubtask, updateSubtask, toggleSubtask, deleteSubtask } = useTaskStore();

  // Function to log activity to the activity_log table
  const logActivity = async (eventType: 'INSERT' | 'UPDATE' | 'DELETE', recordId: string, payload: any) => {
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
        console.log('Activity logged successfully:', logEntry);
      }
    } catch (error) {
      console.error('Error logging activity:', error);
    }
  };

  /**
   * Handle adding a new subtask
   * 
   * @param data - Data for the new subtask
   */
  const handleAddSubtask = async (data: { 
    title: string; 
    assignee_id?: string; 
    due_date?: string;
  }) => {
    try {
      await addSubtask(taskId, data);
      // Log the INSERT after adding the subtask
      const newSubtask = { title: data.title, assignee_id: data.assignee_id, due_date: data.due_date, ticket_id: taskId };
      logActivity('INSERT', taskId, newSubtask); // Use taskId (ticket_id) as record_id
      setIsAddingSubtask(false);
      onUpdate();
    } catch (error) {
      console.error('Failed to add subtask:', error);
    }
  };

  /**
   * Handle updating an existing subtask
   * 
   * @param subtask - The subtask to update
   * @param data - The updated data for the subtask
   */
  const handleUpdateSubtask = async (subtask: Subtask, data: Partial<Subtask>) => {
    try {
      await updateSubtask(subtask.id, { ...data, ticket_id: taskId });
      // Log the UPDATE after updating the subtask
      logActivity('UPDATE', taskId, { ...subtask, ...data }); // Use taskId (ticket_id) as record_id
      setEditingSubtask(null);
      onUpdate();
    } catch (error) {
      console.error('Failed to update subtask:', error);
    }
  };

  /**
   * Handle duplicating an existing subtask
   * 
   * @param subtask - The subtask to duplicate
   */
  const handleDuplicateSubtask = async (subtask: Subtask) => {
    try {
      const { id, created_at, completed, completed_at, ...subtaskData } = subtask;
      await addSubtask(taskId, subtaskData);
      // Log the INSERT for the duplicated subtask (use taskId as record_id)
      logActivity('INSERT', taskId, subtaskData);
      onUpdate();
    } catch (error) {
      console.error('Failed to duplicate subtask:', error);
    }
  };

  /**
   * Handle toggling the completion status of a subtask
   * 
   * @param subtaskId - ID of the subtask to toggle
   * @param completed - New completion status
   */
  const handleToggleSubtask = async (subtaskId: string, completed: boolean) => {
    try {
      await toggleSubtask(subtaskId, completed);
      // Log the UPDATE after toggling
      const subtask = subtasks.find(s => s.id === subtaskId);
      if (subtask) {
        logActivity('UPDATE', taskId, { ...subtask, completed }); // Use taskId (ticket_id) as record_id
      }
      onUpdate();
    } catch (error) {
      console.error('Failed to toggle subtask:', error);
    }
  };

  /**
   * Handle deleting a subtask
   * 
   * @param subtaskId - ID of the subtask to delete
   */
  const handleDeleteSubtask = async (subtaskId: string) => {
    if (!window.confirm('Are you sure you want to delete this subtask?')) return;
    try {
      await deleteSubtask(subtaskId);
      // Log the DELETE after deleting
      const subtask = subtasks.find(s => s.id === subtaskId); // Corrected to use subtaskId
      if (subtask) {
        logActivity('DELETE', taskId, subtask); // Use taskId (ticket_id) as record_id
      }
      onUpdate();
    } catch (error) {
      console.error('Failed to delete subtask:', error);
    }
  };

  return (
    <div className="space-y-3">
      {subtasks.map(subtask => (
        <div key={subtask.id}>
          {editingSubtask?.id === subtask.id ? (
            <SubtaskForm
              defaultValues={{
                title: subtask.title,
                assignee_id: subtask.assignee_id,
                due_date: subtask.due_date
              }}
              onSubmit={(data) => handleUpdateSubtask(subtask, data)}
              onCancel={() => setEditingSubtask(null)}
            />
          ) : (
            <SubtaskItem
              subtask={subtask}
              onToggle={(completed) => handleToggleSubtask(subtask.id, completed)}
              onEdit={() => setEditingSubtask(subtask)}
              onDuplicate={() => handleDuplicateSubtask(subtask)}
              onDelete={() => handleDeleteSubtask(subtask.id)}
            />
          )}
        </div>
      ))}

      {isAddingSubtask ? (
        <SubtaskForm
          onSubmit={(data) => handleAddSubtask(data)} // Ensure data is passed correctly
          onCancel={() => setIsAddingSubtask(false)}
        />
      ) : (
        <button 
          onClick={() => setIsAddingSubtask(true)}
          className="flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add subtask
        </button>
      )}
    </div>
  );
};