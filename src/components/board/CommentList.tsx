// CommentList.tsx
import React, { useState, useRef } from 'react';
import { format } from 'date-fns';
import { Trash2, Upload, Edit2, Check, X } from 'lucide-react';
import { useTaskStore, TaskComment } from '../../lib/store/task';
import { useAttachmentStore } from '../../lib/store/attachment/store';
import { useUserStore } from '../../lib/store/user';
import { AttachmentList } from './AttachmentList';
import { formatUserDisplay } from '../../lib/utils/user-display';
import { MentionsInput } from './MentionsInput'; // Import the MentionsInput component

interface CommentListProps {
  taskId: string;
  comments: TaskComment[];
  onUpdate: () => void;
}

export const CommentList: React.FC<CommentListProps> = ({ taskId, comments, onUpdate }) => {
  // State to store new comment text.
  const [newComment, setNewComment] = useState('');
  // State to store an array of mentioned user IDs.
  const [mentionedUserIds, setMentionedUserIds] = useState<string[]>([]);
  // State for comment editing.
  const [editingComment, setEditingComment] = useState<string | null>(null);
  const [editedContent, setEditedContent] = useState('');
  // Ref for file input (attachments).
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get methods from our stores.
  const { addComment, deleteComment, updateComment } = useTaskStore();
  const { attachments, uploadAttachment, deleteAttachment, fetchAttachments } = useAttachmentStore();
  const { users } = useUserStore();

  // Handler for adding a new comment.
  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      console.log('Adding comment with mentioned users:', mentionedUserIds);
      // Call addComment and pass the mentionedUserIds array.
      await addComment(taskId, newComment.trim(), mentionedUserIds);
      setNewComment('');
      setMentionedUserIds([]);
      onUpdate();
    } catch (error) {
      console.error('Failed to add comment:', error);
    }
  };

  // Handler for editing a comment.
  const handleEditComment = async (commentId: string) => {
    if (!editedContent.trim()) return;
    try {
      await updateComment(commentId, editedContent.trim());
      setEditingComment(null);
      setEditedContent('');
      onUpdate();
    } catch (error) {
      console.error('Failed to update comment:', error);
    }
  };

  // Handler for deleting a comment.
  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      await deleteComment(commentId);
      onUpdate();
    } catch (error) {
      console.error('Failed to delete comment:', error);
    }
  };

  // Handler for file upload.
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadAttachment(taskId, file);
      await fetchAttachments(taskId);
    } catch (error) {
      console.error('Failed to upload file:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload file');
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Handler for deleting an attachment.
  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      await deleteAttachment(attachmentId);
    } catch (error) {
      console.error('Failed to delete attachment:', error);
    }
  };

  // Utility function to get the display name of a comment author.
  const getCommentAuthor = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return formatUserDisplay(user);
  };

  return (
    <div className="space-y-4">
      {/* Existing comments */}
      {comments.map(comment => (
        <div key={comment.id} className="bg-gray-50 rounded-lg p-3 space-y-1 group">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-900">
              {getCommentAuthor(comment.created_by)}
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-xs text-gray-500">
                {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
              </span>
              <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
                <button
                  onClick={() => {
                    setEditingComment(comment.id);
                    setEditedContent(comment.content);
                  }}
                  className="p-1 text-gray-400 hover:text-gray-500 rounded"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => handleDeleteComment(comment.id)}
                  className="p-1 text-red-400 hover:text-red-500 rounded"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
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
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    setEditingComment(null);
                    setEditedContent('');
                  }}
                  className="p-1 text-red-600 hover:text-red-700 rounded"
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

      {/* Attachments */}
      <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment} />

      {/* Comment form */}
      <form onSubmit={handleAddComment} className="space-y-4">
        <div className="space-y-2">
          {/* Use the MentionsInput component */}
          <MentionsInput
            value={newComment}
            onChange={setNewComment}
            onMentionsChange={(ids) => {
              console.log('MentionsInput returned mentioned IDs:', ids);
              setMentionedUserIds(ids);
            }}
            placeholder="Add a comment..."
            users={users}
          />
        </div>
        
        <div className="flex justify-between items-center">
          <div>
            <input
              ref={fileInputRef}
              type="file"
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
              Attach file
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
      </form>
    </div>
  );
};
