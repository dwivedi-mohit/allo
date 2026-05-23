"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ErrorBanner } from "@/components/error-banner";

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
  const [error, setError] = useState<string | null>(null);
  const [reserving, setReserving] = useState<Record<string, boolean>>({});
  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch("/api/products");
      if (!res.ok) throw new Error("Failed to fetch products");
      const data = await res.json();
      setProducts(data);
    } catch {
      setError("Failed to load products");
    }
  }, []);

  const fetchWarehouses = useCallback(async () => {
    try {
      const res = await fetch("/api/warehouses");
      if (!res.ok) throw new Error("Failed to fetch warehouses");
      setWarehouses(await res.json());
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
    setError(null);

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
        setError(data.error);
        return;
      }

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to reserve");
        return;
      }

      const reservation = await res.json();
      router.push(`/reservations/${reservation.id}`);
    } catch {
      setError("Network error while reserving");
    } finally {
      setReserving((prev) => ({ ...prev, [key]: false }));
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-2xl font-bold text-gray-900">Allo Inventory</h1>
          <p className="text-sm text-gray-500 mt-1">
            Products and stock levels across warehouses
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <ErrorBanner message={error} onDismiss={() => setError(null)} />

        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Price</TableHead>
                {warehouses.map((w) => (
                  <TableHead key={w.id}>{w.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={3 + warehouses.length}
                    className="text-center text-gray-500 py-8"
                  >
                    No products available
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">
                      {product.name}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {product.sku}
                    </TableCell>
                    <TableCell>${Number(product.price).toFixed(2)}</TableCell>
                    {warehouses.map((warehouse) => {
                      const stock = product.stocks.find(
                        (s) => s.warehouseId === warehouse.id,
                      );
                      const available = stock ? stock.available : 0;
                      const key = `${product.id}-${warehouse.id}`;
                      const isReserving = reserving[key];

                      return (
                        <TableCell key={warehouse.id}>
                          <div className="flex items-center gap-3">
                            <Badge
                              variant={
                                available > 0 ? "success" : "destructive"
                              }
                            >
                              {available} available
                            </Badge>
                            <Button
                              size="sm"
                              disabled={available < 1 || isReserving}
                              onClick={() =>
                                handleReserve(product.id, warehouse.id)
                              }
                            >
                              {isReserving ? "..." : "Reserve"}
                            </Button>
                          </div>
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </main>
    </div>
  );
}
