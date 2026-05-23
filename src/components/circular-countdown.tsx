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

  const circumference = 2 * Math.PI * 64;
  const offset = circumference * (1 - progress);

  const color =
    progress > 0.5
      ? "stroke-blue-600"
      : progress > 0.25
        ? "stroke-orange-500"
        : "stroke-red-500";

  const textColor =
    progress > 0.5
      ? "text-blue-700"
      : progress > 0.25
        ? "text-orange-700"
        : "text-red-700";

  const label =
    expired ? "Expired"
    : progress > 0.5 ? "Time left"
    : progress > 0.25 ? "Running out"
    : "Expiring soon";

  return (
    <div className={cn("relative flex items-center justify-center", className)}>
      <svg className="w-40 h-40 -rotate-90 drop-shadow-sm" viewBox="0 0 140 140" filter="url(#emboss)">
        <defs>
          <filter id="emboss">
            <feDropShadow dx="1" dy="1" stdDeviation="1" floodColor="#d1d1d6" floodOpacity="0.5" />
            <feDropShadow dx="-1" dy="-1" stdDeviation="1" floodColor="#ffffff" floodOpacity="0.8" />
          </filter>
        </defs>
        <circle
          cx="70"
          cy="70"
          r="64"
          fill="none"
          stroke="#d1d1d6"
          strokeWidth="5"
          opacity="0.4"
        />
        <circle
          cx="70"
          cy="70"
          r="64"
          fill="none"
          className={cn("transition-all duration-1000 ease-linear drop-shadow-sm", color)}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          filter="url(#emboss)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className={cn(
            "text-3xl font-bold font-mono tracking-tight drop-shadow-sm",
            textColor,
          )}
        >
          {expired ? "0:00" : timeLeft}
        </span>
        <span className="text-[10px] font-medium text-[#8e8e93] uppercase tracking-wider mt-0.5">
          {label}
        </span>
      </div>
    </div>
  );
}
