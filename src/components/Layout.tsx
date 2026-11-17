import { useEffect } from "react";
import { Link, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Nav from "./Nav";
import Footer from "./Footer";
import CartDrawer from "./CartDrawer";
import { useCart } from "../lib/cart";
import { inr } from "../lib/format";

export default function Layout() {
  const location = useLocation();
  const { count, subtotal, open, lastAdded } = useCart();

  useEffect(() => {
    if (location.hash) {
      const el = document.getElementById(location.hash.slice(1));
      if (el) {
        window.setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname, location.hash]);

  return (
    <div className="flex min-h-screen flex-col">
      <Nav />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />

      <AnimatePresence>
        {lastAdded && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pointer-events-none fixed left-1/2 top-[86px] z-50 -translate-x-1/2 rounded-full bg-ink px-4 py-2 text-xs font-bold text-cream shadow-lg"
          >
            <span className="text-amber">✓</span> {lastAdded} added to cart
          </motion.div>
        )}
      </AnimatePresence>

      {count > 0 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-ink/10 bg-cream/95 px-4 py-3 backdrop-blur-md sm:hidden">
          <button
            type="button"
            onClick={open}
            className="btn btn-accent w-full justify-between"
            aria-label="View cart"
          >
            <span className="flex items-center gap-2">
              <ShoppingBag size={16} /> {count} item{count === 1 ? "" : "s"}
            </span>
            <span>{inr(subtotal)} · View cart</span>
          </button>
        </div>
      )}

      <Link
        to="/track"
        className="fixed bottom-20 right-4 z-20 hidden rounded-full border border-ink/15 bg-paper/90 px-3 py-2 text-[0.7rem] font-bold text-ink/70 shadow-sm backdrop-blur hover:text-chili sm:bottom-6 sm:right-6 sm:block"
      >
        Track order
      </Link>
    </div>
  );
}
