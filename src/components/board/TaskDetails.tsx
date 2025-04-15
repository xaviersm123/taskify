import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
// Added Users icon for Collaborators
import { Calendar, User, Users, Folder, AlertTriangle, Edit2, Check, X, Plus } from 'lucide-react';
import ReactLinkify from 'react-linkify';
import Select, { MultiValue } from 'react-select'; // Import react-select
// Ensure Task type includes collaborator_ids (updated in types.ts)
import { useTaskStore, Task } from '../../lib/store/task';
import { useUserStore, User as UserType } from '../../lib/store/user';
import { useProjectStore, Project } from '../../lib/store/project';
import { useBoardStore, Column } from '../../lib/store/board';
import { SubtaskList, Subtask } from './SubtaskList';
import { CommentList } from './CommentList';
import { TaskDetailsHeader } from './TaskDetails/TaskDetailsHeader';
import { useTaskUpdates } from '../../hooks/useTaskUpdates';
import { formatUserDisplay } from '../../lib/utils/user-display';
import { UserAvatar } from '../common/UserAvatar';
import { useAuthStore } from '../../lib/store/auth';
import { ActivityLogList } from '../tasks/ActivityLogList';
// Assuming TaskComment and TaskCustomField types are correctly defined/imported
import { TaskComment } from '../../lib/store/task/types';
import { TaskCustomField } from '../../lib/store/task/types'; // Assuming TaskCustomField type exists and is correct
// Import the shared styles and types
import { selectStyles, UserOption } from '../common/reactSelectStyles';

interface TaskDetailsProps {
    taskId: string;
    isOpen: boolean;
    onClose: () => void;
}

// Ensure TaskWithCustomFields uses the updated Task type
interface TaskWithCustomFields extends Task {
    customFields: TaskCustomField[];
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({
    taskId,
    isOpen,
    onClose,
}) => {
    const navigate = useNavigate();
    const [task, setTask] = useState<TaskWithCustomFields | null>(null);
    const [subtasks, setSubtasks] = useState<Subtask[]>([]);
    const [comments, setComments] = useState<TaskComment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showActivityLogs, setShowActivityLogs] = useState(false);
    const [isEditingDescription, setIsEditingDescription] = useState(false);
    const [editedDescription, setEditedDescription] = useState('');
    // State for collaborator editing
    const [isEditingCollaborators, setIsEditingCollaborators] = useState(false);
    const [selectedCollaboratorOptions, setSelectedCollaboratorOptions] = useState<MultiValue<UserOption>>([]);


    const { fetchTaskDetails, updateTask, deleteTask, updateTaskCustomField } = useTaskStore();
    const { users, fetchUsers } = useUserStore();
    const { projects, fetchProjects } = useProjectStore();
    const { columns } = useBoardStore();
    const { user } = useAuthStore();
    const currentUserId = user?.id;

    // Helper to generate options and set state for the selector (used in load and cancel)
    const updateCollaboratorSelectorState = useCallback((collaboratorIds: string[], assigneeId?: string | null) => {
        if (!users || users.length === 0) {
             setSelectedCollaboratorOptions([]); // Reset if users aren't loaded
             return;
         }
        const availableOptions = users
            .filter(user => user.id !== assigneeId) // Exclude assignee
            .map(user => ({
                value: user.id,
                label: formatUserDisplay(user) || user.email || user.id,
            }));
        const currentSelections = availableOptions.filter(opt => collaboratorIds.includes(opt.value));
        setSelectedCollaboratorOptions(currentSelections);
    }, [users]); // Dependency is users array

    const loadTaskDetails = useCallback(async () => {
        if (!taskId) return;
        try {
            setLoading(true);
            const details = await fetchTaskDetails(taskId);
            console.log('Fetched task details:', details);
            // Ensure customFields and collaborator_ids are initialized correctly
            const taskData = {
                ...details.task,
                customFields: details.customFields || [],
                collaborator_ids: details.task.collaborator_ids || [] // Default collaborators to empty array
            };
            setTask(taskData);
            setEditedDescription(taskData.description || '');
            setSubtasks(details.subtasks || []);
            setComments(details.comments || []);
            // Initialize collaborator selector state when task loads
             updateCollaboratorSelectorState(taskData.collaborator_ids || [], taskData.assignee_id);
             setIsEditingCollaborators(false); // Reset edit mode on load
            console.log('Updated task state:', taskData);
        } catch (error) {
            console.error('Failed to load task details:', error);
            // Handle error state if needed (e.g., show message, redirect)
            setTask(null); // Clear task on error
        } finally {
            setLoading(false);
        }
    }, [taskId, fetchTaskDetails, updateCollaboratorSelectorState]); // Use the memoized helper


