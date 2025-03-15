import { create } from 'zustand';
import { supabase } from '../supabase/client';
import { Task, Subtask, TaskComment } from './task/types';

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
        id: string;
        name: string;
        type: string;
        options: any;
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

  setSelectedTaskId: (taskId) => set({ selectedTaskId: taskId }),

  // Helper function to log activity
  logActivity: async (eventType: 'INSERT' | 'UPDATE_COLUMN' | 'UPDATE_POSITION' | 'DELETE', taskId: string, payload: any) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) console.warn('No authenticated user found:', authError);
      const currentUserId = user?.id || 'anonymous';

      const logEntry = {
        event_type: eventType,
        table_name: 'tickets',
        record_id: taskId,
        payload: JSON.stringify(payload),
        created_by: currentUserId,
      };

      const { error } = await supabase.from('activity_log').insert([logEntry]);
      if (error) console.error('Failed to log task activity:', error);
    } catch (error) {
      console.error('Error logging task activity:', error);
    }
  },

  createTask: async (data) => {
    try {
      // Fetch the highest position for the column (if column_id is provided)
      let position = 0;
      if (data.column_id) {
        const { data: tasks, error: fetchError } = await supabase
          .from('tickets')
          .select('position')
          .eq('column_id', data.column_id)
          .order('position', { ascending: false })
          .limit(1);
        if (fetchError) throw fetchError;
        position = tasks.length > 0 ? (tasks[0].position || 0) + 1 : 0;
      }

      const taskData = { ...data, position };
      const { data: task, error } = await supabase
        .from('tickets')
        .insert([taskData])
        .select()
        .single();
      if (error) throw error;

      set((state) => ({
        tasks: [...state.tasks, task],
        error: null,
      }));

      const payload = {
        title: task.title || 'Untitled Task',
        created_at: task.created_at || new Date().toISOString(),
        column_id: task.column_id,
        position: task.position,
      };
      await get().logActivity('INSERT', task.id, payload);

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const currentUserId = user?.id;

      if (task.assignee_id && task.assignee_id !== currentUserId) {
        const { error: notifError } = await supabase.from('notifications').insert([
          {
            user_id: task.assignee_id,
            type: 'assignment',
            content: `You were assigned to a new task: ${task.title}`,
            link: `/projects/${task.project_id}?task=${task.id}`,
            metadata: { task_id: task.id, project_id: task.project_id },
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
      const currentTask = get().tasks.find((t) => t.id === id) || (await supabase.from('tickets').select('*').eq('id', id).single()).data;
      if (!currentTask) throw new Error('Task not found');

      const { error } = await supabase.from('tickets').update(data).eq('id', id);
      if (error) throw error;

      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
        error: null,
      }));

      const oldColumnId = currentTask.column_id;
      const newColumnId = data.column_id || oldColumnId;
      const oldPosition = currentTask.position;
      const newPosition = data.position ?? oldPosition;

      if (newColumnId !== oldColumnId || newPosition !== oldPosition) {
        const payload = {
          old_column_id: oldColumnId,
          new_column_id: newColumnId,
          old_position: oldPosition,
          new_position: newPosition,
          updated_at: new Date().toISOString(),
        };
        const eventType = newColumnId !== oldColumnId ? 'UPDATE_COLUMN' : 'UPDATE_POSITION';
        await get().logActivity(eventType, id, payload);
      }

      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      const currentUserId = user?.id;

      const oldAssigneeId = currentTask.assignee_id;
      const newAssigneeId = data.assignee_id || oldAssigneeId;
      if (newAssigneeId && newAssigneeId !== oldAssigneeId && newAssigneeId !== currentUserId) {
        const { error: notifError } = await supabase.from('notifications').insert([
          {
            user_id: newAssigneeId,
            type: 'assignment',
            content: `You were assigned to task: ${currentTask.title}`,
            link: `/projects/${currentTask.project_id}?task=${id}`,
            metadata: { task_id: id, project_id: currentTask.project_id },
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
      const { data: task, error: fetchError } = await supabase.from('tickets').select('*').eq('id', id).single();
      if (fetchError) throw fetchError;

      const { error } = await supabase.from('tickets').delete().eq('id', id);
      if (error) throw error;

      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        error: null,
      }));

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
        .order('column_id', { ascending: true }) // Sort by column_id first
        .order('position', { ascending: true }); // Then by position within each column
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
        .order('column_id', { ascending: true })
        .order('position', { ascending: true });
      if (error) throw error;
      set({ tasks: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  fetchTaskDetails: async (taskId) => {
    try {
      const taskResult = await supabase.from('tickets').select('*').eq('id', taskId).single();
      if (taskResult.error) throw taskResult.error;
      const { project_id } = taskResult.data;

      const [subtasksResult, commentsResult, customFieldsResult, ticketFieldsResult] = await Promise.all([
        supabase.from('subtasks').select('*').eq('ticket_id', taskId).order('created_at'),
        supabase.from('task_comments').select('*').eq('ticket_id', taskId).order('created_at'),
        supabase.from('custom_fields').select('*').eq('project_id', project_id),
        supabase.from('ticket_custom_fields').select('*').eq('ticket_id', taskId),
      ]);

      if (subtasksResult.error) throw subtasksResult.error;
      if (commentsResult.error) throw commentsResult.error;
      if (customFieldsResult.error) throw customFieldsResult.error;
      if (ticketFieldsResult.error) throw ticketFieldsResult.error;

      const customFields = customFieldsResult.data.map((field) => {
        const ticketField = ticketFieldsResult.data.find((tcf) => tcf.field_id === field.id);
        return {
          field_id: field.id,
          value: ticketField?.value || '',
          custom_fields: {
            id: field.id,
            name: field.name,
            type: field.type,
            options: field.options,
          },
        };
      });

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
      return newSubtask;
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

  addComment: async (taskId, content, mentionedUsers: string[] = []) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.id) throw authError || new Error('User not found');
      const currentUserId = authData.user.id;
      const userMetadata = authData.user.user_metadata;
      const mentionerName = userMetadata?.firstName || 'Someone';

      const { data: creatorData, error: creatorError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', currentUserId)
        .single();

      let creatorName = 'Someone';
      if (!creatorError && creatorData?.full_name) creatorName = creatorData.full_name;

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

      if (commentError) throw commentError;
      set({ error: null });

      if (mentionedUsers.length > 0) {
        const { data: taskData, error: taskError } = await supabase
          .from('tickets')
          .select('project_id, title')
          .eq('id', taskId)
          .single();

        if (!taskError && taskData) {
          const taskTitle = taskData.title || 'a task';
          for (const mentionedUser of mentionedUsers) {
            const notificationContent = `${mentionerName} mentioned you in ${taskTitle}`;
            const { error: notifError } = await supabase.from('notifications').insert([
              {
                user_id: mentionedUser,
                type: 'mention',
                content: notificationContent,
                link: `/projects/${taskData.project_id}?task=${taskId}`,
                metadata: { comment_id: comment.id, task_id: taskId, project_id: taskData.project_id },
                read: false,
                created_by: currentUserId,
              },
            ]);
            if (notifError) console.error(`Error creating notification for ${mentionedUser}:`, notifError);
          }
        }
      }

      return comment;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateComment: async (commentId, content) => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError || new Error('User not authenticated');
      const currentUserId = user.id;

      const { data: comment, error: fetchError } = await supabase
        .from('task_comments')
        .select('created_by')
        .eq('id', commentId)
        .single();

      if (fetchError) throw fetchError;
      if (!comment || comment.created_by !== currentUserId) throw new Error('Unauthorized');

      const { error } = await supabase
        .from('task_comments')
        .update({ content, updated_at: new Date().toISOString() })
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
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError || new Error('User not authenticated');
      const currentUserId = user.id;

      const { data: comment, error: fetchError } = await supabase
        .from('task_comments')
        .select('created_by')
        .eq('id', commentId)
        .single();

      if (fetchError) throw fetchError;
      if (!comment || comment.created_by !== currentUserId) throw new Error('Unauthorized');

      const { error } = await supabase.from('task_comments').delete().eq('id', commentId);
      if (error) throw error;
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },
}));