import { CheckCircle, Trash2, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface TaskDetailsHeaderProps {
  title: string;
  onTitleChange: (value: string) => void;
  onMarkComplete: () => void;
  onDelete: () => void;
  onClose: () => void;
  isComplete: boolean;
}

export function TaskDetailsHeader({
  title,
  onTitleChange,
  onMarkComplete,
  onDelete,
  onClose,
  isComplete,
}: TaskDetailsHeaderProps) {
  const titleInputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-adjust height on mount and title change
  useEffect(() => {
    if (titleInputRef.current) {
      titleInputRef.current.style.height = '0px';
      titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
    }
  }, [title]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (titleInputRef.current) {
      titleInputRef.current.style.height = '0px';
      titleInputRef.current.style.height = `${titleInputRef.current.scrollHeight}px`;
    }
    onTitleChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      titleInputRef.current?.blur();
    }
  };

  return (
    <div className="flex items-start justify-between p-4 border-b min-h-[4rem]">
      <div className="flex items-start space-x-3 flex-1 min-w-0">
        <button
          onClick={onMarkComplete}
          className={`p-1.5 rounded-full flex-shrink-0 mt-1 ${
            isComplete
              ? 'text-green-600 bg-green-50 hover:bg-green-100'
              : 'text-gray-400 hover:text-gray-500 hover:bg-gray-100'
          }`}
        >
          <CheckCircle className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <textarea
            ref={titleInputRef}
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            className="w-full text-lg font-medium text-gray-900 bg-transparent border-0 focus:ring-0 p-0 resize-none overflow-hidden leading-tight"
            style={{
              minHeight: '28px',
              maxHeight: '150px'
            }}
            rows={1}
          />
        </div>
      </div>
      <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
        <button 
          onClick={onDelete}
          className="p-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full"
        >
          <Trash2 className="h-5 w-5" />
        </button>
        <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-500">
          <X className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}