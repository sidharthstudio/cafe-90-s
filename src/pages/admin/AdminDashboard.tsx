import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeIndianRupee,
  ChefHat,
  CircleDollarSign,
  Clock,
  Flame,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import type { AdminStats, OrderStatus } from "../../../shared/types";
import { STATUS_LABEL } from "../../../shared/types";
import { api } from "../../lib/api";
import { inr, orderTime, STATUS_STYLES, timeAgo } from "../../lib/format";
import { useAdmin } from "./AdminLayout";

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);
  const { admin, refreshStats } = useAdmin();

  const load = useCallback(async () => {
    try {
      const res = await api.admin.stats();
      setStats(res);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(), 20_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const changeStatus = async (id: number, status: OrderStatus) => {
    setUpdating(id);
    try {
      await api.admin.setOrderStatus(id, status);
      await load();
      refreshStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update the order");
    } finally {
      setUpdating(null);
    }
  };

  const week = useMemo(() => {
    const byDay = new Map((stats?.daily ?? []).map((d) => [d.day, d]));
    const istNow = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(istNow);
      date.setUTCDate(istNow.getUTCDate() - (6 - i));
      const key = date.toISOString().slice(0, 10);
      const hit = byDay.get(key);
      return { day: key, orders: hit?.orders ?? 0, sales: hit?.sales ?? 0 };
    });
  }, [stats]);

  const maxSales = Math.max(1, ...week.map((d) => d.sales));
  const maxPopular = Math.max(1, ...(stats?.popular ?? []).map((p) => p.qty));

  const cards = [
    {
      label: "Total sales",
      value: inr(stats?.totalSales ?? 0),
      hint: `${inr(stats?.todaySales ?? 0)} today`,
      icon: CircleDollarSign,
      accent: "bg-teal/15 text-teal-900",
    },
    {
      label: "Total orders",
      value: stats?.totalOrders ?? 0,
      hint: `${stats?.todayOrders ?? 0} today`,
      icon: ShoppingBag,
      accent: "bg-amber/25 text-amber-900",
    },
    {
      label: "New / pending",
      value: stats?.newOrders ?? 0,
      hint: `${stats?.activeOrders ?? 0} in progress`,
      icon: Clock,
      accent: "bg-chili/15 text-chili",
    },
    {
      label: "Completed",
      value: stats?.completedOrders ?? 0,
      hint: `${stats?.cancelledOrders ?? 0} cancelled`,
      icon: ChefHat,
      accent: "bg-plum/15 text-plum",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[0.65rem] font-bold uppercase tracking-widest text-ink/40">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="display mt-1 text-[clamp(1.8rem,3.6vw,2.6rem)]">
            Hey {admin?.name?.split(" ")[0] || "there"}, here&apos;s today.
          </h1>
          <p className="text-[0.82rem] text-ink/50">Live order queue, sales and the items people keep reordering.</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => void load()} className="btn btn-sm btn-cream">
            <RefreshCw size={14} /> Refresh
          </button>
          <Link to="/admin/orders" className="btn btn-sm btn-accent">
            Open orders <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-chili/30 bg-chili/5 px-4 py-3 text-[0.82rem] font-semibold text-chili">{error}</div>
      )}

      {(stats?.newOrders ?? 0) > 0 && (
        <Link
          to="/admin/orders"
          className="flex items-center justify-between gap-3 rounded-2xl border border-chili/25 bg-chili/10 px-4 py-3 transition-colors hover:bg-chili/15"
        >
          <span className="flex items-center gap-2 text-[0.85rem] font-bold text-chili">
            <Flame size={16} /> {stats?.newOrders} order{stats?.newOrders === 1 ? "" : "s"} waiting to be accepted
          </span>
          <span className="text-[0.75rem] font-bold text-chili underline">Review now</span>
        </Link>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-ink/10 bg-paper p-4">
            <div className="flex items-start justify-between">
              <p className="text-[0.66rem] font-bold uppercase tracking-widest text-ink/40">{card.label}</p>
              <span className={`grid h-8 w-8 place-items-center rounded-full ${card.accent}`}>
                <card.icon size={15} />
              </span>
            </div>
            <p className="display mt-2 text-[1.9rem] leading-none">{loading ? "—" : card.value}</p>
            <p className="mt-1 text-[0.72rem] font-semibold text-ink/40">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-ink/10 bg-paper p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="display text-xl">Last 7 days</h2>
              <p className="text-[0.72rem] text-ink/45">Sales by day, cancelled orders excluded</p>
            </div>
            <span className="flex items-center gap-1 rounded-full bg-teal/10 px-2.5 py-1 text-[0.68rem] font-bold text-teal-900">
              <TrendingUp size={12} /> {inr(stats?.totalSales ?? 0)} all time
            </span>
          </div>

          <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3">
            {week.map(
              (day, i) => (
                <div key={`${day.day}-${i}`} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-amber/60 to-chili transition-all"
                      style={{ height: `${Math.max(4, (day.sales / maxSales) * 100)}%` }}
                      title={`${day.orders} orders · ${inr(day.sales)}`}
                    />
                  </div>
                  <p className="text-[0.62rem] font-bold uppercase text-ink/40">
                    {day.day
                      ? new Date(day.day).toLocaleDateString("en-IN", { weekday: "short" })
                      : "—"}
                  </p>
                  <p className="text-[0.6rem] font-semibold text-ink/30">{day.orders || ""}</p>
                </div>
              ),
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-ink/10 bg-paper p-4 sm:p-5">
          <h2 className="display text-xl">Popular right now</h2>
          <p className="text-[0.72rem] text-ink/45">Units sold, all orders</p>
          <ul className="mt-4 space-y-3">
            {(stats?.popular ?? []).length === 0 && (
              <li className="rounded-xl border border-dashed border-ink/15 p-4 text-[0.8rem] text-ink/45">
                No orders yet — share the menu link and your first sale will show up here.
              </li>
            )}
            {(stats?.popular ?? []).map((item, i) => (
              <li key={item.name}>
                <div className="flex items-center justify-between gap-2 text-[0.8rem]">
                  <span className="flex min-w-0 items-center gap-2 font-semibold">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink text-[10px] font-extrabold text-cream">
                      {i + 1}
                    </span>
                    <span className="truncate">{item.name}</span>
                  </span>
                  <span className="shrink-0 text-[0.72rem] font-bold text-ink/45">{item.qty} sold</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/8">
                  <div className="h-full rounded-full bg-amber" style={{ width: `${(item.qty / maxPopular) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="overflow-hidden rounded-2xl border border-ink/10 bg-paper">
        <div className="flex items-center justify-between border-b border-ink/10 px-4 py-3 sm:px-5">
          <div>
            <h2 className="display text-xl">Recent orders</h2>
            <p className="text-[0.72rem] text-ink/45">Update a status straight from here</p>
          </div>
          <Link to="/admin/orders" className="text-[0.76rem] font-bold text-chili hover:underline">
            All orders →
          </Link>
        </div>

        {loading ? (
          <div className="space-y-2 p-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-12 rounded-lg" />
            ))}
          </div>
        ) : (stats?.recent ?? []).length === 0 ? (
          <div className="px-5 py-10 text-center">
            <BadgeIndianRupee size={24} className="mx-auto text-ink/25" />
            <p className="mt-2 text-sm font-semibold text-ink/60">No orders yet.</p>
            <p className="text-[0.78rem] text-ink/40">As soon as a customer checks out, the order appears here.</p>
          </div>
        ) : (
          <div className="divide-y divide-ink/8">
            {(stats?.recent ?? []).map((order) => (
              <div key={order.id} className="flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5">
                <div className="min-w-[130px] flex-1">
                  <p className="text-[0.82rem] font-extrabold tracking-wide">{order.code}</p>
                  <p className="text-[0.72rem] text-ink/45">
                    {order.customerName} · {timeAgo(order.createdAt)}
                  </p>
                </div>
                <div className="hidden text-[0.72rem] text-ink/50 sm:block">
                  {order.items.reduce((n, i) => n + i.qty, 0)} items · {orderTime(order.createdAt)}
                </div>
                <p className="text-[0.85rem] font-extrabold tabular-nums">{inr(order.total)}</p>
                <span className={`badge border ${STATUS_STYLES[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                <select
                  value={order.status}
                  disabled={updating === order.id}
                  onChange={(e) => void changeStatus(order.id, e.target.value as OrderStatus)}
                  className="rounded-lg border border-ink/15 bg-cream px-2 py-1.5 text-[0.72rem] font-semibold"
                  aria-label={`Update status for ${order.code}`}
                >
                  {Object.entries(STATUS_LABEL).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
