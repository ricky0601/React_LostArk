import React from 'react';
import { SkeletonBlock } from '../Loading';
import GlassCard from '../GlassCard';

const CompareSkeleton: React.FC = () => (
  <div className="space-y-6 animate-fade-in">
    <GlassCard className="p-5">
      <SkeletonBlock className="h-6 w-32 mb-4" />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <div className="space-y-3">
          <SkeletonBlock className="h-48 rounded-xl" />
          <SkeletonBlock className="h-4 w-24 mx-auto" />
          <SkeletonBlock className="h-6 w-20 mx-auto" />
        </div>
        <div className="space-y-3">
          <SkeletonBlock className="h-48 rounded-xl" />
          <SkeletonBlock className="h-4 w-24 mx-auto" />
          <SkeletonBlock className="h-6 w-20 mx-auto" />
        </div>
      </div>
    </GlassCard>
    {Array.from({ length: 3 }).map((_, i) => (
      <GlassCard key={i} className="p-5">
        <SkeletonBlock className="h-6 w-24 mb-4" />
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, j) => (
            <SkeletonBlock key={j} className="h-12 rounded-lg" />
          ))}
        </div>
      </GlassCard>
    ))}
  </div>
);

export default CompareSkeleton;
