"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Toast } from "@/components/ui/toast";
import { StockDots } from "@/components/stock-dots";

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

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
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

  useEffect(() => {
    fetchProducts();
    const interval = setInterval(fetchProducts, 15000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  async function handleReserve(productId: string, warehouseId: string) {
    const key = `${productId}-${warehouseId}`;
    setReserving((prev) => ({ ...prev, [key]: true }));

    try {
      const res = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, warehouseId, quantity: 1 }),
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

      <header className="bg-[#1e293b]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  Allo Inventory
                </h1>
                <p className="text-[11px] text-white/50 font-medium tracking-wider">
                  Multi-warehouse stock system
                </p>
              </div>
            </div>

            <div className="relative max-w-xs w-full">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8e8e93]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search products..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-[#d1d1d6] bg-white text-sm text-[#1d1d1f] placeholder-[#8e8e93] focus:outline-none focus:border-[#007aff] focus:ring-2 focus:ring-[#007aff]/20 transition-all"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            <div className="sm:col-span-2 bg-card rounded-2xl border border-[#d1d1d6] p-6 space-y-4">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-1/4" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl border border-[#d1d1d6] p-5 space-y-3">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-4 bg-[#f2f2f7] rounded-full flex items-center justify-center shadow-inner">
              <svg className="w-8 h-8 text-[#8e8e93]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <p className="text-[#8e8e93] font-medium">No products match your search</p>
            <button
              onClick={() => setSearch("")}
              className="mt-2 text-sm text-[#007aff] hover:text-[#007aff]/80 underline font-medium"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            style={{ animation: "fade-in 0.4s ease-out" }}
          >
            {filteredProducts.map((product, idx) => {
              const isHero = idx === 0;

              return (
                <div
                  key={product.id}
                  className={`group relative bg-card rounded-2xl border border-[#d1d1d6] overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.04] hover:-translate-y-0.5 ${
                    isHero ? "sm:col-span-2" : ""
                  }`}
                  style={{ animation: `slide-up 0.35s ease-out ${idx * 0.06}s both` }}
                >
                  <div className="absolute left-0 right-0 top-0 h-0.5 bg-[#1e293b]/10" />

                  <div className="p-5">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1 min-w-0">
                        <h3 className={`font-bold text-[#1d1d1f] leading-tight ${isHero ? "text-lg" : "text-base"}`}>
                          {product.name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="warm" className="text-[10px] font-mono">
                            {product.sku}
                          </Badge>
                          <span className="text-[11px] text-[#8e8e93]">
                            {product.stocks.length} warehouse{product.stocks.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                      <span className={`font-bold text-[#1d1d1f] shrink-0 ml-3 ${isHero ? "text-2xl" : "text-lg"}`}>
                        ${Number(product.price).toFixed(2)}
                      </span>
                    </div>

                    <div className={`space-y-3 ${isHero ? "sm:flex sm:gap-4 sm:space-y-0" : ""}`}>
                      {product.stocks.map((stock) => {
                        const key = `${product.id}-${stock.warehouseId}`;
                        const isReserving = reserving[key];
                        const lowStock = stock.available > 0 && stock.available <= 3;

                        return (
                          <div
                            key={stock.warehouseId}
                            className={`flex items-center gap-3 p-3 rounded-xl ${
                              isHero ? "flex-1 bg-[#f2f2f7]" : ""
                            }`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-semibold text-[#8e8e93] uppercase tracking-wider mb-1">
                                {stock.warehouseName}
                              </p>
                              <StockDots
                                available={stock.available}
                                total={stock.total}
                              />
                            </div>
                            <Button
                              size={isHero ? "default" : "sm"}
                              variant={lowStock ? "destructive" : "default"}
                              disabled={stock.available < 1 || isReserving}
                              onClick={() => handleReserve(product.id, stock.warehouseId)}
                              className="shrink-0"
                            >
                              {isReserving ? (
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                              ) : stock.available < 1 ? (
                                "Out"
                              ) : "Reserve"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