    const { handleFieldUpdate } = useTaskUpdates({
        task,
        setTask: setTask as React.Dispatch<React.SetStateAction<Task | null>>, // Adjust type if necessary
        updateTask,
        onError: loadTaskDetails, // Reload task details on error during update
    });

    useEffect(() => {
        if (isOpen && taskId) {
            // Fetch users only if needed
            if (users.length === 0 && typeof fetchUsers === 'function') {
                fetchUsers();
            }
            // Fetch projects only if needed
             if (projects.length === 0 && typeof fetchProjects === 'function') {
                fetchProjects();
             }
            loadTaskDetails();
        } else {
            // Reset state when closed or taskId changes
            setTask(null);
            setSubtasks([]);
            setComments([]);
            setLoading(true);
            setIsEditingDescription(false);
            setEditedDescription('');
            setIsEditingCollaborators(false);
            setSelectedCollaboratorOptions([]);
        }
    }, [isOpen, taskId, loadTaskDetails, fetchUsers, fetchProjects, users.length, projects.length]); // Added lengths to deps

    // Update collaborator selector options ONLY when task data changes relevantly, or users list changes
    // This prevents resetting the selector state unnecessarily while editing
     useEffect(() => {
         if (task && users.length > 0 && !isEditingCollaborators) { // Only update if not editing
             updateCollaboratorSelectorState(task.collaborator_ids || [], task.assignée_id);
         }
     }, [task?.collaborator_ids, task?.assignée_id, users, isEditingCollaborators, updateCollaboratorSelectorState]);


    const handleMarkComplete = async () => {
        if (!task) return;
        const newStatus = task.status === 'complete' ? 'todo' : 'complete';
        try {
            // Use handleFieldUpdate for status change
            await handleFieldUpdate({ status: newStatus });
             // No need to call loadTaskDetails if handleFieldUpdate updates state correctly
            // await loadTaskDetails();
        } catch (error) {
            console.error('Failed to update task status:', error);
        }
    };

    const handleDeleteTask = async () => {
        if (!task || !window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await deleteTask(taskId);
            onClose();
            navigate(`/projects/${task.project_id}`); // Navigate back to the project board
        } catch (error) {
            console.error('Failed to delete task:', error);
             // Optionally show an error message
        }
    };

    const handleCustomFieldChange = async (fieldId: string, value: string) => {
        if (!task) return;
        try {
            // Optimistically update UI before saving
             setTask(prevTask => prevTask ? ({
                ...prevTask,
                customFields: prevTask.customFields.map((f) =>
                    f.field_id === fieldId ? { ...f, value: value } : f
                ),
            }) : null);
             // Now save
            await updateTaskCustomField(taskId, fieldId, value);
            // await loadTaskDetails(); // Reload can cause flicker, maybe remove if optimistic update is enough
        } catch (error) {
            console.error('Failed to update custom field:', error);
            loadTaskDetails(); // Reload on error to revert optimistic update
        }
    };

    // --- Description Edit Handlers ---
    const handleSaveDescription = async () => {
        if (!task || editedDescription === task.description) {
            setIsEditingDescription(false);
            return;
        }
        try {
            await handleFieldUpdate({ description: editedDescription });
            setIsEditingDescription(false);
        } catch (error) {
            console.error('Failed to save description:', error);
        }
    };

    const handleCancelDescriptionEdit = () => {
        if (!task) return;
        setEditedDescription(task.description || '');
        setIsEditingDescription(false);
    };

    // --- Collaborator Edit Handlers ---
    const handleCollaboratorSelectionChange = (selected: MultiValue<UserOption>) => {
        // Enforce limit immediately in the selector state
        const limitedSelection = selected.length > 6 ? selected.slice(0, 6) : selected;
        setSelectedCollaboratorOptions(limitedSelection);
    };

    const handleSaveCollaborators = async () => {
        if (!task) return;
        const newCollaboratorIds = selectedCollaboratorOptions.map(opt => opt.value);
        // Check if collaborators actually changed
        const currentIds = task.collaborator_ids || [];
        // Sort arrays before comparing to ensure order doesn't matter
        const changed = JSON.stringify(newCollaboratorIds.slice().sort()) !== JSON.stringify(currentIds.slice().sort());


        if (!changed) {
            setIsEditingCollaborators(false);
            return;
        }

        try {
             // Use handleFieldUpdate to save
            await handleFieldUpdate({ collaborator_ids: newCollaboratorIds });
            setIsEditingCollaborators(false);
             // loadTaskDetails should be called by handleFieldUpdate's success/error handling if needed
        } catch (error) {
            console.error('Failed to save collaborators:', error);
             // Optionally show error message
             // Revert selector state on error
              updateCollaboratorSelectorState(task.collaborator_ids || [], task.assignée_id);
              setIsEditingCollaborators(false); // Exit edit mode on error too
        }
    };

