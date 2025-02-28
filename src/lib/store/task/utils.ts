import { Task } from './types';

export function validateTask(data: Partial<Task>): void {
  if (!data.title?.trim()) {
    throw new Error('Task title is required');
  }

  if (!data.project_id) {
    throw new Error('Project ID is required');
  }

  if (data.status && !['todo', 'in_progress', 'complete'].includes(data.status)) {
    throw new Error('Invalid task status');
  }
}

export function formatTaskError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unexpected error occurred';
}

export function isValidTaskStatus(status: string): status is Task['status'] {
  return ['todo', 'in_progress', 'complete'].includes(status);
}