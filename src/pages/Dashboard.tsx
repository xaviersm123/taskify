// Import necessary modules and components from React and local files
import React, { useEffect } from 'react';
import { TaskList } from '../components/tasks/TaskList';
import { ProjectList } from '../components/projects/ProjectList';
import { CollaboratorsList } from '../components/dashboard/CollaboratorsList';
import { useAuthStore } from '../lib/store/auth';
import { useProjectStore } from '../lib/store/project';
import { useProjectMemberStore } from '../lib/store/project-member';
import { useUserStore } from '../lib/store/user';
import { useTaskStore } from '../lib/store/task';

// Define the Dashboard component
export const Dashboard = () => {
  // Destructure user from the authentication store
  const { user } = useAuthStore();
  // Destructure projects and fetchProjects function from the project store
  const { projects, fetchProjects } = useProjectStore();
  // Destructure fetchMembers function from the project member store
  const { fetchMembers } = useProjectMemberStore();
  // Destructure fetchUsers function from the user store
  const { fetchUsers } = useUserStore();
  // Destructure fetchAssignedTasks function from the task store
  const { fetchAssignedTasks } = useTaskStore();
  // Get the user's first name or email prefix or default to 'there'
  const firstName = user?.user_metadata?.firstName || user?.email?.split('@')[0] || 'there';
  // Get the current user ID
  const currentUserId = user?.id;

  // useEffect hook to initialize the dashboard by fetching initial data
  useEffect(() => {
    const initializeDashboard = async () => {
      try {
        // Fetch initial data: projects, users, and tasks
        await Promise.all([
          fetchProjects(),
          fetchUsers(),
          fetchAssignedTasks(user.id)
        ]);
      } catch (error) {
        console.error('Failed to initialize dashboard:', error);
      }
    };

    if (user?.id) {
      initializeDashboard();
    }
  }, [fetchProjects, fetchUsers, fetchAssignedTasks, user?.id]);

  // useEffect hook to fetch project members whenever projects change
  useEffect(() => {
    const fetchProjectMembers = async () => {
      try {
        // Fetch members for each project
        const memberPromises = projects.map(project => fetchMembers(project.id));
        await Promise.all(memberPromises);
      } catch (error) {
        console.error('Error fetching project members:', error);
      }
    };

    // Fetch members if there are any projects
    if (projects.length > 0) {
      fetchProjectMembers();
    }
  }, [projects, fetchMembers]);

  // Render the dashboard layout
  return (
    <div className="p-6 flex-1 min-h-0">
      <div className="mb-8">
        {/* Greeting message with user's first name and current date */}
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getTimeOfDay()}, {firstName}
        </h1>
        <p className="text-sm text-gray-500">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Grid layout for task list and project list */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TaskList currentUserId={currentUserId} />
        <ProjectList />
      </div>

      {/* List of collaborators */}
      <CollaboratorsList />
    </div>
  );
};

// Helper function to get the time of day (morning, afternoon, evening)
const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};