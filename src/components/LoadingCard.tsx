import React from 'react';

import { SkeletonBlock } from './Loading';

interface LoadingCardProps {
  count?: number;
}

const LoadingCard: React.FC<LoadingCardProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 space-y-4 animate-fade-in">
          <SkeletonBlock className="aspect-[3/4] w-full" />
          <SkeletonBlock className="h-5 w-3/4" />
          <SkeletonBlock className="h-4 w-1/2" />
          <div className="flex justify-between gap-2">
            <SkeletonBlock className="h-6 w-20" />
            <SkeletonBlock className="h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingCard;
