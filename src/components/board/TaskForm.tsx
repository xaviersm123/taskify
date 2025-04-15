import React, { useState, useMemo, useEffect } from 'react';
import { Calendar, User, Users } from 'lucide-react'; // Added Users icon
import Select, { MultiValue, StylesConfig } from 'react-select'; // Import react-select
import { useUserStore } from '../../lib/store/user'; // Assuming User type is exported or available
import { User as UserType } from '../../lib/store/user'; // Import User type if needed
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { formatUserDisplay } from '../../lib/utils/user-display'; // Import the utility

// Update TaskFormData to include collaborators
export interface TaskFormData {
    title: string;
    description?: string;
    due_date?: string | null; // Allow null for clearing date
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    assignee_id?: string | null; // Allow null/undefined
    collaborator_ids?: string[]; // Array of user IDs
    // Include status/column if they are managed here (from CreateTaskDialog initialData)
    status?: string;
    column_id?: string;
}

interface TaskFormProps {
    // Use a more specific initial data type if needed, matching Task or TaskFormData
    initialData?: Partial<TaskFormData>; // Renamed from defaultValues for clarity
    onSubmit: (data: TaskFormData) => void;
    onCancel?: () => void;
    isSubmitting?: boolean;
    // Pass project ID if needed for context (e.g., filtering users)
    // projectId?: string;
}

// Define the shape for react-select options
interface UserOption {
    value: string;
    label: string;
}

// Custom styles for react-select (optional, for better integration with Tailwind)
const selectStyles: StylesConfig<UserOption, true> = {
    control: (provided) => ({
        ...provided,
        borderColor: '#d1d5db', // gray-300
        boxShadow: 'none',
        '&:hover': {
            borderColor: '#a5b4fc', // indigo-300
        },
        minHeight: '38px', // Match Tailwind input height
    }),
    valueContainer: (provided) => ({
        ...provided,
        padding: '0 8px',
    }),
     multiValue: (provided) => ({
         ...provided,
         backgroundColor: '#e0e7ff', // indigo-100
     }),
     multiValueLabel: (provided) => ({
         ...provided,
         color: '#3730a3', // indigo-800
     }),
     multiValueRemove: (provided) => ({
         ...provided,
         color: '#4338ca', // indigo-700
         '&:hover': {
             backgroundColor: '#c7d2fe', // indigo-200
             color: '#312e81', // indigo-900
         },
     }),
    input: (provided) => ({
        ...provided,
        margin: '0px',
        padding: '0px',
    }),
     indicatorsContainer: (provided) => ({
         ...provided,
         height: '38px',
     }),
    // Add more style overrides if needed
};


