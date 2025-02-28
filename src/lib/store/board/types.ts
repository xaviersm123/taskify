export interface BoardColumn {
  id: string;
  project_id: string;
  name: string;
  position: number;
  created_at: string;
}

export interface BoardState {
  columns: BoardColumn[];
  loading: boolean;
  error: string | null;
  fetchColumns: (projectId: string) => Promise<void>;
  createColumn: (projectId: string, name: string) => Promise<BoardColumn>;
  updateColumn: (columnId: string, data: { name?: string; position?: number }) => Promise<void>;
  deleteColumn: (columnId: string) => Promise<void>;
}