'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  showCheck?: boolean;
  className?: string;
}

export function CircularProgress({
  progress,
  size = 40,
  strokeWidth = 4,
  showCheck = false,
  className
}: CircularProgressProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      {/* Background circle */}
      <svg
        className="transform -rotate-90"
        width={size}
        height={size}
      >
        <circle
          className="text-muted/20"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress circle */}
        <circle
          className={cn(
            "transition-all duration-300 ease-in-out",
            showCheck ? "text-green-500" : "text-green-500"
          )}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      
      {/* Checkmark when complete */}
      {showCheck && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Check 
            className="text-green-500 animate-in zoom-in-50 duration-300" 
            size={size * 0.5}
            strokeWidth={3}
          />
        </div>
      )}
      
      {/* Progress percentage when not complete */}
      {!showCheck && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-green-600">
            {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}
