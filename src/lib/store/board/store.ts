import { create } from 'zustand';
import { supabase } from '../../supabase/client'; // Ensure correct path
import { BoardState, BoardColumn } from './types'; // Ensure correct path

// Helper function to format raw DB column data
// Ensure consistency between DB schema and BoardColumn type
const formatDbColumn = (dbCol: any): BoardColumn => {
    // Handle potential string/null position from DB if schema has text type
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
        name: dbCol.name,
        created_at: dbCol.created_at,
        created_by: dbCol.created_by, // Added based on schema
        position: numericPosition, // Ensure number type
        is_ruler_column: !!dbCol.is_ruler_column, // Ensure boolean type
    };
};


export const useBoardStore = create<BoardState>((set, get) => ({ // Add get() here
  columns: [],
  loading: false,
  error: null,

  fetchColumns: async (projectId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('board_columns')
        .select('*') // Selects all columns, including the new is_ruler_column
        .eq('project_id', projectId)
        .order('position', { ascending: true }); // Order by position

      if (error) throw error;

      // Format data after fetching
      const formattedData = (data || []).map(formatDbColumn);

      set({ columns: formattedData, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
      console.error('Failed to fetch columns:', error);
      throw error;
    }
  },

  createColumn: async (projectId: string, name: string) => {
    set({ error: null }); // Clear previous error
    try {
      // Get the highest current position for the project
      const { data: existingColumns, error: positionError } = await supabase
        .from('board_columns')
        .select('position')
        .eq('project_id', projectId)
        .order('position', { ascending: false })
        .limit(1); // Only need the highest

      if (positionError) throw positionError;

      // Calculate the new position (ensure it's a number)
      let newPosition = 0;
       if (existingColumns && existingColumns.length > 0) {
           const highestPos = formatDbColumn(existingColumns[0]).position; // Use formatter to ensure number
           newPosition = highestPos + 1;
       }

      // Get current user ID
       const { data: { user }, error: authError } = await supabase.auth.getUser();
       if (authError) throw authError;


      // Insert the new column (is_ruler_column defaults to false in DB)
      const { data: newDbColumn, error: insertError } = await supabase
        .from('board_columns')
        .insert([{
          project_id: projectId,
          name,
          position: newPosition, // Use calculated numeric position
          created_by: user?.id, // Add created_by
        }])
        .select() // Select all columns of the new row
        .single(); // Expecting a single row back

      if (insertError) throw insertError;
      if (!newDbColumn) throw new Error("Failed to create column, no data returned.");

      const formattedNewColumn = formatDbColumn(newDbColumn); // Format the returned data

      // Update state optimistically
      set(state => ({
        columns: [...state.columns, formattedNewColumn].sort((a, b) => a.position - b.position), // Add and re-sort
        error: null
      }));

      return formattedNewColumn; // Return the formatted column object
    } catch (error: any) {
      console.error("Failed to create column:", error);
      set({ error: error.message });
      // throw error; // Re-throw if caller needs to handle it
      return null; // Indicate failure
    }
  },

  updateColumn: async (columnId: string, data: Partial<Omit<BoardColumn, 'id' | 'project_id' | 'created_at' | 'created_by'>>) => {
    set({ error: null }); // Clear previous error
    try {
        // Prevent updating restricted fields just in case
        const updateData = { ...data };
        delete (updateData as any).id;
        delete (updateData as any).project_id;
        delete (updateData as any).created_at;
        delete (updateData as any).created_by;
        // Do not delete is_ruler_column here, it's handled by specific functions

      const { error } = await supabase
        .from('board_columns')
        .update(updateData)
        .eq('id', columnId);

      if (error) throw error;

      // Update local state
      set(state => ({
        columns: state.columns.map(col =>
          col.id === columnId ? formatDbColumn({ ...col, ...updateData }) : col // Re-format updated column
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
    set({ error: null }); // Clear previous error
    try {
      // DB automatically handles associated task deletion via ON DELETE CASCADE
      const { error } = await supabase
        .from('board_columns')
        .delete()
        .eq('id', columnId);

      if (error) throw error;

      // Update local state
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

  // --- Ruler Column Actions ---

  setRulerColumn: async (projectId, columnId) => {
    console.log(`Attempting to set column ${columnId} as ruler for project ${projectId}`);
    const currentState = get(); // Use get() to access current state
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
         return; // Already the ruler, do nothing
    }

    // Optimistic Update
    const optimisticColumns = currentColumns.map(col => {
        if (col.project_id !== projectId) return col; // Skip columns from other projects
        if (col.id === columnId) return { ...col, is_ruler_column: true }; // Set new ruler
        if (col.is_ruler_column) return { ...col, is_ruler_column: false }; // Unset old ruler
        return col; // Keep others as they are
    });
    set({ columns: optimisticColumns, error: null }); // Clear error on start

    try {
        // --- Database Updates ---
        // Order: Unset old first, then set new.

        // 1. Unset the current ruler (if one exists)
        if (currentRuler) {
            const { error: unsetError } = await supabase
                .from('board_columns')
                .update({ is_ruler_column: false })
                .eq('id', currentRuler.id);
            if (unsetError) {
                 console.error(`Failed to unset previous ruler ${currentRuler.id}:`, unsetError);
                 // Don't necessarily throw yet, try setting the new one, but log it.
                 // Or decide to throw immediately depending on desired atomicity without transactions.
                 // Let's throw for now to be safer.
                 throw new Error(`Failed to unset previous ruler: ${unsetError.message}`);
            }
            console.log(`Unset previous ruler: ${currentRuler.id}`);
        }

        // 2. Set the new ruler
        const { error: setError } = await supabase
            .from('board_columns')
            .update({ is_ruler_column: true })
            .eq('id', columnId);

        if (setError) throw new Error(`Failed to set new ruler: ${setError.message}`);
        console.log(`Set new ruler: ${columnId}`);

        // No need to refetch if optimistic update worked and DB calls succeeded

    } catch (error: any) {
        console.error("Failed to update ruler column status in DB:", error);
        // Revert optimistic update on error
        set({ columns: currentColumns, error: error.message });
        throw error; // Re-throw for component handling
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
         return; // Not the ruler, do nothing
    }

    // Optimistic Update
    const optimisticColumns = currentColumns.map(col =>
        col.id === columnId ? { ...col, is_ruler_column: false } : col
    );
    set({ columns: optimisticColumns, error: null }); // Clear error on start

    try {
        // Database Update
        const { error } = await supabase
            .from('board_columns')
            .update({ is_ruler_column: false })
            .eq('id', columnId);

        if (error) throw error;
        console.log(`Removed ruler status from column: ${columnId}`);

        // No need to refetch

    } catch (error: any) {
        console.error("Failed to remove ruler column status in DB:", error);
        // Revert optimistic update on error
        set({ columns: currentColumns, error: error.message });
        throw error;
    }
  },

}));