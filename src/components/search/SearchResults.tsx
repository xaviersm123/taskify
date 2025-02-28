import React, { useEffect, useRef } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { SearchResult } from '../../lib/utils/search';

interface SearchResultsProps {
  results: SearchResult[];
  onSelect: (result: SearchResult) => void;
  onClose: () => void;
}

export const SearchResults: React.FC<SearchResultsProps> = ({
  results,
  onSelect,
  onClose,
}) => {
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close the dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        onClose(); // Close the dropdown if clicked outside
      }
    };

    // Add event listener for clicks outside the dropdown
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      // Clean up the event listener
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  // If there are no results, show a message
  if (results.length === 0) {
    return (
      <div
        ref={dropdownRef}
        className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50"
      >
        <div className="px-4 py-3 text-sm text-gray-500">No results found.</div>
      </div>
    );
  }

  // Render the search results
  return (
    <div
      ref={dropdownRef}
      className="absolute top-full left-0 right-0 mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50"
    >
      {results.map((result) => (
        <button
          key={`${result.type}-${result.id}`}
          onClick={() => {
            onSelect(result);
            onClose();
          }}
          className="w-full px-4 py-3 text-left hover:bg-gray-50 flex items-center space-x-3 transition-colors duration-200"
          aria-label={`Select ${result.type}: ${result.title}`}
        >
          <Search className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center">
              <span className="text-sm font-medium text-gray-900 truncate">
                {result.title}
              </span>
              <ArrowRight className="h-4 w-4 text-gray-400 ml-2" />
              <span className="text-xs text-gray-500 ml-2">
                {result.type === 'subtask' ? 'Subtask' : 'Task'}
              </span>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
};