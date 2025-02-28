import { supabase } from '../../supabase/client';
import { ApiError } from '../../utils/api-error';
import { withRetry } from '../../utils/retry';
import type { Task, TaskUpdate } from './types';

export async function updateTask(id: string, data: TaskUpdate): Promise<void> {
  return withRetry(async () => {
    const { error } = await supabase
      .from('tickets')
      .update(data)
      .eq('id', id);

    if (error) throw ApiError.fromError(error);
  });
}

export async function fetchTaskDetails(taskId: string) {
  return withRetry(async () => {
    const [taskResult, subtasksResult, commentsResult] = await Promise.all([
      supabase.from('tickets').select('*').eq('id', taskId).single(),
      supabase.from('subtasks').select('*').eq('ticket_id', taskId).order('created_at'),
      supabase.from('task_comments').select('*').eq('ticket_id', taskId).order('created_at')
    ]);

    if (taskResult.error) throw ApiError.fromError(taskResult.error);
    if (subtasksResult.error) throw ApiError.fromError(subtasksResult.error);
    if (commentsResult.error) throw ApiError.fromError(commentsResult.error);

    return {
      task: taskResult.data,
      subtasks: subtasksResult.data || [],
      comments: commentsResult.data || []
    };
  });
}