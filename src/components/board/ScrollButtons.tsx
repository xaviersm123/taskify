import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollButtonsProps {
  onScrollLeft: () => void;
  onScrollRight: () => void;
  showLeft: boolean;
  showRight: boolean;
}

export const ScrollButtons: React.FC<ScrollButtonsProps> = ({
  onScrollLeft,
  onScrollRight,
  showLeft,
  showRight,
}) => {
  return (
    <>
      {showLeft && (
        <button
          onClick={onScrollLeft}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-all"
          style={{ zIndex: 100 }}
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
      )}
      
      {showRight && (
        <button
          onClick={onScrollRight}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 transition-all"
          style={{ zIndex: 100 }}
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      )}
    </>
  );
};