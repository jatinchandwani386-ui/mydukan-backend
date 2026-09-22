# My Dukan — Backend & Admin Dashboard

Backend + admin API for a custom Amazon affiliate e-commerce platform.
Node.js / Express / MongoDB (Mongoose), JWT auth, and a single-file
vanilla-JS admin dashboard served at `/admin`.

## 1. Setup

```bash
npm install
cp .env.example .env      # fill in MONGO_URI, JWT_SECRET, AMAZON_AFFILIATE_TAG, etc.
npm run seed:admin "Your Name" you@example.com "a-strong-password"
npm run dev                # or: npm start
```

Visit `http://localhost:5000/admin` and log in with the admin account you just created.

## 2. Project layout

```
config/db.js              MongoDB connection
models/                   Product, Category, User, ClickLog schemas
middleware/                JWT auth guard + central error handler
utils/
  affiliateLink.js         builds/parses Amazon affiliate URLs & ASINs
  productDataProvider.js   PA-API integration for Quick Add (see below)
controllers/               route handlers (public + admin)
routes/                    Express routers
admin-dashboard/index.html the admin panel UI (static, calls the API)
scripts/createAdmin.js     CLI to create the first admin login
server.js                  app entry point
```

## 3. "Quick Add by URL/ASIN" — important

Amazon's Conditions of Use prohibit scraping product pages. The compliant
way to auto-fetch title/price/images/reviews is the official **Amazon
Product Advertising API (PA-API 5.0)**, which is free for approved
Associates (access typically unlocks after your first few qualifying
sales). `utils/productDataProvider.js` is wired up for it:

1. `npm install amazon-paapi`
2. Fill in `PAAPI_ACCESS_KEY`, `PAAPI_SECRET_KEY`, `PAAPI_PARTNER_TAG` in `.env`.
3. Use the "Quick Add" tab in the admin dashboard, or `POST /api/admin/quick-add/lookup`.

Until PA-API is configured, that endpoint returns a clear `501` explaining
what's missing rather than failing silently — manual product entry always
works regardless.

## 4. Affiliate link & redirect engine

- Every product's `affiliate.buyUrl` is auto-generated from its ASIN +
  `AMAZON_AFFILIATE_TAG` (see `utils/affiliateLink.js`) — never typed by hand.
- Every "Buy on Amazon" button on your storefront should point to
  `GET /api/redirect/:productId` (open with `target="_blank"` to get the
  new-tab behavior). That endpoint logs the click to `ClickLog`,
  increments the product's `clickCount`, and 302-redirects to Amazon.
- `GET /api/admin/analytics/clicks` gives a simple per-product click report.

## 5. Public API

| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List products. Query: `page, limit, category, subcategory, minPrice, maxPrice, minRating, q, sort` |
| GET | `/api/products/:slug` | Full single-product view |
| GET | `/api/categories` | Nested category tree |
| GET | `/api/redirect/:productId` | Logs the click, redirects to Amazon |

## 6. Admin API (requires `Authorization: Bearer <token>` from `/api/auth/login`)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/login` | `{ email, password }` → JWT |
| GET | `/api/auth/me` | Current admin |
| GET/POST | `/api/admin/products` | List / create |
| PUT/DELETE | `/api/admin/products/:id` | Update / delete |
| PATCH | `/api/admin/products/:id/feature` | Toggle featured |
| PATCH | `/api/admin/products/:id/hide` | Toggle visibility |
| GET/POST | `/api/admin/categories` | List / create |
| PUT/DELETE | `/api/admin/categories/:id` | Update / delete |
| POST | `/api/admin/quick-add/lookup` | `{ input: "<url or ASIN>" }` → draft product data |
| GET | `/api/admin/analytics/clicks` | Click report |

## 7. Notes

- No public self-registration route on purpose — this is a single-tenant
  admin panel; create accounts via `npm run seed:admin`.
- `price.discountPercent` and `slug` are computed automatically on save —
  don't set them manually.
- `isHidden` is a soft hide (product stays in the DB, just excluded from
  public endpoints); use DELETE for a hard delete.
- The admin dashboard is intentionally framework-free (no build step) so
  it runs by just opening `/admin` — swap in React/Next.js later if you
  want a richer UI; the API underneath doesn't need to change.
