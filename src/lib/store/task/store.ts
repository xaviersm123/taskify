import { create } from 'zustand';
import { supabase } from '../supabase/client';
import { Task, Subtask, TaskComment } from './types'; // Ensure types are correctly imported
// Import the board store to check for ruler columns
import { useBoardStore } from '../board'; // Adjust path if needed

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;
  setSelectedTaskId: (taskId: string | null) => void;
  createTask: (data: Partial<Omit<Task, 'id' | 'created_at'>>) => Promise<Task | null>; // More specific input type
  updateTask: (id: string, data: Partial<Omit<Task, 'id' | 'project_id' | 'created_at'>>) => Promise<void>; // More specific input type
  deleteTask: (id: string) => Promise<void>;
  fetchTasks: (projectId: string) => Promise<void>;
  fetchAssignedTasks: (userId: string) => Promise<void>;
  fetchTaskDetails: (taskId: string) => Promise<{
    task: Task;
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
  } | null >; // Allow null return on error
  updateTaskCustomField: (ticketId: string, fieldId: string, value: any) => Promise<void>;
  deleteTaskCustomField: (ticketId: string, fieldId: string) => Promise<void>;
  addSubtask: (taskId: string, data: { title: string; assignee_id?: string; due_date?: string; created_by?: string }) => Promise<Subtask | null>; // Added created_by optional, return Subtask or null
  updateSubtask: (subtaskId: string, data: Partial<Subtask>) => Promise<void>;
  toggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, mentionedUsers?: string[]) => Promise<TaskComment | null>; // Return null on error
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

// Helper function to ensure task properties match the Task type
const formatDbTask = (dbTask: any): Task => {
    // Basic validation/formatting example
    return {
        id: dbTask.id,
        title: dbTask.title ?? 'Untitled Task',
        description: dbTask.description,
        // Ensure status is one of the allowed values
        status: ['todo', 'in_progress', 'complete'].includes(dbTask.status) ? dbTask.status : 'todo',
        priority: ['low', 'medium', 'high', 'urgent'].includes(dbTask.priority) ? dbTask.priority : undefined,
        project_id: dbTask.project_id,
        column_id: dbTask.column_id,
        position: typeof dbTask.position === 'number' ? dbTask.position : (parseInt(String(dbTask.position), 10) || 0), // Ensure position is number
        assignee_id: dbTask.assignee_id,
        collaborator_ids: Array.isArray(dbTask.collaborator_ids) ? dbTask.collaborator_ids : [], // Ensure array
        due_date: dbTask.due_date,
        created_at: dbTask.created_at,
        created_by: dbTask.created_by,
        customFields: Array.isArray(dbTask.customFields) ? dbTask.customFields : [], // Ensure array if fetched directly
        updated_at: dbTask.updated_at,
    };
};


