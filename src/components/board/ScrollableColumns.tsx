import React from 'react';
import { Column } from './Column';
import { Task } from '../../lib/store/task';

interface ScrollableColumnsProps {
  columns: Array<{
    id: string;
    name: string;
    position: number;
  }>;
  tasks: Task[];
  projectId: string;
}

export const ScrollableColumns: React.FC<ScrollableColumnsProps> = ({
  columns,
  tasks,
  projectId,
}) => {
  const getColumnTasks = (columnId: string) => {
    return tasks.filter(task => task.column_id === columnId);
  };

  // Sort columns by position
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  return (
    <div className="h-full px-6 py-4 min-w-full">
      <div className="inline-flex gap-4 h-full">
        {sortedColumns.map(column => (
          <Column
            key={column.id}
            id={column.id}
            title={column.name}
            tasks={getColumnTasks(column.id)}
            projectId={projectId}
            totalColumns={columns.length}
            position={column.position}
          />
        ))}
      </div>
    </div>
  );
};