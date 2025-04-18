import { create } from 'zustand';
import { supabase } from '../supabase/client'; // Ensure correct path

// --- TYPES (Combined Here) ---

export interface BoardColumn {
  id: string;
  project_id: string;
  name: string;
  position: number; // Keep as number if that's how you use it internally
  created_at: string;
  created_by: string | null; // Added based on DB schema
  is_ruler_column: boolean; // <-- ADDED RULER FIELD
}

export interface BoardState {
  columns: BoardColumn[];
  loading: boolean;
  error: string | null;
  fetchColumns: (projectId: string) => Promise<void>;
  createColumn: (projectId: string, name: string) => Promise<BoardColumn | null>; // Return null on failure
  updateColumn: (columnId: string, data: Partial<Omit<BoardColumn, 'id' | 'project_id' | 'created_at' | 'created_by' | 'is_ruler_column'>>) => Promise<void>; // Specific update data (exclude ruler status)
  deleteColumn: (columnId: string) => Promise<void>;
  reorderColumns: (columns: BoardColumn[]) => Promise<void>; // Keep if needed
  // --- Ruler Column Actions ---
  setRulerColumn: (projectId: string, columnId: string) => Promise<void>; // <-- ADDED ACTION TYPE
  removeRulerColumn: (projectId: string, columnId: string) => Promise<void>; // <-- ADDED ACTION TYPE
}

// --- HELPER FUNCTION ---

// Helper function to format raw DB column data
const formatDbColumn = (dbCol: any): BoardColumn => {
    let numericPosition = 0;
    if (typeof dbCol.position === 'number') {
        numericPosition = dbCol.position;
    } else if (typeof dbCol.position === 'string') {
        numericPosition = parseInt(dbCol.position, 10);
        if (isNaN(numericPosition)) {
             console.warn(`Column ${dbCol.id} has non-numeric position '${dbCol.position}'. Defaulting to 0.`);
             numericPosition = 0;
        }
    } else if (dbCol.position == null) {
         console.warn(`Column ${dbCol.id} has null position. Defaulting to 0.`);
         numericPosition = 0;
    }

    return {
        id: dbCol.id,
        project_id: dbCol.project_id,
        name: dbCol.name ?? 'Unnamed Column', // Add default
        created_at: dbCol.created_at,
        created_by: dbCol.created_by,
        position: numericPosition,
        is_ruler_column: !!dbCol.is_ruler_column, // Ensure boolean
    };
};

// --- STORE IMPLEMENTATION ---

