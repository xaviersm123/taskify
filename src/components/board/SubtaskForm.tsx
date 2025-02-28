import React, { useState } from 'react';
import { useUserStore } from '../../lib/store/user';
import { formatUserDisplay } from '../../lib/utils/user-display';
import { Calendar, User, X, Check } from 'lucide-react';

interface SubtaskFormData {
  /**
   * Title of the subtask
   */
  title: string;
  
  /**
   * ID of the user assigned to the subtask (optional)
   */
  assignee_id?: string;
  
  /**
   * Due date of the subtask (optional)
   */
  due_date?: string;
}

interface SubtaskFormProps {
  /**
   * Default values for the form fields (optional)
   */
  defaultValues?: SubtaskFormData;
  
  /**
   * Callback function to handle form submission
   */
  onSubmit: (data: SubtaskFormData) => void;
  
  /**
   * Callback function to handle form cancellation (optional)
   */
  onCancel?: () => void;
}

/**
 * SubtaskForm Component
 * Provides a form interface for creating or editing a subtask
 */
export const SubtaskForm: React.FC<SubtaskFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel
}) => {
  // State to manage form data
  const [formData, setFormData] = useState<SubtaskFormData>(defaultValues || {
    title: '',
  });
  
  // Extract users from the user store
  const { users } = useUserStore();

  /**
   * Handle form submission
   * 
   * @param e - Form submission event
   */
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Ensure the title is not empty
    if (!formData.title.trim()) return;
    
    // Call the onSubmit callback with the form data
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="flex items-center space-x-2">
        {/* Input field for the subtask title */}
        <input
          type="text"
          value={formData.title}
          onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
          placeholder="Add subtask..."
          className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          autoFocus
        />
        
        {/* Submit button */}
        <button
          type="submit"
          className="p-1 text-green-600 hover:text-green-700 rounded"
        >
          <Check className="h-4 w-4" />
        </button>
        
        {/* Cancel button (if onCancel is provided) */}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1 text-red-600 hover:text-red-700 rounded"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex items-center space-x-4 text-sm">
        <div className="flex items-center space-x-2">
          {/* Dropdown for selecting the assignee */}
          <User className="h-4 w-4 text-gray-400" />
          <select
            value={formData.assignee_id || ''}
            onChange={e => setFormData(prev => ({ ...prev, assignee_id: e.target.value || undefined }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
          >
            <option value="">Unassigned</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {formatUserDisplay(user)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center space-x-2">
          {/* Input field for selecting the due date */}
          <Calendar className="h-4 w-4 text-gray-400" />
          <input
            type="date"
            value={formData.due_date || ''}
            onChange={e => setFormData(prev => ({ ...prev, due_date: e.target.value || undefined }))}
            className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 text-sm"
          />
        </div>
      </div>
    </form>
  );
};