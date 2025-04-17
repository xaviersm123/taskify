// src/components/tasks/ActivityLogList.tsx

import React, { useState, useEffect } from 'react';
// REMOVED: No longer using createClient directly here if already configured elsewhere
// import { createClient } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase/client'; // Import configured client
import { User } from '../../lib/store/user/types';
import { useUserStore } from '../../lib/store/user';
import { formatUserDisplay } from '../../lib/utils/user-display';

// REMOVED: Supabase client initialization if it's done centrally
// const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
// const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
// const supabase = createClient(supabaseUrl, supabaseKey);

interface ActivityLog {
  id: string;
  event_type: 'INSERT' | 'UPDATE_COLUMN' | 'DELETE';
  table_name: string;
  record_id: string;
  payload: string;
  created_by: string;
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
  const [columns, setColumns] = useState<Column[]>([]);
  // Get users directly from the store, assume TaskDetails fetched them
  const { users } = useUserStore(); // REMOVED fetchUsers from destructuring

  useEffect(() => {
    // Flag to prevent state updates if component unmounts during async operations
    let isMounted = true;

    const fetchActivityLogsAndColumns = async () => {
      // Don't proceed if the component unmounted before fetching started
      if (!isMounted) return;

      try {
        setLoading(true);
        setError(null); // Reset error on new fetch
        console.log('Fetching activity logs and columns for taskId:', taskId);

        // Fetch logs
        const logPromise = supabase
          .from('activity_log')
          .select('*')
          .eq('record_id', taskId)
          .order('created_at', { ascending: false });

        // Fetch columns
        const columnsPromise = supabase
          .from('board_columns')
          .select('id, name');

        const [logResult, columnsResult] = await Promise.all([logPromise, columnsPromise]);

        // Check if component is still mounted before setting state
        if (!isMounted) return;

        console.log('Activity logs fetched:', logResult.data);
        if (logResult.error) throw logResult.error;
        setLogs(logResult.data || []);

        console.log('Board columns fetched:', columnsResult.data);
        if (columnsResult.error) throw columnsResult.error;
        setColumns(columnsResult.data || []);

      } catch (error: any) {
        console.error('Error fetching activity logs or columns:', error);
        // Check if component is still mounted before setting state
        if (isMounted) {
           setError(error.message);
        }
      } finally {
        // Check if component is still mounted before setting state
        if (isMounted) {
           setLoading(false);
           // --- REMOVED fetchUsers() CALL ---
           // fetchUsers(); // DON'T fetch users here, rely on parent/TaskDetails
           // --- END REMOVAL ---
           console.log('Using users from store for logs:', users);
        }
      }
    };

    fetchActivityLogsAndColumns();

    // Cleanup function to set isMounted to false when component unmounts
    return () => {
      isMounted = false;
      console.log('ActivityLogList unmounting or taskId changed, cancelling pending updates.');
    };
  }, [taskId]); // Keep taskId dependency

  // Function to get column name by ID (Keep as is)
  const getColumnName = (columnId: string | null | undefined): string => {
    if (!columnId) return 'Unknown';
    const column = columns.find((c) => c.id === columnId);
    return column ? column.name : 'Unknown';
  };

  // Function to format the log message (Keep as is, but ensure `users` is available)
  const formatLogMessage = (log: ActivityLog): string => {
    const user = users.find((u) => u.id === log.created_by); // Uses the users from the store
    const userName = user ? `${formatUserDisplay(user)}` : (log.created_by === 'anonymous' ? 'System' : 'Unknown User');
    const date = new Date(log.created_at).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' });

    let payload;
    try {
      payload = JSON.parse(log.payload || '{}');
    } catch (parseError) {
      console.error('Failed to parse payload for log:', log.id, log.payload, parseError);
      payload = {};
    }

    // Rest of the formatting logic remains the same...
    if (log.table_name === 'subtasks') {
      // ... handle subtask logs ...
        let subtaskTitle = payload.title || 'a subtask';
        switch (log.event_type) {
            case 'INSERT': return `${userName} added subtask ‘${subtaskTitle}’ on ${date}`;
            // Add cases for UPDATE, DELETE if you log them
            default: return `${userName} performed an action on a subtask on ${date}`;
        }
    } else if (log.table_name === 'tickets') {
      const title = payload.title || 'this task';
      const newColumnId = payload.new_column_id;
      const oldColumnId = payload.old_column_id;

      switch (log.event_type) {
        case 'INSERT':
          return `${userName} created ${title} on ${date}`;
        case 'UPDATE_COLUMN':
          const oldColumnName = getColumnName(oldColumnId);
          const newColumnName = getColumnName(newColumnId);
          return `${userName} moved ${title} to ${newColumnName} from ${oldColumnName} on ${date}`;
        case 'DELETE':
          return `${userName} deleted ${title} on ${date}`;
        // Add cases for other UPDATE types (title, description, assignee, etc.)
        default:
          return `${userName} updated ${title} on ${date}`;
      }
    }

    return `${userName} performed an action on ${date}`; // Fallback
  };

  // --- Rendering logic remains the same ---
  if (loading) {
    return <div className="p-4 text-sm text-gray-500 animate-pulse">Loading activity logs...</div>;
  }

  if (error) {
    return <div className="p-4 text-sm text-red-600 bg-red-50 rounded border border-red-200">Error loading activity logs: {error}</div>;
  }

  if (logs.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No activity recorded for this task yet.</div>;
  }

  return (
    <div className="py-4 px-1"> {/* Adjusted padding slightly */}
      {/* Removed redundant title, button controls it */}
      {/* <h3 className="text-sm font-medium text-gray-900 mb-2">Activity Log</h3> */}
      <ul className="space-y-2 text-xs text-gray-600 border-l border-gray-200 pl-4 ml-1"> {/* Simple timeline style */}
        {logs.map((log) => (
          <li key={log.id} className="relative pb-2">
            <div className="absolute -left-[21px] top-[3px] h-2 w-2 rounded-full bg-gray-300"></div> {/* Timeline dot */}
            {formatLogMessage(log)}
          </li>
        ))}
      </ul>
    </div>
  );
};