export interface BoardColumn {
  id: string;
  project_id: string;
  name: string;
  position: number; // Keep as number if that's how you use it internally
  created_at: string;
  created_by: string | null; // Added based on DB schema from previous context
  is_ruler_column: boolean; // <-- ADDED THIS FIELD
}

export interface BoardState {
  columns: BoardColumn[];
  loading: boolean;
  error: string | null;
  fetchColumns: (projectId: string) => Promise<void>;
  // Updated createColumn signature to match implementation
  createColumn: (projectId: string, name: string) => Promise<BoardColumn | null>; // Return null on failure maybe?
  updateColumn: (columnId: string, data: Partial<Omit<BoardColumn, 'id' | 'project_id' | 'created_at' | 'created_by'>>) => Promise<void>; // More specific update data
  deleteColumn: (columnId: string) => Promise<void>;
  // --- Ruler Column Actions ---
  setRulerColumn: (projectId: string, columnId: string) => Promise<void>; // <-- ADDED ACTION TYPE
  removeRulerColumn: (projectId: string, columnId: string) => Promise<void>; // <-- ADDED ACTION TYPE
}