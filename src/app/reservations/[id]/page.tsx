"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { CircularCountdown } from "@/components/circular-countdown";

interface Reservation {
  id: string;
  productId: string;
  productName: string;
  productSku: string;
  productPrice: number;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  status: string;
  expiresAt: string;
  confirmedAt: string | null;
  releasedAt: string | null;
  createdAt: string;
}

export default function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [stamped, setStamped] = useState(false);
  const router = useRouter();

  const fetchReservation = useCallback(async () => {
    const { id } = await params;
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setToast({ message: "Reservation not found", type: "error" });
          setLoading(false);
          return;
        }
        throw new Error("Failed to fetch");
      }
      const data = await res.json();
      setReservation(data);
    } catch {
      setToast({ message: "Failed to load reservation", type: "error" });
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchReservation();
    const interval = setInterval(fetchReservation, 5000);
    return () => clearInterval(interval);
  }, [fetchReservation]);

  async function handleConfirm() {
    if (!reservation) return;
    setActionLoading(true);

    try {
      const res = await fetch(
        `/api/reservations/${reservation.id}/confirm`,
        { method: "POST" },
      );

      if (res.status === 410) {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
        await fetchReservation();
        return;
      }

      if (res.status === 409) {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
        await fetchReservation();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setToast({ message: data.error || "Failed to confirm", type: "error" });
        return;
      }

      setReservation((prev) =>
        prev ? { ...prev, status: "CONFIRMED" } : prev,
      );
      setStamped(true);
      setToast({ message: "Purchase confirmed successfully!", type: "success" });
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRelease() {
    if (!reservation) return;
    setActionLoading(true);

    try {
      const res = await fetch(
        `/api/reservations/${reservation.id}/release`,
        { method: "POST" },
      );

      if (res.status === 410) {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
        await fetchReservation();
        return;
      }

      if (res.status === 409) {
        const data = await res.json();
        setToast({ message: data.error, type: "error" });
        await fetchReservation();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setToast({ message: data.error || "Failed to cancel", type: "error" });
        return;
      }

      setReservation((prev) =>
        prev ? { ...prev, status: "RELEASED" } : prev,
      );
      setToast({ message: "Reservation cancelled", type: "warning" });
    } catch {
      setToast({ message: "Network error", type: "error" });
    } finally {
      setActionLoading(false);
    }
  }

  const handleExpired = useCallback(async () => {
    setToast({
      message: "This reservation has expired. The stock has been released.",
      type: "warning",
    });
    await fetchReservation();
  }, [fetchReservation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 w-full max-w-md px-4">
          <Skeleton className="h-10 w-40 mx-auto rounded-xl" />
          <Skeleton className="h-96 w-full rounded-2xl" />
          <Skeleton className="h-11 w-40 mx-auto rounded-xl" />
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-[#fef1f0] rounded-full flex items-center justify-center shadow-inner">
            <svg className="w-8 h-8 text-[#ff3b30]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-[#1d1d1f] mb-1">Reservation Not Found</h2>
          <p className="text-sm text-[#8e8e93] mb-4">This reservation may have expired or the link is invalid.</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Back to products
          </Button>
        </div>
      </div>
    );
  }

  const isPending = reservation.status === "PENDING";

  return (
    <div className="min-h-screen bg-background">
      <Toast
        message={toast?.message ?? null}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />

      <header className="border-b border-[#d1d1d6] bg-white/80 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-9 h-9 rounded-full bg-[#f2f2f7] hover:bg-[#e8e8ed] flex items-center justify-center transition-colors"
            aria-label="Back"
          >
            <svg className="w-4 h-4 text-[#8e8e93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#1d1d1f] tracking-tight">Reservation</h1>
            <p className="text-[10px] text-[#8e8e93] font-mono uppercase tracking-wider">
              #{reservation.id.slice(0, 8)}
            </p>
          </div>
          <StatusBadge status={reservation.status} />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        <div
          className="bg-card rounded-2xl border-2 border-[#d1d1d6] overflow-hidden shadow-lg shadow-black/[0.04]"
          style={{ animation: "slide-up 0.4s ease-out" }}
        >
          <div className="p-6 space-y-6">
            {/* Countdown */}
            {isPending && (
              <div className="flex justify-center -mt-2">
                <CircularCountdown
                  expiresAt={reservation.expiresAt}
                  onExpired={handleExpired}
                />
              </div>
            )}

            {/* Stamp animation */}
            {stamped && (
              <div
                className="absolute top-20 right-8 z-10"
                style={{ animation: "stamp-in 0.5s ease-out both" }}
              >
                <div className="bg-[#34c759] text-white text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-lg -rotate-6 shadow-lg">
                  Confirmed
                </div>
              </div>
            )}

            {/* Product info */}
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-[#1d1d1f] leading-tight">
                  {reservation.productName}
                </h2>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="warm" className="text-[10px] font-mono">
                    {reservation.productSku}
                  </Badge>
                  <span className="text-xs text-[#8e8e93]">
                    &middot; {reservation.warehouseName}
                  </span>
                </div>
              </div>
              <span className="text-2xl font-bold text-[#1d1d1f] shrink-0 ml-3">
                ${Number(reservation.productPrice).toFixed(2)}
              </span>
            </div>

            {/* Status Timeline */}
            <StatusTimeline status={reservation.status} />

            {/* Detail rows */}
            <div className="grid grid-cols-2 gap-3">
              <DetailItem label="Quantity" value={`${reservation.quantity}`} />
              <DetailItem label="Total" value={`$${(Number(reservation.productPrice) * reservation.quantity).toFixed(2)}`} />
              <DetailItem label="Warehouse" value={reservation.warehouseName} />
              <DetailItem label="Created" value={new Date(reservation.createdAt).toLocaleTimeString()} />
            </div>

            {/* Past status info */}
            {reservation.status === "CONFIRMED" && reservation.confirmedAt && (
              <div className="bg-[#e8f8ee] border border-[#b7ebc5] rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-[#b7ebc5] rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[#1a7d36]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1a7d36]">Confirmed</p>
                  <p className="text-xs text-[#1a7d36]/70">
                    {new Date(reservation.confirmedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}

            {reservation.status === "RELEASED" && reservation.releasedAt && (
              <div className="bg-[#f2f2f7] border border-[#d1d1d6] rounded-xl p-4 flex items-center gap-3">
                <div className="w-9 h-9 bg-[#e8e8ed] rounded-full flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4 text-[#8e8e93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#1d1d1f]">
                    {reservation.releasedAt > reservation.expiresAt ? "Expired" : "Cancelled"}
                  </p>
                  <p className="text-xs text-[#8e8e93]">
                    {new Date(reservation.releasedAt).toLocaleString()}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          {isPending ? (
            <div className="p-4 bg-[#f2f2f7] flex gap-3">
              <Button
                onClick={handleConfirm}
                disabled={actionLoading}
                className="flex-1"
              >
                {actionLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Confirm Purchase
                  </>
                )}
              </Button>
              <Button
                onClick={handleRelease}
                disabled={actionLoading}
                variant="outline"
                className="flex-1 border-[#ff3b30]/30 text-[#ff3b30] hover:bg-[#fef1f0] hover:border-[#ff3b30]/50"
              >
                {actionLoading ? (
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                ) : "Cancel"}
              </Button>
            </div>
          ) : (
            <div className="p-4">
              <Button
                onClick={() => router.push("/")}
                variant="outline"
                className="w-full"
              >
                Back to Products
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; classes: string }> = {
    PENDING: { label: "Pending", classes: "bg-[#fff0e0] text-[#9a3a00] border-[#ffd6b0]" },
    CONFIRMED: { label: "Confirmed", classes: "bg-[#e8f8ee] text-[#1a7d36] border-[#b7ebc5]" },
    RELEASED: { label: "Released", classes: "bg-[#f2f2f7] text-[#8e8e93] border-[#d1d1d6]" },
  };

  const c = config[status] || config.PENDING;
  return (
    <span className={`ml-auto text-xs font-semibold px-3 py-1 rounded-full border ${c.classes}`}>
      {c.label}
    </span>
  );
}

function StatusTimeline({ status }: { status: string }) {
  const steps = [
    { key: "PENDING", label: "Reserved" },
    { key: "CONFIRMED", label: "Confirmed" },
    { key: "RELEASED", label: "Closed" },
  ];

  const currentIdx = steps.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center justify-between px-2">
      {steps.map((step, i) => {
        const isPast = i <= currentIdx;
        const Icon = i === 0
          ? ClockIcon
          : i === 1
            ? CheckIcon
            : CloseIcon;

        const circleBg =
          isPast && i === 0
            ? "bg-blue-500 text-white"
            : isPast && i === 1
              ? "bg-[#34c759] text-white"
              : isPast && i === 2
                ? "bg-[#8e8e93] text-white"
                : "bg-[#f2f2f7] text-[#d1d1d6]";

        return (
          <div key={step.key} className="flex items-center gap-1.5">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${circleBg}`}>
              <Icon />
            </div>
            <span className={`text-[11px] font-medium ${
              isPast ? "text-[#1d1d1f]" : "text-[#d1d1d6]"
            }`}>
              {step.label}
            </span>
            {i < 2 && (
              <div
                className={`w-6 h-0.5 ${
                  i < currentIdx
                    ? i === 0 ? "bg-blue-300" : "bg-[#34c759]/50"
                    : "bg-[#e8e8ed]"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClockIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#f2f2f7] rounded-xl px-4 py-3">
      <p className="text-[10px] text-[#8e8e93] uppercase tracking-wider font-semibold">{label}</p>
      <p className="text-sm font-bold text-[#1d1d1f] mt-0.5">{value}</p>
    </div>
  );
}
