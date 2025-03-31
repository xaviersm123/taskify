// CommentList.tsx
import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Trash2, Upload, Edit2, Check, X } from 'lucide-react';
import ReactLinkify from 'react-linkify'; // Import react-linkify
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
      // Check if the related target is inside the drop zone to prevent flickering
      if (!dropZone.contains(e.relatedTarget as Node)) {
          setIsDragging(false);
      }
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

    // Prevent default browser behavior for dragover/drop on the window
    const preventDefaults = (e: DragEvent) => e.preventDefault();
    window.addEventListener('dragover', preventDefaults, false);
    window.addEventListener('drop', preventDefaults, false);


    return () => {
      dropZone.removeEventListener('dragover', handleDragOver);
      dropZone.removeEventListener('dragleave', handleDragLeave);
      dropZone.removeEventListener('drop', handleDrop);
      window.removeEventListener('dragover', preventDefaults, false);
      window.removeEventListener('drop', preventDefaults, false);
    };
  }, [taskId]); // Ensure this runs only when needed

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    try {
      setErrorMessage(null); // Clear previous errors
      await addComment(taskId, newComment.trim(), mentionedUserIds);
      setNewComment('');
      setMentionedUserIds([]);
      onUpdate(); // Refresh comment list
    } catch (error: any) {
        console.error("Failed to add comment:", error);
        setErrorMessage(error.response?.data?.message || error.message || 'Failed to add comment');
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editedContent.trim()) return;
    try {
       setErrorMessage(null); // Clear previous errors
      await updateComment(commentId, editedContent.trim());
      setEditingComment(null);
      setEditedContent('');
      onUpdate(); // Refresh comment list
    } catch (error: any) {
      console.error("Failed to update comment:", error);
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to update comment');
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!window.confirm('Are you sure you want to delete this comment?')) return;
    try {
      setErrorMessage(null); // Clear previous errors
      await deleteComment(commentId);
      onUpdate(); // Refresh comment list
    } catch (error: any) {
      console.error("Failed to delete comment:", error);
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to delete comment');
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleMultipleFileUpload([...files]);
    }
    // Reset file input value to allow uploading the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleMultipleFileUpload = async (files: File[]) => {
    // Optional: Add file size validation here before uploading
    const maxSize = 15 * 1024 * 1024; // 15MB
    const oversizedFiles = files.filter(file => file.size > maxSize);
    if (oversizedFiles.length > 0) {
        setErrorMessage(`File(s) exceed the 15MB limit: ${oversizedFiles.map(f => f.name).join(', ')}`);
        return;
    }

    try {
      setErrorMessage(null); // Clear previous errors
      const uploadPromises = files.map(file => uploadAttachment(taskId, file));
      await Promise.all(uploadPromises);
      await fetchAttachments(taskId); // Refresh attachment list
    } catch (error: any) {
      console.error("Failed to upload file(s):", error);
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to upload one or more files');
    }
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    if (!window.confirm('Are you sure you want to delete this attachment?')) return;
    try {
      setErrorMessage(null); // Clear previous errors
      await deleteAttachment(attachmentId);
      // Attachment store should update the list automatically, no need to call fetchAttachments here usually
    } catch (error: any) {
      console.error("Failed to delete attachment:", error);
      setErrorMessage(error.response?.data?.message || error.message || 'Failed to delete attachment');
    }
  };

  const getCommentAuthor = (userId: string | undefined) => {
      if (!userId) return 'System'; // Or 'Unknown User'
      const user = users.find((u) => u.id === userId);
      return formatUserDisplay(user);
  };

  // Link decorator for react-linkify
  const linkDecorator = (href: string, text: string, key: number) => (
    <a href={href} key={key} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
      {text}
    </a>
  );

  return (
    <div className="space-y-4">
      {errorMessage && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <span className="block sm:inline">{errorMessage}</span>
          <button
            onClick={() => setErrorMessage(null)}
            className="absolute top-0 bottom-0 right-0 px-4 py-3"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="space-y-3 max-h-96 overflow-y-auto pr-2"> {/* Added max height and scroll */}
        {comments && comments.length > 0 ? comments.map((comment) => (
          <div key={comment.id} className="bg-gray-50 rounded-lg p-3 space-y-1 group relative">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-900">
                {getCommentAuthor(comment.created_by)}
              </span>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500" title={new Date(comment.created_at).toISOString()}>
                  {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
                </span>
                 {(currentUserId && comment.created_by && currentUserId === comment.created_by) && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1 absolute top-1 right-1 bg-gray-50 rounded p-0.5"> {/* Positioned edit/delete */}
                    <button
                      onClick={() => {
                        setEditingComment(comment.id);
                        setEditedContent(comment.content);
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 rounded hover:bg-gray-200"
                      title="Edit comment"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteComment(comment.id)}
                      className="p-1 text-red-400 hover:text-red-600 rounded hover:bg-red-100"
                      title="Delete comment"
                    >
                      <Trash2 className="h-3 w-3" />
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
                  rows={3} // Slightly larger editing area
                  autoFocus // Focus when editing starts
                  onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.metaKey) { // Cmd+Enter to save
                          handleEditComment(comment.id);
                      }
                      if (e.key === 'Escape') { // Escape to cancel
                           setEditingComment(null);
                           setEditedContent('');
                      }
                  }}
                />
                <div className="flex flex-col space-y-1">
                  <button
                    onClick={() => handleEditComment(comment.id)}
                    className="p-1 text-green-600 hover:text-green-700 rounded hover:bg-green-100"
                    title="Save (Cmd+Enter)"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingComment(null);
                      setEditedContent('');
                    }}
                    className="p-1 text-red-600 hover:text-red-700 rounded hover:bg-red-100"
                    title="Cancel (Esc)"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ) : (
              // Apply ReactLinkify here
              <div className="text-sm text-gray-700 whitespace-pre-wrap pt-1">
                  <ReactLinkify componentDecorator={linkDecorator}>
                      {comment.content}
                  </ReactLinkify>
              </div>
            )}
          </div>
        )) : (
           <p className="text-sm text-gray-500 italic px-3">No comments yet.</p>
        )}
      </div>


      <AttachmentList attachments={attachments} onDelete={handleDeleteAttachment} />

      <form onSubmit={handleAddComment} className="space-y-4 pt-4 border-t"> {/* Added border */}
        <div className="space-y-2">
           {/* Mentions Input Component */}
          <MentionsInput
              value={newComment}
              onChange={setNewComment}
              onMentionsChange={(ids) => setMentionedUserIds(ids)}
              placeholder="Add a comment... Use @ to mention users."
              users={users}
          />
        </div>

        <div className="space-y-4">
          {/* Drag and Drop Zone */}
          <div
            ref={dropZoneRef}
            className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer ${
              isDragging ? 'border-indigo-500 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'
            }`}
            onClick={() => fileInputRef.current?.click()} // Make the drop zone clickable
          >
            <Upload className={`h-6 w-6 mx-auto mb-2 ${isDragging ? 'text-indigo-600' : 'text-gray-400'}`} />
            <p className="text-sm text-gray-600">
              <span className="font-medium text-indigo-600">Click to upload</span> or drag and drop files here
            </p>
            <p className="text-xs text-gray-500 mt-1">Max size: 15MB per file</p>
            <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden" // Keep hidden, trigger programmatically
                accept="image/*,.pdf,.doc,.docx,.txt,.xls,.xlsx,.ppt,.pptx,.zip,.rar" // Example accepted types
            />
          </div>

          {/* Submit Button aligned right */}
          <div className="flex justify-end items-center">
             {/* Optional: Show selected file names or progress */}
            <button
              type="submit"
              disabled={!newComment.trim()}
              className="inline-flex justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Comment
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};