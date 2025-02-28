import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TaskCard } from './TaskCard';
import { CreateTaskDialog } from './CreateTaskDialog';
import { ColumnContextMenu } from './ColumnContextMenu';
import { Plus, Check, X } from 'lucide-react';
import { useBoardStore } from '../../lib/store/board';
import { useTaskStore } from '../../lib/store/task';
import { Task } from '../../lib/store/task';

interface ColumnProps {
  id: string;
  title: string;
  tasks: Task[];
  projectId: string;
  totalColumns: number;
  position: number;
}

export const Column: React.FC<ColumnProps> = ({ 
  id, 
  title, 
  tasks, 
  projectId,
  totalColumns,
  position 
}) => {
  const { setNodeRef } = useDroppable({
    id,
    data: {
      type: 'column',
      columnId: id,
      accepts: ['task']
    }
  });

  const { updateColumn, deleteColumn } = useBoardStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(title);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [isChangingPosition, setIsChangingPosition] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(position);

  const handleSave = async () => {
    if (editedTitle.trim() && editedTitle !== title) {
      try {
        await updateColumn(id, { name: editedTitle.trim() });
      } catch (error) {
        console.error('Failed to update column name:', error);
        setEditedTitle(title);
      }
    }
    setIsEditing(false);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleDeleteColumn = async () => {
    try {
      await deleteColumn(id);
    } catch (error) {
      console.error('Failed to delete column:', error);
    }
  };

  const handlePositionChange = () => {
    setIsChangingPosition(true);
  };

  const handlePositionSave = async () => {
    if (selectedPosition !== position) {
      try {
        await updateColumn(id, { position: selectedPosition });
      } catch (error) {
        console.error('Failed to update column position:', error);
      }
    }
    setIsChangingPosition(false);
  };

  const positionOptions = Array.from({ length: totalColumns }, (_, i) => i);

  return (
    <div className="flex-shrink-0 w-[320px] bg-gray-50 rounded-lg flex flex-col max-h-full">
      <div 
        className="p-3 flex items-center justify-between border-b border-gray-200"
        onContextMenu={handleContextMenu}
      >
        <div className="flex items-center space-x-2">
          {isEditing ? (
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') setIsEditing(false);
                }}
              />
              <button onClick={handleSave} className="p-1 text-green-600 hover:text-green-700">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setIsEditing(false)} className="p-1 text-red-600 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : isChangingPosition ? (
            <div className="flex items-center space-x-2">
              <select
                value={selectedPosition}
                onChange={(e) => setSelectedPosition(Number(e.target.value))}
                className="px-2 py-1 text-sm border rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {positionOptions.map(pos => (
                  <option key={pos} value={pos}>{pos + 1}</option>
                ))}
              </select>
              <button onClick={handlePositionSave} className="p-1 text-green-600 hover:text-green-700">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setIsChangingPosition(false)} className="p-1 text-red-600 hover:text-red-700">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <>
              <h3 
                className="font-medium text-gray-900 cursor-pointer hover:text-gray-600" 
                onClick={() => setIsEditing(true)}
              >
                {title}
              </h3>
              <span className="text-gray-500 text-sm">{tasks.length}</span>
            </>
          )}
        </div>
      </div>

      <div
        ref={setNodeRef}
        className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[100px]"
      >
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map(task => (
            <TaskCard 
              key={task.id} 
              task={task} 
              columnId={id}
            />
          ))}
        </SortableContext>
        
        <button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="w-full p-2 flex items-center justify-center text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors duration-200"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add task
        </button>
      </div>

      <CreateTaskDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        projectId={projectId}
        status={getStatusFromColumnName(title)}
        columnId={id}
      />

      {contextMenu && (
        <ColumnContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onDelete={handleDeleteColumn}
          onPositionChange={handlePositionChange}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
};

function getStatusFromColumnName(name: string): 'todo' | 'in_progress' | 'complete' {
  const normalized = name.toLowerCase();
  if (normalized.includes('progress')) return 'in_progress';
  if (normalized.includes('complete') || normalized.includes('done')) return 'complete';
  return 'todo';
}