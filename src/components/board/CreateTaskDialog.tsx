import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useTaskStore } from '../../lib/store/task';
// Correct the import path for TaskForm
import { TaskForm, TaskFormData } from '../board/TaskForm';
import { formatDateForStorage } from '../../lib/utils/date-format';

interface CreateTaskDialogProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    status: 'todo' | 'in_progress' | 'complete';
    columnId: string;
}

export const CreateTaskDialog: React.FC<CreateTaskDialogProps> = ({
    isOpen,
    onClose,
    projectId,
    status,
    columnId,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { createTask } = useTaskStore();

    if (!isOpen) return null;

    const handleSubmit = async (data: TaskFormData) => {
        // Basic validation (TaskForm should handle title requirement visually)
        if (!data.title?.trim()) {
            setError('Title is required.');
            return;
        }
        if ((data.collaborator_ids?.length ?? 0) > 6) {
             setError('Maximum 6 collaborators allowed.');
             return;
        }


        setError(null);
        setIsSubmitting(true);

        try {
            // Create the task object, including collaborators
            await createTask({
                project_id: projectId, // Required by store action definition
                title: data.title.trim(),
                description: data.description?.trim() || null, // Send null if empty/undefined
                status, // from props
                column_id: columnId, // from props
                priority: data.priority || 'medium', // Default if undefined
                assignee_id: data.assignee_id || null, // Send null if empty/undefined
                due_date: data.due_date ? formatDateForStorage(data.due_date) : null, // Format date or send null
                // Pass collaborator IDs from the form data
                collaborator_ids: data.collaborator_ids || [], // Send empty array if undefined/null
            });

            onClose(); // Close dialog on successful creation
        } catch (err: any) {
            console.error('Failed to create task:', err);
            // Display a user-friendly error message
            const message = err.response?.data?.message || err.message || 'An unexpected error occurred while creating the task.';
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
             {/* Modal positioning container */}
             <div className="flex min-h-screen items-start justify-center p-4 pt-10 pb-20 text-center sm:items-center sm:p-0">
                {/* Backdrop */}
                <div
                    className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
                    onClick={!isSubmitting ? onClose : undefined} // Prevent closing while submitting
                    aria-hidden="true"
                />

                 {/* Modal Panel */}
                <div className="relative bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
                    <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                        <div className="sm:flex sm:items-start">
                            {/* Optional Icon */}
                            {/* <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-indigo-100 sm:mx-0 sm:h-10 sm:w-10">
                                <ClipboardList className="h-6 w-6 text-indigo-600" aria-hidden="true" />
                            </div> */}
                             <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                <h3 className="text-lg font-medium leading-6 text-gray-900" id="modal-title">
                                    Create New Task
                                </h3>
                                {/* Error Message Area */}
                                {error && (
                                    <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                                        <p className="text-sm text-red-700">{error}</p>
                                    </div>
                                )}
                                 {/* Task Form Integration */}
                                <div className="mt-4">
                                    <TaskForm
                                         // Pass initial status/column, TaskForm needs to handle these if they affect display/logic within it
                                         initialData={{ status, column_id: columnId }}
                                         onSubmit={handleSubmit}
                                         onCancel={!isSubmitting ? onClose : undefined}
                                         isSubmitting={isSubmitting}
                                     />
                                 </div>
                             </div>
                        </div>
                    </div>
                     {/* Buttons are now inside TaskForm */}
                     {/* Close button (optional top right absolute) */}
                    <button
                        type="button"
                        onClick={!isSubmitting ? onClose : undefined}
                        disabled={isSubmitting}
                        className="absolute top-0 right-0 mt-4 mr-4 p-1 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                    >
                        <span className="sr-only">Close</span>
                        <X className="h-5 w-5" />
                    </button>
                </div> {/* End Modal Panel */}
            </div> {/* End Modal positioning container */}
        </div> // End Fixed inset container
    );
};