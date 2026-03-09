import React, { useEffect, useRef, useState } from 'react';

interface Props {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
}

const THRESHOLD = 72;
const MAX_PULL = 96;

const PullToRefresh: React.FC<Props> = ({ onRefresh, children }) => {
  const [refreshing, setRefreshing] = useState(false);
  const refreshingRef = useRef(false);
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const contentRef = useRef<HTMLDivElement>(null);
  const indicatorRef = useRef<HTMLDivElement>(null);
  const arrowRef = useRef<HTMLDivElement>(null);
  const pullDistRef = useRef(0);

  useEffect(() => {
    let startY = 0;
    let pulling = false;

    const applyContent = (dist: number, animate: boolean) => {
      const el = contentRef.current;
      if (!el) return;
      el.style.transition = animate ? 'transform 0.3s ease' : 'none';
      el.style.transform = dist === 0 ? '' : `translateY(${dist}px)`;
    };

    const applyIndicator = (dist: number, animate: boolean) => {
      const el = indicatorRef.current;
      if (!el) return;
      el.style.transition = animate ? 'transform 0.3s ease, opacity 0.3s ease' : 'none';
      el.style.transform = `translateY(${dist - 48}px)`;
      el.style.opacity = dist <= 0 ? '0' : String(Math.min(1, dist / THRESHOLD));
    };

    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY > 0 || refreshingRef.current) return;
      startY = e.touches[0].clientY;
      pulling = true;
      applyContent(0, false);
      applyIndicator(0, false);
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!pulling || refreshingRef.current) return;
      const delta = e.touches[0].clientY - startY;
      if (delta <= 0) {
        pulling = false;
        return;
      }
      e.preventDefault();
      const dist = Math.min(MAX_PULL, delta * 0.45);
      pullDistRef.current = dist;
      applyContent(dist, false);
      applyIndicator(dist, false);
      if (arrowRef.current) {
        arrowRef.current.style.transform = `rotate(${Math.min(180, (dist / THRESHOLD) * 180)}deg)`;
      }
    };

    const onTouchEnd = async () => {
      if (!pulling) return;
      pulling = false;
      const dist = pullDistRef.current;
      pullDistRef.current = 0;

      if (dist >= THRESHOLD) {
        applyContent(THRESHOLD, true);
        applyIndicator(THRESHOLD, true);
        refreshingRef.current = true;
        setRefreshing(true);
        await onRefreshRef.current();
        refreshingRef.current = false;
        setRefreshing(false);
      }

      applyContent(0, true);
      applyIndicator(0, true);
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', onTouchStart);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  return (
    <div className="relative">
      {/* Pull indicator */}
      <div
        ref={indicatorRef}
        className="absolute left-0 right-0 flex justify-center z-50 pointer-events-none"
        style={{ top: 0, height: '48px', alignItems: 'center', display: 'flex', transform: 'translateY(-48px)', opacity: 0 }}
      >
        <div className="w-8 h-8 rounded-full bg-white dark:bg-gray-800 shadow-lg flex items-center justify-center">
          {refreshing ? (
            <svg className="w-5 h-5 text-la-gold animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <div ref={arrowRef}>
              <svg className="w-5 h-5 text-la-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div ref={contentRef}>
        {children}
      </div>
    </div>
  );
};

export default PullToRefresh;
