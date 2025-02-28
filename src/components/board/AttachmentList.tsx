import React from 'react';
import { FileIcon, Image, Trash2, Download } from 'lucide-react';
import { Attachment } from '../../lib/store/attachment/types';

interface AttachmentListProps {
  attachments: Attachment[];
  onDelete: (id: string) => void;
}

export const AttachmentList: React.FC<AttachmentListProps> = ({
  attachments,
  onDelete,
}) => {
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div className="space-y-2">
      {attachments.map(attachment => (
        <div
          key={attachment.id}
          className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg group"
        >
          {isImage(attachment.type) ? (
            <div className="relative w-12 h-12">
              <img
                src={attachment.url}
                alt={attachment.name}
                className="w-full h-full object-cover rounded"
              />
            </div>
          ) : (
            <div className="w-12 h-12 flex items-center justify-center bg-gray-100 rounded">
              <FileIcon className="h-6 w-6 text-gray-400" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <a
                href={attachment.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-gray-900 truncate hover:underline"
              >
                {attachment.name}
              </a>
              <span className="text-xs text-gray-500">
                {formatFileSize(attachment.size)}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <a
              href={attachment.url}
              download={attachment.name}
              className="p-1 text-gray-400 hover:text-gray-500 rounded"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              onClick={() => onDelete(attachment.id)}
              className="p-1 text-red-400 hover:text-red-500 rounded"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};