import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Product, Variant } from "../../shared/types";

export type CartLine = {
  key: string;
  productId: number;
  variantId: number;
  name: string;
  variantLabel: string;
  price: number;
  image: string;
  qty: number;
  notes: string;
};

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  isOpen: boolean;
  open: () => void;
  close: () => void;
  add: (product: Product, variant: Variant, qty?: number, notes?: string) => void;
  setQty: (key: string, qty: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  lastAdded: string | null;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "c90_cart_v1";

function readStorage(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((l) => l && typeof l.productId === "number" && typeof l.qty === "number");
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  useEffect(() => {
    setLines(readStorage());
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    } catch {
      /* storage may be unavailable in private mode */
    }
  }, [lines]);

  const add = useCallback((product: Product, variant: Variant, qty = 1, notes = "") => {
    setLines((prev) => {
      const key = `${product.id}:${variant.id}:${notes.trim().toLowerCase()}`;
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(30, l.qty + qty) } : l));
      }
      return [
        ...prev,
        {
          key,
          productId: product.id,
          variantId: variant.id,
          name: product.name,
          variantLabel: variant.label,
          price: variant.price,
          image: product.image,
          qty,
          notes,
        },
      ];
    });
    setLastAdded(product.name);
    window.setTimeout(() => setLastAdded(null), 2200);
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    setLines((prev) =>
      prev.flatMap((l) => (l.key !== key ? [l] : qty <= 0 ? [] : [{ ...l, qty: Math.min(30, qty) }])),
    );
  }, []);

  const remove = useCallback((key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }, []);

  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<CartContextValue>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + l.qty * l.price, 0);
    return {
      lines,
      count,
      subtotal,
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
      add,
      setQty,
      remove,
      clear,
      lastAdded,
    };
  }, [lines, isOpen, add, setQty, remove, clear, lastAdded]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}
