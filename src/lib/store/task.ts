import { create } from 'zustand';
import { supabase } from '../supabase/client';
// Assuming Task, Subtask, TaskComment types are defined in './task/types'
// User needs to manually add `collaborator_ids?: string[] | null;` to the Task type definition there.
import { Task, Subtask, TaskComment } from './task/types';
import { User } from './user'; // Assuming User type is available for notifications

// --- ADD THIS IMPORT ---
import { useBoardStore } from './board'; // Adjust path ../board if needed
// -----------------------


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
    _notifyUsers: (userIds: string[], taskId: string, taskTitle: string, projectId: string, type: 'assignment' | 'collaboration' | 'mention', messageTemplate: string, currentUserId?: string) => Promise<void>;
}

// Helper function to format task data consistently (optional but recommended)
// Using a simplified version based on the provided code structure
const formatDbTask = (dbTask: any): Task => {
    // Basic type checking and defaults
    return {
        ...dbTask,
        position: typeof dbTask.position === 'number' ? dbTask.position : (parseInt(String(dbTask.position), 10) || 0),
        collaborator_ids: Array.isArray(dbTask.collaborator_ids) ? dbTask.collaborator_ids : [],
        // Ensure other fields match the Task type if necessary
    } as Task; // Cast to Task, assuming DB returns compatible structure mostly
};


