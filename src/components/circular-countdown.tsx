"use client";

import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

interface CircularCountdownProps {
  expiresAt: string;
  durationMinutes?: number;
  onExpired: () => void;
  className?: string;
}

export function CircularCountdown({
  expiresAt,
  durationMinutes = 10,
  onExpired,
  className,
}: CircularCountdownProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [progress, setProgress] = useState(1);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function tick() {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const created = expiry - durationMinutes * 60 * 1000;
      const total = expiry - created;
      const remaining = expiry - now;

      if (remaining <= 0) {
        setTimeLeft("0:00");
        setProgress(0);
        if (!expired) {
          setExpired(true);
          onExpired();
        }
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
      setProgress(Math.max(0, Math.min(1, remaining / total)));
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, durationMinutes, onExpired, expired]);

  const circumference = 2 * Math.PI * 54;
  const offset = circumference * (1 - progress);

  const color =
    progress > 0.5
      ? "stroke-orange-500"
      : progress > 0.25
        ? "stroke-amber-500"
        : "stroke-rose-500";

  const textColor =
    progress > 0.5
      ? "text-orange-600"
      : progress > 0.25
        ? "text-amber-600"
        : "text-rose-600";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          stroke="currentColor"
          className="text-stone-100"
          strokeWidth="6"
        />
        <circle
          cx="60"
          cy="60"
          r="54"
          fill="none"
          className={cn(
            "transition-all duration-1000 ease-linear",
            color,
          )}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "text-2xl font-bold font-mono tracking-tight",
            textColor,
          )}
        >
          {expired ? "0:00" : timeLeft}
        </span>
        {expired && (
          <span className="text-xs font-medium text-rose-500 mt-0.5">
            Expired
          </span>
        )}
      </div>
    </div>
  );
}
