import { useCallback, useState } from "react";

import { useApp } from "@/context/app";
import { api } from "@/lib/api";
import type { Product } from "@/lib/types";

/** Qty + add/inc/dec for a product tile (Blinkit-style ADD). */
export function useCartQty() {
  const { cart, refreshCart } = useApp();
  const [busyId, setBusyId] = useState<number | null>(null);

  const qtyOf = useCallback(
    (productId: number) => {
      const lines = cart?.items || [];
      return lines.filter((i) => i.product_id === productId).reduce((n, i) => n + (i.quantity || 0), 0);
    },
    [cart?.items]
  );

  const lineOf = useCallback(
    (productId: number) => (cart?.items || []).find((i) => i.product_id === productId),
    [cart?.items]
  );

  const add = useCallback(
    async (product: Product) => {
      setBusyId(product.id);
      try {
        await api.customer.addCartItem({
          product_id: product.id,
          quantity: 1,
          is_eggless: Boolean(product.is_eggless),
        });
        await refreshCart();
      } finally {
        setBusyId(null);
      }
    },
    [refreshCart]
  );

  const setQty = useCallback(
    async (product: Product, next: number) => {
      const line = lineOf(product.id);
      setBusyId(product.id);
      try {
        if (!line) {
          if (next > 0) {
            await api.customer.addCartItem({
              product_id: product.id,
              quantity: next,
              is_eggless: Boolean(product.is_eggless),
            });
          }
        } else if (next < 1) {
          await api.customer.removeCartItem(line.id);
        } else {
          await api.customer.updateCartItem(line.id, { quantity: next });
        }
        await refreshCart();
      } finally {
        setBusyId(null);
      }
    },
    [lineOf, refreshCart]
  );

  return {
    qtyOf,
    busyId,
    add,
    inc: (p: Product) => setQty(p, qtyOf(p.id) + 1),
    dec: (p: Product) => setQty(p, qtyOf(p.id) - 1),
  };
}
