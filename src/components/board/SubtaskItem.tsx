import React, { useState, useCallback } from 'react';
import { User } from 'lucide-react';
import { Subtask } from '../../lib/store/task/types';
import { useUserStore } from '../../lib/store/user';
import { SubtaskContextMenu } from './SubtaskContextMenu';
import { TaskCheckbox } from './TaskCheckbox';
import { formatTaskDate } from '../../lib/utils/date-format';
import { formatUserDisplay } from '../../lib/utils/user-display';

interface SubtaskItemProps {
  subtask: Subtask;
  onToggle: (completed: boolean) => void;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const SubtaskItem: React.FC<SubtaskItemProps> = ({
  subtask,
  onToggle,
  onEdit,
  onDuplicate,
  onDelete
}) => {
  const { users } = useUserStore();
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const assignee = users.find(u => u.id === subtask.assignee_id);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  }, []);

  const getInitials = (user: { first_name?: string; last_name?: string; email: string }) => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    return user.email.substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div 
        onContextMenu={handleContextMenu}
        className="flex items-center space-x-3 py-1 px-2 hover:bg-gray-50 rounded-md cursor-pointer group"
      >
        <div className="flex-shrink-0">
          <TaskCheckbox
            checked={subtask.completed}
            onChange={onToggle}
          />
        </div>
        
        <div className="flex-1 min-w-0">
          <span className={`text-sm ${subtask.completed ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {subtask.title}
          </span>
        </div>

        <div className="flex items-center space-x-2 text-sm text-gray-500">
          {subtask.due_date && (
            <span className="text-xs">{formatTaskDate(subtask.due_date)}</span>
          )}
          
          {assignee && (
            <div className="relative group/assignee">
              <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-xs font-medium text-gray-600">
                {getInitials(assignee)}
              </div>
              <div className="absolute bottom-full mb-1 left-1/2 transform -translate-x-1/2 hidden group-hover/assignee:block">
                <div className="bg-gray-900 text-white text-xs rounded py-1 px-2 whitespace-nowrap">
                  {formatUserDisplay(assignee)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <SubtaskContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onEdit={onEdit}
          onDuplicate={onDuplicate}
          onDelete={onDelete}
          onClose={() => setContextMenu(null)}
        />
      )}
    </>
  );
};