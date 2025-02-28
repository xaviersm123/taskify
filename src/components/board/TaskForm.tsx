import React from 'react';
import { Calendar, User } from 'lucide-react';
import { useUserStore } from '../../lib/store/user';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

export interface TaskFormData {
  title: string;
  description?: string;
  due_date?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  assignee_id?: string;
}

interface TaskFormProps {
  defaultValues?: TaskFormData;
  onSubmit: (data: TaskFormData) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export const TaskForm: React.FC<TaskFormProps> = ({
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting
}) => {
  const [formData, setFormData] = React.useState<TaskFormData>(defaultValues || {
    title: '',
    priority: 'medium'
  });
  const { users } = useUserStore();

  const handleSubmitClick = () => {
    onSubmit(formData);
  };

  // Convert string to Date object for DatePicker, and back to string for formData
  const selectedDate = formData.due_date ? new Date(formData.due_date) : null;

  const handleDateChange = (date: Date | null) => {
    setFormData(prev => ({
      ...prev,
      due_date: date ? date.toISOString().split('T')[0] : undefined
    }));
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700">
          Title
        </label>
        <input
          type="text"
          value={formData.title}
          onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          required
        />
      </div>

      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <textarea
          value={formData.description || ''}
          onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
          rows={3}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        />
      </div>

      <div>
        <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
          Priority
        </label>
        <select
          value={formData.priority}
          onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as TaskFormData['priority'] }))}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
        >
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="urgent">Urgent</option>
        </select>
      </div>

      <div>
        <label htmlFor="assignee" className="block text-sm font-medium text-gray-700">
          Assignee
        </label>
        <div className="mt-1 relative">
          <select
            value={formData.assignee_id || ''}
            onChange={e => setFormData(prev => ({ ...prev, assignee_id: e.target.value || undefined }))}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Unassigned</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>
                {user.email}
              </option>
            ))}
          </select>
          <User className="absolute right-3 top-2 h-4 w-4 text-gray-400" />
        </div>
      </div>

      <div>
        <label htmlFor="due_date" className="block text-sm font-medium text-gray-700">
          Due Date
        </label>
        <div className="mt-1 relative">
          <DatePicker
            selected={selectedDate}
            onChange={handleDateChange}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            dateFormat="yyyy-MM-dd"
            placeholderText="Select a date"
            disabled={isSubmitting}
          />
          <Calendar className="absolute right-3 top-2 h-4 w-4 text-gray-400 pointer-events-none" />
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmitClick}
          disabled={isSubmitting || !formData.title}
          className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md hover:bg-indigo-700 disabled:opacity-50"
        >
          Save
        </button>
      </div>
    </div>
  );
};