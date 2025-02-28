import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Folder, Plus } from 'lucide-react';
import { useProjectStore } from '../../lib/store/project';
import { CreateProjectDialog } from '../projects/CreateProjectDialog';

export const SidebarProjects = () => {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { projects, fetchProjects } = useProjectStore();
  const [contextMenu, setContextMenu] = useState<{
    projectId: string;
    x: number;
    y: number;
  } | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    console.log('Fetching projects for sidebar...');
    fetchProjects();
  }, [fetchProjects]);

  useEffect(() => {
    const handleGlobalClick = () => {
      if (contextMenu) {
        console.log('Global click detected. Closing context menu.');
        setContextMenu(null);
      }
    };

    window.addEventListener('click', handleGlobalClick);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
    };
  }, [contextMenu]);

  const handleContextMenu = (event: React.MouseEvent, projectId: string) => {
    event.preventDefault();
    console.log('Right-click detected on project ID:', projectId);
    setContextMenu({
      projectId,
      x: event.pageX,
      y: event.pageY,
    });
  };

  const handleSettingsClick = () => {
    if (contextMenu && contextMenu.projectId) {
      console.log('Navigating to settings for project:', contextMenu.projectId);
      navigate(`/projects/${contextMenu.projectId}/project-settings`);
      setContextMenu(null);
    }
  };

  const handleMetricsClick = () => {
    if (contextMenu && contextMenu.projectId) {
      console.log('Navigating to metrics for project:', contextMenu.projectId);
      navigate(`/projects/${contextMenu.projectId}/metrics`);
      setContextMenu(null);
    }
  };

  return (
    <>
      <div className="pt-4">
        <div className="px-3 flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
            Projects
          </span>
          <button 
            onClick={() => setIsCreateDialogOpen(true)}
            className="text-gray-400 hover:text-gray-500"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        
        <div className="space-y-1">
          {projects.map(project => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              onContextMenu={(e) => handleContextMenu(e, project.id)}
              className="group flex items-center px-3 py-2 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <Folder className="mr-3 h-5 w-5 text-gray-400 group-hover:text-gray-500" />
              <span className="truncate">{project.name}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Render the custom context menu if it is active */}
      {contextMenu && (
        <div
          className="absolute bg-white shadow-lg rounded-md py-2 z-50"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={handleSettingsClick}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Settings
          </button>
          <button
            onClick={handleMetricsClick}
            className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            Metrics
          </button>
        </div>
      )}

      {/* Dialog for creating a new project */}
      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
      />
    </>
  );
};