import React, { useState, useCallback } from 'react';
import { Folder, MoreVertical, Check, X } from 'lucide-react';
import { ProjectContextMenu } from './ProjectContextMenu';
import { useProjectStore } from '../../lib/store/project';

interface ProjectItemProps {
  id: string;
  name: string;
  description: string;
  onClick: () => void;
}

export const ProjectItem: React.FC<ProjectItemProps> = ({
  id,
  name,
  description,
  onClick,
}) => {
  const { updateProject } = useProjectStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [showOptions, setShowOptions] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedName, setEditedName] = useState(name);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.button === 0 && !isEditing) { // Left click and not editing
      onClick();
    }
  }, [onClick, isEditing]);

  const handleSave = async () => {
    if (editedName.trim() && editedName !== name) {
      try {
        await updateProject(id, { name: editedName.trim() });
      } catch (error) {
        console.error('Failed to update project name:', error);
        setEditedName(name); // Reset on error
      }
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditedName(name);
      setIsEditing(false);
    }
  };

  return (
    <>
      <div 
        onClick={handleClick}
        onContextMenu={handleContextMenu}
        onMouseEnter={() => setShowOptions(true)}
        onMouseLeave={() => setShowOptions(false)}
        className="flex items-center p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow cursor-pointer relative group"
      >
        <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
          <Folder className="h-5 w-5 text-indigo-600" />
        </div>
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onKeyDown={handleKeyDown}
                className="block w-full text-sm border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                autoFocus
                onClick={(e) => e.stopPropagation()}
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSave();
                }}
                className="p-1 text-green-600 hover:text-green-700 rounded"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditedName(name);
                  setIsEditing(false);
                }}
                className="p-1 text-red-600 hover:text-red-700 rounded"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <h3 className="text-sm font-medium text-gray-900 truncate">{name}</h3>
              {description && (
                <p className="text-sm text-gray-500 truncate">{description}</p>
              )}
            </>
          )}
        </div>
        {!isEditing && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu({ x: e.currentTarget.getBoundingClientRect().right, y: e.currentTarget.getBoundingClientRect().top });
            }}
            className={`p-1 rounded-full hover:bg-gray-100 transition-opacity ${showOptions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
          >
            <MoreVertical className="h-4 w-4 text-gray-400" />
          </button>
        )}
      </div>

      {contextMenu && (
        <ProjectContextMenu
          projectId={id}
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          onEdit={() => {
            setIsEditing(true);
            setContextMenu(null);
          }}
        />
      )}
    </>
  );
};