export const useTaskStore = create<TaskState>((set, get) => ({
    tasks: [],
    loading: false,
    error: null,
    selectedTaskId: null,

    setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),

    // Helper function to log activity (As provided by user)
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

    // Helper function for sending notifications (As provided by user)
    _notifyUsers: async (userIds, taskId, taskTitle, projectId, type, messageTemplate, currentUserId) => {
        // Added projectId check and fallback title
        if (!userIds || userIds.length === 0 || !projectId) return;

        const notifications = userIds
            // Filter out the user performing the action
            .filter(id => id && id !== currentUserId)
            .map(userId => ({
                user_id: userId,
                type: type,
                content: messageTemplate.replace('{taskTitle}', taskTitle || 'Untitled Task'),
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

    // createTask (As provided by user)
    createTask: async (data) => {
        try {
            let position = 0;
            if (data.column_id) {
                const { data: tasks, error: fetchError } = await supabase
                    .from('tickets')
                    .select('position', { count: 'exact', head: true })
                    .eq('column_id', data.column_id)
                    .order('position', { ascending: false })
                    .limit(1);
                if (fetchError && fetchError.code !== 'PGRST116') { throw fetchError; }
                const maxPos = tasks && tasks.length > 0 && tasks[0].position !== null ? tasks[0].position : -1;
                 position = maxPos + 1;
            }

            const { data: { user } } = await supabase.auth.getUser();
            const currentUserId = user?.id;
            const collaborator_ids = data.collaborator_ids || [];
            const finalCollaborators = collaborator_ids.filter(id => id !== data.assignee_id);

            const taskData = { ...data, position, created_by: currentUserId, collaborator_ids: finalCollaborators };

            const { data: task, error } = await supabase.from('tickets').insert([taskData]).select('*').single();
            if (error) throw error;
            const newTask: Task = task;

            set((state) => ({ tasks: [...state.tasks, newTask], error: null, }));

            const logPayload = { title: newTask.title || 'Untitled Task', created_at: newTask.created_at || new Date().toISOString(), column_id: newTask.column_id, position: newTask.position, assignee_id: newTask.assignee_id, collaborator_ids: newTask.collaborator_ids };
            await get().logActivity('INSERT', newTask.id, logPayload);

            if (newTask.assignee_id) { await get()._notifyUsers( [newTask.assignee_id], newTask.id, newTask.title, newTask.project_id, 'assignment', 'You were assigned to task: {taskTitle}', currentUserId ); }
            if (newTask.collaborator_ids && newTask.collaborator_ids.length > 0) { await get()._notifyUsers( newTask.collaborator_ids, newTask.id, newTask.title, newTask.project_id, 'collaboration', 'You were added as a collaborator to task: {taskTitle}', currentUserId ); }

            return newTask;
        } catch (error: any) {
            console.error("Create Task Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    // --- THIS FUNCTION IS THE ONLY ONE MODIFIED ---
    updateTask: async (id, data) => {
        // --- Get context and current state ---
        const { tasks, logActivity, _notifyUsers } = get(); // Destructure helpers from store instance
        const taskIndex = tasks.findIndex(t => t.id === id); // Use local state for optimistic revert baseline
        let originalTaskState = taskIndex !== -1 ? tasks[taskIndex] : null; // Store local state as fallback

        try {
            // Fetch the definitive current task state from DB *before* applying updates
            const { data: currentTaskData, error: fetchError } = await supabase
                .from('tickets')
                .select('*') // Fetch all fields
                .eq('id', id)
                .single();

            if (fetchError || !currentTaskData) {
                const errorMsg = `Task with id ${id} not found in DB for update. Error: ${fetchError?.message}`;
                console.error(errorMsg);
                set({ error: errorMsg });
                throw fetchError || new Error('Task not found');
            }
            const currentTask: Task = formatDbTask(currentTaskData); // Use formatter
            originalTaskState = currentTask; // Prefer DB state as the revert baseline

            const { data: authData } = await supabase.auth.getUser();
            const currentUserId = authData?.user?.id;

            // --- Prepare initial update data ---
            let finalUpdateData: Partial<Task> = { ...data }; // Start with the requested update data
            let movedByAutomation = false; // Flag for logging <<<<<<<<<<<<<<< ADDED

            // --- START RULER AUTOMATION LOGIC <<<<<<<<<<<<<<< ADDED BLOCK
            if (finalUpdateData.status === 'complete' && currentTask.status !== 'complete') {
                console.log(`[Ruler Check] Task ${id} ('${currentTask.title}') marked complete. Checking project ${currentTask.project_id}...`);
                const boardColumns = useBoardStore.getState().columns;
                console.log(`[Ruler Check] Columns available:`, boardColumns.map(c => ({ id: c.id, name: c.name, isRuler: c.is_ruler_column })));
                const rulerColumn = boardColumns.find(col => col.project_id === currentTask.project_id && col.is_ruler_column);
                console.log(`[Ruler Check] Found ruler column:`, rulerColumn ? { id: rulerColumn.id, name: rulerColumn.name } : undefined);

                if (rulerColumn && rulerColumn.id !== currentTask.column_id) {
                    console.log(`[Ruler Check] Applying move to ruler column ${rulerColumn.id}...`);
                    movedByAutomation = true; // Set the flag
                    finalUpdateData.column_id = rulerColumn.id;

                    const { data: tasksInRulerCol, error: posError } = await supabase
                        .from('tickets').select('position').eq('column_id', rulerColumn.id).order('position', { ascending: false }).limit(1);
                    if (posError && posError.code !== 'PGRST116'){ console.error("[Ruler Check] Error fetching position:", posError); finalUpdateData.position = 0; }
                    else { const maxPosition = tasksInRulerCol?.[0]?.position ?? -1; finalUpdateData.position = maxPosition + 1; }
                    console.log(`[Ruler Check] Calculated new position: ${finalUpdateData.position}`);
                } else if (rulerColumn && rulerColumn.id === currentTask.column_id) console.log(`[Ruler Check] Task ${id} is already in the ruler column.`);
                else console.log(`[Ruler Check] No ruler column found or task not changing to complete.`);
            }
            // --- END RULER AUTOMATION LOGIC <<<<<<<<<<<<<<< END ADDED BLOCK

            // --- Handle Collaborators (As provided by user) ---
            if ('collaborator_ids' in finalUpdateData || 'assignee_id' in finalUpdateData) {
                 const assigneeId = finalUpdateData.assignee_id !== undefined ? finalUpdateData.assignee_id : currentTask.assignee_id;
                 let collaborators = finalUpdateData.collaborator_ids !== undefined ? finalUpdateData.collaborator_ids : currentTask.collaborator_ids;
                 collaborators = collaborators || [];
                 if (assigneeId) finalUpdateData.collaborator_ids = collaborators.filter(cid => cid !== assigneeId);
                 else finalUpdateData.collaborator_ids = collaborators;
                 // Ensure empty array is handled correctly based on DB schema (e.g., send null or empty array)
                 if (finalUpdateData.collaborator_ids && finalUpdateData.collaborator_ids.length === 0) {
                     // Check DB column definition - does it allow NULL or prefer empty array '{}'?
                     // Assuming empty array is preferred based on previous logic:
                      finalUpdateData.collaborator_ids = [];
                 }
            }

            // --- Optimistic Update (Local State) ---
            const optimisticTaskData = formatDbTask({ ...currentTask, ...finalUpdateData });
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? optimisticTaskData : t)),
                error: null,
            }));

            // --- Execute DB Update ---
            // Use finalUpdateData which may include ruler changes
            console.log('>>> Sending update to DB:', { taskId: id, data: finalUpdateData });
            const { data: dbUpdatedTaskData, error: updateError } = await supabase
                .from('tickets')
                .update(finalUpdateData)
                .eq('id', id)
                .select('*')
                .single();

            if (updateError) throw updateError; // Propagate DB error
            if (!dbUpdatedTaskData) throw new Error("Update successful but no data returned from DB.");

            const updatedTask = formatDbTask(dbUpdatedTaskData); // Format confirmed data
            console.log(`Task ${id} updated successfully in DB. Final state:`, updatedTask);

            // --- Update Local State with Confirmed Data ---
            set((state) => ({
                tasks: state.tasks.map((t) => (t.id === id ? updatedTask : t)),
                error: null,
            }));

            // --- Activity Logging (Modified to include automation flag) ---
            const logPayload: any = { updated_at: new Date().toISOString() };
            let eventType: 'UPDATE_COLUMN' | 'UPDATE_POSITION' | 'UPDATE_DETAILS' = 'UPDATE_DETAILS';
            const oldColumnId = currentTask.column_id; const newColumnId = updatedTask.column_id;
            const oldPosition = currentTask.position; const newPosition = updatedTask.position;

            if (newColumnId !== oldColumnId) {
                eventType = 'UPDATE_COLUMN';
                logPayload.old_column_id = oldColumnId; logPayload.new_column_id = newColumnId;
                logPayload.old_position = oldPosition; logPayload.new_position = newPosition;
                // --- ADD AUTOMATION FLAG TO LOG <<<<<<<<<<<<<<< MODIFIED
                if (movedByAutomation) logPayload.moved_by_automation = true;
            } else if (newPosition !== oldPosition) {
                eventType = 'UPDATE_POSITION';
                logPayload.old_position = oldPosition; logPayload.new_position = newPosition;
            }

            const changedFields: Partial<Task> = {};
            // Use `finalUpdateData` keys to check what was intended to change
            (Object.keys(finalUpdateData) as Array<keyof Partial<Task>>).forEach(key => {
                 if (key !== 'position' && key !== 'column_id' && JSON.stringify(currentTask[key]) !== JSON.stringify(updatedTask[key])) {
                     changedFields[key] = updatedTask[key];
                     logPayload[`old_${key}`] = currentTask[key]; logPayload[`new_${key}`] = updatedTask[key];
                 }
             });
             if (Object.keys(changedFields).length > 0 && eventType === 'UPDATE_DETAILS') eventType = 'UPDATE_DETAILS';
             else if (Object.keys(changedFields).length > 0) logPayload.changed_details = changedFields;

            // Log only if something actually changed
            if (eventType !== 'UPDATE_DETAILS' || Object.keys(changedFields).length > 0) await logActivity(eventType, id, logPayload);

            // --- Notifications (As provided by user) ---
            const oldAssigneeId = currentTask.assignee_id; const newAssigneeId = updatedTask.assignee_id;
            const oldCollaboratorIds = currentTask.collaborator_ids || []; const newCollaboratorIds = updatedTask.collaborator_ids || [];
            if (newAssigneeId && newAssigneeId !== oldAssigneeId) { await _notifyUsers( [newAssigneeId], id, updatedTask.title, updatedTask.project_id, 'assignment', 'You were assigned to task: {taskTitle}', currentUserId ); }
            const addedCollaborators = newCollaboratorIds.filter(cid => !oldCollaboratorIds.includes(cid));
            if (addedCollaborators.length > 0) { await _notifyUsers( addedCollaborators, id, updatedTask.title, updatedTask.project_id, 'collaboration', 'You were added as a collaborator to task: {taskTitle}', currentUserId ); }

        } catch (error: any) {
            console.error(`Failed during task update process for ${id}:`, error);
            // Revert optimistic update using original task state (fetched or local fallback)
            if (originalTaskState) {
                 set((state) => ({
                     tasks: state.tasks.map((t) => (t.id === id ? originalTaskState : t)),
                     error: error.message,
                 }));
            } else { set({ error: error.message }); } // If original state wasn't available
            throw error; // Re-throw for UI feedback
        }
    },
    // --- END OF MODIFIED updateTask ---


    // deleteTask (As provided by user)
    deleteTask: async (id) => {
        try {
            const { data: task, error: fetchError } = await supabase.from('tickets').select('title, column_id').eq('id', id).single(); // Fetch column_id too
            const { error } = await supabase.from('tickets').delete().eq('id', id);
            if (error) throw error;
            set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id), error: null, }));
            const payload = { title: task?.title || 'Unknown Task', deleted_at: new Date().toISOString(), column_id: task?.column_id }; // Log original column
            await get().logActivity('DELETE', id, payload);
        } catch (error: any) {
            console.error("Delete Task Error:", error);
            set({ error: error.message });
            throw error;
        }
    },

    // fetchTasks (As provided by user, added formatter)
    fetchTasks: async (projectId) => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select('*') // Should include collaborator_ids
                .eq('project_id', projectId)
                .order('position', { ascending: true }); // Changed order
            if (error) throw error;
            const formattedTasks = (data || []).map(formatDbTask); // Use formatter
            set({ tasks: formattedTasks, loading: false });
        } catch (error: any) {
            console.error("Fetch Tasks Error:", error); // Added console error
            set({ error: error.message, loading: false });
            // Don't throw, let UI handle error state
        }
    },

    // fetchAssignedTasks (As provided by user, added formatter)
    fetchAssignedTasks: async (userId) => {
        set({ loading: true, error: null });
        try {
            const { data, error } = await supabase
                .from('tickets')
                .select('*') // Should include collaborator_ids
                .or(`assignee_id.eq.${userId},collaborator_ids.cs.{${userId}}`)
                .order('updated_at', { ascending: false }); // Changed order
            if (error) throw error;
            const formattedTasks = (data || []).map(formatDbTask); // Use formatter
            set({ tasks: formattedTasks, loading: false }); // Note: Overwrites project tasks
        } catch (error: any) {
             console.error("Fetch Assigned Tasks Error:", error); // Added console error
             set({ error: error.message, loading: false });
        }
    },

    // fetchTaskDetails (As provided by user, added formatter, return null)
    fetchTaskDetails: async (taskId): Promise<TaskDetailsPayload | null> => { // Return null on error
        try {
            const taskResult = await supabase.from('tickets').select('*').eq('id', taskId).single();
            if (taskResult.error) throw taskResult.error;
            if (!taskResult.data) return null; // Return null if not found
            const taskData: Task = formatDbTask(taskResult.data); // Use formatter
            const { project_id } = taskData;

            const [subtasksResult, commentsResult, customFieldsResult, ticketFieldsResult] = await Promise.all([
                supabase.from('subtasks').select('*').eq('ticket_id', taskId).order('created_at'),
                supabase.from('task_comments').select('*').eq('ticket_id', taskId).order('created_at'),
                supabase.from('custom_fields').select('*').eq('project_id', project_id),
                supabase.from('ticket_custom_fields').select('*').eq('ticket_id', taskId),
            ]);

            if (subtasksResult.error) throw subtasksResult.error; if (commentsResult.error) throw commentsResult.error;
            if (customFieldsResult.error) throw customFieldsResult.error; if (ticketFieldsResult.error) throw ticketFieldsResult.error;

            const customFields = (customFieldsResult.data || []).map((fieldDef) => {
                const ticketField = (ticketFieldsResult.data || []).find((tcf) => tcf.field_id === fieldDef.id);
                return { field_id: fieldDef.id, value: ticketField?.value ?? '', custom_fields: { id: fieldDef.id, name: fieldDef.name, type: fieldDef.type, options: fieldDef.options } };
            });

            return { task: taskData, subtasks: subtasksResult.data || [], comments: commentsResult.data || [], customFields };
        } catch (error: any) {
            console.error('Failed to fetch task details:', error);
            set({ error: error.message });
            return null; // Explicitly return null on error
        }
    },

    // updateTaskCustomField (As provided by user)
    updateTaskCustomField: async (ticketId, fieldId, value) => {
        try { const { error } = await supabase .from('ticket_custom_fields') .upsert( { ticket_id: ticketId, field_id: fieldId, value: value ?? null }, { onConflict: 'ticket_id, field_id' } ); if (error) throw error; }
        catch (error: any) { console.error("Update Custom Field Error:", error); set({ error: error.message }); throw error; }
    },

    // deleteTaskCustomField (As provided by user)
    deleteTaskCustomField: async (ticketId, fieldId) => {
        try { const { error } = await supabase .from('ticket_custom_fields') .delete() .eq('ticket_id', ticketId) .eq('field_id', fieldId); if (error) throw error; }
        catch (error: any) { console.error("Delete Custom Field Error:", error); set({ error: error.message }); throw error; }
    },

    // addSubtask (As provided by user)
    addSubtask: async (taskId, data) => {
        try {
            const { data: authData } = await supabase.auth.getUser(); const currentUserId = authData?.user?.id;
            const { error } = await supabase.from('subtasks').insert([{ ticket_id: taskId, title: data.title || "New Subtask", assignee_id: data.assignee_id, due_date: data.due_date, completed: false, created_by: data.created_by || currentUserId }]); // Use provided creator or current user
            if (error) throw error; set({ error: null });
        } catch (error: any) { console.error("Add Subtask Error:", error); set({ error: error.message }); throw error; }
    },

    // updateSubtask (As provided by user)
    updateSubtask: async (subtaskId, data) => {
        try { const { error } = await supabase.from('subtasks').update(data).eq('id', subtaskId); if (error) throw error; set({ error: null }); }
        catch (error: any) { console.error("Update Subtask Error:", error); set({ error: error.message }); throw error; }
    },

    // toggleSubtask (As provided by user)
    toggleSubtask: async (subtaskId, completed) => {
        try {
             const { data: authData } = await supabase.auth.getUser(); // Get user to potentially set completed_by
             const { error } = await supabase.from('subtasks').update({ completed, completed_at: completed ? new Date().toISOString() : null, completed_by: completed ? authData?.user?.id : null }).eq('id', subtaskId);
             if (error) throw error; set({ error: null });
        } catch (error: any) { console.error("Toggle Subtask Error:", error); set({ error: error.message }); throw error; }
    },

    // deleteSubtask (As provided by user)
    deleteSubtask: async (subtaskId) => {
        try { const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId); if (error) throw error; set({ error: null }); }
        catch (error: any) { console.error("Delete Subtask Error:", error); set({ error: error.message }); throw error; }
    },

    // addComment (As provided by user)
    addComment: async (taskId, content, mentionedUsers: string[] = []) => {
        try {
            const { data: authData } = await supabase.auth.getUser(); const currentUserId = authData?.user?.id; if (!currentUserId) throw new Error("User not authenticated");
            const { data: comment, error: commentError } = await supabase.from('task_comments').insert([{ ticket_id: taskId, content, created_by: currentUserId, mentioned_users: mentionedUsers || [], }]).select().single();
            if (commentError) throw commentError;

            const { data: taskData } = await supabase.from('tickets').select('project_id, title').eq('id', taskId).single();
            if (taskData && mentionedUsers && mentionedUsers.length > 0 && taskData.project_id) { // Added project_id check
                let mentionerName = authData.user.user_metadata?.firstName || 'Someone';
                // Add profile fetch fallback if needed
                const messageTemplate = `${mentionerName} mentioned you in task: {taskTitle}`;
                await get()._notifyUsers(mentionedUsers, taskId, taskData.title, taskData.project_id, 'mention', messageTemplate, currentUserId);
            }
            set({ error: null });
            return comment;
        } catch (error: any) { console.error("Add Comment Error:", error); set({ error: error.message }); return null; } // Return null on error
    },

    // updateComment (As provided by user)
    updateComment: async (commentId, content) => {
        try {
            const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("User not authenticated");
            const { data: comment, error: fetchError } = await supabase.from('task_comments').select('created_by').eq('id', commentId).single();
            if (fetchError || !comment) throw fetchError || new Error("Comment not found");
            if (comment.created_by !== user.id) throw new Error('Unauthorized to update this comment');
            const { error } = await supabase.from('task_comments').update({ content, updated_at: new Date().toISOString() }).eq('id', commentId); if (error) throw error; set({ error: null });
        } catch (error: any) { console.error("Update Comment Error:", error); set({ error: error.message }); throw error; }
    },

    // deleteComment (As provided by user)
    deleteComment: async (commentId) => {
        try {
            const { data: { user } } = await supabase.auth.getUser(); if (!user) throw new Error("User not authenticated");
            const { data: comment, error: fetchError } = await supabase.from('task_comments').select('created_by').eq('id', commentId).single();
            if (fetchError || !comment) throw fetchError || new Error("Comment not found");
            if (comment.created_by !== user.id) throw new Error('Unauthorized to delete this comment');
            const { error } = await supabase.from('task_comments').delete().eq('id', commentId); if (error) throw error; set({ error: null });
        } catch (error: any) { console.error("Delete Comment Error:", error); set({ error: error.message }); throw error; }
    },

})); // End of create store