export const TaskForm: React.FC<TaskFormProps> = ({
    initialData,
    onSubmit,
    onCancel,
    isSubmitting
}) => {
    // Initialize state, ensuring collaborators is an empty array if not provided
    const [formData, setFormData] = useState<TaskFormData>({
        title: '',
        priority: 'medium',
        ...initialData, // Spread initial data
        collaborator_ids: initialData?.collaborator_ids || [], // Default to empty array
        due_date: initialData?.due_date || null, // Ensure null if not set
        assignee_id: initialData?.assignee_id || null, // Ensure null if not set
    });

    const { users, fetchUsers } = useUserStore(); // Assuming fetchUsers is available if needed

     // Fetch users on component mount if not already loaded
     useEffect(() => {
         // Check if fetchUsers is defined before calling
         if (users.length === 0 && typeof fetchUsers === 'function') {
             fetchUsers();
         }
     }, [users.length, fetchUsers]);


    const handleSubmitClick = () => {
        // Trim title and description before submitting
        onSubmit({
            ...formData,
            title: formData.title.trim(),
            description: formData.description?.trim()
        });
    };

    // --- Date Picker Handling ---
    const selectedDate = formData.due_date ? new Date(formData.due_date) : null;

    const handleDateChange = (date: Date | null) => {
        setFormData(prev => ({
            ...prev,
            // Format as YYYY-MM-DD string or set to null
            due_date: date ? date.toISOString().split('T')[0] : null
        }));
    };

    // --- Collaborator Select Handling ---
    const userOptions = useMemo(() => {
        return users
            // Filter out the currently selected assignee, if any
            .filter(user => user.id !== formData.assignee_id)
            .map((user: UserType) => ({
                value: user.id,
                // Use the formatting utility for display names
                label: formatUserDisplay(user) || user.email || user.id // Fallback chain
            }));
    }, [users, formData.assignee_id]);

    const selectedCollaboratorOptions = useMemo(() => {
        return userOptions.filter(option => formData.collaborator_ids?.includes(option.value));
    }, [userOptions, formData.collaborator_ids]);

    const handleCollaboratorChange = (selectedOptions: MultiValue<UserOption>) => {
        // Limit to 6 collaborators
        if (selectedOptions && selectedOptions.length > 6) {
            // Optionally show a message or just prevent adding more
            console.warn("Maximum of 6 collaborators allowed.");
            // Prevent setting more than 6 by slicing
            const limitedSelection = selectedOptions.slice(0, 6);
             setFormData(prev => ({
                 ...prev,
                 collaborator_ids: limitedSelection.map(option => option.value)
             }));
            return;
        }

        setFormData(prev => ({
            ...prev,
            collaborator_ids: selectedOptions ? selectedOptions.map(option => option.value) : []
        }));
    };

    // Update available collaborator options when assignee changes
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            collaborator_ids: prev.collaborator_ids?.filter(id => id !== prev.assignee_id) || []
        }));
    }, [formData.assignee_id]);


    return (
        <form onSubmit={(e) => { e.preventDefault(); handleSubmitClick(); }} className="space-y-4">
            {/* Title */}
            <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                    Title <span className="text-red-500">*</span>
                </label>
                <input
                    id="title"
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    required
                    disabled={isSubmitting}
                    aria-required="true"
                />
            </div>

            {/* Description */}
            <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                </label>
                <textarea
                    id="description"
                    value={formData.description || ''}
                    onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={isSubmitting}
                />
            </div>

            {/* Priority */}
            <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                    Priority
                </label>
                <select
                    id="priority"
                    value={formData.priority}
                    onChange={e => setFormData(prev => ({ ...prev, priority: e.target.value as TaskFormData['priority'] }))}
                    className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    disabled={isSubmitting}
                >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                </select>
            </div>

            {/* Assignee */}
            <div>
                 <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1">
                     Assignee
                 </label>
                 <div className="mt-1 relative rounded-md shadow-sm">
                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                         <User className="h-4 w-4 text-gray-400" aria-hidden="true" />
                     </div>
                     <select
                        id="assignee"
                        value={formData.assignee_id || ''} // Controlled component needs a stable value like '' for none
                        onChange={e => setFormData(prev => ({ ...prev, assignee_id: e.target.value || null }))} // Set to null if '' selected
                        className="block w-full pl-9 pr-8 py-2 rounded-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        disabled={isSubmitting}
                    >
                        <option value="">Unassigned</option>
                        {users.map(user => (
                             <option key={user.id} value={user.id}>
                                {formatUserDisplay(user) || user.email} {/* Use formatted name */}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

             {/* Collaborators */}
             <div>
                 <label htmlFor="collaborators" className="block text-sm font-medium text-gray-700 mb-1">
                     Collaborators (Max 6)
                 </label>
                 <div className="mt-1 relative">
                     {/* Add icon */}
                      <Users className="absolute left-3 top-[11px] h-4 w-4 text-gray-400 z-10" />
                     <Select<UserOption, true> // Explicitly type Select for multi-select
                         inputId="collaborators"
                         isMulti
                         options={userOptions}
                         value={selectedCollaboratorOptions}
                         onChange={handleCollaboratorChange}
                         isDisabled={isSubmitting || users.length === 0} // Disable if users are not loaded
                         placeholder={users.length === 0 ? "Loading users..." : "Select collaborators..."}
                         closeMenuOnSelect={false} // Keep menu open after selection for multi
                         styles={selectStyles} // Apply custom styles
                         className="react-select-container pl-9" // Add padding-left for icon
                         classNamePrefix="react-select" // Prefix for internal elements styling
                         // Disable adding more options if limit reached (more robust than disabling the whole component)
                         isOptionDisabled={() => (formData.collaborator_ids?.length ?? 0) >= 6}
                         noOptionsMessage={() => users.length === 0 ? 'Loading users...' : (formData.assignee_id ? 'No other users available' : 'Assignee must be selected first? (Optional check)')} // Adjust message based on context
                         aria-label="Select collaborators"
                     />
                     {/* Optional: Show warning message below if limit is exceeded */}
                     {/* {formData.collaborator_ids && formData.collaborator_ids.length > 6 && (
                        <p className="mt-1 text-xs text-red-600">Maximum 6 collaborators allowed.</p>
                     )} */}
                 </div>
             </div>


            {/* Due Date */}
            <div>
                <label htmlFor="due_date" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                </label>
                 <div className="mt-1 relative rounded-md shadow-sm">
                     <DatePicker
                        id="due_date"
                        selected={selectedDate}
                        onChange={handleDateChange}
                        className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm pr-10 py-2" // Adjusted padding
                        dateFormat="yyyy-MM-dd"
                        placeholderText="Select a date"
                        isClearable // Allow clearing the date
                        disabled={isSubmitting}
                    />
                    {/* Position Calendar icon using absolute positioning */}
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                         <Calendar className="h-4 w-4 text-gray-400" aria-hidden="true" />
                    </div>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3 pt-4">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isSubmitting}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit" // Change to type="submit" to work with the form onSubmit
                    disabled={isSubmitting || !formData.title.trim()} // Disable if title is empty
                    className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                >
                    {isSubmitting ? 'Saving...' : 'Save Task'}
                </button>
            </div>
        </form>
    );
};