import React, { useEffect } from 'react';
import { TaskList } from '../components/tasks/TaskList';
import { ProjectList } from '../components/projects/ProjectList';
import { CollaboratorsList } from '../components/dashboard/CollaboratorsList';
import { useAuthStore } from '../lib/store/auth';
import { useProjectStore } from '../lib/store/project';
import { useProjectMemberStore } from '../lib/store/project-member';
import { useUserStore } from '../lib/store/user';
import { useTaskStore } from '../lib/store/task';

export const Dashboard = () => {
  const { user } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const { fetchMembers } = useProjectMemberStore();
  const { fetchUsers } = useUserStore();
  const { fetchAssignedTasks } = useTaskStore();
  const firstName = user?.user_metadata?.firstName || user?.email?.split('@')[0] || 'there';
  const currentUserId = user?.id;

  useEffect(() => {
    const initializeDashboard = async () => {
      try {
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

  useEffect(() => {
    const fetchProjectMembers = async () => {
      try {
        const memberPromises = projects.map(project => fetchMembers(project.id));
        await Promise.all(memberPromises);
      } catch (error) {
        console.error('Error fetching project members:', error);
      }
    };

    if (projects.length > 0) {
      fetchProjectMembers();
    }
  }, [projects, fetchMembers]);

  return (
    <div className="p-6 flex-1 min-h-0">
      <div className="mb-8">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <TaskList currentUserId={currentUserId} />
        <ProjectList />
      </div>

      <CollaboratorsList />
    </div>
  );
};

const getTimeOfDay = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
};