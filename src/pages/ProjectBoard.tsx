import React, { useState, useEffect } from 'react';
import { ProjectHeader } from '../components/projects/ProjectHeader';
import { BoardHeader } from '../components/board/BoardHeader';
import { BoardView } from '../components/board/BoardView';
import { BoardContainer } from '../components/board/BoardContainer';
import { useParams, useNavigate } from 'react-router-dom';
import { TaskFilter } from '../components/board/BoardFilters';
import { ensureCompleteUUID } from '../lib/utils/uuid';
import { useProjectStore } from '../lib/store/project';
import { useTaskStore } from '../lib/store/task';
import { useProjectMemberStore } from '../lib/store/project-member';

export const ProjectBoard = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { fetchProjectById } = useProjectStore();
  const { fetchTasksByProjectId } = useTaskStore();
  const { fetchMembers } = useProjectMemberStore();
  const [filters, setFilters] = useState<TaskFilter>({
    incomplete: false,
    completed: false,
    assignedToMe: false,
    dueThisWeek: false,
    dueNextWeek: false,
  });

  // Handle invalid UUIDs
  let validProjectId: string;
  try {
    validProjectId = projectId ? ensureCompleteUUID(projectId) : '';
  } catch (error) {
    navigate('/dashboard');
    return null;
  }

  if (!validProjectId) {
    navigate('/dashboard');
    return null;
  }

  // Fetch data when projectId changes
  useEffect(() => {
    const fetchData = async () => {
      try {
        if (!fetchProjectById) {
          throw new Error('fetchProjectById is not available in useProjectStore');
        }
        await Promise.all([
          fetchProjectById(validProjectId),
          fetchTasksByProjectId(validProjectId),
          fetchMembers(validProjectId),
        ]);
      } catch (error) {
        console.error('Error fetching project data:', error);
      }
    };

    fetchData();
  }, [validProjectId, fetchProjectById, fetchTasksByProjectId, fetchMembers]);

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex-shrink-0 w-full sticky top-0 z-30 bg-white">
        <ProjectHeader />
      </div>
      <div className="flex-shrink-0 w-full sticky top-16 z-20 bg-white border-b">
        <BoardHeader
          projectId={validProjectId}
          filters={filters}
          onFilterChange={setFilters}
        />
      </div>
      <div className="flex-1 min-h-0 overflow-x-auto"> {/* Ensure horizontal scrolling */}
        <BoardContainer>
          <BoardView projectId={validProjectId} filters={filters} />
          <div className="p-4">
            <button
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              onClick={() => {
                console.log('Add task clicked');
              }}
            >
              + Add task
            </button>
          </div>
        </BoardContainer>
      </div>
    </div>
  );
};