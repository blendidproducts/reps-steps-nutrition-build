import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

export default function PullToRefresh({ onRefresh, children }) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const containerRef = useRef(null);
  
  const threshold = 80; // Pull distance needed to trigger refresh
  const maxPull = 120;

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleTouchStart = (e) => {
      // Only start tracking if we're at the top of the scroll container
      if (container.scrollTop === 0) {
        setTouchStart(e.touches[0].clientY);
      }
    };

    const handleTouchMove = (e) => {
      if (isRefreshing || container.scrollTop > 0) return;

      const touchY = e.touches[0].clientY;
      const distance = touchY - touchStart;

      if (distance > 0 && container.scrollTop === 0) {
        // Calculate pull with diminishing returns
        const pull = Math.min(distance * 0.5, maxPull);
        setPullDistance(pull);
        
        // Prevent default scroll behavior while pulling
        if (pull > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = async () => {
      if (pullDistance >= threshold && !isRefreshing) {
        setIsRefreshing(true);
        try {
          await onRefresh();
        } catch (error) {
          console.error('Refresh failed:', error);
        }
        setIsRefreshing(false);
      }
      setPullDistance(0);
      setTouchStart(0);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [touchStart, pullDistance, isRefreshing, onRefresh]);

  const rotation = pullDistance / threshold * 360;
  const opacity = Math.min(pullDistance / threshold, 1);

  return (
    <div ref={containerRef} className="relative overflow-auto h-full">
      {/* Pull indicator */}
      <div 
        className="absolute top-0 left-0 right-0 flex justify-center items-center transition-all duration-200 pointer-events-none z-50"
        style={{ 
          height: `${pullDistance}px`,
          opacity: opacity
        }}
      >
        <div className="bg-brand-blue/90 backdrop-blur-sm rounded-full p-2 shadow-lg">
          <RefreshCw 
            className={`w-5 h-5 text-white ${isRefreshing ? 'animate-spin' : ''}`}
            style={{ 
              transform: `rotate(${rotation}deg)`,
              transition: isRefreshing ? 'none' : 'transform 0.2s'
            }}
          />
        </div>
      </div>

      {/* Content with transform */}
      <div 
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
}