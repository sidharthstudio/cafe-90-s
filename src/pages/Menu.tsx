import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Search, SlidersHorizontal, ShoppingBag, X } from "lucide-react";
import type { MenuCategory } from "../../shared/types";
import ProductCard from "../components/ProductCard";
import { api } from "../lib/api";
import { inr } from "../lib/format";
import { useCart } from "../lib/cart";
import { useAppData } from "../lib/app-data";

export default function MenuPage() {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState("");
  const [availableOnly, setAvailableOnly] = useState(false);
  const { count, subtotal, open } = useCart();
  const { data: boot } = useAppData();

  const active = params.get("category") ?? "all";

  useEffect(() => {
    let cancelled = false;
    api
      .menu()
      .then((res) => {
        if (!cancelled) setCategories(res.categories);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load the menu");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return categories
      .map((category) => ({
        ...category,
        products: category.products.filter((p) => {
          if (availableOnly && !p.available) return false;
          if (!q) return true;
          return (
            p.name.toLowerCase().includes(q) ||
            p.description.toLowerCase().includes(q) ||
            category.name.toLowerCase().includes(q)
          );
        }),
      }))
      .filter((c) => c.products.length > 0)
      .filter((c) => active === "all" || c.slug === active);
  }, [categories, query, availableOnly, active]);

  const totalShown = filtered.reduce((n, c) => n + c.products.length, 0);

  const setCategory = (slug: string) => {
    if (slug === "all") setParams({});
    else setParams({ category: slug });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="pb-24">
      <section className="relative overflow-hidden border-b border-ink/10 bg-ink py-14 text-cream">
        <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-chili/25 blur-3xl" />
        <div className="pointer-events-none absolute -right-10 bottom-0 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
        <div className="wrap relative">
          <p className="eyebrow text-amber">The complete menu</p>
          <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="display text-[clamp(2.6rem,6vw,4.4rem)]">
                Everything we
                <br />
                <span className="script text-amber">actually cook</span>
              </h1>
              <p className="mt-3 max-w-[52ch] text-[0.92rem] text-cream/60">
                {boot?.stats.items ?? 174} items across {boot?.stats.categories ?? 21} categories. Pick your
                size or variant, then add to cart — prices shown are exactly what the counter charges.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-4 rounded-2xl border border-cream/15 bg-cream/[0.05] px-4 py-3">
              <ShoppingBag size={18} className="text-amber" />
              <div>
                <p className="text-[0.68rem] font-bold uppercase tracking-widest text-cream/45">In your cart</p>
                <p className="display text-lg">
                  {count} item{count === 1 ? "" : "s"} · {inr(subtotal)}
                </p>
              </div>
              <button type="button" onClick={open} className="btn btn-amber btn-sm ml-2">
                View
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[70px] z-30 border-b border-ink/10 bg-cream/95 backdrop-blur-xl">
        <div className="wrap flex flex-col gap-3 py-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink/35" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search shawarma, falooda, mojito…"
                className="field !py-2.5 !pl-10 !text-[0.88rem]"
                aria-label="Search the menu"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/40 hover:text-chili"
                  aria-label="Clear search"
                >
                  <X size={15} />
                </button>
              )}
            </div>
            <button
              type="button"
              onClick={() => setAvailableOnly((v) => !v)}
              className={`chip ${availableOnly ? "chip-active" : ""}`}
              aria-pressed={availableOnly}
            >
              <SlidersHorizontal size={14} /> Available
            </button>
          </div>

          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <button
              type="button"
              onClick={() => setCategory("all")}
              className={`chip ${active === "all" ? "chip-active" : ""}`}
            >
              All items
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategory(c.slug)}
                className={`chip ${active === c.slug ? "chip-active" : ""}`}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: c.tint }} />
                {c.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="wrap pt-10">
        {loading && (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton aspect-[4/3] w-full" />
                <div className="space-y-2 p-4">
                  <div className="skeleton h-4 w-2/3 rounded" />
                  <div className="skeleton h-3 w-full rounded" />
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-chili/30 bg-chili/5 p-6 text-center">
            <p className="font-bold text-chili">{error}</p>
            <button type="button" onClick={() => location.reload()} className="btn btn-sm mt-3">
              Try again
            </button>
          </div>
        )}

        {!loading && !error && (
          <>
            {query && (
              <p className="mb-6 text-[0.78rem] font-semibold uppercase tracking-widest text-ink/40">
                {totalShown} item{totalShown === 1 ? "" : "s"} matching “{query}”
              </p>
            )}

            {filtered.length === 0 && (
              <div className="rounded-3xl border border-dashed border-ink/20 bg-paper p-10 text-center">
                <p className="display text-2xl">Nothing matched that.</p>
                <p className="mt-2 text-sm text-ink/55">Try “shawarma”, “falooda” or clear the filters.</p>
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setParams({});
                  }}
                  className="btn btn-sm mt-4"
                >
                  Reset the menu
                </button>
              </div>
            )}

            <div className="space-y-14">
              {filtered.map((category) => (
                <motion.section key={category.id} id={category.slug} layout>
                  <div className="mb-5 flex flex-wrap items-end justify-between gap-2 border-b border-ink/10 pb-3">
                    <div>
                      <p className="eyebrow" style={{ color: category.tint }}>
                        {category.products.length} items
                      </p>
                      <h2 className="display mt-1 text-[clamp(1.6rem,3.4vw,2.4rem)]">{category.name}</h2>
                      <p className="script text-lg text-ink/45">{category.tagline}</p>
                    </div>
                    <span className="text-[0.72rem] font-semibold uppercase tracking-widest text-ink/35">
                      from {inr(Math.min(...category.products.map((p) => Math.min(...p.variants.map((v) => v.price)))))}
                    </span>
                  </div>
                  <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {category.products.map((product, i) => (
                      <ProductCard key={product.id} product={product} index={i} />
                    ))}
                  </div>
                </motion.section>
              ))}
            </div>

            {filtered.length > 0 && (
              <div className="mt-16 flex flex-col items-center gap-4 rounded-3xl border border-ink/10 bg-paper p-8 text-center">
                <h2 className="display text-3xl">That&apos;s the whole menu.</h2>
                <p className="max-w-[46ch] text-sm text-ink/55">
                  {count > 0
                    ? "Ready when you are — your cart is saved on this device."
                    : "Add a few things to your cart and we'll take it from there."}
                </p>
                <Link to="/checkout" className="btn btn-accent">
                  Go to checkout <ArrowRight size={15} />
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
