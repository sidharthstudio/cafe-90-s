import { env } from "cloudflare:workers";
import {
  defaults,
  distance,
  seed,
  statuses,
  type Product,
} from "../../../lib/cafe";
export const dynamic = "force-dynamic";
type Config = typeof defaults;
const runtime = env as typeof env & {
  ADMIN_EMAIL?: string;
  RAZORPAY_KEY_ID?: string;
  RAZORPAY_KEY_SECRET?: string;
};
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "cache-control": "no-store" } });
function check(ok: unknown, msg: string): asserts ok {
  if (!ok) throw new Error(msg);
}
function str(s: unknown, n = 500) {
  return typeof s === "string" && s.length <= n;
}
function url(s: unknown) {
  return (
    str(s, 1000) &&
    (/^https:\/\//.test(s as string) ||
      /^\/(img|api\/photo)\/[\w.-]+$/.test(s as string))
  );
}
function coord(a: unknown, b: unknown) {
  return (
    typeof a === "number" &&
    Number.isFinite(a) &&
    Math.abs(a) <= 90 &&
    typeof b === "number" &&
    Number.isFinite(b) &&
    Math.abs(b) <= 180
  );
}
function quote(s: Config, a: number, b: number) {
  check(
    s.delivery && s.lat !== null && s.lng !== null,
    "Delivery is paused. Please call the café.",
  );
  check(coord(a, b), "Choose your delivery location.");
  const km = distance(s.lat, s.lng, a, b);
  check(
    km <= s.radius || s.fee !== null,
    "This location is outside our delivery zone.",
  );
  return { km, fee: km <= s.radius ? 0 : s.fee! };
}
async function gateway(path: string, options: RequestInit = {}) {
  const r = await fetch("https://api.razorpay.com/v1/" + path, {
    ...options,
    headers: {
      Authorization:
        "Basic " +
        btoa(runtime.RAZORPAY_KEY_ID + ":" + runtime.RAZORPAY_KEY_SECRET),
      "Content-Type": "application/json",
    },
  });
  check(r.ok, "Payment service unavailable. Please try again.");
  return (await r.json()) as any;
}
async function handle(r: Request) {
  const path = new URL(r.url).pathname.slice(5),
    db = env.DB!;
  const signed = r.headers.get("oai-authenticated-user-id");
  const admin = Boolean(
    signed &&
    runtime.ADMIN_EMAIL &&
    r.headers.get("oai-authenticated-user-email")?.toLowerCase() ===
      runtime.ADMIN_EMAIL.trim().toLowerCase(),
  );
  if (path.startsWith("admin/") && !admin)
    return json(
      {
        error: signed
          ? "Owner access requires the configured ADMIN_EMAIL."
          : "Sign in with the café owner account.",
      },
      403,
    );
  if (r.method === "POST" && r.headers.get("origin") !== new URL(r.url).origin)
    return json({ error: "Request origin unavailable." }, 403);
  if (path.startsWith("photo/")) {
    const f = await env.BUCKET!.get(path.slice(6));
    return f
      ? new Response(f.body, {
          headers: {
            "Content-Type": f.httpMetadata?.contentType || "image/webp",
            "X-Content-Type-Options": "nosniff",
          },
        })
      : new Response(null, { status: 404 });
  }
  if (path === "admin/photo" && r.method === "POST") {
    const blob = await r.blob();
    check(
      blob.size <= 4e6 &&
        ["image/jpeg", "image/webp", "image/png"].includes(blob.type),
      "Choose a JPG, PNG or WebP under 4 MB.",
    );
    const id = crypto.randomUUID();
    await env.BUCKET!.put(id, await blob.arrayBuffer(), {
      httpMetadata: { contentType: blob.type },
    });
    return json({ url: "/api/photo/" + id });
  }
  const setting = await db
    .prepare("SELECT data FROM settings WHERE id='business'")
    .first<{ data: string }>();
  const s: Config = { ...defaults, ...JSON.parse(setting?.data || "{}") };
  async function menu() {
    const rows = await db
      .prepare("SELECT id,data FROM products")
      .all<{ id: string; data: string }>();
    const map = new Map(seed.map((p) => [p.id, p as Product]));
    for (const x of rows.results) {
      const p = JSON.parse(x.data);
      if (p === null) map.delete(x.id);
      else map.set(x.id, p);
    }
    return [...map.values()];
  }
  const online = Boolean(
    runtime.RAZORPAY_KEY_ID && runtime.RAZORPAY_KEY_SECRET,
  );
  if (path === "catalog") {
    const popular = await db
      .prepare(
        "SELECT product, SUM(qty) AS sold FROM order_items JOIN orders ON order_items.order_id=orders.id WHERE status='Delivered' GROUP BY product ORDER BY sold DESC LIMIT 4",
      )
      .all<{ product: string }>();
    return json({
      menu: await menu(),
      settings: s,
      online,
      popular: popular.results.map((x) => x.product),
    });
  }
  if (path === "admin/orders") {
    if (online) {
      const unpaid = await db
        .prepare(
          "SELECT id,gateway,subtotal,fee FROM orders WHERE status='Awaiting payment' AND gateway IS NOT NULL AND created>? ORDER BY created DESC LIMIT 50",
        )
        .bind(Date.now() - 7 * 86400000)
        .all<any>();
      await Promise.allSettled(
        unpaid.results.map(async (o) => {
          const link = await gateway(
            "payment_links/" + encodeURIComponent(o.gateway),
          );
          if (
            link.status === "paid" &&
            link.amount_paid === (o.subtotal + o.fee) * 100 &&
            link.reference_id === o.id
          )
            await db
              .prepare(
                "UPDATE orders SET status='Pending' WHERE id=? AND status='Awaiting payment'",
              )
              .bind(o.id)
              .run();
        }),
      );
    }
    const os = await db
      .prepare(
        "SELECT * FROM orders WHERE status!='Awaiting payment' ORDER BY created DESC",
      )
      .all<any>();
    const ls = await db
      .prepare("SELECT * FROM order_items ORDER BY id")
      .all<any>();
    return json(
      os.results.map((o) => ({
        ...o,
        customer: JSON.parse(o.customer),
        items: ls.results.filter((i) => i.order_id === o.id),
      })),
    );
  }
  if (path.startsWith("track/")) {
    const id = path.slice(6);
    let o = await db
      .prepare(
        "SELECT id,status,subtotal,fee,payment,gateway FROM orders WHERE id=?",
      )
      .bind(id)
      .first<any>();
    if (!o) return json({ error: "Order not found." }, 404);
    if (o.status === "Awaiting payment" && o.gateway) {
      const link = await gateway(
        "payment_links/" + encodeURIComponent(o.gateway),
      );
      if (
        link.status === "paid" &&
        link.amount_paid === (o.subtotal + o.fee) * 100 &&
        link.reference_id === id
      ) {
        await db
          .prepare(
            "UPDATE orders SET status='Pending' WHERE id=? AND status='Awaiting payment'",
          )
          .bind(id)
          .run();
        o.status = "Pending";
      }
    }
    return json({
      id,
      status: o.status,
      total: o.subtotal + o.fee,
      payment: o.payment,
    });
  }
  if (r.method !== "POST") return json({ error: "Unknown request." }, 404);
  const v = (await r.json()) as any;
  if (path === "quote") return json(quote(s, v.lat, v.lng));
  if (path === "admin/settings") {
    check(
      str(v.address) &&
        str(v.phone, 18) &&
        /^\+?[\d ()-]{8,18}$/.test(v.phone) &&
        url(v.maps) &&
        url(v.instagram) &&
        [v.hours, v.promo, v.events, v.offers].every((t) => str(t, 2500)),
      "Check the business details.",
    );
    check(
      typeof v.delivery === "boolean" &&
        v.radius >= 3 &&
        v.radius <= 4 &&
        Number.isFinite(v.radius) &&
        (v.fee === null || (Number.isInteger(v.fee) && v.fee >= 0)) &&
        (coord(v.lat, v.lng) ||
          (!v.delivery && v.lat === null && v.lng === null)),
      "Check the café pin, radius and fee.",
    );
    check(
      Array.isArray(v.gallery) &&
        v.gallery.every(url) &&
        Array.isArray(v.categories) &&
        v.categories.every((x: unknown) => str(x, 100)),
      "Invalid gallery or categories.",
    );
    await db
      .prepare("INSERT OR REPLACE INTO settings VALUES ('business',?)")
      .bind(
        JSON.stringify(
          Object.fromEntries(Object.keys(defaults).map((k) => [k, v[k]])),
        ),
      )
      .run();
    return json({ ok: true });
  }
  if (path === "admin/product") {
    check(/^[a-z0-9-]{1,120}$/.test(v.id), "Invalid product ID.");
    if (!v.remove) {
      check(
        str(v.name, 150) &&
          v.name.trim() &&
          str(v.category, 100) &&
          v.category.trim() &&
          url(v.image) &&
          Array.isArray(v.variants) &&
          v.variants.length &&
          v.variants.every(
            (x: any) =>
              str(x.name, 70) &&
              x.name.trim() &&
              Number.isInteger(x.price) &&
              x.price > 0 &&
              x.price < 100000,
          ) &&
          new Set(v.variants.map((x: any) => x.name)).size ===
            v.variants.length,
        "Check the item details and variant prices.",
      );
    }
    await db
      .prepare("INSERT OR REPLACE INTO products VALUES (?,?)")
      .bind(v.id, JSON.stringify(v.remove ? null : v))
      .run();
    return json({ ok: true });
  }
  if (path === "admin/status") {
    check(statuses.includes(v.status), "Unknown status.");
    await db
      .prepare(
        "UPDATE orders SET status=? WHERE id=? AND status!='Awaiting payment'",
      )
      .bind(v.status, v.id)
      .run();
    return json({ ok: true });
  }
  if (path === "order") {
    const c = v.customer;
    check(
      c &&
        ["name", "phone", "building", "address", "area"].every(
          (k) => str(c[k], 400) && c[k].trim(),
        ) &&
        /^\d{10}$/.test(c.phone) &&
        ["landmark", "instructions", "notes"].every((k) => str(c[k], 1000)),
      "Enter your name, 10-digit phone number and complete address.",
    );
    const q = quote(s, c.lat, c.lng);
    check(
      Array.isArray(v.cart) && v.cart.length > 0 && v.cart.length <= 200,
      "Check your cart.",
    );
    const catalog = await menu();
    const items = v.cart.map((l: any) => {
      const p = catalog.find((p) => p.id === l.id);
      const choice = p?.variants.find((x) => x.name === l.variant);
      check(
        p?.available &&
          choice &&
          Number.isInteger(l.qty) &&
          l.qty >= 1 &&
          l.qty <= 99,
        "An item changed. Please review your cart.",
      );
      return { p, choice, qty: l.qty };
    });
    const subtotal = items.reduce(
      (a: number, i: any) => a + i.choice.price * i.qty,
      0,
    );
    check(
      subtotal === v.subtotal && q.fee === v.fee,
      "Prices changed. Refresh and review your order.",
    );
    const id = v.requestId;
    check(/^[0-9a-f-]{36}$/.test(id), "Invalid checkout session.");
    check(
      v.payment === "COD" || (v.payment === "Online" && online),
      "Payment option unavailable.",
    );
    const old = await db
      .prepare("SELECT id,status,gateway FROM orders WHERE id=?")
      .bind(id)
      .first<any>();
    if (old) {
      if (old.status === "Awaiting payment" && old.gateway)
        return json({
          id,
          url: (await gateway("payment_links/" + old.gateway)).short_url,
        });
      check(
        old.status !== "Awaiting payment",
        "Please start a new payment attempt.",
      );
      return json({ id });
    }
    await db.batch([
      db
        .prepare("INSERT INTO orders VALUES (?,?,?,?,?,?,?,NULL)")
        .bind(
          id,
          Date.now(),
          v.payment === "COD" ? "Pending" : "Awaiting payment",
          JSON.stringify(c),
          subtotal,
          q.fee,
          v.payment,
        ),
      ...items.map((i: any) =>
        db
          .prepare(
            "INSERT INTO order_items(order_id,product,name,variant,qty,price) VALUES (?,?,?,?,?,?)",
          )
          .bind(id, i.p.id, i.p.name, i.choice.name, i.qty, i.choice.price),
      ),
    ]);
    if (v.payment === "Online") {
      const link = await gateway("payment_links", {
        method: "POST",
        body: JSON.stringify({
          amount: (subtotal + q.fee) * 100,
          currency: "INR",
          reference_id: id,
          description: "Cafe 90’s order",
          callback_url: new URL("/?track=" + id, r.url).href,
          callback_method: "get",
        }),
      });
      await db
        .prepare("UPDATE orders SET gateway=? WHERE id=?")
        .bind(link.id, id)
        .run();
      return json({ id, url: link.short_url });
    }
    return json({ id });
  }
  return json({ error: "Unknown request." }, 404);
}
async function route(r: Request) {
  try {
    return await handle(r);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Request failed.";
    return json(
      {
        error: /D1_|SQLITE|binding|undefined/i.test(msg)
          ? "The café service is unavailable. Please try again."
          : msg,
      },
      400,
    );
  }
}
export { route as GET, route as POST };