    const handleCancelCollaboratorEdit = () => {
         if (!task) return;
         // Reset selector state to match the actual task state using the helper
         updateCollaboratorSelectorState(task.collaborator_ids || [], task.assignee_id);
         setIsEditingCollaborators(false);
    };

    // Memoize user options for the collaborator selector
    const collaboratorOptions = useMemo(() => {
        return users
            .filter(user => user.id !== task?.assignee_id) // Exclude current assignee
            .map(user => ({
                value: user.id,
                label: formatUserDisplay(user) || user.email || user.id,
            }));
    }, [users, task?.assignee_id]);


    // Link decorator for react-linkify
    const linkDecorator = (href: string, text: string, key: number) => (
        <a href={href} key={key} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
            {text}
        </a>
    );

    if (!isOpen) return null;

    const currentProject = projects.find((p: Project) => p.id === task?.project_id);
    const currentColumn = columns.find((col: Column) => col.id === task?.column_id);

    // Helper function to parse jsonb options safely
    const parseOptions = (options: any): string[] => {
        if (!options) return [];
        try {
            if (typeof options === 'string') {
                const parsed = JSON.parse(options);
                return Array.isArray(parsed) ? parsed : [];
            }
            return Array.isArray(options) ? options : [];
        } catch (error) {
            console.error('Failed to parse options:', options, error);
            return [];
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} aria-hidden="true" />

            {/* Panel */}
            <div className="relative w-full max-w-2xl bg-white shadow-xl flex flex-col h-full transform transition-transform duration-300 ease-in-out">
                {loading || !task ? (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                    </div>
                ) : (
                    <>
                        {/* Header */}
                        <TaskDetailsHeader
                            title={task.title}
                            onTitleChange={(title) => handleFieldUpdate({ title })}
                            onMarkComplete={handleMarkComplete}
                            onDelete={handleDeleteTask}
                            onClose={onClose}
                            isComplete={task.status === 'complete'}
                        />

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto">
                            <div className="p-4 md:p-6 space-y-6"> {/* Added md:p-6 */}

                                {/* --- Task Fields --- */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                                     {/* Assignee */}
                                    <div className="flex items-start space-x-3">
                                        <User className="h-4 w-4 text-gray-400 mt-1.5 flex-shrink-0" />
                                        <div className="flex-grow">
                                             <label className="text-sm text-gray-500 block mb-1">Assignee</label>
                                            <div className="flex items-center space-x-2">
                                                {task.assignee_id && <UserAvatar userId={task.assignee_id} size="xs" />}
                                                <select
                                                    value={task.assignee_id || ''}
                                                    onChange={(e) => handleFieldUpdate({ assignee_id: e.target.value || null })}
                                                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1"
                                                >
                                                    <option value="">Unassigned</option>
                                                    {users.map((u: UserType) => (
                                                        <option key={u.id} value={u.id}>
                                                            {formatUserDisplay(u)}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Collaborators */}
                                    <div className="flex items-start space-x-3">
                                        <Users className="h-4 w-4 text-gray-400 mt-1.5 flex-shrink-0" />
                                        <div className="flex-grow">
                                             <div className="flex justify-between items-center mb-1">
                                                  <label className="text-sm text-gray-500">Collaborators</label>
                                                  {!isEditingCollaborators && (
                                                       <button
                                                            onClick={() => setIsEditingCollaborators(true)}
                                                            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                                                            title="Edit Collaborators"
                                                       >
                                                            <Edit2 className="h-3 w-3 mr-1" /> Edit
                                                       </button>
                                                  )}
                                             </div>

                                            {isEditingCollaborators ? (
                                                <div className="space-y-2">
                                                     <Select<UserOption, true>
                                                          isMulti
                                                          options={collaboratorOptions}
                                                          value={selectedCollaboratorOptions}
                                                          onChange={handleCollaboratorSelectionChange}
                                                          isDisabled={users.length === 0}
                                                          placeholder={users.length === 0 ? "Loading..." : "Select up to 6..."}
                                                          closeMenuOnSelect={false}
                                                          styles={selectStyles} // Use imported styles
                                                          classNamePrefix="react-select"
                                                          isOptionDisabled={() => selectedCollaboratorOptions.length >= 6}
                                                          noOptionsMessage={() => 'No other users available'}
                                                      />
                                                    <div className="flex justify-end space-x-2">
                                                        <button onClick={handleCancelCollaboratorEdit} className="px-2 py-1 text-xs rounded border hover:bg-gray-100">Cancel</button>
                                                        <button onClick={handleSaveCollaborators} className="px-2 py-1 text-xs rounded bg-indigo-600 text-white hover:bg-indigo-700">Save</button>
                                                    </div>
                                                </div>
                                            ) : (
                                                 // Display View
                                                 <div className="flex flex-wrap items-center gap-1 min-h-[34px] bg-gray-50 p-1.5 rounded border border-gray-200">
                                                     {(task.collaborator_ids && task.collaborator_ids.length > 0) ? (
                                                         task.collaborator_ids.map(id => (
                                                             <UserAvatar key={id} userId={id} size="xs" />
                                                         ))
                                                     ) : (
                                                         <span className="text-sm text-gray-500 italic">None</span>
                                                     )}
                                                      {/* Button to quickly add if empty/not editing */}
                                                      {!isEditingCollaborators && (!task.collaborator_ids || task.collaborator_ids.length < 6) && (
                                                          <button
                                                              onClick={() => setIsEditingCollaborators(true)}
                                                              className="ml-1 p-0.5 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600"
                                                              title="Add Collaborator"
                                                          >
                                                              <Plus className="h-3 w-3" />
                                                          </button>
                                                      )}
                                                 </div>
                                            )}
                                        </div>
                                    </div>


                                    {/* Due Date */}
                                    <div className="flex items-start space-x-3">
                                        <Calendar className="h-4 w-4 text-gray-400 mt-1.5 flex-shrink-0" />
                                        <div className="flex-grow">
                                             <label className="text-sm text-gray-500 block mb-1">Due Date</label>
                                            <input
                                                type="date"
                                                value={task.due_date?.split('T')[0] || ''}
                                                onChange={(e) => handleFieldUpdate({ due_date: e.target.value || null })}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1"
                                            />
                                        </div>
                                    </div>

                                    {/* Priority */}
                                     <div className="flex items-start space-x-3">
                                         <AlertTriangle className="h-4 w-4 text-gray-400 mt-1.5 flex-shrink-0" />
                                         <div className="flex-grow">
                                              <label className="text-sm text-gray-500 block mb-1">Priority</label>
                                             <select
                                                 value={task.priority || 'medium'}
                                                 onChange={(e) => handleFieldUpdate({ priority: e.target.value })}
                                                 className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1"
                                             >
                                                 <option value="low">Low</option>
                                                 <option value="medium">Medium</option>
                                                 <option value="high">High</option>
                                                 <option value="urgent">Urgent</option>
                                             </select>
                                         </div>
                                     </div>

                                     {/* Project & Column */}
                                     <div className="flex items-start space-x-3 md:col-span-2"> {/* Span across on larger screens */}
                                        <Folder className="h-4 w-4 text-gray-400 mt-1 flex-shrink-0" />
                                        <div className="flex-grow">
                                            <label className="text-sm text-gray-500 block mb-1">Project / Status</label>
                                             <div className="text-sm text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                                {currentProject?.name ?? 'Unknown Project'} • {currentColumn?.name ?? 'Unknown Column'}
                                             </div>
                                         </div>
                                     </div>
                                </div>

                                {/* --- Custom Fields Section --- */}
                                {task.customFields && task.customFields.length > 0 && (
                                     <div className="border-t pt-4 mt-4">
                                         <h3 className="text-sm font-medium text-gray-900 mb-3">Custom Fields</h3>
                                         <div className="space-y-3">
                                             {task.customFields.map((field) => (
                                                 <div key={field.field_id} className="flex items-center space-x-4">
                                                     <span className="w-32 text-sm text-gray-700 flex-shrink-0">
                                                         {field.custom_fields?.name ?? 'Unnamed Field'}
                                                     </span>
                                                     <div className="flex-grow"> {/* Allow input/select to take space */}
                                                         {field.custom_fields?.type === 'select' ? (
                                                             <select
                                                                 value={field.value || ''}
                                                                 // Update local state immediately for responsiveness
                                                                 onChange={(e) => {
                                                                     const newValue = e.target.value;
                                                                     setTask(prevTask => prevTask ? ({
                                                                         ...prevTask,
                                                                         customFields: prevTask.customFields.map((f) =>
                                                                             f.field_id === field.field_id ? { ...f, value: newValue } : f
                                                                         ),
                                                                     }) : null);
                                                                 }}
                                                                 // Persist on blur
                                                                 onBlur={(e) => handleCustomFieldChange(field.field_id, e.target.value)}
                                                                 className="w-full md:w-60 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1"
                                                             >
                                                                 <option value="">Select...</option>
                                                                 {parseOptions(field.custom_fields.options).map((option: string) => (
                                                                     <option key={option} value={option}>
                                                                         {option}
                                                                     </option>
                                                                 ))}
                                                             </select>
                                                         ) : (
                                                             <input
                                                                 type={field.custom_fields?.type === 'number' ? 'number' : 'text'}
                                                                 value={field.value || ''}
                                                                  // Update local state immediately
                                                                 onChange={(e) => {
                                                                     const newValue = e.target.value;
                                                                     setTask(prevTask => prevTask ? ({
                                                                         ...prevTask,
                                                                         customFields: prevTask.customFields.map((f) =>
                                                                             f.field_id === field.field_id ? { ...f, value: newValue } : f
                                                                         ),
                                                                     }) : null);
                                                                 }}
                                                                 // Persist on blur
                                                                 onBlur={(e) => handleCustomFieldChange(field.field_id, e.target.value)}
                                                                 className="w-full md:w-60 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1"
                                                             />
                                                         )}
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                )}


                                {/* --- Description --- */}
                                <div className="border-t pt-4 mt-4">
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-sm font-medium text-gray-900">
                                            Description
                                        </label>
                                        {!isEditingDescription && (
                                            <button
                                                onClick={() => setIsEditingDescription(true)}
                                                className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center"
                                            >
                                                <Edit2 className="h-3 w-3 mr-1" /> Edit
                                            </button>
                                        )}
                                    </div>

                                    {isEditingDescription ? (
                                        <div>
                                            <textarea
                                                id="description"
                                                value={editedDescription}
                                                onChange={(e) => setEditedDescription(e.target.value)}
                                                rows={6}
                                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                                                placeholder="Add a description..."
                                            />
                                            <div className="flex justify-end space-x-2 mt-2">
                                                <button onClick={handleCancelDescriptionEdit} className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50">Cancel</button>
                                                <button onClick={handleSaveDescription} className="px-3 py-1 text-sm rounded-md border border-transparent text-white bg-indigo-600 hover:bg-indigo-700">Save</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="prose prose-sm max-w-none p-2 border border-transparent rounded-md min-h-[6rem] bg-gray-50">
                                            {task.description ? (
                                                <ReactLinkify componentDecorator={linkDecorator}>
                                                    <div className="whitespace-pre-wrap">{task.description}</div>
                                                </ReactLinkify>
                                            ) : (
                                                <p className="text-gray-500 italic">No description provided.</p>
                                            )}
                                        </div>
                                    )}
                                </div>


                                {/* --- Subtasks --- */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Subtasks</h3>
                                    <SubtaskList
                                        taskId={taskId}
                                        subtasks={subtasks}
                                        onUpdate={loadTaskDetails} // Reload details when subtasks change
                                        currentUserId={currentUserId || ''}
                                    />
                                </div>

                                {/* --- Comments & Attachments --- */}
                                <div className="border-t pt-4 mt-4">
                                    <h3 className="text-sm font-medium text-gray-900 mb-2">Comments</h3>
                                    <CommentList
                                        taskId={taskId}
                                        comments={comments}
                                        onUpdate={loadTaskDetails} // Reload details when comments change
                                    />
                                </div>

                                {/* --- Activity Logs --- */}
                                <div className="border-t pt-4 mt-4">
                                    <button
                                        onClick={() => setShowActivityLogs(!showActivityLogs)}
                                        className="text-sm text-indigo-600 hover:text-indigo-800 font-medium mb-2"
                                    >
                                        {showActivityLogs ? 'Hide Activity Log' : 'Show Activity Log'}
                                    </button>
                                    {showActivityLogs && <ActivityLogList taskId={taskId} />}
                                </div>
                            </div> {/* End p-4 */}
                        </div> {/* End Body Scroll */}
                    </>
                )}
            </div> {/* End Panel */}
        </div> // End Outer container
    );
};

// NO LONGER NEEDED HERE - Moved to src/components/common/reactSelectStyles.ts
// // Shared styles and types (consider moving to a separate file)
// interface UserOption { ... }
// const selectStyles: StylesConfig<UserOption, true> = { ... };