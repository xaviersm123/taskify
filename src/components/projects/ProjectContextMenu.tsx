import React from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useProjectStore } from '../../lib/store/project';

interface ProjectContextMenuProps {
  projectId: string;
  x: number;
  y: number;
  onClose: () => void;
  onEdit: () => void;
}

export const ProjectContextMenu: React.FC<ProjectContextMenuProps> = ({
  projectId,
  x,
  y,
  onClose,
  onEdit,
}) => {
  const navigate = useNavigate();
  const { deleteProject } = useProjectStore();

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!projectId || !window.confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteProject(projectId);
      onClose();
      navigate('/dashboard');
    } catch (error) {
      console.error('Failed to delete project:', error);
      alert('Failed to delete project. Please try again.');
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 z-50"
        onClick={onClose}
      />
      <div
        className="fixed z-50 bg-white rounded-lg shadow-lg py-1 min-w-[160px]"
        style={{ top: y, left: x }}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
        >
          <Edit2 className="h-4 w-4" />
          <span>Rename project</span>
        </button>
        <button
          onClick={handleDelete}
          className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
        >
          <Trash2 className="h-4 w-4" />
          <span>Delete project</span>
        </button>
      </div>
    </>
  );
};