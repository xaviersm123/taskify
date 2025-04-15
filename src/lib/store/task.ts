import { create } from 'zustand';
import { supabase } from '../supabase/client';
// Assuming Task, Subtask, TaskComment types are defined in './task/types'
// User needs to manually add `collaborator_ids?: string[] | null;` to the Task type definition there.
import { Task, Subtask, TaskComment } from './task/types';
import { User } from './user'; // Assuming User type is available for notifications

// Define a type for the Task details payload, ensuring collaborator_ids is included
interface TaskDetailsPayload {
    task: Task; // This Task type should now include collaborator_ids
    subtasks: Subtask[];
    comments: TaskComment[];
    customFields: Array<{
        field_id: string;
        value: any;
        custom_fields: {
            id: string;
            name: string;
            type: string;
            options: any;
        };
    }>;
}

// Define the shape of data for creating/updating tasks, explicitly including collaborators
type TaskInputData = Partial<Omit<Task, 'id' | 'created_at' | 'created_by' | 'project_id'> & { project_id: string; created_by?: string }>;


interface TaskState {
    tasks: Task[];
    loading: boolean;
    error: string | null;
    selectedTaskId: string | null;
    setSelectedTaskId: (taskId: string | null) => void;
    // Update createTask signature to potentially accept collaborator_ids
    createTask: (data: TaskInputData) => Promise<Task>;
    // Update updateTask signature to potentially accept collaborator_ids
    updateTask: (id: string, data: Partial<Task>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    fetchTasks: (projectId: string) => Promise<void>;
    fetchAssignedTasks: (userId: string) => Promise<void>;
    // Update fetchTaskDetails return type
    fetchTaskDetails: (taskId: string) => Promise<TaskDetailsPayload>;
    updateTaskCustomField: (ticketId: string, fieldId: string, value: any) => Promise<void>;
    deleteTaskCustomField: (ticketId: string, fieldId: string) => Promise<void>;
    addSubtask: (taskId: string, data: { title: string; assignee_id?: string; due_date?: string; created_by: string }) => Promise<void>;
    updateSubtask: (subtaskId: string, data: Partial<Subtask>) => Promise<void>;
    toggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>;
    deleteSubtask: (subtaskId: string) => Promise<void>;
    addComment: (taskId: string, content: string, mentionedUsers?: string[]) => Promise<TaskComment>;
    updateComment: (commentId: string, content: string) => Promise<void>;
    deleteComment: (commentId: string) => Promise<void>;
    // Add internal helper for notifications
    _notifyUsers: (userIds: string[], taskId: string, taskTitle: string, projectId: string, type: 'assignment' | 'collaboration', messageTemplate: string, currentUserId?: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    loading: false,
    error: null,
    selectedTaskId: null,

    setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),

    // Helper function to log activity
    logActivity: async (eventType: 'INSERT' | 'UPDATE_COLUMN' | 'UPDATE_POSITION' | 'UPDATE_DETAILS' | 'DELETE', taskId: string, payload: any) => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id; // Null check added

            const logEntry = {
                event_type: eventType,
                table_name: 'tickets',
                record_id: taskId,
                payload: JSON.stringify(payload),
                created_by: currentUserId, // Can be null if user is not logged in
            };

            const { error } = await supabase.from('activity_log').insert([logEntry]);
            if (error) console.error('Failed to log task activity:', error);
        } catch (error) {
            console.error('Error logging task activity:', error);
        }
    },

    // Helper function for sending notifications
    _notifyUsers: async (userIds, taskId, taskTitle, projectId, type, messageTemplate, currentUserId) => {
        if (!userIds || userIds.length === 0) return;

        const notifications = userIds
            // Filter out the user performing the action
            .filter(id => id && id !== currentUserId)
            .map(userId => ({
                user_id: userId,
                type: type,
                content: messageTemplate.replace('{taskTitle}', taskTitle),
                link: `/projects/${projectId}?task=${taskId}`,
                metadata: { task_id: taskId, project_id: projectId },
                read: false,
                created_by: currentUserId,
            }));

        if (notifications.length > 0) {
            const { error: notifError } = await supabase.from('notifications').insert(notifications);
            if (notifError) console.error(`Failed to create ${type} notifications:`, notifError);
        }
    },

    createTask: async (data) => {
        try {
            // Fetch the highest position
            let position = 0;
            if (data.column_id) {
                const { data: tasks, error: fetchError } = await supabase
                    .from('tickets')
                    .select('position', { count: 'exact', head: true }) // More efficient way to get count/max
                    .eq('column_id', data.column_id)
                    .order('position', { ascending: false })
                    .limit(1);

                if (fetchError && fetchError.code !== 'PGRST116') { // Ignore 'range not found' error for empty columns
                     throw fetchError;
                }
                // If tasks exist, increment the highest position, otherwise start at 0 or 1
                const maxPos = tasks && tasks.length > 0 && tasks[0].position !== null ? tasks[0].position : -1;
                 position = maxPos + 1;

                 // Fetch count approach (alternative, less efficient if many tasks)
                 // const { count, error: countError } = await supabase
                 //    .from('tickets')
                 //    .select('*', { count: 'exact', head: true })
                 //    .eq('column_id', data.column_id);
                 // if (countError) throw countError;
                 // position = count ?? 0;
            }

            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;

            // Ensure collaborator_ids is an empty array if null/undefined, matching DB default
            const collaborator_ids = data.collaborator_ids || [];

            // Ensure assignee_id is not included in collaborator_ids
            const finalCollaborators = collaborator_ids.filter(id => id !== data.assignee_id);

            const taskData = {
                ...data,
                position,
                created_by: currentUserId, // Set creator
                collaborator_ids: finalCollaborators // Use cleaned collaborators
            };

            const { data: task, error } = await supabase
                .from('tickets')
                .insert([taskData])
                // Select all fields including the generated ones and collaborators
                .select('*')
                .single();
            if (error) throw error;

            // Ensure task returned from DB includes collaborator_ids
            const newTask: Task = task;

            set((state) => ({
                tasks: [...state.tasks, newTask],
                error: null,
            }));

            // Log creation activity
            const logPayload = {
                title: newTask.title || 'Untitled Task',
                created_at: newTask.created_at || new Date().toISOString(),
                column_id: newTask.column_id,
                position: newTask.position,
                assignee_id: newTask.assignee_id,
                collaborator_ids: newTask.collaborator_ids, // Log collaborators
            };
            await get().logActivity('INSERT', newTask.id, logPayload);


            // Notify Assignee
            if (newTask.assignee_id) {
                await get()._notifyUsers(
                    [newTask.assignee_id],
                    newTask.id,
                    newTask.title,
                    newTask.project_id,
                    'assignment',
                    'You were assigned to task: {taskTitle}',
                    currentUserId
                );
            }
            // Notify Collaborators
            if (newTask.collaborator_ids && newTask.collaborator_ids.length > 0) {
                await get()._notifyUsers(
                    newTask.collaborator_ids,
                    newTask.id,
                    newTask.title,
                    newTask.project_id,
                    'collaboration',
                    'You were added as a collaborator to task: {taskTitle}',
                    currentUserId
                );
            }

            return newTask;
        } catch (error: any) {
            console.error("Create Task Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    updateTask: async (id, data) => {
        try {
            // Fetch current task state including collaborators
            const { data: currentTaskData, error: fetchError } = await supabase
                .from('tickets')
                .select('*') // Fetch all fields
                .eq('id', id)
                .single();

            if (fetchError || !currentTaskData) throw fetchError || new Error('Task not found');
            const currentTask: Task = currentTaskData;

            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;

            // Prepare update data
            const updateData = { ...data };

            // If collaborators are being updated, ensure assignee is not included
            if (updateData.collaborator_ids) {
                const assigneeId = updateData.assignee_id !== undefined ? updateData.assignee_id : currentTask.assignee_id;
                updateData.collaborator_ids = updateData.collaborator_ids.filter(cid => cid !== assigneeId);
            }
             // Ensure collaborator_ids is passed correctly (handle null/undefined if needed by DB)
            if ('collaborator_ids' in updateData && updateData.collaborator_ids === null) {
                updateData.collaborator_ids = []; // Or handle as your DB expects nulls vs empty arrays
            }


            const { error } = await supabase
                .from('tickets')
                .update(updateData)
                .eq('id', id)
                .select('*') // Select updated data to get definitive state
                .single();

            if (error) throw error;

            // Refetch the task to get the guaranteed updated state, including collaborators
            const { data: updatedTaskData, error: refetchError } = await supabase
                .from('tickets')
                .select('*')
                .eq('id', id)
                .single();

            if (refetchError || !updatedTaskData) throw refetchError || new Error('Failed to refetch updated task');
            const updatedTask: Task = updatedTaskData;


            // Update local state
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
                error: null,
            }));

            // --- Activity Logging ---
            const logPayload: any = { updated_at: new Date().toISOString() };
            let eventType: 'UPDATE_COLUMN' | 'UPDATE_POSITION' | 'UPDATE_DETAILS' = 'UPDATE_DETAILS';

            // Check for position/column changes
            const oldColumnId = currentTask.column_id;
            const newColumnId = updatedTask.column_id;
            const oldPosition = currentTask.position;
            const newPosition = updatedTask.position;

            if (newColumnId !== oldColumnId) {
                eventType = 'UPDATE_COLUMN';
                logPayload.old_column_id = oldColumnId;
                logPayload.new_column_id = newColumnId;
                logPayload.old_position = oldPosition; // Include position change during column move
                logPayload.new_position = newPosition;
            } else if (newPosition !== oldPosition) {
                eventType = 'UPDATE_POSITION';
                logPayload.old_position = oldPosition;
                logPayload.new_position = newPosition;
            }

             // Check for changes in other fields for detailed logging
            const changedFields: Partial<Task> = {};
            (Object.keys(data) as Array<keyof Partial<Task>>).forEach(key => {
                 // Compare with the truly updated task state
                 if (key !== 'position' && key !== 'column_id' && JSON.stringify(currentTask[key]) !== JSON.stringify(updatedTask[key])) {
                     changedFields[key] = updatedTask[key]; // Log the new value
                     logPayload[`old_${key}`] = currentTask[key]; // Optionally log the old value
                     logPayload[`new_${key}`] = updatedTask[key];
                 }
             });
             // If only position/column changed, eventType remains as set above
             // If other details changed as well, log them under the more specific event or keep 'UPDATE_DETAILS'
             if (Object.keys(changedFields).length > 0 && eventType === 'UPDATE_DETAILS') {
                  eventType = 'UPDATE_DETAILS'; // Explicitly set if only details changed
             } else if (Object.keys(changedFields).length > 0) {
                 // Add changed fields detail to existing position/column log payload
                 logPayload.changed_details = changedFields;
             }


            await get().logActivity(eventType, id, logPayload);

            // --- Notifications ---
            const oldAssigneeId = currentTask.assignee_id;
            const newAssigneeId = updatedTask.assignee_id;
            const oldCollaboratorIds = currentTask.collaborator_ids || [];
            const newCollaboratorIds = updatedTask.collaborator_ids || [];

            // Notify new assignee (if changed and not self-assigned)
            if (newAssigneeId && newAssigneeId !== oldAssigneeId) {
                 await get()._notifyUsers(
                    [newAssigneeId],
                    id,
                    updatedTask.title,
                    updatedTask.project_id,
                    'assignment',
                    'You were assigned to task: {taskTitle}',
                    currentUserId
                );
            }

            // Notify newly added collaborators
            const addedCollaborators = newCollaboratorIds.filter(cid => !oldCollaboratorIds.includes(cid));
            if (addedCollaborators.length > 0) {
                 await get()._notifyUsers(
                    addedCollaborators,
                    id,
                    updatedTask.title,
                    updatedTask.project_id,
                    'collaboration',
                    'You were added as a collaborator to task: {taskTitle}',
                    currentUserId
                );
            }
             // TODO: Optionally notify removed collaborators/assignee

        } catch (error: any) {
            console.error("Update Task Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    deleteTask: async (id) => {
        try {
             // Fetch task data before deleting for logging
            const { data: task, error: fetchError } = await supabase.from('tickets').select('title').eq('id', id).single();
             // Proceed even if fetch fails, just won't have title for log

            const { error } = await supabase.from('tickets').delete().eq('id', id);
            if (error) throw error;

            set((state) => ({
                tasks: state.tasks.filter((t) => t.id !== id),
                error: null,
            }));

             // Log deletion
             const payload = {
                 title: task?.title || 'Unknown Task',
                 deleted_at: new Date().toISOString(),
             };
            await get().logActivity('DELETE', id, payload);

             // Optional: Delete related notifications?

        } catch (error: any) {
            console.error("Delete Task Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    fetchTasks: async (projectId) => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select('*') // Should include collaborator_ids
                .eq('project_id', projectId)
                .order('column_id', { ascending: true })
                .order('position', { ascending: true });
            if (error) throw error;
            set({ tasks: (data as Task[]) || [], loading: false }); // Cast to Task[]
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    fetchAssignedTasks: async (userId) => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select('*') // Should include collaborator_ids
                // Fetch tasks where the user is either assignee OR a collaborator
                .or(`assignee_id.eq.${userId},collaborator_ids.cs.{${userId}}`) // Use .cs (contains) for array
                .order('column_id', { ascending: true })
                .order('position', { ascending: true });
            if (error) throw error;
            set({ tasks: (data as Task[]) || [], loading: false }); // Cast to Task[]
        } catch (error: any) {
            set({ error: error.message, loading: false });
            throw error;
        }
    },

    fetchTaskDetails: async (taskId): Promise<TaskDetailsPayload> => { // Ensure return type matches Promise<TaskDetailsPayload>
        try {
            // Fetch task, ensuring collaborator_ids is selected
            const taskResult = await supabase
                .from('tickets')
                .select('*') // Selects all columns, including collaborator_ids
                .eq('id', taskId)
                .single();

            if (taskResult.error) throw taskResult.error;
            const taskData: Task = taskResult.data; // Cast to Task (ensure Task type includes collaborator_ids)
            const { project_id } = taskData;

            // Fetch related data
            const [subtasksResult, commentsResult, customFieldsResult, ticketFieldsResult] = await Promise.all([
                supabase.from('subtasks').select('*').eq('ticket_id', taskId).order('created_at'),
                supabase.from('task_comments').select('*').eq('ticket_id', taskId).order('created_at'),
                // Fetch custom field definitions for the project
                supabase.from('custom_fields').select('*').eq('project_id', project_id),
                 // Fetch custom field values specific to this ticket
                supabase.from('ticket_custom_fields').select('*').eq('ticket_id', taskId),
            ]);

            // Error handling for parallel fetches
             if (subtasksResult.error) throw subtasksResult.error;
             if (commentsResult.error) throw commentsResult.error;
             if (customFieldsResult.error) throw customFieldsResult.error;
             if (ticketFieldsResult.error) throw ticketFieldsResult.error;

            // Map custom field values to their definitions
            const customFields = (customFieldsResult.data || []).map((fieldDef) => {
                const ticketField = (ticketFieldsResult.data || []).find((tcf) => tcf.field_id === fieldDef.id);
                return {
                    field_id: fieldDef.id,
                    value: ticketField?.value ?? '', // Use nullish coalescing for default
                    custom_fields: { // Nest the definition details
                        id: fieldDef.id,
                        name: fieldDef.name,
                        type: fieldDef.type,
                        options: fieldDef.options, // Already parsed from DB? Or needs JSON.parse?
                    },
                };
            });

            return {
                task: taskData, // Task data now includes collaborator_ids
                subtasks: subtasksResult.data || [],
                comments: commentsResult.data || [],
                customFields,
            };
        } catch (error: any) {
            console.error('Failed to fetch task details:', error);
            set({ error: error.message }); // Optionally update store error state
            throw error; // Re-throw for the calling component to handle
        }
    },

    // --- Custom Fields, Subtasks, Comments remain largely the same ---
    // (No changes needed below this line for collaborator feature based on provided code)

    updateTaskCustomField: async (ticketId, fieldId, value) => {
        try {
            // Use upsert to handle both insert and update
            const { error } = await supabase
                .from('ticket_custom_fields')
                .upsert(
                    { ticket_id: ticketId, field_id: fieldId, value },
                    { onConflict: 'ticket_id, field_id' } // Specify conflict target
                 );

            if (error) throw error;
            // Optionally refetch task details or update local state if necessary
        } catch (error: any) {
            console.error("Update Custom Field Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    deleteTaskCustomField: async (ticketId, fieldId) => {
        try {
            const { error } = await supabase
                .from('ticket_custom_fields')
                .delete()
                .eq('ticket_id', ticketId)
                .eq('field_id', fieldId);
            if (error) throw error;
             // Optionally refetch task details or update local state if necessary
        } catch (error: any) {
             console.error("Delete Custom Field Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    addSubtask: async (taskId, data) => {
        try {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData.user?.id) throw authError || new Error('User not found');
            const currentUserId = authData.user.id;

            const { data: newSubtask, error } = await supabase.from('subtasks').insert([
                {
                    ticket_id: taskId,
                    title: data.title,
                    assignee_id: data.assignee_id,
                    due_date: data.due_date,
                    completed: false,
                    created_by: currentUserId,
                },
            ]).select().single();

            if (error) throw error;
            set({ error: null });
             // No need to return newSubtask if UI updates via onUpdate() callback
             // return newSubtask;
        } catch (error: any) {
            console.error("Add Subtask Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    updateSubtask: async (subtaskId, data) => {
        try {
            const { error } = await supabase.from('subtasks').update(data).eq('id', subtaskId);
            if (error) throw error;
            set({ error: null });
        } catch (error: any) {
             console.error("Update Subtask Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    toggleSubtask: async (subtaskId, completed) => {
        try {
            const { error } = await supabase
                .from('subtasks')
                .update({
                    completed,
                    completed_at: completed ? new Date().toISOString() : null,
                })
                .eq('id', subtaskId);
            if (error) throw error;
            set({ error: null });
        } catch (error: any) {
             console.error("Toggle Subtask Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    deleteSubtask: async (subtaskId) => {
        try {
            const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
            if (error) throw error;
            set({ error: null });
        } catch (error: any) {
             console.error("Delete Subtask Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    addComment: async (taskId, content, mentionedUsers: string[] = []) => {
        try {
            const { data: authData, error: authError } = await supabase.auth.getUser();
            if (authError || !authData.user?.id) throw authError || new Error('User not found');
            const currentUserId = authData.user.id;

             // Fetch task details for notification context
            const { data: taskData, error: taskError } = await supabase
                 .from('tickets')
                 .select('project_id, title')
                 .eq('id', taskId)
                 .single();
            if (taskError) console.warn("Could not fetch task details for mention notification:", taskError);
             const taskTitle = taskData?.title || 'a task';
             const projectId = taskData?.project_id || ''; // Need project ID for link


             // Fetch creator name for notification message
             let mentionerName = 'Someone';
             // Use user metadata first for potentially faster access
             if (authData.user.user_metadata?.firstName) {
                 mentionerName = authData.user.user_metadata.firstName;
             } else {
                 // Fallback to fetching profile if metadata name isn't available
                 const { data: profileData, error: profileError } = await supabase
                     .from('profiles')
                     .select('full_name') // Adjust if using first_name, last_name
                     .eq('id', currentUserId)
                     .single();
                 if (!profileError && profileData?.full_name) {
                     mentionerName = profileData.full_name.split(' ')[0]; // Get first name
                 }
             }


            const { data: comment, error: commentError } = await supabase
                .from('task_comments')
                .insert([
                    {
                        ticket_id: taskId,
                        content,
                        created_by: currentUserId,
                        mentioned_users: mentionedUsers || [], // Ensure it's an array
                    },
                ])
                .select() // Select the created comment
                .single();

            if (commentError) throw commentError;
            set({ error: null });

             // Send mention notifications
             if (projectId && mentionedUsers && mentionedUsers.length > 0) {
                 const messageTemplate = `${mentionerName} mentioned you in task: {taskTitle}`;
                 await get()._notifyUsers(
                    mentionedUsers,
                    taskId,
                    taskTitle,
                    projectId,
                    'mention',
                    messageTemplate,
                    currentUserId
                 );
             }

            return comment; // Return the created comment
        } catch (error: any) {
            console.error("Add Comment Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    updateComment: async (commentId, content) => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw authError || new Error('User not authenticated');
            const currentUserId = user.id;

             // Verify ownership before updating
            const { data: comment, error: fetchError } = await supabase
                .from('task_comments')
                .select('created_by')
                .eq('id', commentId)
                .single();

            if (fetchError) throw fetchError;
            // Allow update only if user created the comment
            // TODO: Consider allowing admins/project managers to edit?
            if (!comment || comment.created_by !== currentUserId) {
                 throw new Error('Unauthorized to update this comment');
            }

            const { error } = await supabase
                .from('task_comments')
                .update({ content, updated_at: new Date().toISOString() })
                .eq('id', commentId);
            if (error) throw error;
            set({ error: null });
        } catch (error: any) {
             console.error("Update Comment Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    deleteComment: async (commentId) => {
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            if (authError || !user) throw authError || new Error('User not authenticated');
            const currentUserId = user.id;

             // Verify ownership before deleting
             const { data: comment, error: fetchError } = await supabase
                 .from('task_comments')
                 .select('created_by')
                 .eq('id', commentId)
                 .single();

             if (fetchError) throw fetchError;
             // Allow delete only if user created the comment
              // TODO: Consider allowing admins/project managers to delete?
             if (!comment || comment.created_by !== currentUserId) {
                  throw new Error('Unauthorized to delete this comment');
             }

            const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
            if (error) throw error;
            set({ error: null });
        } catch (error: any) {
            console.error("Delete Comment Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

}));