import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { useAuthStore } from '../lib/store/auth';

// Initialize Supabase client (move to a separate file in a real app, e.g., ./supabase/client.ts)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface MetricsData {
  totalTasks: number;
  completedTasks: number;
  incompleteTasks: number;
  overdueTasks: number;
  tasksByPriority: { priority: string; count: number }[];
  pendingTasksByPriority: { priority: string; count: number }[];
  projectName: string;
}

export const MetricsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>(); // Get projectId from URL
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  useEffect(() => {
    if (!projectId) {
      setError('No project ID provided');
      setLoading(false);
      return;
    }

    const fetchMetrics = async () => {
      try {
        setLoading(true);

        // Fetch project name by projectId
        const { data: project, error: projectError } = await supabase
          .from('projects')
          .select('name')
          .eq('id', projectId)
          .single();

        if (projectError || !project) throw new Error('Project not found');

        // Fetch tasks for the specific project, including priority
        const { data: tasks, error: tasksError } = await supabase
          .from('tickets')
          .select('id, status, due_date, priority') // Include priority for counts
          .eq('project_id', projectId);

        if (tasksError) throw tasksError;

        const totalTasks = tasks?.length || 0;
        const completedTasks = tasks?.filter(t => t.status === 'complete').length || 0;
        const incompleteTasks = tasks?.filter(t => t.status !== 'complete').length || 0;
        const overdueTasks = tasks?.filter(t => {
          const dueDate = t.due_date ? new Date(t.due_date) : null;
          const today = new Date();
          return dueDate && dueDate < today && t.status !== 'complete';
        }).length || 0;

        // Define all possible priority levels
        const priorityLevels = ['Low', 'Medium', 'High', 'Urgent'];

        // Total tasks by priority (all tasks, regardless of status)
        const tasksByPriority = priorityLevels.reduce((acc, priority) => {
          acc[priority] = tasks?.filter(t => t.priority === priority).length || 0;
          return acc;
        }, {} as { [key: string]: number });
        
        // Format for display, including all priority levels
        const tasksByPriorityData = priorityLevels.map(priority => ({
          priority,
          count: tasksByPriority[priority] || 0,
        }));

        // Pending (incomplete) tasks by priority
        const pendingTasksByPriority = priorityLevels.reduce((acc, priority) => {
          acc[priority] = tasks?.filter(t => t.status !== 'complete' && t.priority === priority).length || 0;
          return acc;
        }, {} as { [key: string]: number });
        
        // Format for display, including all priority levels
        const pendingTasksByPriorityData = priorityLevels.map(priority => ({
          priority,
          count: pendingTasksByPriority[priority] || 0,
        }));

        setMetrics({
          totalTasks,
          completedTasks,
          incompleteTasks,
          overdueTasks,
          tasksByPriority: tasksByPriorityData,
          pendingTasksByPriority: pendingTasksByPriorityData,
          projectName: project.name,
        });
      } catch (error: any) {
        console.error('Failed to fetch metrics:', error);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [projectId]);

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading metrics...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading metrics: {error}</div>;
  }

  if (!metrics) {
    return <div className="p-4 text-gray-500">No metrics available.</div>;
  }

  return (
    <div className="p-4 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Metrics & Analytics for Project {metrics.projectName}</h1>
      
      {/* Summary Cards for Total, Completed, Incomplete, and Overdue Tasks */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-gray-900 p-4 rounded-lg shadow text-white">
          <h2 className="text-lg font-semibold">Total Tasks</h2>
          <p className="text-2xl font-bold">{metrics.totalTasks}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow text-white">
          <h2 className="text-lg font-semibold">Completed Tasks</h2>
          <p className="text-2xl font-bold">{metrics.completedTasks}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow text-white">
          <h2 className="text-lg font-semibold">Incomplete Tasks</h2>
          <p className="text-2xl font-bold">{metrics.incompleteTasks}</p>
        </div>
        <div className="bg-gray-900 p-4 rounded-lg shadow text-white">
          <h2 className="text-lg font-semibold">Overdue Tasks</h2>
          <p className="text-2xl font-bold">{metrics.overdueTasks}</p>
        </div>
      </div>

      {/* Total Tasks by Priority (Individual Counts) */}
      {metrics.tasksByPriority.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Total Tasks by Priority</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {metrics.tasksByPriority.map((item) => (
              <div key={item.priority} className="bg-gray-900 p-4 rounded-lg shadow text-white">
                <h3 className="text-lg font-semibold">{item.priority}</h3>
                <p className="text-2xl font-bold">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending (Incomplete) Tasks by Priority (Individual Counts) */}
      {metrics.pendingTasksByPriority.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-800">Pending Tasks by Priority</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {metrics.pendingTasksByPriority.map((item) => (
              <div key={item.priority} className="bg-gray-900 p-4 rounded-lg shadow text-white">
                <h3 className="text-lg font-semibold">{item.priority}</h3>
                <p className="text-2xl font-bold">{item.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};