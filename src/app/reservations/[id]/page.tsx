"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ErrorBanner } from "@/components/error-banner";
import { ReservationCountdown } from "@/components/reservation-countdown";

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

const statusVariant: Record<string, "warning" | "success" | "destructive" | "default"> = {
  PENDING: "warning",
  CONFIRMED: "success",
  RELEASED: "destructive",
};

export default function ReservationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [reservation, setReservation] = useState<Reservation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const router = useRouter();

  const fetchReservation = useCallback(async () => {
    const { id } = await params;
    try {
      const res = await fetch(`/api/reservations/${id}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError("Reservation not found");
          setLoading(false);
          return;
        }
        throw new Error("Failed to fetch reservation");
      }
      const data = await res.json();
      setReservation(data);
    } catch {
      setError("Failed to load reservation");
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
    setError(null);

    try {
      const res = await fetch(
        `/api/reservations/${reservation.id}/confirm`,
        { method: "POST" },
      );

      if (res.status === 410) {
        const data = await res.json();
        setError(data.error);
        await fetchReservation();
        return;
      }

      if (res.status === 409) {
        const data = await res.json();
        setError(data.error);
        await fetchReservation();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to confirm");
        return;
      }

      setReservation((prev) =>
        prev ? { ...prev, status: "CONFIRMED" } : prev,
      );
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRelease() {
    if (!reservation) return;
    setActionLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/reservations/${reservation.id}/release`,
        { method: "POST" },
      );

      if (res.status === 410) {
        const data = await res.json();
        setError(data.error);
        await fetchReservation();
        return;
      }

      if (res.status === 409) {
        const data = await res.json();
        setError(data.error);
        await fetchReservation();
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to release");
        return;
      }

      setReservation((prev) =>
        prev ? { ...prev, status: "RELEASED" } : prev,
      );
    } catch {
      setError("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  const handleExpired = useCallback(async () => {
    setError("This reservation has expired. The stock has been released.");
    await fetchReservation();
  }, [fetchReservation]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Loading reservation...</p>
      </div>
    );
  }

  if (!reservation && error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <ErrorBanner
              message={error}
              onDismiss={() => router.push("/")}
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!reservation) return null;

  const isPending = reservation.status === "PENDING";

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-6 flex items-center gap-4">
          <button
            onClick={() => router.push("/")}
            className="text-gray-500 hover:text-gray-700"
          >
            &larr; Back
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Reservation Details
          </h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">
                  {reservation.productName}
                </CardTitle>
                <CardDescription>
                  SKU: {reservation.productSku} &middot;{" "}
                  {reservation.warehouseName}
                </CardDescription>
              </div>
              <Badge variant={statusVariant[reservation.status] || "default"}>
                {reservation.status}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Quantity</span>
                <p className="font-medium">{reservation.quantity}</p>
              </div>
              <div>
                <span className="text-gray-500">Price</span>
                <p className="font-medium">
                  ${Number(reservation.productPrice).toFixed(2)}
                </p>
              </div>
              <div>
                <span className="text-gray-500">Warehouse</span>
                <p className="font-medium">{reservation.warehouseName}</p>
              </div>
              <div>
                <span className="text-gray-500">Created</span>
                <p className="font-medium">
                  {new Date(reservation.createdAt).toLocaleString()}
                </p>
              </div>
            </div>

            {isPending && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800 font-medium">
                  Time remaining to confirm:
                </p>
                <p className="text-2xl font-bold text-yellow-900 mt-1">
                  <ReservationCountdown
                    expiresAt={reservation.expiresAt}
                    onExpired={handleExpired}
                  />
                </p>
              </div>
            )}

            {reservation.confirmedAt && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  Confirmed at{" "}
                  {new Date(reservation.confirmedAt).toLocaleString()}
                </p>
              </div>
            )}

            {reservation.releasedAt && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-600">
                  {reservation.status === "RELEASED"
                    ? "Released"
                    : "Released"}{" "}
                  at {new Date(reservation.releasedAt).toLocaleString()}
                </p>
              </div>
            )}
          </CardContent>
          {isPending && (
            <CardFooter className="gap-3">
              <Button
                onClick={handleConfirm}
                disabled={actionLoading}
                className="flex-1"
              >
                {actionLoading ? "Processing..." : "Confirm Purchase"}
              </Button>
              <Button
                onClick={handleRelease}
                disabled={actionLoading}
                variant="outline"
                className="flex-1"
              >
                {actionLoading ? "Processing..." : "Cancel"}
              </Button>
            </CardFooter>
          )}
        </Card>
      </main>
    </div>
  );
}
