import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Minus, Plus, ShoppingBag, Trash2, X, Truck } from "lucide-react";
import { useCart } from "../lib/cart";
import { useAppData } from "../lib/app-data";
import { inr } from "../lib/format";

export default function CartDrawer() {
  const { lines, isOpen, close, setQty, remove, subtotal, count } = useCart();
  const { data } = useAppData();
  const radius = data?.settings.freeRadiusKm ?? 3.5;

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div className="fixed inset-0 z-[60]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <button
            type="button"
            aria-label="Close cart"
            className="absolute inset-0 bg-ink/50 backdrop-blur-sm"
            onClick={close}
          />
          <motion.aside
            className="absolute right-0 top-0 flex h-full w-full max-w-[430px] flex-col bg-cream shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 260 }}
            role="dialog"
            aria-label="Your cart"
          >
            <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
              <div>
                <p className="eyebrow text-chili">Your order</p>
                <h2 className="display text-2xl">
                  {count} item{count === 1 ? "" : "s"}
                </h2>
              </div>
              <button
                type="button"
                onClick={close}
                className="grid h-9 w-9 place-items-center rounded-full border border-ink/15 bg-paper"
                aria-label="Close cart"
              >
                <X size={16} />
              </button>
            </div>

            {lines.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-amber/25 text-ink">
                  <ShoppingBag size={26} />
                </span>
                <h3 className="display text-2xl">Your cart is empty</h3>
                <p className="text-sm text-ink/60">
                  Shawarma, falooda, 24 mojitos — the menu is waiting for you.
                </p>
                <Link to="/menu" onClick={close} className="btn btn-sm mt-2">
                  Explore the menu
                </Link>
              </div>
            ) : (
              <>
                <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                  {lines.map((line) => (
                    <div key={line.key} className="flex gap-3 rounded-2xl border border-ink/10 bg-paper p-3">
                      <img
                        src={line.image}
                        alt={line.name}
                        loading="lazy"
                        className="h-16 w-16 shrink-0 rounded-xl object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold">{line.name}</p>
                            <p className="text-[0.72rem] uppercase tracking-wide text-ink/45">{line.variantLabel}</p>
                            {line.notes && <p className="mt-0.5 text-[0.72rem] italic text-ink/50">“{line.notes}”</p>}
                          </div>
                          <button
                            type="button"
                            onClick={() => remove(line.key)}
                            className="text-ink/35 transition-colors hover:text-chili"
                            aria-label={`Remove ${line.name}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 rounded-full border border-ink/15 bg-cream px-1 py-0.5">
                            <button
                              type="button"
                              onClick={() => setQty(line.key, line.qty - 1)}
                              className="grid h-6 w-6 place-items-center rounded-full hover:bg-ink/10"
                              aria-label="Decrease quantity"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="min-w-[1.1rem] text-center text-xs font-bold tabular-nums">{line.qty}</span>
                            <button
                              type="button"
                              onClick={() => setQty(line.key, line.qty + 1)}
                              className="grid h-6 w-6 place-items-center rounded-full hover:bg-ink/10"
                              aria-label="Increase quantity"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="text-sm font-extrabold">{inr(line.price * line.qty)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-ink/10 bg-paper/70 px-5 py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink/60">Subtotal</span>
                    <span className="font-extrabold">{inr(subtotal)}</span>
                  </div>
                  <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-teal/10 px-3 py-2 text-[0.75rem] font-semibold text-teal-900">
                    <Truck size={14} /> Free delivery within {radius} km — confirmed at checkout.
                  </p>
                  <Link to="/checkout" onClick={close} className="btn btn-accent mt-3 w-full">
                    Checkout · {inr(subtotal)}
                  </Link>
                  <button type="button" onClick={close} className="mt-2 w-full py-2 text-xs font-semibold text-ink/50 hover:text-ink">
                    Continue browsing
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
