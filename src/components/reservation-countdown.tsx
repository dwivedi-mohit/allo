"use client";

import { useState, useEffect } from "react";

interface Props {
  expiresAt: string;
  onExpired: () => void;
}

export function ReservationCountdown({ expiresAt, onExpired }: Props) {
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    function tick() {
      const now = Date.now();
      const expiry = new Date(expiresAt).getTime();
      const diff = expiry - now;

      if (diff <= 0) {
        setTimeLeft("Expired");
        onExpired();
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${minutes}:${seconds.toString().padStart(2, "0")}`);
    }

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  return (
    <span
      className={
        timeLeft === "Expired" ? "text-red-600 font-bold" : "font-mono text-lg"
      }
    >
      {timeLeft}
    </span>
  );
}
