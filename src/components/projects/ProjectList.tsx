import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ProjectListHeader } from './ProjectListHeader';
import { ProjectItem } from './ProjectItem';
import { CreateProjectDialog } from './CreateProjectDialog';
import { Plus } from 'lucide-react';
import { useProjectStore } from '../../lib/store/project';

export const ProjectList = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { projects, fetchProjects } = useProjectStore();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectClick = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="bg-white rounded-lg shadow">
      <ProjectListHeader onCreateClick={() => setIsCreateDialogOpen(true)} />
      
      <div className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Create Project Card */}
          <button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="flex items-center p-4 border-2 border-dashed border-gray-200 rounded-lg hover:border-indigo-500 hover:bg-indigo-50 transition-colors group"
          >
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3 group-hover:bg-indigo-200">
              <Plus className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="text-left">
              <p className="font-medium text-gray-900">Create project</p>
              <p className="text-sm text-gray-500">Start from scratch</p>
            </div>
          </button>

          {/* Project Cards */}
          {projects.map(project => (
            <ProjectItem
              key={project.id}
              id={project.id}
              name={project.name}
              description={project.description || ''}
              onClick={() => handleProjectClick(project.id)}
            />
          ))}
        </div>
      </div>

      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </div>
  );
};