// CommentList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, Upload, Edit2, Check, X } from 'lucide-react';
import { useTaskStore, TaskComment } from '../../lib/store/task';
import { useAttachmentStore } from '../../lib/store/attachment/store';
import { useUserStore } from '../../lib/store/user';
import { useAuthStore } from '../../lib/store/auth';
import { AttachmentList } from './AttachmentList';
import { formatUserDisplay } from '../../lib/utils/user-display';
import { MentionsInput } from './MentionsInput';

interface CommentListProps {
  taskId: string;
  comments: TaskComment[];
  onUpdate: () => void;
}

export const CommentList: React.FC<CommentListProps> = ({ taskId, comments, onUpdate }) => {
  const [newComment, setNewComment] = useState('');
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const { addComment, deleteComment, updateComment } = useTaskStore();
  const { attachments, uploadAttachment, deleteAttachment, fetchAttachments } = useAttachmentStore();
  const { users } = useUserStore();
  const { user } = useAuthStore();
  const currentUserId = user?.id;

  // Fetch attachments when taskId changes or on mount
  useEffect(() => {
    if (taskId) {
      fetchAttachments(taskId);
    }
  }, [taskId, fetchAttachments]);

  // Drag and Drop Handlers
  useEffect(() => {
    const dropZone = dropZoneRef.current;
    if (!dropZone) return;

    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(true);
    };

    const handleDragLeave = (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
    };

    const handleDrop = async (e: DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        await handleMultipleFileUpload([...files]);
      }
    };

    dropZone.addEventListener('dragover', handleDragOver);
    dropZone.addEventListener('dragleave', handleDragLeave);
    dropZone.addEventListener('drop', handleDrop);

    return () => {
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('drop', handleDrop);
    };
  }, [taskId]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      await addComment(taskId, newComment.trim(), mentionedUserIds);
      setNewComment('');
      setMentionedUserIds([]);
      setErrorMessage(null);
      onUpdate();
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to add comment');
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editedContent.trim()) return;
    try {
      await updateComment(commentId, editedContent.trim());
      setEditingComment(null);
      setEditedContent('');
      setErrorMessage(null);
      onUpdate();
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteComment(commentId);
      setErrorMessage(null);
      onUpdate();
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to delete comment');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleMultipleFileUpload([...files]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMultipleFileUpload = async (files: File[]) => {
    try {
      const uploadPromises = files.map(file => uploadAttachment(taskId, file));
      await Promise.all(uploadPromises);
      await fetchAttachments(taskId);
      setErrorMessage(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to upload one or more files');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await deleteAttachment(attachmentId);
      setErrorMessage(null);
    } catch (error: any) {
      setErrorMessage(error.message || 'Failed to delete attachment');
    }
  };

  const getCommentAuthor = (userId: string) => {
    const user = users.find((u) => u.id === userId);
    return formatUserDisplay(user);
  };

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span>{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="absolute top-0 right-0 px-4 py-3"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {comments.map((comment) => (
        <div key={comment.id} className="bg-gray-50 rounded-lg p-3 space-y-1 group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              {getCommentAuthor(comment.created_by)}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
              </span>
              {(currentUserId && comment.created_by && currentUserId === comment.created_by) && (
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                  <button
                    onClick={() => {
                      setEditingComment(comment.id);
                      setEditedContent(comment.content);
                    }}
                    className="p-1 text-gray-400 hover:text-gray-500 rounded"
                    title="Edit comment"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteComment(comment.id)}
                    className="p-1 text-red-400 hover:text-red-500 rounded"
                    title="Delete comment"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {editingComment === comment.id ? (
            <div className="mt-2 flex items-start space-x-2">
              <textarea
                value={editedContent}
                onChange={(e) => setEditedContent(e.target.value)}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2"
                rows={2}
              />
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => handleEditComment(comment.id)}
                  className="p-1 text-green-600 hover:text-green-700 rounded"
                  title="Save changes"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditedContent('');
                  }}
                  className="p-1 text-red-600 hover:text-red-700 rounded"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
          )}
        </div>
      ))}

      <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment} />

      <form onSubmit={handleAddComment} className="space-y-4">
        <div className="space-y-2">
          <MentionsInput
            value={newComment}
            onChange={setNewComment}
            onMentionsChange={(ids) => setMentionedUserIds(ids)}
            placeholder="Add a comment..."
            users={users}
          />
        </div>

        <div className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            ref={dropZoneRef}
            className={`border-2 border-dashed rounded-lg p-4 text-center ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300'
            }`}
          >
            <p className="text-sm text-gray-600">
              Drag and drop files here, or click to select files
            </p>
            <p className="text-xs text-gray-500">Max size: 15MB per file</p>
          </div>

          {/* File Input and Button */}
          <div className="flex justify-between items-center">
            <div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,.pdf,.doc,.docx,.txt"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                <Upload className="h-4 w-4 mr-2" />
                Attach files
              </button>
              <span className="ml-2 text-xs text-gray-500">Max size: 15MB</span>
            </div>
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              Comment
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};