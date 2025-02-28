// TaskDetails.tsx

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, User, Folder, AlertTriangle } from 'lucide-react';
import { useTaskStore } from '../../lib/store/task';
import { useUserStore } from '../../lib/store/user';
import { useProjectStore } from '../../lib/store/project';
import { useBoardStore } from '../../lib/store/board';
import { SubtaskList } from './SubtaskList';
import { CommentList } from './CommentList';
import { TaskDetailsHeader } from './TaskDetails/TaskDetailsHeader';
import { useTaskUpdates } from '../../hooks/useTaskUpdates';
import { formatUserDisplay } from '../../lib/utils/user-display';
import { UserAvatar } from '../common/UserAvatar';
import { useAuthStore } from '../../lib/store/auth';
import { ActivityLogList } from '../tasks/ActivityLogList'; // Import the new component

interface TaskDetailsProps {
  taskId: string;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskDetails: React.FC<TaskDetailsProps> = ({
  taskId,
  isOpen,
  onClose,
}) => {
  const navigate = useNavigate();
  const [task, setTask] = useState<Task | null>(null);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [comments, setComments] = useState<TaskComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showActivityLogs, setShowActivityLogs] = useState(false); // State to toggle activity logs
  const { fetchTaskDetails, updateTask, deleteTask, updateTaskCustomField } = useTaskStore();
  const { users, fetchUsers } = useUserStore();
  const { projects, fetchProjects } = useProjectStore();
  const { columns } = useBoardStore();
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  // Function to load task details from the store
  const loadTaskDetails = async () => {
    try {
      setLoading(true);
      const details = await fetchTaskDetails(taskId);
      console.log('Fetched task details:', details);
      setTask({ ...details.task, customFields: details.customFields });
      setSubtasks(details.subtasks);
      setComments(details.comments);
      console.log('Updated task state with customFields:', { ...details.task, customFields: details.customFields });
    } catch (error) {
      console.error('Failed to load task details:', error);
    } finally {
      setLoading(false);
    }
  };

  const { handleFieldUpdate } = useTaskUpdates({
    task,
    setTask,
    updateTask,
    onError: loadTaskDetails,
  });

  useEffect(() => {
    if (isOpen && taskId) {
      loadTaskDetails();
      fetchUsers();
      fetchProjects();
    }
  }, [isOpen, taskId, fetchUsers, fetchProjects]);

  console.log('Custom Fields in TaskDetails:', task?.customFields);

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
      navigate(-1);
    } catch (error) {
      console.error('Failed to delete task:', error);
    }
  };

  const handleCustomFieldChange = async (fieldId: string, value: string) => {
    if (!task) return;
    try {
      await updateTaskCustomField(taskId, fieldId, value);
      await loadTaskDetails();
    } catch (error) {
      console.error('Failed to update custom field:', error);
    }
  };

  if (!isOpen || !task) return null;

  const currentColumn = columns.find((col) => col.id === task.column_id);
  const currentProject = projects.find((p) => p.id === task.project_id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="fixed inset-0 bg-black bg-opacity-30" onClick={onClose} />

      <div className="relative w-full max-w-2xl bg-white shadow-xl flex flex-col h-full">
        {loading ? (
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
                <div className="flex items-center space-x-4">
                  <div className="w-32 flex items-center space-x-2">
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
                      className="w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Unassigned</option>
                      {users.map((user) => (
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
                    onChange={(e) => handleFieldUpdate({ due_date: e.target.value })}
                    className="w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                {/* Project */}
                <div className="flex items-center space-x-4">
                  <div className="w-32 flex items-center space-x-2">
                    <Folder className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500">Project</span>
                  </div>
                  <div className="text-sm text-gray-900">
                    {currentProject?.name} • {currentColumn?.name}
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
                    className="w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                {/* Custom Fields */}
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-900">Custom Fields</h3>
                  {task.customFields && task.customFields.length > 0 ? (
                    task.customFields.map((field) => (
                      <div key={field.field_id} className="flex items-center space-x-2">
                        <span className="w-32 text-sm text-gray-700">
                          {field.custom_fields.name}
                        </span>
                        <input
                          type={field.custom_fields.type === 'number' ? 'number' : 'text'}
                          value={field.value || ''}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setTask({
                              ...task,
                              customFields: task.customFields.map((f) =>
                                f.field_id === field.field_id ? { ...f, value: newValue } : f
                              ),
                            });
                          }}
                          onBlur={(e) => handleCustomFieldChange(field.field_id, e.target.value)}
                          className="w-48 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No custom fields available.</p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label
                    htmlFor="description"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Description
                  </label>
                  <textarea
                    id="description"
                    value={task.description || ''}
                    onChange={(e) => handleFieldUpdate({ description: e.target.value })}
                    rows={4}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                    placeholder="Add a description..."
                  />
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

                {/* Activity Logs Toggle/Button */}
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