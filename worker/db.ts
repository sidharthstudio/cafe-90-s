import { MENU, IMAGES, type CategorySeed, type ProductSeed } from "../shared/menu";
import type { Settings } from "../shared/types";
import { hashPassword } from "./auth";

export type Env = {
  DB: D1Database;
  ASSETS: Fetcher;
  SESSION_SECRET?: string;
  ADMIN_EMAIL?: string;
  ADMIN_PASSWORD?: string;
  ADMIN_NAME?: string;
  ORDER_WEBHOOK_URL?: string;
  ONLINE_PAYMENT_PROVIDER?: string;
};

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS admin_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'owner',
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  tagline TEXT NOT NULL DEFAULT '',
  tint TEXT NOT NULL DEFAULT '#d9a05b',
  image TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  portion TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  available INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  bestseller INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS variants (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  price REAL NOT NULL,
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  house TEXT NOT NULL DEFAULT '',
  area TEXT NOT NULL DEFAULT '',
  landmark TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  lat REAL,
  lng REAL,
  distance_km REAL,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  delivery_fee REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  payment_method TEXT NOT NULL DEFAULT 'cod',
  payment_status TEXT NOT NULL DEFAULT 'pending',
  coupon_code TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER,
  name TEXT NOT NULL,
  variant_label TEXT NOT NULL DEFAULT '',
  unit_price REAL NOT NULL DEFAULT 0,
  qty INTEGER NOT NULL DEFAULT 1,
  notes TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS offers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  code TEXT NOT NULL DEFAULT '',
  discount_type TEXT NOT NULL DEFAULT 'percent',
  discount_value REAL NOT NULL DEFAULT 0,
  min_order REAL NOT NULL DEFAULT 0,
  image TEXT NOT NULL DEFAULT '',
  badge TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  date TEXT NOT NULL DEFAULT '',
  time TEXT NOT NULL DEFAULT '',
  image TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  rating INTEGER NOT NULL DEFAULT 5,
  text TEXT NOT NULL,
  approved INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS gallery (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  image TEXT NOT NULL,
  caption TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  mime TEXT NOT NULL,
  data TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_variants_product ON variants(product_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON order_items(order_id);
`;

export const DEFAULT_SETTINGS: Settings = {
  cafeName: "Café 90's",
  tagline: "Vibe with Taste",
  phone: "+91 89214 75744",
  whatsapp: "918921475744",
  email: "hello@cafe90s.in",
  address: "Café 90's, Ooramvila, Chathannoor, Kollam district, Kerala 691572",
  mapUrl: "https://maps.app.goo.gl/WYaHtAS6byBRfxGG8",
  mapEmbedUrl: "https://www.google.com/maps?q=8.8593821,76.7227549&z=16&output=embed",
  instagram: "https://www.instagram.com/cafe_90s_ctnr",
  facebook: "",
  hours: [
    { day: "Monday", open: "09:00", close: "01:00" },
    { day: "Tuesday", open: "09:00", close: "01:00" },
    { day: "Wednesday", open: "09:00", close: "01:00" },
    { day: "Thursday", open: "09:00", close: "01:00" },
    { day: "Friday", open: "09:00", close: "01:00" },
    { day: "Saturday", open: "09:00", close: "01:00" },
    { day: "Sunday", open: "09:00", close: "01:00" },
  ],
  cafeLat: 8.8593821,
  cafeLng: 76.7227549,
  freeRadiusKm: 3.5,
  maxRadiusKm: 8,
  outsideFee: 0,
  outsideDeliveryAllowed: false,
  deliveryEnabled: true,
  minOrderValue: 0,
  prepTime: "25–35 min",
  announcement: "Free delivery within 3.5 km of the cafe. Fresh off the grill, every order.",
  heroHeadline: "Nineties flavour. Served fresh.",
  heroSubline:
    "Shawarma off the spit, falooda in layers, 24 kinds of mojito — the cafe Chathannoor keeps coming back to, now delivered to your door.",
  onlinePaymentEnabled: false,
};

// No demo promotions are seeded — offers (and their coupon codes) are created by the owner
// from the dashboard, so nothing fake is ever redeemable at checkout.
const SEED_OFFERS: {
  title: string;
  description: string;
  code: string;
  discount_type: string;
  discount_value: number;
  min_order: number;
  image: string;
  badge: string;
  active: number;
}[] = [];

const SEED_EVENTS = [
  {
    title: "90's Rewind Nights",
    description: "Every Friday the speakers go retro — Tamil and Malayalam 90's hits till closing.",
    date: "Every Friday",
    time: "7:00 PM – 11:00 PM",
    image: IMAGES.cafe1,
    active: 1,
  },
  {
    title: "Shake & Chill Sundays",
    description: "Any two special milkshakes for the price of one, all day Sunday.",
    date: "Every Sunday",
    time: "9:00 AM – 1:00 AM",
    image: IMAGES.shake1,
    active: 1,
  },
];

const SEED_GALLERY = [
  { image: IMAGES.shawarma1, caption: "Shawarma off the spit" },
  { image: IMAGES.falooda1, caption: "Falooda, five layers deep" },
  { image: IMAGES.fries2, caption: "Hot from the fryer" },
  { image: IMAGES.burger1, caption: "Double patty, double cheese" },
  { image: IMAGES.mojito1, caption: "Mint, lime, ice" },
  { image: IMAGES.wings2, caption: "Wings, five to a plate" },
];

function sqlString(value: string | undefined | null): string {
  return `'${String(value ?? "").replace(/'/g, "''")}'`;
}

