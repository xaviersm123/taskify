import { create } from 'zustand';
import { supabase } from '../../supabase/client';
import { TaskState, Task, Subtask, TaskComment } from './types';

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  loading: false,
  error: null,
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),

  fetchTasks: async (projectId: string) => {
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

  createTask: async (data) => {
    try {
      const { data: task, error } = await supabase
        .from('tickets')
        .insert([data])
        .select()
        .single();

      if (error) throw error;

      set(state => ({
        tasks: [...state.tasks, task],
        error: null
      }));

      // Add a notification for the assignee if the task has an assignee
      if (data.assignee_id) {
        await supabase.from('notifications').insert({
          user_id: data.assignee_id,
          content: `You have been assigned a new task: ${data.title}`,
          link: `/tasks/${task.id}`,
          read: false
        });
      }

      return task;
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateTask: async (id, data) => {
    try {
      console.log('Updating task:', { id, data }); // Debug log

      const { error } = await supabase
        .from('tickets')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      // Create notification if assignee changed
      if (data.assignee_id) {
        console.log('Creating assignment notification for:', data.assignee_id); // Debug log
        
        const { data: task } = await supabase
          .from('tickets')
          .select('project_id, title')
          .eq('id', id)
          .single();

        await supabase.from('notifications').insert([{
          user_id: data.assignee_id,
          type: 'assignment',
          content: 'You have been assigned a new task',
          link: `/projects/${task?.project_id}?task=${id}`,
          metadata: {
            task_id: id,
            project_id: task?.project_id,
            task_title: task?.title
          }
        }]);
      }

      set(state => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...data } : t),
        error: null
      }));
    } catch (error: any) {
      console.error('Failed to update task:', error); // Debug log
      set({ error: error.message });
      throw error;
    }
  },

  deleteTask: async (id) => {
    try {
      const { error } = await supabase
        .from('tickets')
        .delete()
        .eq('id', id);

      if (error) throw error;

      set(state => ({
        tasks: state.tasks.filter(t => t.id !== id),
        error: null
      }));
    } catch (error: any) {
      set({ error: error.message });
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
      const [taskResult, subtasksResult, commentsResult, customFieldsResult, ticketFieldsResult] = await Promise.all([
        supabase.from('tickets').select('*').eq('id', taskId).single(),
        supabase.from('subtasks').select('*').eq('ticket_id', taskId).order('created_at'),
        supabase.from('task_comments').select('*').eq('ticket_id', taskId).order('created_at'),
        supabase.from('custom_fields').select('*').eq('project_id', taskResult.data?.project_id),
        supabase.from('ticket_custom_fields').select('*').eq('ticket_id', taskId),
      ]);
  
      if (taskResult.error) throw taskResult.error;
      if (subtasksResult.error) throw subtasksResult.error;
      if (commentsResult.error) throw commentsResult.error;
      if (customFieldsResult.error) throw customFieldsResult.error;
      if (ticketFieldsResult.error) throw ticketFieldsResult.error;
  
      // Merge custom fields with ticket-specific values
      const customFields = customFieldsResult.data.map((field) => {
        const ticketField = ticketFieldsResult.data.find((tcf) => tcf.field_id === field.id);
        return {
          ...field,
          value: ticketField?.value || '', // Assign value if it exists, else empty
        };
      });
  
      return {
        task: taskResult.data,
        subtasks: subtasksResult.data || [],
        comments: commentsResult.data || [],
        customFields, // Include combined custom fields
      };
    } catch (error) {
      set({ error: error.message });
      throw error;
    }
  };
  
  

  addSubtask: async (taskId, data) => {
    try {
      const { error } = await supabase
        .from('subtasks')
        .insert([{
          ticket_id: taskId,
          title: data.title,
          assignee_id: data.assignee_id,
          due_date: data.due_date,
          completed: false
        }]);

      if (error) throw error;
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  updateSubtask: async (subtaskId: string, data: Partial<Subtask>) => {
    try {
      console.log('Updating subtask:', { subtaskId, data }); // Debug log

      const { error } = await supabase
        .from('subtasks')
        .update(data)
        .eq('id', subtaskId);

      if (error) throw error;

      // Create notification if assignee changed
      if (data.assignee_id) {
        console.log('Creating subtask assignment notification for:', data.assignee_id); // Debug log
        
        const { data: subtask } = await supabase
          .from('subtasks')
          .select('ticket_id, title')
          .eq('id', subtaskId)
          .single();

        if (subtask) {
          const { data: task } = await supabase
            .from('tickets')
            .select('project_id')
            .eq('id', subtask.ticket_id)
            .single();

          await supabase.from('notifications').insert([{
            user_id: data.assignee_id,
            type: 'assignment',
            content: 'You have been assigned a new subtask',
            link: `/projects/${task?.project_id}?task=${subtask.ticket_id}`,
            metadata: {
              subtask_id: subtaskId,
              task_id: subtask.ticket_id,
              project_id: task?.project_id,
              subtask_title: subtask.title
            }
          }]);
        }
      }

      set({ error: null });
    } catch (error: any) {
      console.error('Failed to update subtask:', error); // Debug log
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
          completed_at: completed ? new Date().toISOString() : null
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
      const { error } = await supabase
        .from('subtasks')
        .delete()
        .eq('id', subtaskId);

      if (error) throw error;
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  },

  addComment: async (taskId: string, content: string, mentionedUsers: string[] = []) => {
    try {
      console.log('Adding comment with data:', { taskId, content, mentionedUsers });
      
      // Get the current user only once and store its id.
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData.user?.id) {
        console.error('Error getting current user:', authError);
        throw authError || new Error('User not found');
      }
      const currentUserId = authData.user.id;
      console.log('Current user id:', currentUserId);
      
      // Insert the comment into the 'task_comments' table.
      const { data: comment, error: commentError } = await supabase
        .from('task_comments')
        .insert([
          {
            ticket_id: taskId,
            content,
            created_by: currentUserId,
            // Save mentioned_users as an array if there are any, or null otherwise.
            mentioned_users: mentionedUsers.length > 0 ? mentionedUsers : null,
          }
        ])
        .select()  // Return the inserted row(s)
        .single();
        
      if (commentError) {
        console.error('Error adding comment:', commentError);
        throw commentError;
      }
      
      console.log('Comment added successfully:', comment);
      set({ error: null });
      
      // If there are mentioned users, create notifications.
      if (mentionedUsers.length > 0) {
        console.log('Processing notifications for mentioned users:', mentionedUsers);
        
        // Fetch task details to get the project info.
        const { data: taskData, error: taskError } = await supabase
          .from('tickets')
          .select('project_id, title')
          .eq('id', taskId)
          .single();
          
        if (taskError) {
          console.error('Error fetching task details for notification:', taskError);
        } else if (!taskData) {
          console.error('No task data returned for taskId:', taskId);
        } else {
          console.log('Task data for notification:', taskData);
          // Loop through each mentioned user and insert a notification.
          for (const mentionedUser of mentionedUsers) {
            console.log(`Attempting to create notification for user: ${mentionedUser}`);
            
            const { data: notifData, error: notifError } = await supabase
              .from('notifications')
              .insert([
                {
                  user_id: mentionedUser,
                  type: 'mention',
                  content: `You were mentioned in a comment on task: ${taskData.title}`,
                  link: `/projects/${taskData.project_id}?task=${taskId}`,
                  metadata: {
                    comment_id: comment.id,
                    task_id: taskId,
                    project_id: taskData.project_id,
                  },
                  read: false,
                  created_by: currentUserId,
                }
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
        .update({ content })
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
      const { error } = await supabase
        .from('task_comments')
        .delete()
        .eq('id', commentId);

      if (error) throw error;
      set({ error: null });
    } catch (error: any) {
      set({ error: error.message });
      throw error;
    }
  }
}));