import React from 'react';
import { SkeletonBlock } from '../Loading';
import GlassCard from '../GlassCard';

const PageSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 animate-fade-in">
    <div className="space-y-4">
      <GlassCard className="overflow-hidden">
        <SkeletonBlock className="h-80 w-full" />
        <div className="p-4 space-y-2">
          <SkeletonBlock className="h-5 w-32" />
          {Array.from({ length: 4 }).map((_, i) => <SkeletonBlock key={i} className="h-4 w-full" />)}
        </div>
      </GlassCard>
      {Array.from({ length: 3 }).map((_, i) => (
        <GlassCard key={i} className="p-4">
          <SkeletonBlock className="h-3 w-20 mb-3" />
          <div className="grid grid-cols-3 gap-2">
            {Array.from({ length: 6 }).map((_, j) => <SkeletonBlock key={j} className="h-14 rounded-lg" />)}
          </div>
        </GlassCard>
      ))}
    </div>
    <div className="space-y-4">
      <GlassCard className="p-4">
        <SkeletonBlock className="h-3 w-12 mb-3" />
        <div className="flex gap-2">
          {Array.from({ length: 10 }).map((_, i) => <SkeletonBlock key={i} className="w-12 h-14 rounded-xl" />)}
        </div>
      </GlassCard>
      <GlassCard className="p-4">
        <SkeletonBlock className="h-3 w-12 mb-3" />
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <SkeletonBlock key={i} className="h-14 rounded-xl" />)}
          </div>
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <SkeletonBlock key={i} className="h-14 rounded-xl" />)}
          </div>
        </div>
      </GlassCard>
    </div>
  </div>
);

export default PageSkeleton;
