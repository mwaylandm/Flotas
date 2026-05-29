"use client";

import { cn } from "@/lib/utils";

interface CapacityIndicatorProps {
  current: number;
  max: number;
}

export function CapacityIndicator({ current, max }: CapacityIndicatorProps) {
  const percentage = max > 0 ? Math.min(100, ((current ?? 0) / max) * 100) : 0;
  
  const getColor = () => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 70) return "bg-amber-500";
    if (percentage >= 40) return "bg-blue-500";
    return "bg-cyan-500";
  };

  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs text-gray-600">
        <span>Carga: {(current ?? 0).toLocaleString()} L</span>
        <span>{percentage.toFixed(0)}%</span>
      </div>
      <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        <div
          className={cn("h-full transition-all duration-500 rounded-full", getColor())}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 text-right">Cap: {(max ?? 0).toLocaleString()} L</p>
    </div>
  );
}
