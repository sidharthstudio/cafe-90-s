import { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Plus } from "lucide-react";
import type { Product } from "../../shared/types";
import { inr } from "../lib/format";
import { useCart } from "../lib/cart";

export default function ProductCard({ product, index = 0 }: { product: Product; index?: number }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id);
  const [justAdded, setJustAdded] = useState(false);
  const { add } = useCart();
  const reduce = useReducedMotion();

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const multi = product.variants.length > 1;

  const handleAdd = () => {
    if (!variant) return;
    add(product, variant);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  return (
    <motion.article
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay: Math.min(index, 6) * 0.04 }}
      className={`card card-hover group relative flex h-full flex-col overflow-hidden ${
        product.available ? "" : "opacity-75"
      }`}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-ink/5">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.06]"
        />
        <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
          <div className="flex flex-wrap gap-1.5">
            {product.bestseller && <span className="badge bg-amber text-ink">Bestseller</span>}
            {product.featured && <span className="badge bg-pink text-white">Signature</span>}
          </div>
          {product.portion && (
            <span className="badge border border-cream/30 bg-ink/55 text-[0.6rem] text-cream backdrop-blur">
              {product.portion}
            </span>
          )}
        </div>
        {!product.available && (
          <div className="absolute inset-0 grid place-items-center bg-ink/60 backdrop-blur-[2px]">
            <span className="badge border border-cream/40 bg-cream text-[0.62rem] text-ink">Sold out today</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-[1.02rem] font-bold leading-tight">{product.name}</h3>
          <p className="shrink-0 text-[1.02rem] font-extrabold tabular-nums">{variant ? inr(variant.price) : "—"}</p>
        </div>
        {product.description && (
          <p className="mt-1.5 line-clamp-2 text-[0.8rem] leading-snug text-ink/55">{product.description}</p>
        )}

        {multi && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {product.variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setVariantId(v.id)}
                disabled={!product.available}
                className={`rounded-full border px-2.5 py-1 text-[0.7rem] font-bold transition-all ${
                  v.id === variant?.id
                    ? "border-ink bg-ink text-cream"
                    : "border-ink/15 bg-paper text-ink/65 hover:border-ink/40"
                }`}
                aria-pressed={v.id === variant?.id}
              >
                {v.label} · {inr(v.price)}
              </button>
            ))}
          </div>
        )}

        <div className="mt-auto pt-3">
          <button
            type="button"
            onClick={handleAdd}
            disabled={!product.available || !variant}
            className={`flex w-full items-center justify-center gap-1.5 rounded-full border px-3 py-2 text-[0.8rem] font-bold transition-all ${
              justAdded
                ? "border-teal bg-teal text-white"
                : product.available
                  ? "border-ink/15 bg-cream text-ink hover:border-chili hover:bg-chili hover:text-white"
                  : "cursor-not-allowed border-ink/10 bg-ink/5 text-ink/40"
            }`}
          >
            {justAdded ? (
              <>
                <Check size={14} /> Added to cart
              </>
            ) : product.available ? (
              <>
                <Plus size={14} /> Add to cart
              </>
            ) : (
              "Unavailable"
            )}
          </button>
        </div>
      </div>
    </motion.article>
  );
}
