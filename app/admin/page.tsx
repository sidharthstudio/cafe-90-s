"use client";
import { useEffect, useState } from "react";
import { api } from "../storefront";
import { defaults, statuses, type Product } from "../../lib/cafe";
const empty: Product = {
  id: "",
  name: "",
  category: "",
  image: "/img/burger.webp",
  variants: [{ name: "Regular", price: 0 }],
  featured: false,
  available: true,
  description: "",
  subcategory: "",
};
export default function Admin() {
  const [orders, A] = useState<any[]>([]),
    [s, S] = useState(defaults),
    [menu, M] = useState<Product[]>([]),
    [access, X] = useState(false),
    [note, N] = useState(""),
    [tab, T] = useState("Orders"),
    [query, Q] = useState(""),
    [filter, F] = useState("All"),
    [p, P] = useState<Product>(empty),
    [vars, V] = useState("Regular | 0"),
    [sel, E] = useState("");
  async function sync() {
    try {
      const data = await api("admin/orders");
      A(data);
      X(true);
    } catch (e: any) {
      N(e.message);
      X(false);
    }
  }
  async function catalog() {
    const d = await api("catalog");
    S(d.settings);
    M(d.menu);
  }
  useEffect(() => {
    sync();
    catalog().catch((e) => N(e.message));
    const t = setInterval(sync, 10000);
    return () => clearInterval(t);
  }, []);
  async function act(fn: () => Promise<void>) {
    try {
      await fn();
      N("Saved.");
    } catch (e: any) {
      N(e.message);
    }
  }
  async function upload(file: File) {
    const r = await fetch("/api/admin/photo", { method: "POST", body: file });
    const d: any = await r.json();
    if (!r.ok) throw Error(d.error);
    return d.url;
  }
  function edit(id: string) {
    const x = menu.find((i) => i.id === id) || empty;
    P({ ...x });
    V(x.variants.map((v) => v.name + " | " + v.price).join("\n"));
    E(id);
  }
  const sales = orders.filter((o) => o.status === "Delivered");
  const pop: Record<string, number> = {};
  orders
    .filter((o) => o.status !== "Cancelled")
    .forEach((o) =>
      o.items.forEach((l: any) => {
        pop[l.name] = (pop[l.name] || 0) + l.qty;
      }),
    );
  return (
    <main className="admin">
      <a className="brand" href="/">
        Café 90’s<b>.</b>
      </a>
      <h1>Owner dashboard</h1>
      {!access ? (
        <>
          <p>{note || "Checking owner access…"}</p>
          <a
            className="pill"
            target="_top"
            href="/signin-with-chatgpt?return_to=%2Fadmin"
          >
            Sign in with ChatGPT
          </a>
        </>
      ) : (
        <>
          <div className="chips">
            {["Orders", "Menu", "Business & delivery"].map((t) => (
              <button
                className={t === tab ? "active" : ""}
                key={t}
                onClick={() => {
                  T(t);
                  N("");
                }}
              >
                {t}
              </button>
            ))}
          </div>
          {note && (
            <p className="notice" role="status">
              {note}
            </p>
          )}
          {tab === "Orders" && (
            <>
              <div className="notice">
                Total orders {orders.length} · New / pending{" "}
                {orders.filter((o) => o.status === "Pending").length} ·
                Completed {sales.length} · Delivered sales ₹
                {sales.reduce((a, o) => a + o.fee + o.subtotal, 0)}
              </div>
              <p>
                Popular items ·{" "}
                {Object.entries(pop)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 4)
                  .map(([k, n]) => k + " (" + n + ")")
                  .join(", ") || "No orders yet"}
              </p>
              <div className="filters">
                <input
                  placeholder="Search customer, phone or reference"
                  aria-label="Search orders"
                  value={query}
                  onChange={(e) => Q(e.target.value)}
                />
                <select
                  aria-label="Filter orders"
                  value={filter}
                  onChange={(e) => F(e.target.value)}
                >
                  {["All", ...statuses].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </select>
              </div>
              {!orders.length && (
                <p>New orders will appear here automatically.</p>
              )}
              {orders
                .filter(
                  (o) =>
                    (filter === "All" || o.status === filter) &&
                    (o.id + o.customer.name + o.customer.phone)
                      .toLowerCase()
                      .includes(query.toLowerCase()),
                )
                .map((o) => (
                  <article className="line" key={o.id}>
                    <small>
                      {new Date(o.created).toLocaleString("en-IN", {
                        timeZone: "Asia/Kolkata",
                      })}{" "}
                      · {o.id}
                    </small>
                    <h3>
                      {o.customer.name} · {o.status}
                    </h3>
                    <a href={"tel:" + o.customer.phone}>{o.customer.phone}</a> ·{" "}
                    <a href={"https://wa.me/91" + o.customer.phone}>WhatsApp</a>
                    <p>
                      {[
                        o.customer.building,
                        o.customer.address,
                        o.customer.area,
                        o.customer.landmark,
                        o.customer.instructions,
                        o.customer.notes,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                    <a
                      className="under"
                      href={
                        "https://www.google.com/maps?q=" +
                        o.customer.lat +
                        "," +
                        o.customer.lng
                      }
                    >
                      Delivery pin
                    </a>
                    {o.items.map((l: any) => (
                      <div key={l.id}>
                        {l.qty} × {l.name} ({l.variant}) · ₹{l.qty * l.price}
                      </div>
                    ))}
                    <p>
                      Subtotal ₹{o.subtotal} · Delivery ₹{o.fee} · {o.payment}
                    </p>
                    <label>
                      Order status
                      <select
                        value={o.status}
                        onChange={(e) =>
                          act(async () => {
                            await api("admin/status", {
                              id: o.id,
                              status: e.target.value,
                            });
                            await sync();
                          })
                        }
                      >
                        {statuses.map((x) => (
                          <option key={x}>{x}</option>
                        ))}
                      </select>
                    </label>
                  </article>
                ))}
            </>
          )}
          {tab === "Menu" && (
            <>
              <label>
                Select menu item
                <select value={sel} onChange={(e) => edit(e.target.value)}>
                  <option value="">Add a new item</option>
                  {menu.map((x) => (
                    <option key={x.id} value={x.id}>
                      {x.name}
                    </option>
                  ))}
                </select>
              </label>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  act(async () => {
                    const id = p.id || crypto.randomUUID();
                    await api("admin/product", {
                      ...p,
                      id,
                      variants: vars
                        .split("\n")
                        .filter(Boolean)
                        .map((v) => {
                          const [name, price] = v.split("|");
                          return { name: name.trim(), price: Number(price) };
                        }),
                    });
                    await catalog();
                    E(id);
                    P({ ...p, id });
                  });
                }}
              >
                {(
                  [
                    "name",
                    "category",
                    "subcategory",
                    "description",
                    "image",
                  ] as const
                ).map((k) => (
                  <label key={k}>
                    {k.charAt(0).toUpperCase() + k.slice(1)}
                    <input
                      list={k === "category" ? "categories" : undefined}
                      required={["name", "category", "image"].includes(k)}
                      value={p[k] || ""}
                      onChange={(e) => P({ ...p, [k]: e.target.value })}
                    />
                  </label>
                ))}
                <datalist id="categories">
                  {[
                    ...new Set([
                      ...menu.map((x) => x.category),
                      ...s.categories,
                    ]),
                  ].map((x) => (
                    <option key={x}>{x}</option>
                  ))}
                </datalist>
                <label>
                  Upload item photograph
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f)
                        act(async () => P({ ...p, image: await upload(f) }));
                    }}
                  />
                </label>
                <label>
                  Variants (one name | rupee price per line)
                  <textarea
                    value={vars}
                    onChange={(e) => V(e.target.value)}
                    required
                  />
                </label>
                {(["available", "featured"] as const).map((k) => (
                  <label className="row" key={k}>
                    <input
                      type="checkbox"
                      checked={p[k]}
                      onChange={(e) => P({ ...p, [k]: e.target.checked })}
                    />
                    {k}
                  </label>
                ))}
                <div className="row">
                  <button className="pill">Save item</button>
                  {sel && (
                    <button
                      className="small"
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this menu item?"))
                          act(async () => {
                            await api("admin/product", {
                              id: sel,
                              remove: true,
                            });
                            await catalog();
                            edit("");
                          });
                      }}
                    >
                      Delete item
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
          {tab === "Business & delivery" && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                act(async () => {
                  await api("admin/settings", s);
                  await catalog();
                });
              }}
            >
              <h2>Delivery zone</h2>
              <label className="row">
                <input
                  type="checkbox"
                  checked={s.delivery}
                  onChange={(e) => S({ ...s, delivery: e.target.checked })}
                />
                Accept delivery orders
              </label>
              <button
                className="small"
                type="button"
                onClick={() =>
                  navigator.geolocation?.getCurrentPosition(
                    (pos) =>
                      S({
                        ...s,
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                      }),
                    () =>
                      N(
                        "Location unavailable. Enter the verified café coordinates.",
                      ),
                    { enableHighAccuracy: true },
                  )
                }
              >
                Set pin from my location at the café
              </button>
              <div className="two">
                {(["lat", "lng", "radius", "fee"] as const).map((k, i) => (
                  <label key={k}>
                    {
                      [
                        "Café latitude",
                        "Café longitude",
                        "Free radius (3–4 km)",
                        "Outside-zone fee ₹ (blank to decline)",
                      ][i]
                    }
                    <input
                      type="number"
                      step={k === "fee" ? 1 : "any"}
                      value={s[k] ?? ""}
                      onChange={(e) =>
                        S({
                          ...s,
                          [k]:
                            e.target.value === ""
                              ? null
                              : Number(e.target.value),
                        })
                      }
                    />
                  </label>
                ))}
              </div>
              <h2>Business details</h2>
              {(
                [
                  "address",
                  "phone",
                  "instagram",
                  "maps",
                  "hours",
                  "promo",
                  "offers",
                  "events",
                ] as const
              ).map((k, i) => (
                <label key={k}>
                  {
                    [
                      "Address",
                      "Phone",
                      "Instagram URL",
                      "Google Maps URL",
                      "Opening hours",
                      "Homepage introduction",
                      "Offers and promotions",
                      "Events and announcements",
                    ][i]
                  }
                  <input
                    value={s[k]}
                    onChange={(e) => S({ ...s, [k]: e.target.value })}
                  />
                </label>
              ))}
              <label>
                Menu categories (one per line)
                <textarea
                  value={s.categories.join("\n")}
                  onChange={(e) =>
                    S({ ...s, categories: e.target.value.split("\n") })
                  }
                />
              </label>
              <label>
                Gallery photo URLs (one per line)
                <textarea
                  value={s.gallery.join("\n")}
                  onChange={(e) =>
                    S({ ...s, gallery: e.target.value.split("\n") })
                  }
                />
              </label>
              <label>
                Add gallery photo
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f)
                      act(async () =>
                        S({ ...s, gallery: [...s.gallery, await upload(f)] }),
                      );
                  }}
                />
              </label>
              <button className="pill">Save settings</button>
            </form>
          )}
        </>
      )}
    </main>
  );
}
