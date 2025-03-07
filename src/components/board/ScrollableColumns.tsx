import React from 'react';
import { SortableContext, horizontalListSortingStrategy } from '@dnd-kit/sortable';
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
  selectedTaskId?: string | null; // Optional prop from BoardView.tsx
}

export const ScrollableColumns: React.FC<ScrollableColumnsProps> = ({
  columns,
  tasks,
  projectId,
  selectedTaskId,
}) => {
  const sortedColumns = [...columns].sort((a, b) => a.position - b.position);

  return (
    <div className="h-full px-6 py-4 min-w-full">
      <SortableContext
        items={sortedColumns.map(col => col.id)}
        strategy={horizontalListSortingStrategy}
      >
        <div className="inline-flex gap-4 h-full">
          {sortedColumns.map(column => (
            <Column
              key={column.id}
              id={column.id}
              title={column.name}
              tasks={tasks.filter(task => task.column_id === column.id)}
              projectId={projectId}
              totalColumns={columns.length}
              position={column.position}
            />
          ))}
        </div>
      </SortableContext>
    </div>
  );
};