function productRow(c: CategorySeed, p: ProductSeed, categoryId: number, index: number) {
  return {
    categoryId,
    slug: p.slug,
    name: p.name,
    description: p.description ?? "",
    image: p.image,
    portion: p.portion ?? "",
    tags: (p.tags ?? []).join(","),
    sort: index,
  };
}

async function seed(db: D1Database, env: Env) {
  const statements: D1PreparedStatement[] = [];
  let productId = 0;

  MENU.forEach((category, ci) => {
    const categoryId = ci + 1;
    statements.push(
      db
        .prepare(
          "INSERT OR IGNORE INTO categories (id, slug, name, tagline, tint, image, sort) VALUES (?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(categoryId, category.slug, category.name, category.tagline, category.tint, IMAGES[category.image], ci),
    );
    category.products.forEach((p, pi) => {
      productId += 1;
      const row = productRow(category, p, categoryId, pi);
      statements.push(
        db
          .prepare(
            "INSERT OR IGNORE INTO products (id, category_id, slug, name, description, image, portion, tags, available, featured, bestseller, sort) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)",
          )
          .bind(
            productId,
            row.categoryId,
            row.slug,
            row.name,
            row.description,
            IMAGES[p.image],
            row.portion,
            row.tags,
            (p.tags ?? []).includes("featured") ? 1 : 0,
            (p.tags ?? []).includes("bestseller") ? 1 : 0,
            row.sort,
          ),
      );
      p.variants.forEach((v, vi) => {
        statements.push(
          db
            .prepare("INSERT INTO variants (product_id, label, price, sort) VALUES (?, ?, ?, ?)")
            .bind(productId, v.label, v.price, vi),
        );
      });
    });
  });

  for (const o of SEED_OFFERS) {
    statements.push(
      db
        .prepare(
          "INSERT INTO offers (title, description, code, discount_type, discount_value, min_order, image, badge, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        )
        .bind(o.title, o.description, o.code, o.discount_type, o.discount_value, o.min_order, o.image, o.badge, o.active),
    );
  }
  for (const e of SEED_EVENTS) {
    statements.push(
      db
        .prepare("INSERT INTO events (title, description, date, time, image, active) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(e.title, e.description, e.date, e.time, e.image, e.active),
    );
  }
  SEED_GALLERY.forEach((g, i) => {
    statements.push(
      db.prepare("INSERT INTO gallery (image, caption, sort) VALUES (?, ?, ?)").bind(g.image, g.caption, i),
    );
  });

  const password = env.ADMIN_PASSWORD?.trim() || "Cafe90s@2026";
  const email = (env.ADMIN_EMAIL?.trim() || "admin@cafe90s.in").toLowerCase();
  const name = env.ADMIN_NAME?.trim() || "Owner";
  statements.push(
    db
      .prepare(
        "INSERT OR IGNORE INTO admin_users (email, name, password_hash, role, created_at) VALUES (?, ?, ?, 'owner', ?)",
      )
      .bind(email, name, await hashPassword(password), new Date().toISOString()),
  );

  // D1 batch keeps each chunk transactional; chunked to stay well inside limits.
  for (let i = 0; i < statements.length; i += 40) {
    await db.batch(statements.slice(i, i + 40));
  }
  await saveSettings(env, DEFAULT_SETTINGS);
}

let initPromise: Promise<void> | null = null;

export async function ensureDb(env: Env): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      await env.DB.exec(SCHEMA.replace(/\n/g, " "));
      const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM products").first<{ n: number }>();
      if (!row || Number(row.n) === 0) await seed(env.DB, env);
      const settingsRow = await env.DB.prepare("SELECT value FROM settings WHERE key = 'business'").first<{
        value: string;
      }>();
      if (!settingsRow) await saveSettings(env, DEFAULT_SETTINGS);
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  return initPromise;
}

export async function getSettings(env: Env): Promise<Settings> {
  const row = await env.DB.prepare("SELECT value FROM settings WHERE key = 'business'").first<{ value: string }>();
  if (!row) return DEFAULT_SETTINGS;
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value) as Partial<Settings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(env: Env, patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings(env);
  const next = { ...current, ...patch };
  await env.DB.prepare(
    "INSERT INTO settings (key, value) VALUES ('business', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
  )
    .bind(JSON.stringify(next))
    .run();
  return next;
}

/** Kept for tooling / tests that want a raw SQL view of the seed. */
export function seedSummary() {
  return MENU.map((c) => ({
    category: c.name,
    items: c.products.length,
    sample: c.products[0] ? `${c.products[0].name} — ${sqlString(String(c.products[0].variants[0]?.price))}` : "",
  }));
}
