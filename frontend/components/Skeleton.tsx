import React from 'react';
import { cn } from '../lib/utils';

interface SkeletonProps {
  className?: string;
  count?: number;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className, count = 1 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "animate-pulse bg-white/[0.03] rounded",
            className
          )}
        />
      ))}
    </>
  );
};
