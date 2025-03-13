import React, { useRef, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface BoardContainerProps {
  children: React.ReactNode;
}

export const BoardContainer: React.FC<BoardContainerProps> = ({ children }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(true);

  const checkScroll = () => {
    if (!containerRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = containerRef.current;
    setShowLeft(scrollLeft > 0);
    setShowRight(scrollLeft < scrollWidth - clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const observer = new ResizeObserver(checkScroll);
    if (containerRef.current) {
      observer.observe(containerRef.current);
    }
    return () => observer.disconnect();
  }, []);

  const handleScroll = (direction: 'left' | 'right') => {
    if (!containerRef.current) return;
    const scrollAmount = 320;
    const newPosition =
      direction === 'left'
        ? containerRef.current.scrollLeft - scrollAmount
        : containerRef.current.scrollLeft + scrollAmount;

    containerRef.current.scrollTo({
      left: newPosition,
      behavior: 'smooth',
    });
  };

  return (
    <div className="relative flex-1 min-h-0">
      {showLeft && (
        <button
          onClick={() => handleScroll('left')}
          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 z-10"
          style={{ transform: 'translate(0, -50%)' }}
        >
          <ChevronLeft className="h-6 w-6 text-gray-600" />
        </button>
      )}

      {showRight && (
        <button
          onClick={() => handleScroll('right')}
          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white p-2 rounded-full shadow-lg hover:bg-gray-50 z-10"
          style={{ transform: 'translate(0, -50%)' }}
        >
          <ChevronRight className="h-6 w-6 text-gray-600" />
        </button>
      )}

      <div
        ref={containerRef}
        className="h-full overflow-x-auto hide-scrollbar w-full" // Ensure width is constrained to container
        onScroll={checkScroll}
      >
        <div className="flex gap-4 p-6 h-full w-max"> {/* Use w-max to allow content to grow but not shrink */}
          {children}
        </div>
      </div>
    </div>
  );
};