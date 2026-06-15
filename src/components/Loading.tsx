import React from 'react';

import GlassCard from './GlassCard';

const joinClassNames = (...classes: Array<string | undefined | false>): string =>
  classes.filter(Boolean).join(' ');

interface SkeletonBlockProps {
  className?: string;
}

export const SkeletonBlock: React.FC<SkeletonBlockProps> = ({ className }) => (
  <div className={joinClassNames('skeleton', className)} />
);

interface LoadingIndicatorProps {
  message: string;
  className?: string;
  textClassName?: string;
}

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({
  message,
  className,
  textClassName,
}) => (
  <GlassCard className={joinClassNames('p-6 text-center animate-fade-in', className)}>
    <p className={joinClassNames('text-gray-500 dark:text-gray-400', textClassName)}>{message}</p>
  </GlassCard>
);
