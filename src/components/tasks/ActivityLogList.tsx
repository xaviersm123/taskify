import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { User } from '../../lib/store/user/types'; // Adjust path based on your user types
import { useUserStore } from '../../lib/store/user';
import { formatUserDisplay } from '../../lib/utils/user-display';

// Initialize Supabase client (move to a separate file in a real app, e.g., ./supabase/client.ts)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

interface ActivityLog {
  id: string;
  event_type: 'INSERT' | 'UPDATE_COLUMN' | 'DELETE';
  table_name: string;
  record_id: string;
  payload: string;
  created_by: string; // UUID or string representing the user ID
  created_at: string;
}

interface Column {
  id: string;
  name: string;
}

interface ActivityLogListProps {
  taskId: string;
}

export const ActivityLogList: React.FC<ActivityLogListProps> = ({ taskId }) => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [columns, setColumns] = useState<Column[]>([]); // State for board columns
  const { users, fetchUsers } = useUserStore();

  useEffect(() => {
    const fetchActivityLogsAndColumns = async () => {
      try {
        setLoading(true);
        console.log('Fetching activity logs and columns for taskId:', taskId);

        // Fetch logs where record_id matches the taskId (ticket_id) for both tickets and subtasks
        const { data: logData, error: logError } = await supabase
          .from('activity_log')
          .select('*')
          .eq('record_id', taskId) // Filter logs by the specific ticket_id
          .order('created_at', { ascending: false }); // Most recent first

        console.log('Activity logs fetched:', logData);
        if (logError) throw logError;

        setLogs(logData || []);

        // Fetch all columns from board_columns
        const { data: columnsData, error: columnsError } = await supabase
          .from('board_columns')
          .select('id, name');

        console.log('Board columns fetched:', columnsData);
        if (columnsError) throw columnsError;

        setColumns(columnsData || []);
      } catch (error: any) {
        console.error('Error fetching activity logs or columns:', error);
        setError(error.message);
      } finally {
        setLoading(false);
        fetchUsers(); // Ensure users are loaded to display user names
        console.log('Users fetched for logs:', users);
      }
    };

    fetchActivityLogsAndColumns();
  }, [taskId]);

  // Function to get column name by ID
  const getColumnName = (columnId: string | null | undefined): string => {
    if (!columnId) return 'Unknown';
    const column = columns.find((c) => c.id === columnId);
    return column ? column.name : 'Unknown';
  };

  // Function to format the log message with subtask or ticket details
  const formatLogMessage = (log: ActivityLog): string => {
    const user = users.find((u) => u.id === log.created_by);
    const userName = user ? `${formatUserDisplay(user)}` : 'Unknown User';
    const date = new Date(log.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    // Parse payload with detailed debugging
    let payload;
    try {
      payload = JSON.parse(log.payload || '{}');
      console.log('Parsed payload for log:', log.id, payload);
    } catch (parseError) {
      console.error('Failed to parse payload for log:', log.id, log.payload, parseError);
      payload = {};
    }

    if (log.table_name === 'subtasks') {
      // Handle subtask logs
      let subtaskTitle = 'a subtask';
      subtaskTitle = payload.title || subtaskTitle; // Use flat payload structure for subtasks

      switch (log.event_type) {
        case 'INSERT':
          return `${userName} added ‘${subtaskTitle}’ on ${date}`;
        case 'UPDATE':
          return `${userName} updated ‘${subtaskTitle}’ on ${date}`;
        case 'DELETE':
          return `${userName} deleted ‘${subtaskTitle}’ on ${date}`;
        default:
          return `${userName} performed an action on ${date}`;
      }
    } else if (log.table_name === 'tickets') {
      // Handle ticket logs
      const title = payload.title || 'Untitled Task'; // Use flat payload for tickets if needed
      const newColumnId = payload.new_column_id;
      const oldColumnId = payload.old_column_id;

      switch (log.event_type) {
        case 'INSERT':
          return `${userName} created this task (‘${title}’) on ${date}`;
        case 'UPDATE_COLUMN':
          const oldColumnName = getColumnName(oldColumnId);
          const newColumnName = getColumnName(newColumnId);
          return `${userName} moved the ticket to column ${newColumnName} from ${oldColumnName} on ${date}`;
        case 'DELETE':
          return `${userName} deleted this task (‘${title}’) on ${date}`;
        default:
          return `${userName} performed an action on ${date}`;
      }
    }

    return `${userName} performed an action on ${date}`;
  };

  if (loading) {
    return <div className="p-4 text-gray-500">Loading activity logs...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Error loading activity logs: {error}</div>;
  }

  if (logs.length === 0) {
    return <div className="p-4 text-gray-500">No activity logs found for this task.</div>;
  }

  return (
    <div className="p-4 space-y-2">
      <h3 className="text-sm font-medium text-gray-900">Activity Logs</h3>
      <ul className="list-disc pl-5 text-sm text-gray-700">
        {logs.map((log) => (
          <li key={log.id}>{formatLogMessage(log)}</li>
        ))}
      </ul>
    </div>
  );
};