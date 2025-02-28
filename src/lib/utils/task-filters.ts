import { Task } from '../store/task/types';
import { TaskFilter } from '../../components/board/BoardFilters';
import { parseISO } from 'date-fns';
import { isThisWeek, isNextWeek } from './date-filters';

export function filterTasks(tasks: Task[], filters: TaskFilter, currentUserId?: string): Task[] {
  return tasks.filter(task => {
    // Status filters
    if (filters.incomplete && task.status === 'complete') {
      return false;
    }
    if (filters.completed && task.status !== 'complete') {
      return false;
    }

    // Assignment filters
    if (filters.assignedToMe && task.assignee_id !== currentUserId) {
      return false;
    }
    if (filters.assignee && task.assignee_id !== filters.assignee) {
      return false;
    }

    // Due date filters
    if (task.due_date) {
      const dueDate = parseISO(task.due_date);
      if (filters.dueThisWeek && !isThisWeek(dueDate)) {
        return false;
      }
      if (filters.dueNextWeek && !isNextWeek(dueDate)) {
        return false;
      }
    } else if (filters.dueThisWeek || filters.dueNextWeek) {
      return false;
    }

    return true;
  });
}