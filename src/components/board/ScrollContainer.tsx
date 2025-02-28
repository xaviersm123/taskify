import React, { useState, useRef, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollContainerProps {
  children: React.ReactNode;
}

export const ScrollContainer: React.FC<ScrollContainerProps> = ({ children }) => {
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true); // Start with true to show right arrow
  const containerRef = useRef<HTMLDivElement>(null);

  const checkScroll = () => {
    if (!containerRef.current) return;
    
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setShowLeftArrow(scrollLeft > 0);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10); // Add small buffer
  };

  useEffect(() => {
    checkScroll();
    const observer = new ResizeObserver(checkScroll);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const scroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    
    const scrollAmount = 320; // Width of a column
    const container = containerRef.current;
    const newPosition = direction === 'left' 
      ? container.scrollLeft - scrollAmount 
      : container.scrollLeft + scrollAmount;
    
    container.scrollTo({
      left: newPosition,
      behavior: 'smooth'
    });
  };

  return (
    <div className="relative flex-1 flex">
      {showLeftArrow && (
        <button
          onClick={() => scroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg z-10 hover:bg-gray-50"
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>
      )}

      {showRightArrow && (
        <button
          onClick={() => scroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg z-10 hover:bg-gray-50"
          aria-label="Scroll right"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      )}

      <div
        ref={containerRef}
        className="flex-1 overflow-x-auto scrollbar-hide px-6"
        onScroll={checkScroll}
      >
        <div className="inline-flex gap-4 pb-4">
          {children}
        </div>
      </div>
    </div>
  );
};