export const useBoardStore = create<BoardState>((set, get) => ({ // Add get() here
  columns: [],
  loading: false,
  error: null,

  fetchColumns: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('board_columns')
        .select('*') // Selects all columns, including is_ruler_column
        .eq('project_id', projectId)
        .order('position', { ascending: true });

      if (error) throw error;
      const formattedData = (data || []).map(formatDbColumn);
      set({ columns: formattedData, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      console.error('Failed to fetch columns:', error);
      // Don't throw here, let UI handle loading/error state
    }
  },

  createColumn: async (projectId: string, name: string) => {
    set({ error: null });
    try {
      const { data: existingColumns, error: positionError } = await supabase
        .from('board_columns')
        .select('position')
        .eq('project_id', projectId)
        .order('position', { ascending: false })
        .limit(1);

      if (positionError) throw positionError;
      let newPosition = 0;
       if (existingColumns && existingColumns.length > 0) {
           const highestPos = formatDbColumn(existingColumns[0]).position;
           newPosition = highestPos + 1;
       }

      const { data: { user } } = await supabase.auth.getUser();

      const { data: newDbColumn, error: insertError } = await supabase
        .from('board_columns')
        .insert([{
          project_id: projectId,
          name: name || "New Column", // Add default name
          position: newPosition,
          created_by: user?.id,
          // is_ruler_column defaults to false in DB
        }])
        .select()
        .single();

      if (insertError) throw insertError;
      if (!newDbColumn) throw new Error("Failed to create column, no data returned.");

      const formattedNewColumn = formatDbColumn(newDbColumn);
      set(state => ({
        columns: [...state.columns, formattedNewColumn].sort((a, b) => a.position - b.position),
        error: null
      }));
      return formattedNewColumn;
    } catch (error: any) {
      console.error("Failed to create column:", error);
      set({ error: error.message });
      return null;
    }
  },

  // Update only specific, allowed fields (e.g., name, position)
  // Ruler status is updated via specific functions
  updateColumn: async (columnId: string, data: Partial<Omit<BoardColumn, 'id' | 'project_id' | 'created_at' | 'created_by' | 'is_ruler_column'>>) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('board_columns')
        .update(data) // Only update fields passed in `data`
        .eq('id', columnId);

      if (error) throw error;

      set(state => ({
        columns: state.columns.map(col =>
          col.id === columnId ? formatDbColumn({ ...col, ...data }) : col
        ),
        error: null
      }));
    } catch (error: any) {
       console.error(`Failed to update column ${columnId}:`, error);
       set({ error: error.message });
       throw error;
    }
  },

  deleteColumn: async (columnId: string) => {
    set({ error: null });
    try {
      const { error } = await supabase
        .from('board_columns')
        .delete()
        .eq('id', columnId);
      if (error) throw error;
      set(state => ({
        columns: state.columns.filter(col => col.id !== columnId),
        error: null
      }));
    } catch (error: any) {
      console.error('Failed to delete column:', error);
      set({ error: error.message });
      throw error;
    }
  },

  // --- Ruler Column Actions (Copied from previous correct version) ---
  setRulerColumn: async (projectId, columnId) => {
    console.log(`Attempting to set column ${columnId} as ruler for project ${projectId}`);
    const currentState = get();
    const currentColumns = currentState.columns;
    const targetColumn = currentColumns.find(c => c.id === columnId);
    const currentRuler = currentColumns.find(c => c.project_id === projectId && c.is_ruler_column);

    if (!targetColumn || targetColumn.project_id !== projectId) {
        const msg = "Target column not found or doesn't belong to the project.";
        console.error(msg);
        set({ error: msg });
        throw new Error(msg);
    }
    if (targetColumn.is_ruler_column) {
         console.log("Target column is already the ruler.");
         return;
    }

    const optimisticColumns = currentColumns.map(col => {
        if (col.project_id !== projectId) return col;
        if (col.id === columnId) return { ...col, is_ruler_column: true };
        if (col.is_ruler_column) return { ...col, is_ruler_column: false };
        return col;
    });
    set({ columns: optimisticColumns, error: null });

    try {
        if (currentRuler) {
            const { error: unsetError } = await supabase
                .from('board_columns')
                .update({ is_ruler_column: false })
                .eq('id', currentRuler.id);
            if (unsetError) throw new Error(`Failed to unset previous ruler: ${unsetError.message}`);
            console.log(`Unset previous ruler: ${currentRuler.id}`);
        }
        const { error: setError } = await supabase
            .from('board_columns')
            .update({ is_ruler_column: true })
            .eq('id', columnId);
        if (setError) throw new Error(`Failed to set new ruler: ${setError.message}`);
        console.log(`Set new ruler: ${columnId}`);
    } catch (error: any) {
        console.error("Failed to update ruler column status in DB:", error);
        set({ columns: currentColumns, error: error.message }); // Revert optimistic
        throw error;
    }
  },

  removeRulerColumn: async (projectId, columnId) => {
    console.log(`Attempting to remove ruler status from column ${columnId} for project ${projectId}`);
    const currentState = get();
    const currentColumns = currentState.columns;
    const targetColumn = currentColumns.find(c => c.id === columnId);

     if (!targetColumn || targetColumn.project_id !== projectId) {
        const msg = "Target column not found or doesn't belong to the project.";
        console.error(msg);
        set({ error: msg });
        throw new Error(msg);
    }
    if (!targetColumn.is_ruler_column) {
         console.log("Target column is not the ruler.");
         return;
    }

    const optimisticColumns = currentColumns.map(col =>
        col.id === columnId ? { ...col, is_ruler_column: false } : col
    );
    set({ columns: optimisticColumns, error: null });

    try {
        const { error } = await supabase
            .from('board_columns')
            .update({ is_ruler_column: false })
            .eq('id', columnId);
        if (error) throw error;
        console.log(`Removed ruler status from column: ${columnId}`);
    } catch (error: any) {
        console.error("Failed to remove ruler column status in DB:", error);
        set({ columns: currentColumns, error: error.message }); // Revert optimistic
        throw error;
    }
  },

  // --- Reorder Columns (Keep existing logic, ensure it works with new fields) ---
  // Note: Upsert might implicitly set is_ruler_column to false if not provided in `updates`.
  // Consider if reordering should preserve ruler status or if only position is updated.
  // Current upsert only sends id, name, project_id, position, created_at. It *should* preserve other fields.
  reorderColumns: async (columns: BoardColumn[]) => {
    // Optimistically update state first
    const orderedColumns = columns.map((col, index) => ({ ...col, position: index }));
    set({ columns: orderedColumns, error: null }); // Set the reordered columns locally

    try {
      // Prepare only the necessary updates for the DB (id and new position)
      const updates = orderedColumns.map((col) => ({
        id: col.id,
        position: col.position,
      }));

      // Update only the position for existing columns
      const { error } = await supabase
        .from('board_columns')
        .upsert(updates, { onConflict: 'id' }); // Use upsert based on ID conflict

      if (error) throw error;
      console.log("Column order updated in DB.");

    } catch (error: any) {
      console.error("Failed to reorder columns in DB:", error);
      // Consider refetching columns to revert optimistic update on error
      // await get().fetchColumns(columns[0]?.project_id); // Requires getting projectId
      set({ error: error.message }); // Keep the error state
      throw error;
    }
  }

}));