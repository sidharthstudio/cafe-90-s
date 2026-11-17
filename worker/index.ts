import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { z } from "zod";
import { ensureDb, getSettings, type Env } from "./db";
import { adminRoutes } from "./admin";
import type { AdminUser, MenuCategory, Order, Product } from "../shared/types";

type AppEnv = { Bindings: Env; Variables: { admin: AdminUser } };

export const app = new Hono<AppEnv>();

/* ------------------------------------------------------------------ helpers */

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 100) / 100;
}

export function newOrderCode(): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return `C90-${Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("")}`;
}

type ProductRow = {
  id: number;
  slug: string;
  name: string;
  description: string;
  image: string;
  portion: string;
  tags: string;
  available: number;
  featured: number;
  bestseller: number;
  sort: number;
  category_id: number;
  category_slug: string;
  category_name: string;
};

export async function loadMenu(db: D1Database): Promise<MenuCategory[]> {
  const [cats, prods, vars] = await Promise.all([
    db.prepare("SELECT * FROM categories ORDER BY sort, id").all<Record<string, unknown>>(),
    db
      .prepare(
        "SELECT p.*, c.slug AS category_slug, c.name AS category_name FROM products p JOIN categories c ON c.id = p.category_id ORDER BY p.sort, p.id",
      )
      .all<ProductRow>(),
    db.prepare("SELECT * FROM variants ORDER BY product_id, sort, id").all<Record<string, any>>(),
  ]);

  const variantsByProduct = new Map<number, Product["variants"]>();
  for (const v of vars.results ?? []) {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push({ id: v.id, productId: v.product_id, label: v.label, price: Number(v.price), sort: v.sort });
    variantsByProduct.set(v.product_id, list);
  }

  const byCategory = new Map<number, Product[]>();
  for (const p of prods.results ?? []) {
    const product: Product = {
      id: p.id,
      slug: p.slug,
      name: p.name,
      description: p.description,
      image: p.image,
      portion: p.portion,
      tags: p.tags ? p.tags.split(",").filter(Boolean) : [],
      available: Boolean(p.available),
      featured: Boolean(p.featured),
      bestseller: Boolean(p.bestseller),
      sort: p.sort,
      categoryId: p.category_id,
      categorySlug: p.category_slug,
      categoryName: p.category_name,
      variants: variantsByProduct.get(p.id) ?? [],
    };
    const list = byCategory.get(p.category_id) ?? [];
    list.push(product);
    byCategory.set(p.category_id, list);
  }

  return (cats.results ?? []).map((c: any) => ({
    id: c.id,
    slug: c.slug,
    name: c.name,
    tagline: c.tagline,
    tint: c.tint,
    image: c.image,
    sort: c.sort,
    products: byCategory.get(c.id) ?? [],
  }));
}

export async function loadOrder(db: D1Database, where: string, value: string | number): Promise<Order | null> {
  const row = await db.prepare(`SELECT * FROM orders WHERE ${where} = ?`).bind(value).first<Record<string, any>>();
  if (!row) return null;
  const items = await db
    .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
    .bind(row.id)
    .all<Record<string, any>>();
  return mapOrder(row, items.results ?? []);
}

export function mapOrder(row: Record<string, any>, items: Record<string, any>[]): Order {
  return {
    id: row.id,
    code: row.code,
    customerName: row.customer_name,
    phone: row.phone,
    house: row.house,
    area: row.area,
    landmark: row.landmark,
    address: row.address,
    instructions: row.instructions,
    notes: row.notes,
    lat: row.lat === null ? null : Number(row.lat),
    lng: row.lng === null ? null : Number(row.lng),
    distanceKm: row.distance_km === null ? null : Number(row.distance_km),
    subtotal: Number(row.subtotal),
    discount: Number(row.discount),
    deliveryFee: Number(row.delivery_fee),
    total: Number(row.total),
    paymentMethod: row.payment_method,
    paymentStatus: row.payment_status,
    couponCode: row.coupon_code,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    items: items.map((i) => ({
      id: i.id,
      productId: i.product_id,
      name: i.name,
      variantLabel: i.variant_label,
      unitPrice: Number(i.unit_price),
      qty: Number(i.qty),
      notes: i.notes,
      image: i.image,
    })),
  };
}

/** Every request makes sure the schema + official menu exist in D1. */
app.use("*", async (c, next) => {
  if (c.req.path.startsWith("/api/")) await ensureDb(c.env);
  await next();
});

