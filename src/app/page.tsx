"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { StockBar } from "@/components/stock-bar";

interface StockInfo {
  warehouseId: string;
  warehouseName: string;
  total: number;
  reserved: number;
  available: number;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stocks: StockInfo[];
}

interface Warehouse {
  id: string;
  name: string;
  location: string | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" | "warning" } | null>(null);
  const [reserving, setReserving] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProducts(data);
    } catch {
      setToast({ message: "Failed to load products", type: "error" });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Failed to fetch warehouses");
      const data: Warehouse[] = await res.json();
      setWarehouses(data);
      if (data.length > 0) setSelectedWarehouse(data[0].id);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchWarehouses();
    const interval = setInterval(fetchProducts, 15000);
    return () => clearInterval(interval);
  }, [fetchProducts, fetchWarehouses]);

  async function handleReserve(productId: string, warehouseId: string) {
    const key = `${productId}-${warehouseId}`;
    setReserving((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          warehouseId,
          quantity: 1,
        }),
      });

      if (res.status === 409) {
        const data = await res.json();
        setToast({ message: data.error || "Insufficient stock", type: "error" });
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setToast({ message: data.error || "Failed to reserve", type: "error" });
        return;
      }

      const reservation = await res.json();
      router.push(`/reservations/${reservation.id}`);
    } catch {
      setToast({ message: "Network error while reserving", type: "error" });
    } finally {
      setReserving((prev) => ({ ...prev, [key]: false }));
    }
  }

  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-background">
      <Toast
        message={toast?.message ?? null}
        type={toast?.type}
        onDismiss={() => setToast(null)}
      />

      <header className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-14">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Allo Inventory
            </h1>
          </div>
          <p className="text-orange-100 text-sm sm:text-base max-w-xl">
            Reserve stock across warehouses while customers complete payment.
          </p>

          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-md">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-orange-200"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 text-white placeholder-orange-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {warehouses.length > 1 && (
          <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
            {warehouses.map((w) => (
              <button
                key={w.id}
                onClick={() => setSelectedWarehouse(w.id)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  selectedWarehouse === w.id
                    ? "bg-orange-500 text-white shadow-md shadow-orange-200"
                    : "bg-white text-stone-600 border border-stone-200 hover:border-orange-300 hover:text-orange-600"
                }`}
              >
                <svg className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {w.name}
                {w.location && (
                  <span className="ml-1 opacity-60 hidden sm:inline">
                    &middot; {w.location}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-2.5 w-full" />
                <Skeleton className="h-10 w-full rounded-full" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-stone-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-stone-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-stone-500 font-medium">No products match your search</p>
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-sm text-orange-500 hover:text-orange-600 underline"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
            style={{ animation: "fade-in 0.4s ease-out" }}
          >
            {filteredProducts.map((product, idx) => {
              const stock = product.stocks.find(
                (s) => s.warehouseId === selectedWarehouse,
              ) || product.stocks[0];
              const available = stock?.available ?? 0;
              const total = stock?.total ?? 0;
              const reserveKey = `${product.id}-${stock?.warehouseId ?? ""}`;
              const isReserving = reserving[reserveKey];
              const lowStock = available > 0 && available <= 3;

              return (
                <div
                  key={product.id}
                  className="group bg-white rounded-2xl border border-stone-200 p-5 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100/30 transition-all duration-300 hover:-translate-y-0.5"
                  style={{ animation: `slide-up 0.3s ease-out ${idx * 0.05}s both` }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-stone-900 truncate">
                        {product.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="warm" className="text-[10px]">
                          {product.sku}
                        </Badge>
                        {stock && (
                          <span className="text-xs text-stone-400">
                            {stock.warehouseName}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-lg font-bold text-stone-900 shrink-0 ml-3">
                      ${Number(product.price).toFixed(2)}
                    </span>
                  </div>

                  <StockBar available={available} total={total} className="mb-4" />

                  <Button
                    size="sm"
                    className={`w-full ${
                      lowStock
                        ? "ring-2 ring-orange-300 ring-offset-1 animate-pulse"
                        : ""
                    }`}
                    disabled={available < 1 || isReserving}
                    onClick={() =>
                      handleReserve(
                        product.id,
                        stock?.warehouseId ?? "",
                      )
                    }
                  >
                    {isReserving ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Reserving...
                      </>
                    ) : available < 1 ? (
                      "Out of stock"
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Reserve
                      </>
                    )}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
