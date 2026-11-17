import type {
  AdminStats,
  AdminUser,
  Category,
  DeliveryCheck,
  EventItem,
  GalleryItem,
  MenuCategory,
  Offer,
  Order,
  Product,
  Review,
  Settings,
} from "../../shared/types";

export type Bootstrap = {
  settings: Settings;
  categories: (Category & { count: number; from: number })[];
  stats: { items: number; categories: number; deliveries: number };
  featured: Product[];
  bestsellers: Product[];
  signature: Product[];
  offers: Offer[];
  events: EventItem[];
  gallery: GalleryItem[];
  reviews: Review[];
};

export class ApiError extends Error {
  status: number;
  issues?: unknown;
  constructor(message: string, status: number, issues?: unknown) {
    super(message);
    this.status = status;
    this.issues = issues;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "same-origin",
    headers: init?.body && !(init.body instanceof FormData) ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.issues);
  }
  return data as T;
}

const json = (body: unknown): RequestInit => ({ method: "POST", body: JSON.stringify(body) });

export const api = {
  bootstrap: () => request<Bootstrap>("/api/bootstrap"),
  menu: () => request<{ categories: MenuCategory[]; total: number }>("/api/menu"),
  settings: () => request<Settings>("/api/settings"),
  checkDelivery: (lat: number, lng: number) =>
    request<DeliveryCheck>("/api/delivery/check", json({ lat, lng })),

  placeOrder: (payload: unknown) => request<{ order: Order }>("/api/orders", json(payload)),
  getOrder: (code: string) => request<{ order: Order }>(`/api/orders/${encodeURIComponent(code)}`),
  cancelOrder: (code: string) => request<{ ok: boolean }>(`/api/orders/${encodeURIComponent(code)}/cancel`, {
    method: "POST",
  }),
  submitReview: (payload: { name: string; rating: number; text: string }) =>
    request<{ ok: boolean; message: string }>("/api/reviews", json(payload)),

  admin: {
    login: (email: string, password: string) =>
      request<{ admin: AdminUser }>("/api/admin/login", json({ email, password })),
    logout: () => request<{ ok: boolean }>("/api/admin/logout", { method: "POST" }),
    me: () => request<{ admin: AdminUser }>("/api/admin/me"),
    stats: () => request<AdminStats>("/api/admin/stats"),
    orders: (params: { status?: string; q?: string } = {}) => {
      const qs = new URLSearchParams();
      if (params.status && params.status !== "all") qs.set("status", params.status);
      if (params.q) qs.set("q", params.q);
      return request<{ orders: Order[] }>(`/api/admin/orders?${qs.toString()}`);
    },
    order: (id: number) => request<{ order: Order }>(`/api/admin/orders/${id}`),
    setOrderStatus: (id: number, status: string) =>
      request<{ ok: boolean }>(`/api/admin/orders/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    menu: () => request<{ categories: MenuCategory[] }>("/api/admin/menu"),
    createProduct: (body: unknown) => request<{ ok: boolean; id: number }>("/api/admin/products", json(body)),
    updateProduct: (id: number, body: unknown) =>
      request<{ ok: boolean }>(`/api/admin/products/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteProduct: (id: number) => request<{ ok: boolean }>(`/api/admin/products/${id}`, { method: "DELETE" }),
    createCategory: (body: unknown) => request<{ ok: boolean; id: number }>("/api/admin/categories", json(body)),
    updateCategory: (id: number, body: unknown) =>
      request<{ ok: boolean }>(`/api/admin/categories/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteCategory: (id: number) => request<{ ok: boolean }>(`/api/admin/categories/${id}`, { method: "DELETE" }),
    offers: () => request<{ offers: (Offer & { discount_type: string; discount_value: number; min_order: number })[] }>(
      "/api/admin/offers",
    ),
    createOffer: (body: unknown) => request<{ ok: boolean }>("/api/admin/offers", json(body)),
    updateOffer: (id: number, body: unknown) =>
      request<{ ok: boolean }>(`/api/admin/offers/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteOffer: (id: number) => request<{ ok: boolean }>(`/api/admin/offers/${id}`, { method: "DELETE" }),
    events: () => request<{ events: EventItem[] }>("/api/admin/events"),
    createEvent: (body: unknown) => request<{ ok: boolean }>("/api/admin/events", json(body)),
    updateEvent: (id: number, body: unknown) =>
      request<{ ok: boolean }>(`/api/admin/events/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
    deleteEvent: (id: number) => request<{ ok: boolean }>(`/api/admin/events/${id}`, { method: "DELETE" }),
    gallery: () => request<{ gallery: GalleryItem[] }>("/api/admin/gallery"),
    addGallery: (body: { image: string; caption: string }) => request<{ ok: boolean }>("/api/admin/gallery", json(body)),
    deleteGallery: (id: number) => request<{ ok: boolean }>(`/api/admin/gallery/${id}`, { method: "DELETE" }),
    reviews: () => request<{ reviews: Review[] }>("/api/admin/reviews"),
    approveReview: (id: number, approved: boolean) =>
      request<{ ok: boolean }>(`/api/admin/reviews/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ approved }),
      }),
    deleteReview: (id: number) => request<{ ok: boolean }>(`/api/admin/reviews/${id}`, { method: "DELETE" }),
    settings: () => request<{ settings: Settings }>("/api/admin/settings"),
    saveSettings: (body: Partial<Settings>) =>
      request<{ settings: Settings }>("/api/admin/settings", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    upload: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return request<{ ok: boolean; url: string }>("/api/admin/upload", { method: "POST", body: form });
    },
    changePassword: (currentPassword: string, newPassword: string) =>
      request<{ ok: boolean }>("/api/admin/password", json({ currentPassword, newPassword })),
  },
};

/** Downscale + compress in the browser so admin uploads always fit the D1 limit. */
export async function compressImage(file: File, maxSide = 1200, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
  if (!blob) return file;
  return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
}