app.get("/api/health", async (c) => {
  const settings = await getSettings(c.env);
  return c.json({ ok: true, cafe: settings.cafeName, time: new Date().toISOString() });
});

app.get("/api/bootstrap", async (c) => {
  const db = c.env.DB;
  const [settings, menu, offers, events, gallery, reviews] = await Promise.all([
    getSettings(c.env),
    loadMenu(db),
    db.prepare("SELECT * FROM offers WHERE active = 1 ORDER BY id DESC").all<Record<string, any>>(),
    db.prepare("SELECT * FROM events WHERE active = 1 ORDER BY id DESC").all<Record<string, any>>(),
    db.prepare("SELECT * FROM gallery ORDER BY sort, id").all<Record<string, any>>(),
    db.prepare("SELECT * FROM reviews WHERE approved = 1 ORDER BY created_at DESC LIMIT 12").all<Record<string, any>>(),
  ]);

  const products = menu.flatMap((category) => category.products);
  const featured = products.filter((p) => p.featured).slice(0, 8);
  const bestsellers = products.filter((p) => p.bestseller).slice(0, 8);
  const signature = [
    "special-loaded-shawarma",
    "cafe-90s-special-falooda",
    "peri-peri-fries",
    "sharjah-shake",
    "chicken-momos",
    "oreo-kitkat-shake",
  ]
    .map((slug) => products.find((p) => p.slug === slug))
    .filter(Boolean) as Product[];

  return c.json({
    settings,
    categories: menu.map(({ products: _p, ...rest }) => ({
      ...rest,
      count: _p.length,
      from: Math.min(..._p.map((x) => Math.min(...x.variants.map((v) => v.price)))),
    })),
    stats: {
      items: products.length,
      categories: menu.length,
      deliveries: Math.round(settings.freeRadiusKm * 10) / 10,
    },
    featured,
    bestsellers,
    signature,
    offers: offers.results,
    events: events.results,
    gallery: gallery.results,
    reviews: reviews.results,
  });
});

app.get("/api/menu", async (c) => {
  const menu = await loadMenu(c.env.DB);
  return c.json({ categories: menu, total: menu.reduce((n, cat) => n + cat.products.length, 0) });
});

app.get("/api/settings", async (c) => c.json(await getSettings(c.env)));

app.get("/api/products/:slug", async (c) => {
  const slug = c.req.param("slug");
  const menu = await loadMenu(c.env.DB);
  const product = menu.flatMap((m) => m.products).find((p) => p.slug === slug);
  if (!product) return c.json({ error: "Product not found" }, 404);
  return c.json(product);
});

/* -------------------------------------------------------------- delivery */

app.post("/api/delivery/check", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = z
    .object({ lat: z.number().min(-90).max(90), lng: z.number().min(-180).max(180) })
    .safeParse(body);
  if (!parsed.success) return c.json({ error: "Valid latitude and longitude are required." }, 400);

  const settings = await getSettings(c.env);
  const distanceKm = haversineKm(settings.cafeLat, settings.cafeLng, parsed.data.lat, parsed.data.lng);
  const inZone = distanceKm <= settings.freeRadiusKm;
  const withinMax = distanceKm <= settings.maxRadiusKm;
  const allowed = settings.deliveryEnabled && withinMax && (inZone || settings.outsideDeliveryAllowed);
  const fee = inZone ? 0 : settings.outsideFee;

  let message = "Free delivery — you are inside our delivery zone.";
  if (!settings.deliveryEnabled) message = "Online delivery is paused right now. Please call us to order.";
  else if (!withinMax) message = `You are ${distanceKm} km away, outside our ${settings.maxRadiusKm} km delivery range. Please call us to arrange something.`;
  else if (!inZone && !settings.outsideDeliveryAllowed)
    message = `You are ${distanceKm} km away — just outside our ${settings.freeRadiusKm} km free delivery zone. Please call us to check if we can deliver.`;
  else if (!inZone && settings.outsideFee > 0)
    message = `You are ${distanceKm} km away. A delivery charge of ₹${settings.outsideFee} applies.`;
  else if (!inZone) message = `You are ${distanceKm} km away, outside the free delivery zone.`;

  return c.json({
    distanceKm,
    inZone,
    allowed,
    fee,
    message,
    freeRadiusKm: settings.freeRadiusKm,
    maxRadiusKm: settings.maxRadiusKm,
    deliveryEnabled: settings.deliveryEnabled,
    minOrderValue: settings.minOrderValue,
  });
});

