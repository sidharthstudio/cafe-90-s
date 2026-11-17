import { Hono, type Context } from "hono";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { z } from "zod";
import type { AdminUser, AdminStats, Order, OrderStatus, Settings } from "../shared/types";
import { getSettings, saveSettings, type Env } from "./db";
import {
  clearLoginFailures,
  COOKIE_NAME,
  createSessionToken,
  loginAllowed,
  readSessionToken,
  recordLoginFailure,
  verifyPassword,
} from "./auth";
// Shared query helpers live with the public API (function declarations, so no init-order issue).
import { loadMenu, loadOrder, mapOrder } from "./index";

type AppEnv = { Bindings: Env; Variables: { admin: AdminUser } };

export const adminRoutes = new Hono<AppEnv>();

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

function isSecure(c: { req: { url: string } }): boolean {
  return new URL(c.req.url).protocol === "https:";
}

function clientIp(headers: Headers): string {
  return headers.get("cf-connecting-ip") ?? headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

async function currentAdmin(c: Context<AppEnv>): Promise<AdminUser | null> {
  const token = getCookie(c, COOKIE_NAME);
  if (!token) return null;
  const payload = await readSessionToken(token, c.env.SESSION_SECRET);
  if (!payload) return null;
  const user = await c.env.DB.prepare("SELECT id, email, name, role FROM admin_users WHERE id = ?")
    .bind(payload.sub)
    .first<AdminUser>();
  return user ?? null;
}

/* ------------------------------------------------------------------ login */

adminRoutes.post("/login", async (c) => {
  const ip = clientIp(c.req.raw.headers);
  if (!loginAllowed(ip)) {
    return c.json({ error: "Too many attempts. Please wait a few minutes and try again." }, 429);
  }
  const parsed = z
    .object({ email: z.string().trim().min(3).max(120), password: z.string().min(4).max(200) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Enter your email and password." }, 400);

  const user = await c.env.DB.prepare("SELECT * FROM admin_users WHERE email = ?")
    .bind(parsed.data.email.toLowerCase())
    .first<Record<string, any>>();

  const ok = user ? await verifyPassword(parsed.data.password, user.password_hash) : false;
  if (!user || !ok) {
    recordLoginFailure(ip);
    return c.json({ error: "Email or password is incorrect." }, 401);
  }

  clearLoginFailures(ip);
  const token = await createSessionToken(
    { sub: user.id, email: user.email, exp: Date.now() + SESSION_MS },
    c.env.SESSION_SECRET,
  );
  setCookie(c, COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "Lax",
    secure: isSecure(c),
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
  await c.env.DB.prepare("UPDATE admin_users SET role = role WHERE id = ?").bind(user.id).run();
  return c.json({ admin: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

adminRoutes.post("/logout", (c) => {
  deleteCookie(c, COOKIE_NAME, { path: "/" });
  return c.json({ ok: true });
});

/* -------------------------------------------------- auth guard (all below) */

adminRoutes.use("*", async (c, next) => {
  const admin = await currentAdmin(c);
  if (!admin) return c.json({ error: "Please sign in." }, 401);
  if (c.req.method !== "GET") {
    const origin = c.req.header("origin");
    if (origin && new URL(origin).host !== new URL(c.req.url).host) {
      return c.json({ error: "Cross-origin request blocked." }, 403);
    }
  }
  c.set("admin", admin);
  await next();
});

adminRoutes.get("/me", (c) => c.json({ admin: c.get("admin") }));

/* ------------------------------------------------------------------ stats */

adminRoutes.get("/stats", async (c) => {
  const db = c.env.DB;
  const [totals, today, popular, recentRows, dailyRows] = await Promise.all([
    db
      .prepare(
        `SELECT COUNT(*) AS total_orders,
                SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status IN ('confirmed','preparing','ready','out_for_delivery') THEN 1 ELSE 0 END) AS active,
                SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS completed,
                SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled,
                SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END) AS sales
         FROM orders`,
      )
      .first<Record<string, any>>(),
    db
      .prepare(
        `SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS sales FROM orders
         WHERE status != 'cancelled' AND date(created_at, '+5 hours', '+30 minutes') = date('now', '+5 hours', '+30 minutes')`,
      )
      .first<Record<string, any>>(),
    db
      .prepare(
        `SELECT name, SUM(qty) AS qty, SUM(qty * unit_price) AS revenue FROM order_items
         GROUP BY name ORDER BY qty DESC LIMIT 6`,
      )
      .all<Record<string, any>>(),
    db.prepare("SELECT * FROM orders ORDER BY datetime(created_at) DESC LIMIT 6").all<Record<string, any>>(),
    db
      .prepare(
        `SELECT date(created_at, '+5 hours', '+30 minutes') AS day,
                COUNT(*) AS orders,
                COALESCE(SUM(CASE WHEN status != 'cancelled' THEN total ELSE 0 END), 0) AS sales
         FROM orders
         WHERE datetime(created_at) >= datetime('now', '-7 days')
         GROUP BY day ORDER BY day ASC`,
      )
      .all<Record<string, any>>(),
  ]);

  const recent: Order[] = [];
  for (const row of recentRows.results ?? []) {
    const items = await db
      .prepare("SELECT * FROM order_items WHERE order_id = ? ORDER BY id")
      .bind(row.id)
      .all<Record<string, any>>();
    recent.push(mapOrder(row, items.results ?? []));
  }

  const totalOrders = Number(totals?.total_orders ?? 0);
  const sales = Number(totals?.sales ?? 0);
  const stats: AdminStats = {
    totalOrders,
    newOrders: Number(totals?.pending ?? 0),
    pendingOrders: Number(totals?.pending ?? 0),
    activeOrders: Number(totals?.active ?? 0),
    completedOrders: Number(totals?.completed ?? 0),
    cancelledOrders: Number(totals?.cancelled ?? 0),
    totalSales: sales,
    todayOrders: Number(today?.orders ?? 0),
    todaySales: Number(today?.sales ?? 0),
    avgOrderValue: totalOrders ? Math.round(sales / totalOrders) : 0,
    popular: (popular.results ?? []).map((p: any) => ({
      name: p.name,
      qty: Number(p.qty),
      revenue: Number(p.revenue),
    })),
    recent,
    daily: (dailyRows.results ?? []).map((d: any) => ({
      day: d.day,
      orders: Number(d.orders),
      sales: Number(d.sales),
    })),
  };
  return c.json(stats);
});

/* ----------------------------------------------------------------- orders */

adminRoutes.get("/orders", async (c) => {
  const db = c.env.DB;
  const status = c.req.query("status") ?? "";
  const q = (c.req.query("q") ?? "").trim();
  const limit = Math.min(Number(c.req.query("limit") ?? 60) || 60, 200);

  const where: string[] = [];
  const params: (string | number)[] = [];
  if (status && status !== "all") {
    where.push("status = ?");
    params.push(status);
  }
  if (q) {
    where.push("(code LIKE ? OR customer_name LIKE ? OR phone LIKE ?)");
    params.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const sql = `SELECT * FROM orders ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY datetime(created_at) DESC LIMIT ${limit}`;
  const rows = await db.prepare(sql).bind(...params).all<Record<string, any>>();
  const list = rows.results ?? [];
  if (!list.length) return c.json({ orders: [] });

  const placeholders = list.map(() => "?").join(",");
  const itemRows = await db
    .prepare(`SELECT * FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`)
    .bind(...list.map((o) => o.id))
    .all<Record<string, any>>();
  const grouped = new Map<number, Record<string, any>[]>();
  for (const item of itemRows.results ?? []) {
    const arr = grouped.get(item.order_id) ?? [];
    arr.push(item);
    grouped.set(item.order_id, arr);
  }
  return c.json({ orders: list.map((o) => mapOrder(o, grouped.get(o.id) ?? [])) });
});

adminRoutes.get("/orders/:id", async (c) => {
  const order = await loadOrder(c.env.DB, "id", Number(c.req.param("id")));
  if (!order) return c.json({ error: "Order not found" }, 404);
  return c.json({ order });
});

const statusSchema = z.enum([
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
  "cancelled",
]);

adminRoutes.patch("/orders/:id", async (c) => {
  const parsed = z.object({ status: statusSchema }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid status." }, 400);
  const status = parsed.data.status as OrderStatus;
  const result = await c.env.DB.prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, new Date().toISOString(), Number(c.req.param("id")))
    .run();
  if (!result.meta.changes) return c.json({ error: "Order not found" }, 404);
  return c.json({ ok: true, status });
});

/* ------------------------------------------------------------------- menu */

adminRoutes.get("/menu", async (c) => {
  const menu = await loadMenu(c.env.DB);
  return c.json({ categories: menu });
});

const variantSchema = z.object({
  label: z.string().trim().min(1).max(40),
  price: z.number().min(0).max(100000),
});

const productSchema = z.object({
  name: z.string().trim().min(2).max(90),
  categoryId: z.number().int().positive(),
  description: z.string().trim().max(400).default(""),
  image: z.string().trim().max(600).default(""),
  portion: z.string().trim().max(60).default(""),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
  bestseller: z.boolean().default(false),
  variants: z.array(variantSchema).min(1, "Add at least one price"),
});

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);
}

adminRoutes.post("/products", async (c) => {
  const parsed = productSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid product" }, 400);
  const input = parsed.data;
  const db = c.env.DB;

  const category = await db.prepare("SELECT id FROM categories WHERE id = ?").bind(input.categoryId).first();
  if (!category) return c.json({ error: "Choose a valid category." }, 400);

  const base = slugify(input.name);
  let slug = base;
  for (let attempt = 2; attempt < 40; attempt++) {
    const exists = await db.prepare("SELECT 1 FROM products WHERE slug = ?").bind(slug).first();
    if (!exists) break;
    slug = `${base}-${attempt}`;
  }
  const sortRow = await db
    .prepare("SELECT COALESCE(MAX(sort), 0) AS s FROM products WHERE category_id = ?")
    .bind(input.categoryId)
    .first<{ s: number }>();

  const result = await db
    .prepare(
      `INSERT INTO products (category_id, slug, name, description, image, portion, tags, available, featured, bestseller, sort)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      input.categoryId,
      slug,
      input.name,
      input.description,
      input.image,
      input.portion,
      [input.featured ? "featured" : "", input.bestseller ? "bestseller" : ""].filter(Boolean).join(","),
      input.available ? 1 : 0,
      input.featured ? 1 : 0,
      input.bestseller ? 1 : 0,
      Number(sortRow?.s ?? 0) + 1,
    )
    .run();

  const id = Number(result.meta.last_row_id);
  await db.batch(
    input.variants.map((v, i) =>
      db.prepare("INSERT INTO variants (product_id, label, price, sort) VALUES (?, ?, ?, ?)").bind(id, v.label, v.price, i),
    ),
  );
  return c.json({ ok: true, id, slug }, 201);
});

adminRoutes.patch("/products/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const parsed = productSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid product" }, 400);
  const input = parsed.data;
  const db = c.env.DB;

  const current = await db.prepare("SELECT * FROM products WHERE id = ?").bind(id).first<Record<string, any>>();
  if (!current) return c.json({ error: "Product not found" }, 404);

  const tags = [input.featured ? "featured" : "", input.bestseller ? "bestseller" : ""].filter(Boolean).join(",");

  await db
    .prepare(
      `UPDATE products SET name = ?, category_id = ?, description = ?, image = ?, portion = ?, available = ?, featured = ?, bestseller = ?, tags = ?
       WHERE id = ?`,
    )
    .bind(
      input.name ?? current.name,
      input.categoryId ?? current.category_id,
      input.description ?? current.description,
      input.image ?? current.image,
      input.portion ?? current.portion,
      input.available === undefined ? current.available : input.available ? 1 : 0,
      input.featured === undefined ? current.featured : input.featured ? 1 : 0,
      input.bestseller === undefined ? current.bestseller : input.bestseller ? 1 : 0,
      input.featured === undefined && input.bestseller === undefined ? current.tags : tags,
      id,
    )
    .run();

  if (input.variants && input.variants.length) {
    await db.batch([
      db.prepare("DELETE FROM variants WHERE product_id = ?").bind(id),
      ...input.variants.map((v, i) =>
        db.prepare("INSERT INTO variants (product_id, label, price, sort) VALUES (?, ?, ?, ?)").bind(id, v.label, v.price, i),
      ),
    ]);
  }
  return c.json({ ok: true });
});

adminRoutes.delete("/products/:id", async (c) => {
  const id = Number(c.req.param("id"));
  await c.env.DB.prepare("DELETE FROM products WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

/* ------------------------------------------------------------- categories */

const categorySchema = z.object({
  name: z.string().trim().min(2).max(60),
  tagline: z.string().trim().max(120).default(""),
  tint: z.string().trim().max(20).default("#d9a05b"),
  image: z.string().trim().max(600).default(""),
});

adminRoutes.post("/categories", async (c) => {
  const parsed = categorySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Enter a category name." }, 400);
  const slug = slugify(parsed.data.name);
  const row = await c.env.DB.prepare("SELECT COALESCE(MAX(sort), 0) AS s FROM categories").first<{ s: number }>();
  const result = await c.env.DB.prepare(
    "INSERT INTO categories (slug, name, tagline, tint, image, sort) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(slug, parsed.data.name, parsed.data.tagline, parsed.data.tint, parsed.data.image, Number(row?.s ?? 0) + 1)
    .run();
  return c.json({ ok: true, id: Number(result.meta.last_row_id), slug }, 201);
});

adminRoutes.patch("/categories/:id", async (c) => {
  const parsed = categorySchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid category" }, 400);
  const id = Number(c.req.param("id"));
  const current = await c.env.DB.prepare("SELECT * FROM categories WHERE id = ?").bind(id).first<Record<string, any>>();
  if (!current) return c.json({ error: "Category not found" }, 404);
  await c.env.DB.prepare("UPDATE categories SET name = ?, tagline = ?, tint = ?, image = ? WHERE id = ?")
    .bind(
      parsed.data.name ?? current.name,
      parsed.data.tagline ?? current.tagline,
      parsed.data.tint ?? current.tint,
      parsed.data.image ?? current.image,
      id,
    )
    .run();
  return c.json({ ok: true });
});

adminRoutes.delete("/categories/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const count = await c.env.DB.prepare("SELECT COUNT(*) AS n FROM products WHERE category_id = ?")
    .bind(id)
    .first<{ n: number }>();
  if (Number(count?.n ?? 0) > 0) {
    return c.json({ error: "Move or delete the items in this category first." }, 400);
  }
  await c.env.DB.prepare("DELETE FROM categories WHERE id = ?").bind(id).run();
  return c.json({ ok: true });
});

/* ----------------------------------------------------------------- offers */

const offerSchema = z.object({
  title: z.string().trim().min(2).max(90),
  description: z.string().trim().max(300).default(""),
  code: z.string().trim().max(30).default(""),
  discountType: z.enum(["percent", "flat"]).default("percent"),
  discountValue: z.number().min(0).max(100000).default(0),
  minOrder: z.number().min(0).max(100000).default(0),
  image: z.string().trim().max(600).default(""),
  badge: z.string().trim().max(40).default(""),
  active: z.boolean().default(true),
});

adminRoutes.get("/offers", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM offers ORDER BY id DESC").all<Record<string, any>>();
  return c.json({ offers: rows.results ?? [] });
});

adminRoutes.post("/offers", async (c) => {
  const parsed = offerSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Enter an offer title." }, 400);
  const o = parsed.data;
  const result = await c.env.DB.prepare(
    `INSERT INTO offers (title, description, code, discount_type, discount_value, min_order, image, badge, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(o.title, o.description, o.code.toUpperCase(), o.discountType, o.discountValue, o.minOrder, o.image, o.badge, o.active ? 1 : 0)
    .run();
  return c.json({ ok: true, id: Number(result.meta.last_row_id) }, 201);
});

adminRoutes.patch("/offers/:id", async (c) => {
  const parsed = offerSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid offer" }, 400);
  const id = Number(c.req.param("id"));
  const current = await c.env.DB.prepare("SELECT * FROM offers WHERE id = ?").bind(id).first<Record<string, any>>();
  if (!current) return c.json({ error: "Offer not found" }, 404);
  const o = parsed.data;
  await c.env.DB.prepare(
    `UPDATE offers SET title = ?, description = ?, code = ?, discount_type = ?, discount_value = ?, min_order = ?, image = ?, badge = ?, active = ? WHERE id = ?`,
  )
    .bind(
      o.title ?? current.title,
      o.description ?? current.description,
      (o.code ?? current.code).toUpperCase(),
      o.discountType ?? current.discount_type,
      o.discountValue ?? current.discount_value,
      o.minOrder ?? current.min_order,
      o.image ?? current.image,
      o.badge ?? current.badge,
      o.active === undefined ? current.active : o.active ? 1 : 0,
      id,
    )
    .run();
  return c.json({ ok: true });
});

adminRoutes.delete("/offers/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM offers WHERE id = ?").bind(Number(c.req.param("id"))).run();
  return c.json({ ok: true });
});

/* ----------------------------------------------------------------- events */

const eventSchema = z.object({
  title: z.string().trim().min(2).max(90),
  description: z.string().trim().max(400).default(""),
  date: z.string().trim().max(60).default(""),
  time: z.string().trim().max(60).default(""),
  image: z.string().trim().max(600).default(""),
  active: z.boolean().default(true),
});

adminRoutes.get("/events", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM events ORDER BY id DESC").all<Record<string, any>>();
  return c.json({ events: rows.results ?? [] });
});

adminRoutes.post("/events", async (c) => {
  const parsed = eventSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Enter an event title." }, 400);
  const e = parsed.data;
  await c.env.DB.prepare("INSERT INTO events (title, description, date, time, image, active) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(e.title, e.description, e.date, e.time, e.image, e.active ? 1 : 0)
    .run();
  return c.json({ ok: true }, 201);
});

adminRoutes.patch("/events/:id", async (c) => {
  const parsed = eventSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid event" }, 400);
  const id = Number(c.req.param("id"));
  const current = await c.env.DB.prepare("SELECT * FROM events WHERE id = ?").bind(id).first<Record<string, any>>();
  if (!current) return c.json({ error: "Event not found" }, 404);
  const e = parsed.data;
  await c.env.DB.prepare("UPDATE events SET title = ?, description = ?, date = ?, time = ?, image = ?, active = ? WHERE id = ?")
    .bind(
      e.title ?? current.title,
      e.description ?? current.description,
      e.date ?? current.date,
      e.time ?? current.time,
      e.image ?? current.image,
      e.active === undefined ? current.active : e.active ? 1 : 0,
      id,
    )
    .run();
  return c.json({ ok: true });
});

adminRoutes.delete("/events/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM events WHERE id = ?").bind(Number(c.req.param("id"))).run();
  return c.json({ ok: true });
});

/* ---------------------------------------------------------------- gallery */

adminRoutes.get("/gallery", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM gallery ORDER BY sort, id").all<Record<string, any>>();
  return c.json({ gallery: rows.results ?? [] });
});

adminRoutes.post("/gallery", async (c) => {
  const parsed = z
    .object({ image: z.string().trim().min(4).max(600), caption: z.string().trim().max(80).default("") })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Add an image first." }, 400);
  const row = await c.env.DB.prepare("SELECT COALESCE(MAX(sort), 0) AS s FROM gallery").first<{ s: number }>();
  await c.env.DB.prepare("INSERT INTO gallery (image, caption, sort) VALUES (?, ?, ?)")
    .bind(parsed.data.image, parsed.data.caption, Number(row?.s ?? 0) + 1)
    .run();
  return c.json({ ok: true }, 201);
});

adminRoutes.delete("/gallery/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM gallery WHERE id = ?").bind(Number(c.req.param("id"))).run();
  return c.json({ ok: true });
});

/* ---------------------------------------------------------------- reviews */

adminRoutes.get("/reviews", async (c) => {
  const rows = await c.env.DB.prepare("SELECT * FROM reviews ORDER BY approved ASC, id DESC").all<Record<string, any>>();
  return c.json({ reviews: rows.results ?? [] });
});

adminRoutes.patch("/reviews/:id", async (c) => {
  const parsed = z.object({ approved: z.boolean() }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Invalid review update." }, 400);
  await c.env.DB.prepare("UPDATE reviews SET approved = ? WHERE id = ?")
    .bind(parsed.data.approved ? 1 : 0, Number(c.req.param("id")))
    .run();
  return c.json({ ok: true });
});

adminRoutes.delete("/reviews/:id", async (c) => {
  await c.env.DB.prepare("DELETE FROM reviews WHERE id = ?").bind(Number(c.req.param("id"))).run();
  return c.json({ ok: true });
});

/* --------------------------------------------------------------- settings */

adminRoutes.get("/settings", async (c) => c.json({ settings: await getSettings(c.env) }));

const settingsSchema = z.object({
  cafeName: z.string().trim().min(2).max(60).optional(),
  tagline: z.string().trim().max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  whatsapp: z.string().trim().max(30).optional(),
  email: z.string().trim().max(120).optional(),
  address: z.string().trim().max(200).optional(),
  mapUrl: z.string().trim().max(400).optional(),
  mapEmbedUrl: z.string().trim().max(600).optional(),
  instagram: z.string().trim().max(300).optional(),
  facebook: z.string().trim().max(300).optional(),
  cafeLat: z.number().min(-90).max(90).optional(),
  cafeLng: z.number().min(-180).max(180).optional(),
  freeRadiusKm: z.number().min(0.5).max(20).optional(),
  maxRadiusKm: z.number().min(0.5).max(30).optional(),
  outsideFee: z.number().min(0).max(1000).optional(),
  outsideDeliveryAllowed: z.boolean().optional(),
  deliveryEnabled: z.boolean().optional(),
  minOrderValue: z.number().min(0).max(10000).optional(),
  prepTime: z.string().trim().max(40).optional(),
  announcement: z.string().trim().max(200).optional(),
  heroHeadline: z.string().trim().max(90).optional(),
  heroSubline: z.string().trim().max(280).optional(),
  onlinePaymentEnabled: z.boolean().optional(),
  hours: z
    .array(
      z.object({
        day: z.string().max(20),
        open: z.string().max(10),
        close: z.string().max(10),
        closed: z.boolean().optional(),
      }),
    )
    .optional(),
});

adminRoutes.patch("/settings", async (c) => {
  const parsed = settingsSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid settings" }, 400);
  const patch = parsed.data as Partial<Settings>;
  const current = await getSettings(c.env);
  const next = { ...current, ...patch };
  if (next.freeRadiusKm > next.maxRadiusKm) {
    return c.json({ error: "Free delivery radius cannot be larger than the maximum delivery radius." }, 400);
  }
  const saved = await saveSettings(c.env, next);
  return c.json({ settings: saved });
});

/* ---------------------------------------------------------------- uploads */

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

adminRoutes.post("/upload", async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return c.json({ error: "Choose an image to upload." }, 400);
  if (!ALLOWED_MIME.includes(file.type)) return c.json({ error: "Use a JPG, PNG, WebP or GIF image." }, 400);
  if (file.size > 700_000) return c.json({ error: "Image is too large. Keep it under 700 KB." }, 400);

  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  const id = crypto.randomUUID().replace(/-/g, "");
  await c.env.DB.prepare("INSERT INTO assets (id, mime, data, created_at) VALUES (?, ?, ?, ?)")
    .bind(id, file.type, btoa(binary), new Date().toISOString())
    .run();
  return c.json({ ok: true, url: `/api/assets/${id}` }, 201);
});

/* ---------------------------------------------------------------- account */

adminRoutes.post("/password", async (c) => {
  const parsed = z
    .object({ currentPassword: z.string().min(4), newPassword: z.string().min(8).max(200) })
    .safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "New password must be at least 8 characters." }, 400);
  const admin = c.get("admin");
  const row = await c.env.DB.prepare("SELECT * FROM admin_users WHERE id = ?").bind(admin.id).first<Record<string, any>>();
  if (!row || !(await verifyPassword(parsed.data.currentPassword, row.password_hash))) {
    return c.json({ error: "Current password is incorrect." }, 400);
  }
  const { hashPassword } = await import("./auth");
  await c.env.DB.prepare("UPDATE admin_users SET password_hash = ? WHERE id = ?")
    .bind(await hashPassword(parsed.data.newPassword), admin.id)
    .run();
  return c.json({ ok: true });
});

adminRoutes.get("/session", (c) => {
  const token = getCookie(c, COOKIE_NAME);
  return c.json({ signedIn: Boolean(token) });
});
