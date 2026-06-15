import React from 'react';

import { SkeletonBlock } from '../Loading';

const GoldLoadingSkeleton: React.FC = () => (
  <div className="space-y-6">
    <div className="glass-card p-5">
      <SkeletonBlock className="h-4 w-40 mb-3" />
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-10 w-36 rounded-xl" />
        ))}
      </div>
    </div>
    <div className="glass-card p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center space-y-2">
            <SkeletonBlock className="h-4 w-20 mx-auto" />
            <SkeletonBlock className="h-8 w-32 mx-auto" />
          </div>
        ))}
      </div>
    </div>
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="glass-card p-4 md:p-5">
        <div className="flex flex-col md:flex-row md:items-start gap-4">
          <div className="flex items-center gap-3 md:w-56">
            <SkeletonBlock className="w-14 h-14 rounded-xl flex-shrink-0" />
            <div className="space-y-2">
              <SkeletonBlock className="h-5 w-24" />
              <SkeletonBlock className="h-4 w-16" />
            </div>
          </div>
          <div className="flex-1 space-y-1.5">
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="h-10 w-full rounded-lg" />
            <SkeletonBlock className="h-10 w-3/4 rounded-lg" />
          </div>
          <div className="md:w-36 text-right">
            <SkeletonBlock className="h-4 w-14 ml-auto" />
            <SkeletonBlock className="h-7 w-24 ml-auto mt-1" />
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default GoldLoadingSkeleton;
