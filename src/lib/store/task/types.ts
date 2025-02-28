export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'complete';
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  project_id: string;
  column_id?: string;
  assignee_id?: string;
  due_date?: string;
  created_at: string;
  created_by?: string;
  customFields?: Array<{
    field_id: string;
    value: any;
    custom_fields: {
      name: string;
      type: string;
    };
  }>;
}

export interface Subtask {
  id: string;
  ticket_id: string;
  title: string;
  completed: boolean;
  assignee_id?: string;
  due_date?: string;
  created_at: string;
  completed_at?: string;
  created_by?: string;
  completed_by?: string;
}

export interface TaskComment {
  id: string;
  ticket_id: string;
  content: string;
  created_at: string;
  created_by: string;
  updated_at?: string;
}

export interface TaskState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  createTask: (data: Partial<Task>) => Promise<Task>;
  updateTask: (id: string, data: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  fetchTasks: (projectId: string) => Promise<void>;
  fetchAssignedTasks: (userId: string) => Promise<void>;
  fetchTaskDetails: (taskId: string) => Promise<{
    task: Task;
    subtasks: Subtask[];
    comments: TaskComment[];
  }>;
  addSubtask: (taskId: string, data: {
    title: string;
    assignee_id?: string;
    due_date?: string;
  }) => Promise<void>;
  updateSubtask: (subtaskId: string, data: Partial<Subtask>) => Promise<void>;
  toggleSubtask: (subtaskId: string, completed: boolean) => Promise<void>;
  deleteSubtask: (subtaskId: string) => Promise<void>;
  addComment: (taskId: string, content: string) => Promise<void>;
  updateComment: (commentId: string, content: string) => Promise<void>;
  deleteComment: (commentId: string) => Promise<void>;
}