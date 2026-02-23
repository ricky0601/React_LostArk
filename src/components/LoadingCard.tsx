import React from 'react';

interface LoadingCardProps {
  count?: number;
}

const LoadingCard: React.FC<LoadingCardProps> = ({ count = 6 }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="glass-card p-4 space-y-4 animate-fade-in">
          <div className="skeleton aspect-[3/4] w-full" />
          <div className="skeleton h-5 w-3/4" />
          <div className="skeleton h-4 w-1/2" />
          <div className="flex justify-between gap-2">
            <div className="skeleton h-6 w-20" />
            <div className="skeleton h-6 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
};

export default LoadingCard;
