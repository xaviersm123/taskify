import { Task } from '../store/task/types';
import { Subtask } from '../store/task/types';

/**
 * Represents a search result item, which can be either a task or a subtask.
 */
export interface SearchResult {
  type: 'task' | 'subtask'; // Type of the result (task or subtask)
  id: string; // Unique identifier for the task or subtask
  title: string; // Title of the task or subtask
  parentTaskId?: string; // Parent task ID (only for subtasks)
  columnId?: string; // Column ID associated with the task
  projectId?: string; // Project ID for navigation
}

/**
 * Searches through tasks and subtasks based on a query string.
 *
 * @param query - The search query string.
 * @param tasks - Array of tasks to search through (defaults to an empty array if undefined).
 * @param subtasks - Array of subtasks to search through (defaults to an empty array if undefined).
 * @returns An array of `SearchResult` objects matching the query.
 */
export function searchTasksAndSubtasks(
  query: string,
  tasks: Task[] = [], // Default to an empty array if undefined
  subtasks: Subtask[] = [] // Default to an empty array if undefined
): SearchResult[] {
  // If the query is empty or only contains whitespace, return an empty array
  if (!query.trim()) return [];

  // Normalize the query by trimming whitespace and converting to lowercase
  const normalizedQuery = query.toLowerCase().trim();
  const results: SearchResult[] = [];

  // Search through tasks
  tasks?.forEach((task) => {
    // Check if the task title or description matches the query
    const matchesTitle = task.title.toLowerCase().includes(normalizedQuery);
    const matchesDescription = task.description?.toLowerCase().includes(normalizedQuery);

    // If there's a match, add the task to the results
    if (matchesTitle || matchesDescription) {
      results.push({
        type: 'task',
        id: task.id,
        title: task.title,
        columnId: task.column_id,
        projectId: task.project_id,
      });
    }
  });

  // Search through subtasks
  subtasks?.forEach((subtask) => {
    // Check if the subtask title matches the query
    const matchesTitle = subtask.title.toLowerCase().includes(normalizedQuery);

    // If there's a match, find the parent task and add the subtask to the results
    if (matchesTitle) {
      const parentTask = tasks.find((t) => t.id === subtask.ticket_id);
      results.push({
        type: 'subtask',
        id: subtask.id,
        title: subtask.title,
        parentTaskId: subtask.ticket_id,
        projectId: parentTask?.project_id,
      });
    }
  });

  // Return the array of search results
  return results;
}