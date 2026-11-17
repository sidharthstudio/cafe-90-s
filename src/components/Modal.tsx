import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";

export default function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  wide = false,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button type="button" aria-label="Close" className="absolute inset-0 bg-ink/60 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ y: 40, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`relative max-h-[92vh] w-full overflow-hidden rounded-t-3xl bg-cream shadow-2xl sm:rounded-3xl ${
              wide ? "sm:max-w-4xl" : "sm:max-w-xl"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label={title}
          >
            <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4">
              <div>
                <h2 className="display text-xl">{title}</h2>
                {subtitle && <p className="text-[0.78rem] text-ink/50">{subtitle}</p>}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-ink/15 bg-paper"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <div className="max-h-[calc(92vh-78px)] overflow-y-auto px-5 py-5">{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
