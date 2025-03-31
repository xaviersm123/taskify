import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Folder, AlertTriangle, Edit2, Check, X } from 'lucide-react';
import ReactLinkify from 'react-linkify'; // Import react-linkify
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
import { TaskComment } from '../../lib/store/task';
import { TaskCustomField } from '../../lib/store/task'; // Assuming this type exists

interface TaskDetailsProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
}

// Define a type for the task including custom fields
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

  const { fetchTaskDetails, updateTask, deleteTask, updateTaskCustomField } = useTaskStore();
  const { users, fetchUsers } = useUserStore();
  const { projects, fetchProjects } = useProjectStore();
  const { columns } = useBoardStore();
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  const loadTaskDetails = useCallback(async () => {
    if (!taskId) return;
    try {
      setLoading(true);
      const details = await fetchTaskDetails(taskId);
      console.log('Fetched task details:', details);
      const taskData = { ...details.task, customFields: details.customFields || [] };
      setTask(taskData);
      setEditedDescription(taskData.description || ''); // Initialize editedDescription
      setSubtasks(details.subtasks || []);
      setComments(details.comments || []);
      console.log('Updated task state with customFields:', taskData);
    } catch (error) {
      console.error('Failed to load task details:', error);
      // Handle error state if needed
    } finally {
      setLoading(false);
    }
  }, [taskId, fetchTaskDetails]);


  const { handleFieldUpdate } = useTaskUpdates({
    task,
    setTask: setTask as React.Dispatch<React.SetStateAction<Task | null>>, // Adjust type if necessary
    updateTask,
    onError: loadTaskDetails,
  });

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
      fetchUsers(); // Consider fetching only if users are not already loaded
      fetchProjects(); // Consider fetching only if projects are not already loaded
    } else {
      // Reset state when closed or taskId changes
      setTask(null);
      setSubtasks([]);
      setComments([]);
      setLoading(true);
      setIsEditingDescription(false);
      setEditedDescription('');
    }
  }, [isOpen, taskId, loadTaskDetails, fetchUsers, fetchProjects]);

  const handleMarkComplete = async () => {
    if (!task) return;
    const newStatus = task.status === 'complete' ? 'todo' : 'complete';
    try {
      await updateTask(taskId, { status: newStatus });
      await loadTaskDetails();
    } catch (error) {
      console.error('Failed to update task status:', error);
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !window.confirm('Are you sure you want to delete this task?')) return;
    try {
      await deleteTask(taskId);
      onClose();
      navigate(-1); // Consider redirecting to a more stable location like the project board
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleCustomFieldChange = async (fieldId: string, value: string) => {
    if (!task) return;
    try {
      await updateTaskCustomField(taskId, fieldId, value);
      await loadTaskDetails(); // Reload to confirm change and get potential side-effects
    } catch (error) {
      console.error('Failed to update custom field:', error);
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
      // Optionally call loadTaskDetails() if handleFieldUpdate doesn't update local state sufficiently
    } catch (error) {
      console.error('Failed to save description:', error);
      // Optionally show an error message to the user
    }
  };

  const handleCancelDescriptionEdit = () => {
    if (!task) return;
    setEditedDescription(task.description || '');
    setIsEditingDescription(false);
  };
  // --- End Description Edit Handlers ---

  // Link decorator for react-linkify
  const linkDecorator = (href: string, text: string, key: number) => (
    <a href={href} key={key} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {text}
    </a>
  );


  if (!isOpen) return null; // Render nothing if not open

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
      <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white shadow-xl flex flex-col h-full">
        {loading || !task ? ( // Show loading indicator if loading or task is null
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <>
            <TaskDetailsHeader
              title={task.title}
              onTitleChange={(title) => handleFieldUpdate({ title })}
              onMarkComplete={handleMarkComplete}
              onDelete={handleDeleteTask}
              onClose={onClose}
              isComplete={task.status === 'complete'}
            />

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 space-y-6">
                {/* Assignee */}
                <div className="flex items-start space-x-4">
                  <div className="w-32 flex items-center space-x-2 pt-1.5"> {/* Adjusted padding */}
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Assignee</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    {task.assignee_id && (
                      <UserAvatar userId={task.assignee_id} size="sm" />
                    )}
                    <select
                      value={task.assignee_id || ''}
                      onChange={(e) =>
                        handleFieldUpdate({ assignee_id: e.target.value || null })
                      }
                      className="w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1" // Adjusted padding
                    >
                      <option value="">Unassigned</option>
                      {users.map((user: UserType) => (
                        <option key={user.id} value={user.id}>
                          {formatUserDisplay(user)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center space-x-4">
                  <div className="w-32 flex items-center space-x-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Due Date</span>
                  </div>
                  <input
                    type="date"
                    value={task.due_date?.split('T')[0] || ''}
                    onChange={(e) => handleFieldUpdate({ due_date: e.target.value || null })} // Handle empty date
                    className="w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1" // Adjusted padding
                  />
                </div>

                {/* Project */}
                <div className="flex items-center space-x-4">
                  <div className="w-32 flex items-center space-x-2">
                    <Folder className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Project</span>
                  </div>
                  <div className="text-sm text-gray-900">
                    {currentProject?.name ?? 'Unknown Project'} • {currentColumn?.name ?? 'Unknown Column'}
                  </div>
                </div>

                {/* Priority */}
                <div className="flex items-center space-x-4">
                  <div className="w-32 flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Priority</span>
                  </div>
                  <select
                    value={task.priority || 'medium'}
                    onChange={(e) => handleFieldUpdate({ priority: e.target.value })}
                    className="w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1" // Adjusted padding
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Custom Fields */}
                <div className="space-y-3"> {/* Increased spacing */}
                  <h3 className="text-sm font-medium text-gray-900 mb-1">Custom Fields</h3>
                  {task.customFields && task.customFields.length > 0 ? (
                    task.customFields.map((field) => (
                      <div key={field.field_id} className="flex items-center space-x-4"> {/* Use space-x-4 like others */}
                        <span className="w-32 text-sm text-gray-700 flex-shrink-0"> {/* Added flex-shrink-0 */}
                          {field.custom_fields?.name ?? 'Unnamed Field'}
                        </span>
                        {field.custom_fields?.type === 'select' ? (
                          <select
                            value={field.value || ''}
                             onChange={(e) => {
                              const newValue = e.target.value;
                              // Optimistically update UI - consider debouncing or throttling updates
                              setTask(prevTask => prevTask ? ({
                                ...prevTask,
                                customFields: prevTask.customFields.map((f) =>
                                  f.field_id === field.field_id ? { ...f, value: newValue } : f
                                ),
                              }) : null);
                              // Persist the change on blur
                            }}
                            onBlur={(e) => handleCustomFieldChange(field.field_id, e.target.value)}
                            className="w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1" // Adjusted padding
                          >
                            <option value="">Select...</option> {/* Improved placeholder */}
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
                            onChange={(e) => {
                              const newValue = e.target.value;
                               // Optimistically update UI - consider debouncing or throttling updates
                               setTask(prevTask => prevTask ? ({
                                ...prevTask,
                                customFields: prevTask.customFields.map((f) =>
                                  f.field_id === field.field_id ? { ...f, value: newValue } : f
                                ),
                              }) : null);
                            }}
                            onBlur={(e) => handleCustomFieldChange(field.field_id, e.target.value)}
                            className="w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm py-1" // Adjusted padding
                          />
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 pl-36">No custom fields available.</p> /* Indent message */
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-sm font-medium text-gray-700">
                      Description
                    </label>
                    {!isEditingDescription && (
                      <button
                        onClick={() => setIsEditingDescription(true)}
                        className="text-sm text-indigo-600 hover:text-indigo-800 flex items-center"
                      >
                         <Edit2 className="h-4 w-4 mr-1" /> Edit
                      </button>
                    )}
                  </div>

                  {isEditingDescription ? (
                    <div>
                      <textarea
                        id="description"
                        value={editedDescription}
                        onChange={(e) => setEditedDescription(e.target.value)}
                        rows={6} // Increased rows for better editing
                        className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                        placeholder="Add a description..."
                      />
                      <div className="flex justify-end space-x-2 mt-2">
                         <button
                           onClick={handleCancelDescriptionEdit}
                           className="px-3 py-1 text-sm rounded-md border border-gray-300 hover:bg-gray-50"
                         >
                           Cancel
                         </button>
                         <button
                           onClick={handleSaveDescription}
                           className="px-3 py-1 text-sm rounded-md border border-transparent text-white bg-indigo-600 hover:bg-indigo-700"
                         >
                           Save
                         </button>
                       </div>
                    </div>
                  ) : (
                    <div className="prose prose-sm max-w-none p-2 border border-transparent rounded-md min-h-[6rem]"> {/* Added min-height */}
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


                {/* Subtasks */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900">Subtasks</h3>
                  <SubtaskList
                    taskId={taskId}
                    subtasks={subtasks}
                    onUpdate={loadTaskDetails}
                    currentUserId={currentUserId || ''}
                  />
                </div>

                {/* Comments */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900">Comments</h3>
                  <CommentList
                    taskId={taskId}
                    comments={comments}
                    onUpdate={loadTaskDetails}
                  />
                </div>

                {/* Activity Logs */}
                <div className="space-y-2">
                  <button
                    onClick={() => setShowActivityLogs(!showActivityLogs)}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                  >
                    {showActivityLogs ? 'Hide Activity Logs' : 'Show Activity Logs'}
                  </button>
                  {showActivityLogs && <ActivityLogList taskId={taskId} />}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};