/* ----------------------------------------------------------------- orders */

const orderSchema = z.object({
  customerName: z.string().trim().min(2, "Please enter your full name").max(80),
  phone: z.string().trim().min(8).max(16),
  house: z.string().trim().min(1, "House / building is required").max(120),
  area: z.string().trim().min(2, "Area / locality is required").max(120),
  landmark: z.string().trim().max(120).default(""),
  address: z.string().trim().min(6, "Please enter your delivery address").max(400),
  instructions: z.string().trim().max(300).default(""),
  notes: z.string().trim().max(300).default(""),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  paymentMethod: z.enum(["cod", "online"]).default("cod"),
  couponCode: z.string().trim().max(30).default(""),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        variantId: z.number().int().positive().nullish(),
        qty: z.number().int().min(1).max(30),
        notes: z.string().trim().max(160).default(""),
      }),
    )
    .min(1, "Your cart is empty"),
});

app.post("/api/orders", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid order details", issues: parsed.error.issues }, 400);
  }
  const input = parsed.data;
  const db = c.env.DB;
  const settings = await getSettings(c.env);

  const digits = input.phone.replace(/\D/g, "");
  const normalizedPhone = digits.length > 10 ? digits.slice(-10) : digits;
  if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
    return c.json({ error: "Please enter a valid 10-digit Indian mobile number." }, 400);
  }

  if (!settings.deliveryEnabled) {
    return c.json({ error: "Online ordering is paused right now. Please call us at " + settings.phone }, 400);
  }

  const distanceKm = haversineKm(settings.cafeLat, settings.cafeLng, input.lat, input.lng);
  const inZone = distanceKm <= settings.freeRadiusKm;
  if (distanceKm > settings.maxRadiusKm) {
    return c.json({ error: `Your location is ${distanceKm} km away, outside our delivery range.` }, 400);
  }
  if (!inZone && !settings.outsideDeliveryAllowed) {
    return c.json(
      { error: `Your location is ${distanceKm} km away, outside the free delivery zone. Please call us to order.` },
      400,
    );
  }

  if (input.paymentMethod === "online" && !settings.onlinePaymentEnabled) {
    return c.json({ error: "Online payment is not enabled yet. Please choose cash on delivery." }, 400);
  }

  // Prices always come from the database — never from the browser.
  const products = await loadMenu(db);
  const flat = new Map(products.flatMap((m) => m.products).map((p) => [p.id, p]));
  const lines: { product: Product; variantId: number; label: string; price: number; qty: number; notes: string }[] = [];

  for (const item of input.items) {
    const product = flat.get(item.productId);
    if (!product) return c.json({ error: "One of the items is no longer on the menu." }, 400);
    if (!product.available) return c.json({ error: `${product.name} is sold out right now.` }, 400);
    const variant = product.variants.find((v) => v.id === item.variantId) ?? product.variants[0];
    if (!variant) return c.json({ error: `${product.name} has no price configured.` }, 400);
    lines.push({ product, variantId: variant.id, label: variant.label, price: variant.price, qty: item.qty, notes: item.notes });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.price * l.qty, 0);
  if (settings.minOrderValue > 0 && subtotal < settings.minOrderValue) {
    return c.json({ error: `Minimum order value is ₹${settings.minOrderValue}.` }, 400);
  }

  let discount = 0;
  let couponCode = "";
  if (input.couponCode) {
    const offer = await db
      .prepare("SELECT * FROM offers WHERE active = 1 AND UPPER(code) = ?")
      .bind(input.couponCode.toUpperCase())
      .first<Record<string, any>>();
    if (!offer) return c.json({ error: "That offer code is not valid." }, 400);
    if (subtotal < Number(offer.min_order)) {
      return c.json({ error: `This code needs a minimum order of ₹${offer.min_order}.` }, 400);
    }
    discount =
      offer.discount_type === "percent"
        ? Math.round((subtotal * Number(offer.discount_value)) / 100)
        : Math.min(Number(offer.discount_value), subtotal);
    couponCode = String(offer.code).toUpperCase();
  }

  const deliveryFee = inZone ? 0 : settings.outsideFee;
  const total = Math.max(0, subtotal - discount + deliveryFee);
  const now = new Date().toISOString();
  const code = newOrderCode();

  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO orders (code, customer_name, phone, house, area, landmark, address, instructions, notes, lat, lng, distance_km,
          subtotal, discount, delivery_fee, total, payment_method, payment_status, coupon_code, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, 'pending', ?, ?)`,
      )
      .bind(
        code,
        input.customerName,
        normalizedPhone,
        input.house,
        input.area,
        input.landmark,
        input.address,
        input.instructions,
        input.notes,
        input.lat,
        input.lng,
        distanceKm,
        subtotal,
        discount,
        deliveryFee,
        total,
        input.paymentMethod,
        couponCode,
        now,
        now,
      ),
  ];

  for (const l of lines) {
    statements.push(
      db
        .prepare(
          `INSERT INTO order_items (order_id, product_id, name, variant_label, unit_price, qty, notes, image)
           VALUES ((SELECT id FROM orders WHERE code = ?), ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(code, l.product.id, l.product.name, l.label, l.price, l.qty, l.notes, l.product.image),
    );
  }

  try {
    await db.batch(statements);
  } catch (err) {
    console.error("order insert failed", err);
    return c.json({ error: "We could not save your order. Please try again." }, 500);
  }

  const order = await loadOrder(db, "code", code);

  if (c.env.ORDER_WEBHOOK_URL) {
    const payload = JSON.stringify({ type: "new_order", code, total, phone: normalizedPhone, items: order?.items });
    c.executionCtx.waitUntil(
      fetch(c.env.ORDER_WEBHOOK_URL, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: payload,
      }).catch(() => undefined),
    );
  }

  return c.json({ order }, 201);
});

