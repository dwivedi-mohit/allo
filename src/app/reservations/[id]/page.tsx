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

const statusConfig: Record<string, { label: string; icon: string; badge: "warning" | "success" | "destructive" | "warm" }> = {
  PENDING: {
    label: "Awaiting Payment",
    icon: "clock",
    badge: "warning",
  },
  CONFIRMED: {
    label: "Purchase Confirmed",
    icon: "check",
    badge: "success",
  },
  RELEASED: {
    label: "Reservation Released",
    icon: "x",
    badge: "destructive",
  },
};

const statusIcon = (icon: string) => {
  switch (icon) {
    case "clock":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "check":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case "x":
      return (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

export default function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
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
      setConfirmed(true);
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
          <Skeleton className="h-8 w-48 mx-auto rounded-full" />
          <Skeleton className="h-64 w-full rounded-2xl" />
          <Skeleton className="h-10 w-32 mx-auto rounded-full" />
        </div>
      </div>
    );
  }

  if (!reservation) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-16 h-16 mx-auto mb-4 bg-rose-50 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-stone-900 mb-1">Reservation Not Found</h2>
          <p className="text-sm text-stone-500 mb-4">This reservation may have expired or the link is invalid.</p>
          <Button onClick={() => router.push("/")} variant="outline">
            Back to products
          </Button>
        </div>
      </div>
    );
  }

  const isPending = reservation.status === "PENDING";
  const isConfirmed = reservation.status === "CONFIRMED";
  const config = statusConfig[reservation.status] || statusConfig.PENDING;

  return (
    <div className="min-h-screen bg-background">
      <Toast
        message={toast?.message ?? null}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />

      <header className="bg-white border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.push("/")}
            className="w-9 h-9 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center transition-colors"
            aria-label="Back"
          >
            <svg className="w-4 h-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-lg font-semibold text-stone-900">Reservation</h1>
            <p className="text-xs text-stone-500 font-mono">{reservation.id.slice(0, 12)}...</p>
          </div>
          <div className="ml-auto">
            <Badge variant={config.badge}>
              {statusIcon(config.icon)}
              {config.label}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-10">
        <div style={{ animation: "slide-up 0.4s ease-out" }}>
          {isPending && (
            <div className="flex justify-center mb-8">
              <CircularCountdown
                expiresAt={reservation.expiresAt}
                onExpired={handleExpired}
                className="scale-110"
              />
            </div>
          )}

          <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className="text-xl font-bold text-stone-900">
                    {reservation.productName}
                  </h2>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="warm" className="text-[10px]">
                      {reservation.productSku}
                    </Badge>
                    <span className="text-sm text-stone-400">
                      &middot; {reservation.warehouseName}
                    </span>
                  </div>
                </div>
                <span className="text-2xl font-bold text-stone-900">
                  ${Number(reservation.productPrice).toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 py-4 border-t border-stone-100">
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Quantity</p>
                  <p className="text-lg font-semibold text-stone-900 mt-0.5">
                    {reservation.quantity}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Total</p>
                  <p className="text-lg font-semibold text-stone-900 mt-0.5">
                    ${(Number(reservation.productPrice) * reservation.quantity).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Warehouse</p>
                  <p className="text-sm font-medium text-stone-700 mt-0.5">
                    {reservation.warehouseName}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-400 uppercase tracking-wider font-medium">Created</p>
                  <p className="text-sm font-medium text-stone-700 mt-0.5">
                    {new Date(reservation.createdAt).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {isConfirmed && reservation.confirmedAt && (
                <div
                  className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3"
                  style={{ animation: "scale-in 0.3s ease-out" }}
                >
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">Confirmed</p>
                    <p className="text-xs text-emerald-600">
                      {new Date(reservation.confirmedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}

              {reservation.status === "RELEASED" && reservation.releasedAt && (
                <div
                  className="mt-4 bg-stone-50 border border-stone-200 rounded-xl p-4 flex items-center gap-3"
                  style={{ animation: "scale-in 0.3s ease-out" }}
                >
                  <div className="w-8 h-8 bg-stone-200 rounded-full flex items-center justify-center shrink-0">
                    <svg className="w-4 h-4 text-stone-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-stone-700">
                      {reservation.releasedAt > reservation.expiresAt
                        ? "Expired"
                        : "Cancelled"}
                    </p>
                    <p className="text-xs text-stone-500">
                      {new Date(reservation.releasedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {isPending && (
              <div className="border-t border-stone-100 p-4 bg-stone-50/50 flex gap-3">
                <Button
                  onClick={handleConfirm}
                  disabled={actionLoading}
                  className={`flex-1 ${confirmed ? "bg-emerald-600 hover:bg-emerald-700" : ""}`}
                >
                  {actionLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
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
                  className="flex-1 border-rose-200 text-rose-600 hover:bg-rose-50 hover:border-rose-300"
                >
                  {actionLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </>
                  )}
                </Button>
              </div>
            )}

            {!isPending && (
              <div className="border-t border-stone-100 p-4">
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
        </div>
      </main>
    </div>
  );
}
