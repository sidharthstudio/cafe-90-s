import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Bike,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Copy,
  Home,
  MapPin,
  PackageCheck,
  Phone,
  RotateCw,
  XCircle,
} from "lucide-react";
import type { Order, OrderStatus } from "../../shared/types";
import { ORDER_STATUS_FLOW, STATUS_LABEL } from "../../shared/types";
import { api } from "../lib/api";
import { inr, orderTime, whatsappLink } from "../lib/format";
import { useAppData } from "../lib/app-data";

const STEP_ICONS: Record<string, typeof Clock> = {
  pending: Clock,
  confirmed: CheckCircle2,
  preparing: ChefHat,
  ready: PackageCheck,
  out_for_delivery: Bike,
  delivered: Home,
};

export default function OrderPage() {
  const { code = "" } = useParams();
  const [params] = useSearchParams();
  const justPlaced = params.get("placed") === "1";
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const { data } = useAppData();

  const load = useCallback(async () => {
    try {
      const res = await api.getOrder(code);
      setOrder(res.order);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found");
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => {
      if (order && ["delivered", "cancelled"].includes(order.status)) return;
      void load();
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [load, order]);

  const cancelOrder = async () => {
    if (!order) return;
    if (!window.confirm("Cancel this order? This cannot be undone.")) return;
    setCancelling(true);
    try {
      await api.cancelOrder(order.code);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the order");
    } finally {
      setCancelling(false);
    }
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(order?.code ?? "");
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  if (loading) {
    return (
      <div className="wrap py-24">
        <div className="skeleton mx-auto h-64 max-w-2xl rounded-3xl" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="wrap flex min-h-[60vh] flex-col items-center justify-center py-20 text-center">
        <AlertCircle size={30} className="text-chili" />
        <h1 className="display mt-3 text-3xl">Order not found</h1>
        <p className="mt-2 max-w-[42ch] text-sm text-ink/55">
          {error ?? "We couldn't find that order code."} Double-check the code from your confirmation, or call
          the cafe.
        </p>
        <div className="mt-5 flex gap-2">
          <Link to="/track" className="btn btn-sm">
            Try another code
          </Link>
          <a href={`tel:${(data?.settings.phone ?? "").replace(/\s/g, "")}`} className="btn btn-ghost btn-sm">
            Call the cafe
          </a>
        </div>
      </div>
    );
  }

  const currentIndex = ORDER_STATUS_FLOW.indexOf(order.status as OrderStatus);
  const cancelled = order.status === "cancelled";
  const active = currentIndex >= 0;

  return (
    <div className="pb-24 pt-10">
      <div className="wrap max-w-4xl">
        {justPlaced && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 flex flex-col items-start justify-between gap-4 rounded-3xl border border-teal/30 bg-teal/10 p-5 sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-3">
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.15 }}
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-teal text-white"
              >
                <Check size={20} />
              </motion.span>
              <div>
                <h2 className="display text-2xl">Order placed. We&apos;re on it.</h2>
                <p className="text-[0.85rem] text-ink/60">
                  The kitchen has your order — we&apos;ll call if we need anything.
                </p>
              </div>
            </div>
            <button type="button" onClick={copyCode} className="btn btn-cream btn-sm shrink-0">
              {copied ? <Check size={14} /> : <Copy size={14} />} {order.code}
            </button>
          </motion.div>
        )}

        <div className="card overflow-hidden">
          <div className="border-b border-ink/10 bg-gradient-to-br from-amber/25 via-cream to-pink/10 px-5 py-6 sm:px-7">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="eyebrow text-chili">Order {order.code}</p>
                <h1 className="display mt-1 text-[clamp(1.9rem,4.2vw,2.8rem)]">
                  {cancelled ? "This order was cancelled." : STATUS_LABEL[order.status]}
                </h1>
                <p className="mt-1 text-[0.82rem] text-ink/55">Placed {orderTime(order.createdAt)}</p>
              </div>
              <div className="rounded-xl border border-ink/12 bg-paper/80 px-4 py-2 text-right backdrop-blur">
                <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/40">Total</p>
                <p className="display text-2xl">{inr(order.total)}</p>
                <p className="text-[0.68rem] font-semibold text-ink/45">
                  {order.paymentMethod === "cod" ? "Cash on delivery" : "Paid online"}
                </p>
              </div>
            </div>
          </div>

          <div className="px-5 py-6 sm:px-7">
            {cancelled ? (
              <div className="flex items-center gap-3 rounded-2xl border border-chili/25 bg-chili/5 p-4">
                <XCircle size={20} className="text-chili" />
                <p className="text-sm text-ink/70">
                  This order was cancelled. If you were charged anything, contact the cafe and we&apos;ll sort it
                  out.
                </p>
              </div>
            ) : (
              <ol className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {ORDER_STATUS_FLOW.map((status, index) => {
                  const Icon = STEP_ICONS[status] ?? Clock;
                  const done = index <= currentIndex;
                  const current = index === currentIndex;
                  return (
                    <li key={status} className="relative flex items-start gap-2.5 sm:flex-col sm:gap-2">
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-full border transition-colors ${
                          done
                            ? "border-teal bg-teal text-white"
                            : "border-ink/15 bg-paper text-ink/30"
                        } ${current ? "ring-4 ring-teal/20" : ""}`}
                      >
                        <Icon size={15} />
                      </span>
                      <div>
                        <p className={`text-[0.78rem] font-bold ${done ? "text-ink" : "text-ink/40"}`}>
                          {STATUS_LABEL[status]}
                        </p>
                        {current && <p className="text-[0.68rem] font-semibold uppercase tracking-wider text-teal">Now</p>}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}

            {!cancelled && order.status !== "delivered" && (
              <p className="mt-5 flex items-center gap-2 rounded-xl bg-cream px-3 py-2 text-[0.75rem] font-semibold text-ink/55">
                <RotateCw size={13} className="text-teal" /> This page refreshes automatically. Estimated prep{" "}
                {data?.settings.prepTime ?? "25–35 min"}.
              </p>
            )}
          </div>
        </div>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="display text-xl">Your items</h2>
            <ul className="mt-3 space-y-3">
              {order.items.map((item) => (
                <li key={item.id} className="flex items-start gap-3">
                  <img src={item.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" loading="lazy" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[0.85rem] font-bold leading-tight">{item.name}</p>
                    <p className="text-[0.72rem] uppercase tracking-wide text-ink/40">
                      {item.variantLabel} × {item.qty}
                    </p>
                    {item.notes && <p className="text-[0.72rem] italic text-ink/50">“{item.notes}”</p>}
                  </div>
                  <span className="text-[0.85rem] font-extrabold tabular-nums">{inr(item.unitPrice * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-4 space-y-1.5 border-t border-ink/10 pt-3 text-[0.82rem]">
              <div className="flex justify-between">
                <dt className="text-ink/55">Subtotal</dt>
                <dd className="font-semibold">{inr(order.subtotal)}</dd>
              </div>
              {order.discount > 0 && (
                <div className="flex justify-between text-teal-900">
                  <dt>Discount {order.couponCode && `(${order.couponCode})`}</dt>
                  <dd className="font-semibold">−{inr(order.discount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-ink/55">Delivery</dt>
                <dd className="font-semibold">{order.deliveryFee === 0 ? "FREE" : inr(order.deliveryFee)}</dd>
              </div>
              <div className="flex justify-between border-t border-ink/10 pt-2 text-base font-bold">
                <dt>Total</dt>
                <dd>{inr(order.total)}</dd>
              </div>
            </dl>
          </div>

          <div className="card p-5">
            <h2 className="display text-xl">Delivery</h2>
            <div className="mt-3 space-y-2 text-[0.85rem] text-ink/70">
              <p className="font-bold text-ink">{order.customerName}</p>
              <p>{order.phone}</p>
              <p>
                {order.house}, {order.area}
                {order.landmark ? `, near ${order.landmark}` : ""}
              </p>
              <p className="text-ink/55">{order.address}</p>
              {order.instructions && (
                <p className="rounded-lg bg-amber/15 px-2.5 py-1.5 text-[0.78rem]">
                  <strong>Instructions:</strong> {order.instructions}
                </p>
              )}
              {order.notes && (
                <p className="rounded-lg bg-cream px-2.5 py-1.5 text-[0.78rem]">
                  <strong>Notes:</strong> {order.notes}
                </p>
              )}
              {order.distanceKm !== null && (
                <p className="flex items-center gap-1.5 text-[0.78rem] font-semibold text-ink/50">
                  <MapPin size={13} /> {order.distanceKm} km from the cafe
                </p>
              )}
            </div>

            <div className="mt-4 grid gap-2">
              <a href={`tel:+91${order.phone}`} className="btn btn-ghost btn-sm">
                <Phone size={14} /> Call {order.customerName.split(" ")[0]}
              </a>
              <a
                href={whatsappLink(
                  data?.settings.whatsapp ?? "918921475744",
                  `Hi Café 90's, this is about order ${order.code}.`,
                )}
                target="_blank"
                rel="noreferrer"
                className="btn btn-sm"
              >
                Message the cafe
              </a>
              {["pending", "confirmed"].includes(order.status) && (
                <button type="button" onClick={cancelOrder} disabled={cancelling} className="btn btn-sm border-chili/40 text-chili">
                  {cancelling ? "Cancelling…" : "Cancel order"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink/10 bg-paper px-5 py-4 text-[0.8rem]">
          <p className="text-ink/55">
            Keep this code handy: <span className="font-extrabold tracking-wider text-ink">{order.code}</span>
          </p>
          <Link to="/menu" className="font-semibold text-chili hover:underline">
            Order something else →
          </Link>
        </div>
      </div>
    </div>
  );
}
