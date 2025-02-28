import React, { useState, useEffect } from 'react';
import { X, UserPlus } from 'lucide-react';
import { useProjectMemberStore } from '../../lib/store/project-member';
import { useUserStore } from '../../lib/store/user';
import { MemberList } from './members/MemberList';
import { MemberSelect } from './members/MemberSelect';

interface ProjectMembersProps {
  projectId: string;
}

export const ProjectMembers: React.FC<ProjectMembersProps> = ({ projectId }) => {
  const { members, fetchMembers, addMember, removeMember } = useProjectMemberStore();
  const { users, fetchUsers } = useUserStore();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          await Promise.all([
            fetchMembers(projectId),
            fetchUsers()
          ]);
        } catch (error) {
          console.error('Failed to load members:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [isOpen, projectId, fetchMembers, fetchUsers]);

  const handleAddMember = async () => {
    if (!selectedUserId) return;
    setIsLoading(true);
    try {
      await addMember(projectId, selectedUserId);
      setSelectedUserId('');
    } catch (error) {
      console.error('Failed to add member:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    setIsLoading(true);
    try {
      await removeMember(projectId, userId);
    } catch (error) {
      console.error('Failed to remove member:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const nonMembers = users.filter(
    user => !members.some(member => member.user_id === user.id)
  );

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
      >
        <UserPlus className="w-4 h-4 mr-2" />
        Manage Members
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl z-50">
            <div className="p-4 border-b">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-900">Project Members</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="p-4">
              <MemberSelect
                users={nonMembers}
                selectedUserId={selectedUserId}
                onUserSelect={setSelectedUserId}
                onAddMember={handleAddMember}
                disabled={isLoading}
              />

              <div className="mt-4">
                <MemberList
                  members={members}
                  users={users}
                  onRemoveMember={handleRemoveMember}
                />
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};