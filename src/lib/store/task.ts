// task.ts
import { create } from 'zustand';
import { supabase } from '../supabase/client';
import { Task, Subtask, TaskComment } from './task/types';
import { TaskDetails } from '../../components/board/TaskDetails';

interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;
  setSelectedTaskId: (taskId: string | null) => void;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
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
        name: string;
        type: string;
      };
    }>;
  }>;
  updateTaskCustomField: (ticketId: string, fieldId: string, value: any) => Promise<void>;
  deleteTaskCustomField: (ticketId: string, fieldId: string) => Promise<void>;
  addSubtask: (taskId: string, data: { title: string; assignee_id?: string; due_date?: string; created_by: string }) => Promise<void>;
  updateSubtask: (subtaskId: string, data: Partial<Subtask>) => Promise<void>;
  toggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, mentionedUsers?: string[]) => Promise<TaskComment>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  selectedTaskId: null,

  setSelectedTaskId: (taskId) => {
    set({ selectedTaskId: taskId });
  },

  // Helper function to log activity
  logActivity: async (eventType: 'INSERT' | 'UPDATE_COLUMN' | 'DELETE', taskId: string, payload: any) => {
    try {
      // Get the current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.warn('No authenticated user found, logging as anonymous:', authError);
      }
      const currentUserId = user?.id || 'anonymous';

      const logEntry = {
        event_type: eventType,
        table_name: 'tickets',
        record_id: taskId, // Use taskId as record_id (ticket_id)
        payload: JSON.stringify(payload),
        created_by: currentUserId, // Use authenticated user ID or 'anonymous'
      };

      const { error } = await supabase
        .from('activity_log')
        .insert([logEntry]);

      if (error) {
        console.error('Failed to log task activity:', error);
      } else {
        console.log('Task activity logged successfully:', logEntry);
      }
    } catch (error) {
      console.error('Error logging task activity:', error);
    }
  },

  createTask: async (data) => {
    try {
      const { data: task, error } = await supabase
        .from('tickets')
        .insert([data])
        .select()
        .single();
      if (error) throw error;
      set((state) => ({
        tasks: [...state.tasks, task],
        error: null,
      }));

      // Log the INSERT after creating the task
      const payload = {
        title: task.title || 'Untitled Task',
        created_at: task.created_at || new Date().toISOString(),
        column_id: task.column_id,
      };
      await get().logActivity('INSERT', task.id, payload);

      // Get the current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const currentUserId = user?.id;

      // Send notification if there’s an assignee and it’s not the current user
      if (task.assignee_id && task.assignee_id !== currentUserId) {
        const { error: notifError } = await supabase.from('notifications').insert([
          {
            user_id: task.assignee_id,
            type: 'assignment',
            content: `You were assigned to a new task: ${task.title}`,
            link: `/projects/${task.project_id}?task=${task.id}`,
            metadata: {
              task_id: task.id,
              project_id: task.project_id,
            },
            read: false,
            created_by: currentUserId,
          },
        ]);
        if (notifError) console.error('Failed to create assignment notification:', notifError);
      }

      return task;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateTask: async (id, data) => {
    try {
      // Get the current task to compare old values
      const currentTask = get().tasks.find((t) => t.id === id) || (await supabase.from('tickets').select('*').eq('id', id).single()).data;
      if (!currentTask) throw new Error('Task not found');

      const { error } = await supabase.from('tickets').update(data).eq('id', id);
      if (error) throw error;

      // Update local state
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
        error: null,
      }));

      // Log only column moves
      const oldColumnId = currentTask.column_id;
      const newColumnId = data.column_id || oldColumnId;
      if (newColumnId !== oldColumnId) {
        const payload = {
          old_column_id: oldColumnId,
          new_column_id: newColumnId,
          updated_at: new Date().toISOString(),
        };
        await get().logActivity('UPDATE_COLUMN', id, payload);
      }

      // Get the current authenticated user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const currentUserId = user?.id;

      // Check if assignee changed and notify the new assignee
      const oldAssigneeId = currentTask.assignee_id;
      const newAssigneeId = data.assignee_id || oldAssigneeId;
      if (newAssigneeId && newAssigneeId !== oldAssigneeId && newAssigneeId !== currentUserId) {
        const { error: notifError } = await supabase.from('notifications').insert([
          {
            user_id: newAssigneeId,
            type: 'assignment',
            content: `You were assigned to task: ${currentTask.title}`,
            link: `/projects/${currentTask.project_id}?task=${id}`,
            metadata: {
              task_id: id,
              project_id: currentTask.project_id,
            },
            read: false,
            created_by: currentUserId,
          },
        ]);
        if (notifError) console.error('Failed to create assignment notification:', notifError);
      }
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteTask: async (id) => {
    try {
      // Get the task to log its details before deletion
      const { data: task, error: fetchError } = await supabase.from('tickets').select('*').eq('id', id).single();
      if (fetchError) throw fetchError;

      const { error } = await supabase.from('tickets').delete().eq('id', id);
      if (error) throw error;

      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        error: null,
      }));

      // Log the DELETE after deleting the task
      const payload = {
        title: task.title || 'Untitled Task',
        deleted_at: new Date().toISOString(),
      };
      await get().logActivity('DELETE', id, payload);
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  fetchTasks: async (projectId) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('tickets')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      set({ tasks: data || [], loading: false });
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
        .select('*')
        .eq('assignee_id', userId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      set({ tasks: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchTaskDetails: async (taskId) => {
    try {
      console.log("Fetching task details for Task ID:", taskId);
      // Fetch task details first to get the project_id.
      const taskResult = await supabase.from('tickets').select('*').eq('id', taskId).single();
      console.log("Task Result:", taskResult);
      if (taskResult.error) throw taskResult.error;
      const { project_id } = taskResult.data;
      // Fetch the other data in parallel after getting the project_id.
      const [subtasksResult, commentsResult, customFieldsResult, ticketFieldsResult] = await Promise.all([
        supabase.from('subtasks').select('*').eq('ticket_id', taskId).order('created_at'),
        supabase.from('task_comments').select('*').eq('ticket_id', taskId).order('created_at'),
        supabase.from('custom_fields').select('*').eq('project_id', project_id),
        supabase.from('ticket_custom_fields').select('*').eq('ticket_id', taskId),
      ]);
      console.log("Custom Fields Result:", customFieldsResult);
      console.log("Ticket Custom Fields Result:", ticketFieldsResult);
      if (subtasksResult.error) throw subtasksResult.error;
      if (commentsResult.error) throw commentsResult.error;
      if (customFieldsResult.error) throw customFieldsResult.error;
      if (ticketFieldsResult.error) throw ticketFieldsResult.error;
      // Merge custom fields with ticket-specific values.
      const customFields = customFieldsResult.data.map((field) => {
        const ticketField = ticketFieldsResult.data.find((tcf) => tcf.field_id === field.id);
        return {
          field_id: field.id,
          value: ticketField?.value || '',
          custom_fields: {
            name: field.name,
            type: field.type,
          },
        };
      });
      console.log("Final Custom Fields to be set:", customFields);
      return {
        task: taskResult.data,
        subtasks: subtasksResult.data || [],
        comments: commentsResult.data || [],
        customFields,
      };
    } catch (error: any) {
      console.error('Failed to fetch task details:', error);
      throw error;
    }
  },

  updateTaskCustomField: async (ticketId, fieldId, value) => {
    try {
      const { error } = await supabase
        .from('ticket_custom_fields')
        .upsert({ ticket_id: ticketId, field_id: fieldId, value })
        .eq('ticket_id', ticketId)
        .eq('field_id', fieldId);
      if (error) throw error;
    } catch (error: any) {
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
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  /**
   * Add a new subtask to a task
   * 
   * @param taskId - ID of the parent task
   * @param data - Data for the new subtask
   */
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
          created_by: currentUserId, // Use fetched user ID
        },
      ]).select().single();
      if (error) throw error;
      set({ error: null });
      return newSubtask; // Return the new subtask for logging if needed
    } catch (error: any) {
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
      set({ error: error.message });
      throw error;
    }
  },

  // UPDATED addComment FUNCTION (unchanged from your version)
  addComment: async (taskId, content, mentionedUsers: string[] = []) => {
    console.log(`addComment called at ${new Date().toISOString()} with taskId: ${taskId}, mentionedUsers: ${mentionedUsers}`);
    try {
      // Get the current user.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.id) {
        console.error('Error getting current user:', authError);
        throw authError || new Error('User not found');
      }
      const currentUserId = authData.user.id;
      const userMetadata = authData.user.user_metadata;
      const mentionerName = userMetadata?.firstName || 'Someone';
      console.log('Current user id:', currentUserId);
  
      // Fetch the mentioner's name from the profiles table
      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUserId)
        .single();
  
      // Set a fallback name if fetching fails or full_name is missing
      let creatorName = 'Someone';
      if (!creatorError && creatorData?.full_name) {
        creatorName = creatorData.full_name;
      }
  
      // Insert the comment
      const { data: comment, error: commentError } = await supabase
        .from('task_comments')
        .insert([
          {
            ticket_id: taskId,
            content,
            created_by: currentUserId,
            mentioned_users: mentionedUsers,
          },
        ])
        .select()
        .single();
  
      if (commentError) {
        console.error('Error adding comment:', commentError);
        throw commentError;
      }
  
      console.log('Comment added successfully:', comment);
      set({ error: null });
  
      // Create notifications for each mentioned user if any
      if (mentionedUsers.length > 0) {
        console.log('Processing notifications for mentioned users:', mentionedUsers);
        const { data: taskData, error: taskError } = await supabase
          .from('tickets')
          .select('project_id, title')
          .eq('id', taskId)
          .single();
  
        if (taskError || !taskData) {
          console.error('Error fetching task details for notification:', taskError);
        } else {
          console.log('Task data for notification:', taskData);
          // Use the task title, with a fallback if it’s missing
          const taskTitle = taskData.title || 'a task';
          for (const mentionedUser of mentionedUsers) {
            console.log(`Attempting to create notification for user: ${mentionedUser}`);
            // Updated notification content with the mentioner's name
            const notificationContent = `${mentionerName} mentioned you in ${taskTitle}`;
            const { data: notifData, error: notifError } = await supabase
              .from('notifications')
              .insert([
                {
                  user_id: mentionedUser,
                  type: 'mention',
                  content: notificationContent,
                  link: `/projects/${taskData.project_id}?task=${taskId}`,
                  metadata: {
                    comment_id: comment.id,
                    task_id: taskId,
                    project_id: taskData.project_id,
                  },
                  read: false,
                  created_by: currentUserId,
                },
              ])
              .select();
  
            if (notifError) {
              console.error(`Error creating notification for user ${mentionedUser}:`, notifError);
            } else {
              console.log(`Notification created for user ${mentionedUser}:`, notifData);
            }
          }
        }
      }
  
      return comment;
    } catch (error: any) {
      console.error('Failed to add comment:', error);
      set({ error: error.message });
      throw error;
    }
  },

  updateComment: async (commentId, content) => {
    try {
      const { error } = await supabase
        .from('task_comments')
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq('id', commentId);
      if (error) throw error;
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  deleteComment: async (commentId) => {
    try {
      const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
      if (error) throw error;
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));