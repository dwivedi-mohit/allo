"use client";

import { cn } from "@/lib/utils";

interface StockDotsProps {
  available: number;
  total: number;
  label?: string;
  className?: string;
}

const DOTS = 10;

export function StockDots({ available, total, label, className }: StockDotsProps) {
  const filled = total === 0 ? 0 : Math.round((available / total) * DOTS);
  const safe = Math.max(0, Math.min(DOTS, filled));

  const color =
    safe > 6
      ? "bg-blue-500"
      : safe > 3
        ? "bg-orange-500"
        : "bg-red-500";

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <p className="text-[11px] font-medium text-[#8e8e93] uppercase tracking-wider">
          {label}
        </p>
      )}
      <div className="flex items-center gap-1">
        {Array.from({ length: DOTS }).map((_, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-full transition-all duration-500"
            style={{
              animation: i < safe ? `dot-pop 0.3s ease-out ${i * 0.04}s both` : "none",
              border: `1.5px solid ${i < safe ? "transparent" : "#d1d1d6"}`,
            }}
          >
            <div
              className={cn(
                "w-full h-full rounded-full transition-colors duration-500",
                i < safe ? color : "bg-transparent",
              )}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[11px] text-[#8e8e93]">
        <span>{available} free</span>
        <span>{total} total</span>
      </div>
    </div>
  );
}
