"use client";

import { cn } from "@/lib/utils";

interface StockBarProps {
  available: number;
  total: number;
  className?: string;
}

export function StockBar({ available, total, className }: StockBarProps) {
  if (total === 0) {
    return (
      <div className={cn("h-2 bg-muted rounded-full overflow-hidden", className)}>
        <div className="h-full w-0" />
      </div>
    );
  }

  const ratio = Math.max(0, Math.min(1, available / total));
  const pct = Math.round(ratio * 100);

  const color =
    ratio > 0.5
      ? "bg-emerald-500"
      : ratio > 0.2
        ? "bg-amber-500"
        : "bg-rose-500";

  return (
    <div className="space-y-1">
      <div
        className={cn("h-2.5 bg-stone-100 rounded-full overflow-hidden", className)}
      >
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-muted-foreground">
        <span>{available} available</span>
        <span>{total} total</span>
      </div>
    </div>
  );
}
