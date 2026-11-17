# Café 90's — website, online ordering & owner dashboard

A complete, production-shaped platform for **Café 90's, Ooramvila, Chathannoor, Kollam**: an animated customer
website, a full online ordering flow with delivery-radius checking, and a secure owner dashboard
that edits the live site.

- **Customer site** — 3D animated hero, story, offers, gallery, reviews, events, map, and the
  **complete official menu (174 items / 21 categories)** with sizes and variants, search and filters.
- **Ordering** — persistent cart, checkout with address + geolocation, server-side price and
  delivery-zone validation, coupon codes, order confirmation and live order tracking.
- **Delivery** — Haversine distance from the real cafe coordinates (`8.8593821, 76.7227549`),
  configurable free radius (default **3.5 km**), optional outside-zone fee, hard maximum radius.
- **Admin dashboard** — order queue with status updates and customer contact, full menu & price
  editor with photo uploads, categories, offers, events, gallery, review moderation, business and
  delivery settings, owner password change.

## Stack

| Layer | Choice |
| --- | --- |
| UI | React 18 + TypeScript + Vite, Tailwind CSS v4, Framer Motion, React Three Fiber |
| API | Hono running as a single Cloudflare Worker (`worker/index.ts`) |
| Database | Cloudflare D1 (SQLite) — bindings `DB`, static assets `ASSETS` |
| Auth | PBKDF2-SHA256 password hashing + HMAC-signed HttpOnly session cookie |
| Hosting | Cloudflare Workers + static assets (deployable through Freebuff Sites) |

## Run locally

```bash
npm install

# terminal 1 — API + local D1 database
npm run worker            # http://127.0.0.1:8787

# terminal 2 — UI with hot reload (proxies /api to the worker)
npm run dev               # http://localhost:5173
```

The database creates its schema and seeds the entire menu automatically on the first API request.
To initialise it manually: `npm run db:init` (runs `worker/schema.sql` against local D1).

Production-style local preview (single origin, built assets + worker):

```bash
npm run preview           # builds, then serves http://localhost:3000
```

### Owner dashboard

Open `/admin` and sign in with:

```
email:    admin@cafe90s.in
password: Cafe90s@2026
```

These defaults come from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (see `.dev.vars.example`). **Change the
password from Settings → Owner password after the first login**, and set a strong
`SESSION_SECRET` in production.

## Configuration

| Variable | Purpose |
| --- | --- |
| `SESSION_SECRET` | Signs admin session cookies. Set a long random value in production. |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` / `ADMIN_NAME` | Owner account created during the first seed. |
| `ORDER_WEBHOOK_URL` | Optional JSON webhook fired on every new order (Slack/n8n relay). |

Set these as secrets in the hosting dashboard (never in client code). `ONLINE_PAYMENT_PROVIDER` is
reserved for a future gateway — online payment is intentionally disabled until a real provider is
connected, so the site never fakes a successful payment.

## Where things live

```
shared/menu.ts        official menu (single source of truth for the seed) + placeholder photos
shared/types.ts       shared API types
worker/index.ts       public API: menu, delivery check, orders, tracking, reviews, assets
worker/admin.ts       authenticated admin API (orders, menu, categories, offers, content, settings)
worker/db.ts          D1 schema, seeding, settings storage
worker/auth.ts        PBKDF2 hashing + signed sessions
src/pages/            customer pages (Home, Menu, Checkout, Order, Track) and /admin pages
src/components/       nav, cart drawer, 3D hero, product cards, modals
```

Menu prices and names are taken from the cafe's supplied menu, including **Normal/Special**,
**Normal/Milk**, **Medium/Large** and **Steamed/Fried** variants. Edit individual items in
**Menu & prices** — changes appear on the site immediately.

## Business details still to confirm

These are placeholders or best-known values; update them in the dashboard where possible:

- **Item photos** are free-licence Unsplash placeholders. Replace each item, gallery and offer image
  from the dashboard (upload or paste a URL).
- **Real cafe photos** — upload the interior/exterior shots in **Offers & content → Gallery**. The
  homepage story strip uses the two most recent gallery images, so the last two photos you upload
  appear there automatically. Uploaded images are compressed to fit the database limit.
- **Logo** — the supplied cup logo is recreated as vector art in `src/components/Logo.tsx` and
  `public/logo.svg` (favicon). Drop the original PNG into `public/` and point the `<link rel="icon">`
  in `index.html` at it if you prefer the bitmap version.
- **Address, hours and email** — address and phone come from the Google listing
  (**Ooramvila, Chathannoor, Kollam, Kerala 691572**, 9 AM – 1 AM daily). The email is still a
  placeholder; edit both in Settings.
- **Delivery charges** — default outside-zone fee is `₹0` and outside-zone delivery is **off**, so
  no charge is invented. Enable it and set your fee in Settings → Delivery zone.
- **Domain** in `sitemap.xml`, `robots.txt` and `index.html` canonical URL is a placeholder.
- **Instagram** is linked to `@cafe_90s_ctnr`; **Google Maps** uses the supplied share link and the
  resolved coordinates (8.8593821, 76.7227549).

## API overview

Public: `GET /api/bootstrap`, `GET /api/menu`, `GET /api/products/:slug`, `POST /api/delivery/check`,
`POST /api/orders`, `GET /api/orders/:code`, `POST /api/orders/:code/cancel`, `POST /api/reviews`,
`GET /api/assets/:id`.

Admin (session required): `POST /api/admin/login`, `GET /api/admin/stats`, `/api/admin/orders`,
`/api/admin/menu`, `/api/admin/products`, `/api/admin/categories`, `/api/admin/offers`,
`/api/admin/events`, `/api/admin/gallery`, `/api/admin/reviews`, `/api/admin/settings`,
`POST /api/admin/upload`, `POST /api/admin/password`.

All order totals, discounts and delivery fees are recalculated from the database on the server; the
browser never supplies prices. Admin cookies are HttpOnly, SameSite=Lax, `Secure` on HTTPS, and
admin mutations reject cross-origin requests.

## Deployment notes

The Worker only needs two bindings: `DB` (D1) and `ASSETS` (built site). Build with
`npm run build`, then bundle the worker (`npm run bundle` runs
`wrangler deploy --dry-run --outdir=dist-worker`) and deploy `dist/` as static assets with
`worker.js` as the entrypoint. Ensure the D1 database is provisioned for the environment — the
schema and menu seed themselves on first request, so no manual SQL import is required.