export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  selectedTaskId: null,

  setSelectedTaskId: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  // --- logActivity (Keep as is, but ensure payload includes automation flag if needed) ---
  logActivity: async (eventType: 'INSERT' | 'UPDATE_COLUMN' | 'DELETE', taskId: string, payload: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const currentUserId = user?.id || 'anonymous'; // Use anonymous if no user

      const logEntry = {
        event_type: eventType,
        table_name: 'tickets', // Assuming logs are for tickets table primarily
        record_id: taskId,
        payload: JSON.stringify(payload),
        created_by: currentUserId,
      };

      const { error } = await supabase
        .from('activity_log') // Make sure this table exists and user has INSERT permission
        .insert([logEntry]);

      if (error) {
        console.error('Failed to log task activity:', error.message, logEntry);
      } else {
        // console.log('Task activity logged successfully:', logEntry);
      }
    } catch (error) {
      console.error('Error in logActivity function:', error);
    }
  },


  // --- createTask (Ensure it returns formatted task, log correctly) ---
  createTask: async (data) => {
     set({ error: null }); // Clear previous error
     try {
       // Ensure required fields like project_id are present
       if (!data.project_id) throw new Error("Project ID is required to create a task.");
       if (!data.title) data.title = "Untitled Task"; // Default title

       // Get current user for created_by
       const { data: { user } } = await supabase.auth.getUser();
       const insertData = { ...data, created_by: user?.id };

       const { data: newTaskDb, error } = await supabase
         .from('tickets')
         .insert([insertData])
         .select()
         .single();

       if (error) throw error;
       if (!newTaskDb) throw new Error("Task creation failed, no data returned.");

       const formattedTask = formatDbTask(newTaskDb); // Format the result

       set((state) => ({
         tasks: [...state.tasks, formattedTask], // Add formatted task
       }));

       // Log the INSERT activity
       const logPayload = {
         title: formattedTask.title,
         created_at: formattedTask.created_at,
         column_id: formattedTask.column_id,
         // Add other relevant fields if needed
       };
       await get().logActivity('INSERT', formattedTask.id, logPayload);

       // --- Notification Logic (Optional, keep if needed) ---
       if (formattedTask.assignee_id && formattedTask.assignee_id !== user?.id) {
         const { error: notifError } = await supabase.from('notifications').insert([ /* ... notification data ... */ ]);
         if (notifError) console.error('Failed to create assignment notification:', notifError);
       }
       // --- End Notification Logic ---

       return formattedTask; // Return the newly created and formatted task

     } catch (error: any) {
       console.error("Failed to create task:", error);
       set({ error: error.message });
       // throw error; // Re-throw if the caller needs to handle it
       return null; // Indicate failure
     }
   },


  // --- UPDATE TASK (WITH RULER AUTOMATION) ---
  updateTask: async (id, data) => {
    const { tasks } = get(); // Get current tasks state
    const taskIndex = tasks.findIndex((t) => t.id === id);

    if (taskIndex === -1) {
        const errorMsg = `Task with id ${id} not found in store for update.`;
        console.error(errorMsg);
        set({ error: errorMsg });
        throw new Error(errorMsg); // Stop execution if task isn't found locally
    }
    const currentTask = tasks[taskIndex]; // The task *before* any updates

    // --- AUTOMATION LOGIC ---
    let finalUpdateData = { ...data }; // Start with the requested update data
    let movedByAutomation = false; // Flag for logging
    let rulerColumnIdFound: string | null = null;

    // Check if status is being set to 'complete' AND the task is not already complete
    if (finalUpdateData.status === 'complete' && currentTask.status !== 'complete') {
        console.log(`Task ${id} ('${currentTask.title}') marked complete. Checking for ruler column...`);
        const projectId = currentTask.project_id;

        // Access board store state directly to find the ruler
        const boardColumns = useBoardStore.getState().columns;
        const rulerColumn = boardColumns.find(
            col => col.project_id === projectId && col.is_ruler_column
        );

        if (rulerColumn && rulerColumn.id !== currentTask.column_id) {
            console.log(`Ruler column found: ${rulerColumn.id} ('${rulerColumn.name}'). Moving task...`);
            rulerColumnIdFound = rulerColumn.id; // Store for state update later
            movedByAutomation = true;

            // Add column_id to the data being sent to Supabase
            finalUpdateData.column_id = rulerColumn.id;

            // Calculate new position (append to the end of the ruler column)
            // Filter tasks currently in the store that will be in the ruler column *after* this move potentially finishes
             const tasksInRulerColStore = get().tasks.filter(t =>
                 t.column_id === rulerColumn.id && t.id !== id // Exclude the task being moved
             );
            // Find the maximum position among those tasks
            const maxPosition = tasksInRulerColStore.reduce((max, t) => Math.max(max, t.position ?? -1), -1);
            finalUpdateData.position = maxPosition + 1; // Append after the last one
            console.log(`Calculated new position in ruler column: ${finalUpdateData.position}`);

        } else if (rulerColumn && rulerColumn.id === currentTask.column_id) {
            console.log(`Task ${id} is already in the ruler column ('${rulerColumn.name}'). No move needed.`);
        } else {
            console.log(`No ruler column set for project ${projectId} or task status not changing to complete.`);
        }
    }
    // --- END AUTOMATION LOGIC ---


    // Prepare optimistic update data based on the *final* data (may include ruler move)
    const optimisticTaskData = formatDbTask({ ...currentTask, ...finalUpdateData });

    // Optimistic state update (reflecting potential move and other changes)
    set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? optimisticTaskData : t)),
        error: null, // Clear error optimisticallly
    }));

    try {
        // --- Execute DB Update with finalUpdateData ---
        const { error: updateError } = await supabase
            .from('tickets')
            .update(finalUpdateData) // Use the potentially modified data
            .eq('id', id);

        if (updateError) throw updateError; // Throw error to be caught below
        console.log(`Task ${id} updated successfully in DB.`, finalUpdateData);


        // --- Post-Update Logic (Logging, Notifications) ---

        // Log column moves accurately
        const oldColumnId = currentTask.column_id; // From task *before* update
        const newColumnId = finalUpdateData.column_id || oldColumnId; // Column ID after update (could be from ruler or manual drag)

        if (newColumnId !== oldColumnId) {
            const logPayload = {
                old_column_id: oldColumnId,
                new_column_id: newColumnId,
                updated_at: new Date().toISOString(),
                moved_by_automation: movedByAutomation // Include the automation flag
            };
             await get().logActivity('UPDATE_COLUMN', id, logPayload);
             console.log(`Logged column move for task ${id}. Automated: ${movedByAutomation}`);
        }

        // Notify assignee if changed (using finalUpdateData and currentTask)
        const oldAssigneeId = currentTask.assignee_id;
        const newAssigneeId = finalUpdateData.assignee_id === null ? null : (finalUpdateData.assignee_id || oldAssigneeId); // Handle unassignment

        if (newAssigneeId !== oldAssigneeId) { // Check if it actually changed
             const { data: { user } } = await supabase.auth.getUser();
             const currentUserId = user?.id;

             if (newAssigneeId && newAssigneeId !== currentUserId) { // Only notify if *new* assignee exists and isn't self
                 console.log(`Assignee changed for task ${id}, sending notification to ${newAssigneeId}`);
                 const { error: notifError } = await supabase.from('notifications').insert([
                     {
                         user_id: newAssigneeId,
                         type: 'assignment',
                         content: `You were assigned to task: ${currentTask.title || 'Untitled'}`, // Use title before potential update in this request
                         link: `/projects/${currentTask.project_id}?task=${id}`,
                         metadata: { task_id: id, project_id: currentTask.project_id },
                         read: false,
                         created_by: currentUserId,
                     },
                 ]);
                 if (notifError) console.error('Failed to create assignment notification:', notifError);
             } else {
                  console.log(`Assignee changed for task ${id}, but not sending notification (unassigned, self-assigned, or no new assignee).`);
             }
        }
        // --- End Post-Update Logic ---

    } catch (error: any) {
        console.error(`Failed to update task ${id} in DB:`, error);
        // Revert optimistic update on error
        set((state) => ({
            tasks: state.tasks.map((t) => (t.id === id ? currentTask : t)), // Revert to original task data before this update
            error: error.message,
        }));
        throw error; // Re-throw for caller/UI feedback
    }
},


  // --- deleteTask (Keep existing logic, ensure log includes relevant info) ---
  deleteTask: async (id) => {
    set({ error: null }); // Clear previous error
    const taskToDelete = get().tasks.find(t => t.id === id); // Get data *before* deleting

    try {
      const { error } = await supabase.from('tickets').delete().eq('id', id);
      if (error) throw error;

      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
      }));

      // Log the DELETE activity if task data was found
      if (taskToDelete) {
          const payload = {
            title: taskToDelete.title || 'Untitled Task',
            deleted_at: new Date().toISOString(),
            column_id: taskToDelete.column_id, // Log original column
          };
          await get().logActivity('DELETE', id, payload);
      } else {
           console.warn(`Could not find task ${id} locally to log its details upon deletion.`);
      }

    } catch (error: any) {
       console.error(`Failed to delete task ${id}:`, error);
       set({ error: error.message });
       throw error;
    }
  },

  // --- fetchTasks (Format data on fetch) ---
  fetchTasks: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('project_id', projectId)
        // Consider ordering by position within column if relevant for default view
         .order('column_id')
         .order('position', { ascending: true }); // Or order by created_at

      if (error) throw error;
      const formattedTasks = (data || []).map(formatDbTask); // Format tasks
      set({ tasks: formattedTasks, loading: false });
    } catch (error: any) {
      console.error(`Failed to fetch tasks for project ${projectId}:`, error);
      set({ error: error.message, loading: false });
      // Do not throw error here usually, let UI handle loading/error state
    }
  },

  // --- fetchAssignedTasks (Format data on fetch) ---
  fetchAssignedTasks: async (userId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('assignee_id', userId)
        .order('created_at', { ascending: false }); // Or other relevant order

      if (error) throw error;
       const formattedTasks = (data || []).map(formatDbTask); // Format tasks
      set({ tasks: formattedTasks, loading: false }); // Overwrites project tasks? Decide if this is desired behavior
    } catch (error: any) {
       console.error(`Failed to fetch assigned tasks for user ${userId}:`, error);
       set({ error: error.message, loading: false });
    }
  },

  // --- fetchTaskDetails (Ensure formatting, handle errors) ---
  fetchTaskDetails: async (taskId) => {
     set({ error: null }); // Clear previous error
     try {
       // Fetch task details (logic seems okay, ensure Task type includes all fields)
       const taskResult = await supabase.from('tickets').select('*').eq('id', taskId).single();
       if (taskResult.error) throw taskResult.error;
       if (!taskResult.data) throw new Error("Task not found.");

       const taskData = formatDbTask(taskResult.data); // Format the main task data
       const { project_id } = taskData;

       // Fetch related data
       const [subtasksResult, commentsResult, customFieldsResult, ticketFieldsResult] = await Promise.all([
         supabase.from('subtasks').select('*').eq('ticket_id', taskId).order('created_at'),
         supabase.from('task_comments').select('*').eq('ticket_id', taskId).order('created_at'),
         supabase.from('custom_fields').select('*').eq('project_id', project_id),
         supabase.from('ticket_custom_fields').select('*').eq('ticket_id', taskId),
       ]);

       // Error handling for parallel fetches
       if (subtasksResult.error) throw subtasksResult.error;
       if (commentsResult.error) throw commentsResult.error;
       if (customFieldsResult.error) throw customFieldsResult.error;
       if (ticketFieldsResult.error) throw ticketFieldsResult.error;

       // Process custom fields (ensure options are parsed if needed)
       const customFields = (customFieldsResult.data || []).map((field) => {
         const ticketField = (ticketFieldsResult.data || []).find((tcf) => tcf.field_id === field.id);
         // Basic parsing example for options, adjust if options are stored differently
         let options = [];
         if (field.options && typeof field.options === 'string') {
             try { options = JSON.parse(field.options); } catch { /* ignore parse error */ }
         } else if (Array.isArray(field.options)) {
             options = field.options;
         }
         return {
           field_id: field.id,
           value: ticketField?.value ?? '', // Default to empty string
           custom_fields: {
             id: field.id,
             name: field.name,
             type: field.type,
             options: options, // Use parsed options
           },
         };
       });

       return {
         task: taskData, // Return formatted task
         subtasks: subtasksResult.data || [],
         comments: commentsResult.data || [],
         customFields,
       };
     } catch (error: any) {
       console.error('Failed to fetch task details:', error);
       set({ error: error.message }); // Set error state
       return null; // Indicate failure
     }
   },

  // --- Custom Field Updates (Keep existing logic) ---
  updateTaskCustomField: async (ticketId, fieldId, value) => {
     set({ error: null });
     try {
       const { error } = await supabase
         .from('ticket_custom_fields')
         .upsert({ ticket_id: ticketId, field_id: fieldId, value: value ?? null }) // Handle null/undefined value
         .eq('ticket_id', ticketId) // Ensure composite key constraint works
         .eq('field_id', fieldId);
       if (error) throw error;
     } catch (error: any) {
       console.error(`Failed to update custom field ${fieldId} for task ${ticketId}:`, error);
       set({ error: error.message });
       throw error;
     }
   },

  deleteTaskCustomField: async (ticketId, fieldId) => {
      set({ error: null });
      try {
        // Usually you'd just set the value to null/empty rather than deleting the row
        // But if deleting is intended:
        const { error } = await supabase
          .from('ticket_custom_fields')
          .delete()
          .eq('ticket_id', ticketId)
          .eq('field_id', fieldId);
        if (error) throw error;
      } catch (error: any) {
          console.error(`Failed to delete custom field ${fieldId} for task ${ticketId}:`, error);
          set({ error: error.message });
          throw error;
      }
    },

  // --- Subtask and Comment Actions (Keep existing logic, add formatting/error handling as needed) ---
  addSubtask: async (taskId, data) => {
      set({ error: null });
      try {
        const { data: authData } = await supabase.auth.getUser();
        const userId = authData?.user?.id;

        const { data: newSubtask, error } = await supabase.from('subtasks').insert([
          {
            ticket_id: taskId,
            title: data.title || "New Subtask", // Default title
            assignee_id: data.assignee_id,
            due_date: data.due_date,
            completed: false,
            created_by: data.created_by || userId, // Use provided or current user
          },
        ]).select().single();

        if (error) throw error;
        return newSubtask; // Return the created subtask
      } catch (error: any) {
        console.error(`Failed to add subtask to task ${taskId}:`, error);
        set({ error: error.message });
        return null; // Indicate failure
      }
    },

   updateSubtask: async (subtaskId, data) => {
       set({ error: null });
       try {
           const { error } = await supabase.from('subtasks').update(data).eq('id', subtaskId);
           if (error) throw error;
           // Note: This doesn't update the subtasks array within a fetched TaskDetails state.
           // The TaskDetails component needs to refetch or receive updates via subscription/callback.
       } catch (error: any) {
           console.error(`Failed to update subtask ${subtaskId}:`, error);
           set({ error: error.message });
           throw error;
       }
   },

   toggleSubtask: async (subtaskId, completed) => {
       set({ error: null });
       try {
          const { data: authData } = await supabase.auth.getUser();
          const userId = authData?.user?.id;
          const { error } = await supabase
            .from('subtasks')
            .update({
              completed,
              completed_at: completed ? new Date().toISOString() : null,
              completed_by: completed ? userId : null, // Track who completed it
            })
            .eq('id', subtaskId);
          if (error) throw error;
           // Again, TaskDetails needs to refetch or be updated.
       } catch (error: any) {
          console.error(`Failed to toggle subtask ${subtaskId}:`, error);
          set({ error: error.message });
          throw error;
       }
   },

   deleteSubtask: async (subtaskId) => {
       set({ error: null });
       try {
           const { error } = await supabase.from('subtasks').delete().eq('id', subtaskId);
           if (error) throw error;
           // TaskDetails needs to refetch or be updated.
       } catch (error: any) {
           console.error(`Failed to delete subtask ${subtaskId}:`, error);
           set({ error: error.message });
           throw error;
       }
   },

   addComment: async (taskId, content, mentionedUsers = []) => {
       set({ error: null });
       try {
           // Existing logic seems okay, ensure mentioned_users column exists and is array type
           const { data: authData } = await supabase.auth.getUser();
           const currentUserId = authData?.user?.id;
           if (!currentUserId) throw new Error("User not authenticated");

           const { data: comment, error: commentError } = await supabase
               .from('task_comments')
               .insert([{
                   ticket_id: taskId,
                   content,
                   created_by: currentUserId,
                   mentioned_users: mentionedUsers.length > 0 ? mentionedUsers : null, // Store null if empty?
               }])
               .select()
               .single();

           if (commentError) throw commentError;

           // Existing notification logic...
           if (mentionedUsers.length > 0) {
             // ... fetch task details, loop, insert notifications ...
           }

           return comment;
       } catch (error: any) {
           console.error(`Failed to add comment to task ${taskId}:`, error);
           set({ error: error.message });
           return null; // Indicate failure
       }
   },

   updateComment: async (commentId, content) => {
      set({ error: null });
      try {
          // ... (authorization check logic) ...
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("User not authenticated");
          const { data: comment, error: fetchError } = await supabase.from('task_comments').select('created_by').eq('id', commentId).single();
          if (fetchError || !comment) throw fetchError || new Error("Comment not found");
          if (comment.created_by !== user.id) throw new Error("Not authorized to edit this comment");

          const { error: updateError } = await supabase
              .from('task_comments')
              .update({ content, updated_at: new Date().toISOString() })
              .eq('id', commentId);
          if (updateError) throw updateError;
          // TaskDetails needs to refetch comments or be updated.
      } catch (error: any) {
           console.error(`Failed to update comment ${commentId}:`, error);
           set({ error: error.message });
           throw error;
      }
   },

   deleteComment: async (commentId) => {
       set({ error: null });
       try {
           // ... (authorization check logic) ...
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("User not authenticated");
            const { data: comment, error: fetchError } = await supabase.from('task_comments').select('created_by').eq('id', commentId).single();
            if (fetchError || !comment) throw fetchError || new Error("Comment not found");
            if (comment.created_by !== user.id) throw new Error("Not authorized to delete this comment");


           const { error: deleteError } = await supabase
               .from('task_comments')
               .delete()
               .eq('id', commentId);
           if (deleteError) throw deleteError;
           // TaskDetails needs to refetch comments or be updated.
       } catch (error: any) {
           console.error(`Failed to delete comment ${commentId}:`, error);
           set({ error: error.message });
           throw error;
       }
   },

}));