app.get("/api/orders/:code", async (c) => {
  const order = await loadOrder(c.env.DB, "code", c.req.param("code").toUpperCase());
  if (!order) return c.json({ error: "We could not find an order with that code." }, 404);
  const masked = order.phone.replace(/^(\d{2})\d+(\d{2})$/, "$1••••$2");
  return c.json({ order: { ...order, phone: masked } });
});

app.post("/api/orders/:code/cancel", async (c) => {
  const db = c.env.DB;
  const code = c.req.param("code").toUpperCase();
  const order = await loadOrder(db, "code", code);
  if (!order) return c.json({ error: "Order not found." }, 404);
  if (!["pending", "confirmed"].includes(order.status)) {
    return c.json({ error: "This order is already being prepared. Please call us to cancel." }, 400);
  }
  await db
    .prepare("UPDATE orders SET status = 'cancelled', updated_at = ? WHERE code = ?")
    .bind(new Date().toISOString(), code)
    .run();
  return c.json({ ok: true });
});

/* ---------------------------------------------------------------- reviews */

app.post("/api/reviews", async (c) => {
  const parsed = z
    .object({
      name: z.string().trim().min(2).max(60),
      rating: z.number().int().min(1).max(5),
      text: z.string().trim().min(10).max(600),
    })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Please add a name, rating and a few words." }, 400);
  await c.env.DB.prepare("INSERT INTO reviews (name, rating, text, approved, created_at) VALUES (?, ?, ?, 0, ?)")
    .bind(parsed.data.name, parsed.data.rating, parsed.data.text, new Date().toISOString())
    .run();
  return c.json({ ok: true, message: "Thanks! Your review will appear once the cafe approves it." }, 201);
});

/* ---------------------------------------------------------------- uploads */

app.get("/api/assets/:id", async (c) => {
  const row = await c.env.DB.prepare("SELECT mime, data FROM assets WHERE id = ?")
    .bind(c.req.param("id"))
    .first<{ mime: string; data: string }>();
  if (!row) return c.json({ error: "Image not found" }, 404);
  const binary = atob(row.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return new Response(bytes, {
    headers: {
      "content-type": row.mime,
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
});

/* ------------------------------------------------------------------ admin */

app.route("/api/admin", adminRoutes);

/* --------------------------------------------------- static / SPA fallback */

app.notFound(async (c) => {
  if (c.req.path.startsWith("/api/")) return c.json({ error: "Not found" }, 404);
  const res = await c.env.ASSETS.fetch(c.req.raw);
  if (res.status !== 404) return res;
  const indexUrl = new URL("/", c.req.url);
  const fallback = await c.env.ASSETS.fetch(new Request(indexUrl.toString(), { method: "GET" }));
  return new Response(fallback.body, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache" },
  });
});

app.onError((err, c) => {
  console.error("api error", err);
  if (c.req.path.startsWith("/api/")) return c.json({ error: "Something went wrong. Please try again." }, 500);
  return new Response("Something went wrong", { status: 500 });
});

export default {
  fetch: app.fetch,
};
