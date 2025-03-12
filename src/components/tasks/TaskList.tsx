// Import necessary modules and components from React and local files
import React, { useState, useEffect } from 'react';
import { useTaskStore } from '../../lib/store/task';
import { useAuthStore } from '../../lib/store/auth';
import { TaskListHeader } from './TaskListHeader';
import { TaskListFilters } from './TaskListFilters';
import { TaskItem } from './TaskItem';

export const TaskList = ({ currentUserId }) => {
  const { user } = useAuthStore();
  const { tasks, loading, fetchAssignedTasks } = useTaskStore();
  const [filter, setFilter] = useState<'upcoming' | 'overdue' | 'completed'>('upcoming');
  const [visibleTasks, setVisibleTasks] = useState(6); // Default number of visible tasks

  useEffect(() => {
    if (user?.id) fetchAssignedTasks(user.id);
  }, [user?.id, fetchAssignedTasks]);

  const filteredTasks = tasks.filter(task => {
    const dueDate = task.due_date ? new Date(task.due_date) : null;
    const today = new Date();
    switch (filter) {
      case 'overdue':
        return dueDate && dueDate < today && task.status !== 'complete';
      case 'completed':
        return task.status === 'complete';
      case 'upcoming':
      default:
        return task.status !== 'complete' && (!dueDate || dueDate >= today);
    }
  });

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-4 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-8 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  const handleShowMore = () => {
    setVisibleTasks(prev => prev + 5); // Increase visible tasks by 5
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <TaskListHeader />
      <TaskListFilters
        activeFilter={filter}
        onFilterChange={setFilter}
        counts={{
          upcoming: tasks.filter(t => {
            const dueDate = t.due_date ? new Date(t.due_date) : null;
            return t.status !== 'complete' && (!dueDate || dueDate >= new Date());
          }).length,
          overdue: tasks.filter(t => {
            const dueDate = t.due_date ? new Date(t.due_date) : null;
            return dueDate && dueDate < new Date() && t.status !== 'complete';
          }).length,
          completed: tasks.filter(t => t.status === 'complete').length
        }}
      />
      <div className="divide-y divide-gray-100">
        <div className="max-h-96 overflow-y-auto"> {/* Fixed height with vertical scrollbar */}
          {filteredTasks.slice(0, visibleTasks).map(task => (
            <TaskItem key={task.id} task={task} />
          ))}
          {filteredTasks.length === 0 && (
            <div className="p-4 text-center text-gray-500">No {filter} tasks</div>
          )}
        </div>
        {visibleTasks < filteredTasks.length && (
          <div className="p-4 text-center">
            <button
              onClick={handleShowMore}
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Show more
            </button>
          </div>
        )}
      </div>
    </div>
  );
};