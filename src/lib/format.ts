import type { OrderStatus } from "../../shared/types";

export function inr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const mins = Math.round((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function orderTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const STATUS_STYLES: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  confirmed: "bg-sky-100 text-sky-900 border-sky-300",
  preparing: "bg-orange-100 text-orange-900 border-orange-300",
  ready: "bg-violet-100 text-violet-900 border-violet-300",
  out_for_delivery: "bg-indigo-100 text-indigo-900 border-indigo-300",
  delivered: "bg-emerald-100 text-emerald-900 border-emerald-300",
  cancelled: "bg-rose-100 text-rose-900 border-rose-300",
};

export function whatsappLink(number: string, message: string): string {
  return `https://wa.me/${number.replace(/\D/g, "")}?text=${encodeURIComponent(message)}`;
}

export function telLink(phone: string): string {
  return `tel:+91${phone.replace(/\D/g, "").slice(-10)}`;
}

export function mapsLink(lat: number, lng: number): string {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}
