import React, { useState } from 'react';
import { List, Layout, Calendar, BarChart2, MessageSquare, FileText, Star, MoreHorizontal, Users, Trash2 } from 'lucide-react';
import { useProjectStore } from '../../lib/store/project';
import { useNavigate, useParams } from 'react-router-dom';
import { ProjectMembers } from './ProjectMembers';

export const ProjectHeader = () => {
  const navigate = useNavigate();
  const { projectId } = useParams();
  const { projects, deleteProject } = useProjectStore();
  const [showMembers, setShowMembers] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const project = projects.find(p => p.id === projectId);

  const handleDeleteProject = async () => {
    if (!projectId || !window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      setIsDeleting(true);
      await deleteProject(projectId);
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="border-b border-gray-200 bg-white">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-semibold text-gray-900">
                {project?.name || 'Loading...'}
              </h1>
              <button className="text-gray-400 hover:text-gray-500">
                <Star className="h-5 w-5" />
              </button>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setShowMembers(!showMembers)}
                className="text-gray-700 hover:text-gray-900 flex items-center space-x-2"
              >
                <Users className="h-5 w-5" />
                <span>Members</span>
              </button>
              <button
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="text-red-600 hover:text-red-700 flex items-center space-x-2"
              >
                <Trash2 className="h-5 w-5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete'}</span>
              </button>
            </div>
          </div>

          {showMembers && projectId && (
            <div className="mt-4 p-4 border rounded-lg bg-gray-50">
              <ProjectMembers projectId={projectId} />
            </div>
          )}

          <div className="mt-4 flex items-center space-x-6">
            <NavItem icon={List} label="List" />
            <NavItem icon={Layout} label="Board" active />
            <NavItem icon={Calendar} label="Timeline" />
            <NavItem icon={BarChart2} label="Dashboard" />
            <NavItem icon={MessageSquare} label="Messages" />
            <NavItem icon={FileText} label="Files" />
          </div>
        </div>
      </div>
    </div>
  );
};

interface NavItemProps {
  icon: React.FC<{ className?: string }>;
  label: string;
  active?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, active }) => (
  <button
    className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium ${
      active 
        ? 'text-indigo-700 bg-indigo-50'
        : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
    }`}
  >
    <Icon className="h-5 w-5" />
    <span>{label}</span>
  </button>
);