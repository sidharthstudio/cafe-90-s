import { useCallback, useEffect, useState } from "react";
import {
  Bike,
  CheckCircle2,
  ChefHat,
  MapPin,
  MessageCircle,
  PackageCheck,
  Phone,
  RefreshCw,
  Search,
  ShoppingBag,
  XCircle,
} from "lucide-react";
import type { Order, OrderStatus } from "../../../shared/types";
import { STATUS_LABEL } from "../../../shared/types";
import { api } from "../../lib/api";
import { inr, orderTime, mapsLink, STATUS_STYLES, telLink, timeAgo, whatsappLink } from "../../lib/format";
import Modal from "../../components/Modal";
import { useAdmin } from "./AdminLayout";

const FILTERS: { value: string; label: string }[] = [
  { value: "all", label: "All orders" },
  { value: "pending", label: "New" },
  { value: "confirmed", label: "Confirmed" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "out_for_delivery", label: "On the way" },
  { value: "delivered", label: "Delivered" },
  { value: "cancelled", label: "Cancelled" },
];

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Order | null>(null);
  const [updating, setUpdating] = useState(false);
  const { refreshStats } = useAdmin();

  const load = useCallback(async () => {
    try {
      const res = await api.admin.orders({ status, q: query });
      setOrders(res.orders);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load orders");
    } finally {
      setLoading(false);
    }
  }, [status, query]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const timer = window.setInterval(() => void load(), 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const setOrderStatus = async (order: Order, next: OrderStatus) => {
    if (next === "cancelled" && !window.confirm(`Reject / cancel order ${order.code}?`)) return;
    setUpdating(true);
    try {
      await api.admin.setOrderStatus(order.id, next);
      setSelected((prev) => (prev && prev.id === order.id ? { ...prev, status: next } : prev));
      await load();
      refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the order");
    } finally {
      setUpdating(false);
    }
  };

  const nextStatus = (order: Order): OrderStatus | null => {
    const flow: OrderStatus[] = ["pending", "confirmed", "preparing", "ready", "out_for_delivery", "delivered"];
    const index = flow.indexOf(order.status);
    return index >= 0 && index < flow.length - 1 ? flow[index + 1] : null;
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40">Order management</p>
          <h1 className="display mt-1 text-[clamp(1.8rem,3.6vw,2.5rem)]">Orders</h1>
          <p className="text-[0.82rem] text-ink/50">Accept, cook, dispatch and close — with full customer details.</p>
        </div>
        <button type="button" onClick={() => void load()} className="btn btn-sm btn-cream">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-ink/10 bg-paper p-3 sm:flex-row sm:items-center">
        <div className="relative min-w-[180px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search code, name or phone…"
            className="field !py-2 !pl-9 !text-[0.85rem]"
            aria-label="Search orders"
          />
        </div>
        <div className="no-scrollbar flex min-w-0 shrink gap-1.5 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setStatus(f.value)}
              className={`chip !py-1.5 !text-[0.72rem] ${status === f.value ? "chip-active" : ""}`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-chili/30 bg-chili/5 px-4 py-3 text-[0.82rem] font-semibold text-chili">{error}</div>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ink/20 bg-paper p-12 text-center">
          <ShoppingBag size={26} className="mx-auto text-ink/25" />
          <p className="mt-2 font-bold text-ink/70">No orders in this view.</p>
          <p className="text-[0.8rem] text-ink/45">
            {status === "all" && !query
              ? "New orders will appear here automatically, with a sound alert."
              : "Try a different filter or search term."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-ink/10 bg-paper">
          <div className="divide-y divide-ink/8">
            {orders.map((order) => {
              const next = nextStatus(order);
              return (
                <div key={order.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                  <button type="button" onClick={() => setSelected(order)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="text-[0.88rem] font-extrabold tracking-wide">{order.code}</p>
                      <span className={`badge border ${STATUS_STYLES[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                      {order.status === "pending" && (
                        <span className="h-2 w-2 animate-pulse rounded-full bg-chili" aria-label="New" />
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-[0.8rem] font-semibold text-ink/70">
                      {order.customerName} · {order.phone}
                    </p>
                    <p className="truncate text-[0.75rem] text-ink/45">
                      {order.items.reduce((n, i) => n + i.qty, 0)} items · {orderTime(order.createdAt)} ·{" "}
                      {order.paymentMethod === "cod" ? "COD" : "Online"}
                    </p>
                  </button>

                  <div className="flex items-center gap-2 sm:flex-col sm:items-end">
                    <p className="text-[0.95rem] font-extrabold tabular-nums">{inr(order.total)}</p>
                    <p className="text-[0.68rem] text-ink/40">{timeAgo(order.createdAt)}</p>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {order.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => void setOrderStatus(order, "confirmed")}
                        disabled={updating}
                        className="btn btn-sm !bg-teal !border-teal !text-white"
                      >
                        <CheckCircle2 size={13} /> Accept
                      </button>
                    )}
                    {next && order.status !== "pending" && (
                      <button type="button" onClick={() => void setOrderStatus(order, next)} disabled={updating} className="btn btn-sm">
                        {next === "preparing" && <ChefHat size={13} />}
                        {next === "ready" && <PackageCheck size={13} />}
                        {next === "out_for_delivery" && <Bike size={13} />}
                        {next === "delivered" && <CheckCircle2 size={13} />}
                        {STATUS_LABEL[next]}
                      </button>
                    )}
                    <button type="button" onClick={() => setSelected(order)} className="btn btn-sm btn-cream">
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Modal
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        title={selected ? `Order ${selected.code}` : "Order"}
        subtitle={selected ? orderTime(selected.createdAt) : undefined}
        wide
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`badge border ${STATUS_STYLES[selected.status]}`}>{STATUS_LABEL[selected.status]}</span>
              {selected.distanceKm !== null && (
                <span className="badge border border-ink/15 bg-cream text-ink/70">
                  <MapPin size={11} /> {selected.distanceKm} km from cafe
                </span>
              )}
              <span className="badge border border-ink/15 bg-cream text-ink/70">
                {selected.paymentMethod === "cod" ? "Cash on delivery" : "Online payment"}
              </span>
              {selected.couponCode && (
                <span className="badge border border-teal/30 bg-teal/10 text-teal-900">Code {selected.couponCode}</span>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-ink/10 bg-paper p-3.5">
                <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/40">Customer</p>
                <p className="mt-1 text-sm font-bold">{selected.customerName}</p>
                <p className="text-[0.82rem] text-ink/60">{selected.phone}</p>
                <div className="mt-2 flex gap-1.5">
                  <a href={telLink(selected.phone)} className="btn btn-sm btn-cream !px-2.5 !py-1">
                    <Phone size={12} /> Call
                  </a>
                  <a
                    href={whatsappLink(selected.phone, `Hi ${selected.customerName}, this is Café 90's about order ${selected.code}.`)}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-sm btn-cream !px-2.5 !py-1"
                  >
                    <MessageCircle size={12} /> WhatsApp
                  </a>
                </div>
              </div>

              <div className="rounded-xl border border-ink/10 bg-paper p-3.5">
                <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/40">Delivery address</p>
                <p className="mt-1 text-[0.82rem] leading-relaxed text-ink/70">
                  {selected.house}, {selected.area}
                  {selected.landmark ? `, near ${selected.landmark}` : ""}
                  <br />
                  {selected.address}
                </p>
                {selected.lat !== null && selected.lng !== null && (
                  <a
                    href={mapsLink(selected.lat, selected.lng)}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1.5 inline-flex items-center gap-1 text-[0.75rem] font-bold text-chili hover:underline"
                  >
                    <MapPin size={12} /> Open exact location
                  </a>
                )}
                {selected.instructions && (
                  <p className="mt-2 rounded-lg bg-amber/15 px-2.5 py-1.5 text-[0.75rem]">
                    <strong>Instructions:</strong> {selected.instructions}
                  </p>
                )}
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-ink/10">
              <table className="w-full text-left text-[0.82rem]">
                <thead className="bg-cream text-[0.65rem] uppercase tracking-widest text-ink/45">
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Variant</th>
                    <th className="px-3 py-2 text-center">Qty</th>
                    <th className="px-3 py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/8 bg-paper">
                  {selected.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-3 py-2 font-semibold">
                        {item.name}
                        {item.notes && <span className="block text-[0.68rem] font-normal italic text-ink/45">“{item.notes}”</span>}
                      </td>
                      <td className="px-3 py-2 text-ink/55">{item.variantLabel}</td>
                      <td className="px-3 py-2 text-center font-bold">{item.qty}</td>
                      <td className="px-3 py-2 text-right font-bold tabular-nums">{inr(item.unitPrice * item.qty)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="rounded-xl bg-cream p-3.5 text-[0.82rem]">
              <div className="flex justify-between">
                <span className="text-ink/55">Subtotal</span>
                <span className="font-semibold">{inr(selected.subtotal)}</span>
              </div>
              {selected.discount > 0 && (
                <div className="flex justify-between text-teal-900">
                  <span>Discount</span>
                  <span className="font-semibold">−{inr(selected.discount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-ink/55">Delivery</span>
                <span className="font-semibold">{selected.deliveryFee === 0 ? "FREE" : inr(selected.deliveryFee)}</span>
              </div>
              <div className="mt-1 flex justify-between border-t border-ink/10 pt-1 text-base font-extrabold">
                <span>Total</span>
                <span>{inr(selected.total)}</span>
              </div>
            </div>

            {selected.notes && (
              <p className="rounded-xl border border-ink/10 bg-paper p-3 text-[0.8rem]">
                <strong>Order notes:</strong> {selected.notes}
              </p>
            )}

            <div className="rounded-xl border border-ink/10 bg-paper p-3.5">
              <p className="text-[0.62rem] font-bold uppercase tracking-widest text-ink/40">Update status</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(STATUS_LABEL).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => void setOrderStatus(selected, value as OrderStatus)}
                    disabled={updating || selected.status === value}
                    className={`chip !py-1.5 !text-[0.72rem] ${
                      selected.status === value ? "chip-active" : ""
                    } ${value === "cancelled" ? "!text-chili" : ""}`}
                  >
                    {value === "cancelled" && <XCircle size={12} />}
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[0.7rem] text-ink/40">
                The customer sees this status live on their tracking page.
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
