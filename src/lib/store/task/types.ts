// Definition for the main Task entity
export interface Task {
  id: string;
  title: string;
  description?: string | null; // Allow null
  status: 'todo' | 'in_progress' | 'complete';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  project_id: string;
  column_id?: string | null; // Allow null
  position?: number | null; // Allow null, should probably not be optional if always set
  assignee_id?: string | null; // Allow null
  // Add the new collaborators field
  collaborator_ids?: string[] | null; // Array of user UUIDs, nullable to match DB schema possibility
  due_date?: string | null; // Allow null
  created_at: string;
  created_by?: string | null; // Allow null
  customFields?: Array<{ // Consider defining a specific type for this structure
      field_id: string;
      value: any;
      custom_fields: { // This nested part seems redundant if it's just repeating the definition from 'custom_fields' table
          // id: string; // Usually field_id is the link
          name: string;
          type: string;
          options?: any; // Added options based on store logic
      };
  }>;
  // Add any other fields fetched or used, like 'updated_at' if needed
  updated_at?: string | null;
}

// Definition for Subtasks related to a Task
export interface Subtask {
  id: string;
  ticket_id: string; // Foreign key to Task (consider renaming Task fields to 'ticket' consistently if preferred)
  title: string;
  completed: boolean;
  assignee_id?: string | null; // Allow null
  due_date?: string | null; // Allow null
  created_at: string;
  completed_at?: string | null; // Allow null
  created_by?: string | null; // Allow null
  completed_by?: string | null; // Allow null
  // Add position if subtasks need ordering
  // position?: number | null;
}

// Definition for Comments related to a Task
export interface TaskComment {
  id: string;
  ticket_id: string; // Foreign key to Task
  content: string;
  created_at: string;
  created_by: string; // Should this allow null? Based on store logic, seems it requires a user.
  updated_at?: string | null; // Allow null
  mentioned_users?: string[] | null; // Added based on store logic
}

// Definition for the Zustand store state and actions (partially defined here)
// Note: The full TaskState interface is usually defined within the store file itself (src/lib/store/task.ts)
// It's generally better practice to keep the state shape definition co-located with the store implementation.
// This duplicate definition might lead to inconsistencies.
// Consider removing this TaskState interface from types.ts and relying solely on the one in task.ts.
export interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  createTask: (data: Partial<Task>) => Promise<Task>; // Signature might differ in the actual store (e.g., specific input type)
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  fetchTasks: (projectId: string) => Promise<void>;
  fetchAssignedTasks: (userId: string) => Promise<void>;
  // The fetchTaskDetails signature here might be simpler than the actual implementation
  fetchTaskDetails: (taskId: string) => Promise<{
      task: Task;
      subtasks: Subtask[];
      comments: TaskComment[];
      // customFields are missing here but present in the store's version
  }>;
  // Subtask and Comment actions signatures might also differ slightly from the store implementation
  addSubtask: (taskId: string, data: {
      title: string;
      assignee_id?: string;
      due_date?: string;
  }) => Promise<void>; // Store version returns Promise<Subtask> or Promise<void> depending on implementation needs
  updateSubtask: (subtaskId: string, data: Partial<Subtask>) => Promise<void>;
  toggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, mentionedUsers?: string[]) => Promise<TaskComment>; // Added mentions, store version returns TaskComment
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}

// Optional: Define type for Custom Field definition if used elsewhere
export interface CustomFieldDefinition {
  id: string;
  project_id: string;
  name: string;
  type: 'text' | 'number' | 'select' | 'date'; // Example types
  options?: string[] | null; // For 'select' type
  created_at?: string;
}

// Optional: Define type for the value associated with a ticket's custom field
export interface TicketCustomFieldValue {
  ticket_id: string;
  field_id: string;
  value: any; // Type depends on the custom field's type
  created_at?: string;
  updated_at?: string | null;
}