# Stock POS

A multi-tenant Point of Sale system built with Next.js, Prisma, and PostgreSQL.

## Tech Stack

- **Framework** — Next.js 15 (App Router)
- **Database ORM** — Prisma
- **Database** — PostgreSQL
- **Auth** — JWT sessions (HTTP-only cookies)
- **Styling** — Tailwind CSS

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Create a `.env` file in the root of the project:

```env
# PostgreSQL connection string
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"

# JWT secret — use a long random string in production
JWT_SECRET="your-super-secret-key"
```

> **Local example**
> `DATABASE_URL="postgresql://postgres:postgres@localhost:5432/stockpos"`

### 3. Set up the database

```bash
# Apply all migrations and create the database schema
npx prisma migrate dev --name init

# (Alternative) Push the schema without creating migration files — useful for prototyping
npx prisma db push
```

### 4. Seed the database

The seed creates the **Baraka** merchant, an owner user, categories, products, and default settings.

```bash
npx prisma db seed
```

Default login after seeding:

| Field    | Value                  |
|----------|------------------------|
| Email    | `nandwere@baraka.com`  |
| Password | `art123`               |
| Role     | `OWNER`                |

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Prisma Workflows

### Viewing and editing data (Prisma Studio)

```bash
npx prisma studio
```

Opens a visual browser interface at [http://localhost:5555](http://localhost:5555) where you can browse and edit every table.

### Modifying the schema

1. Edit `prisma/schema.prisma`
2. Create and apply a migration:

```bash
npx prisma migrate dev --name describe_your_change
```

This will:
- Generate a SQL migration file under `prisma/migrations/`
- Apply it to your local database
- Regenerate the Prisma Client

### Regenerating the Prisma Client

Run this whenever `schema.prisma` changes and you need the TypeScript types to update without running a migration (e.g. after a `git pull`):

```bash
npx prisma generate
```

### Resetting the database

Drops and recreates the database, re-applies all migrations, and re-runs the seed:

```bash
npx prisma migrate reset
```

> ⚠️ This deletes all data. Development only.

### Applying migrations in production

```bash
npx prisma migrate deploy
```

Unlike `migrate dev`, this never prompts interactively and never resets data — safe for CI/CD pipelines.

---

## Project Structure

# Storefront + Pay-on-Delivery Orders — Add-on

Public product listing, cart, and order placement for your existing
multi-tenant Prisma/Next.js POS, plus the admin-side order management to
fulfill them.

## What this adds

- **Public storefront** at `/store/[slug]` — product grid, cart, checkout
  (name/phone/address, no account needed)
- **Order tracking** at `/store/[slug]/order/[orderNumber]` — phone-gated
  status lookup for customers
- **Admin order management** — list, confirm, dispatch, mark delivered
  (converts to a real `Sale`), or cancel (restocks automatically)
- New `Order` / `OrderItem` Prisma models, `OrderStatus` enum, and two new
  fields on `Merchant`

## Setup steps, in order

### 1. Merge the schema patch

`prisma/schema-additions.prisma` is **not** a replacement file — it's a
patch. Open your real `schema.prisma` and:

1. Add the `OrderStatus` enum anywhere with your other enums.
2. Add `storefrontEnabled`, `deliveryFee`, `storefrontTagline`, and the
   `orders Order[]` relation line into your existing `model Merchant`.
3. Add `orderItems OrderItem[]` into your existing `model Product`.
4. Add the `Order` and `OrderItem` models anywhere in the file.

Then:
```bash
npx prisma migrate dev --name add_storefront_orders
```

### 2. Wire up `lib/adminAuth.ts`

This is a placeholder — it currently throws a 501 on every call. It needs
to become a real lookup of `{ userId, merchantId, role }` from whatever
session/auth you already have (NextAuth, a custom JWT cookie, etc.). Two
sketched implementations are commented inside the file — pick the one that
matches your setup, or tell me what you use and I'll fill it in exactly.

**Nothing else in this add-on needs to change once this one function is
real** — every admin route calls it and nothing else touches auth.

### 3. Enable the storefront per merchant

`storefrontEnabled` defaults to `false` — a merchant's `/store/[slug]` page
returns 404 until you flip it on (and set a `deliveryFee`). Do this
wherever your merchant settings UI lives, or directly via Prisma Studio for
testing:

```ts
await prisma.merchant.update({
  where: { slug: 'acme-shop' },
  data: { storefrontEnabled: true, deliveryFee: 150, storefrontTagline: 'Fresh groceries, delivered.' },
});
```

### 4. Drop `app/(dashboard)/orders/page.tsx` into your real dashboard

It's written as a standalone page assuming it inherits your existing
authenticated layout. If your dashboard uses a different route group name
than `(dashboard)`, move the file accordingly — nothing inside it depends
on the folder name.

### 5. Tailwind

The storefront and admin order pages use Tailwind utility classes. If your
project doesn't have Tailwind configured, either add it or swap the
className strings for your own styling — no other logic depends on it.

## The stock/accounting model — read this before going live

Your existing `TransactionType` enum doesn't have a clean meaning for
"stock committed to a pending online order," so orders don't slot into it
by pretending otherwise. Here's exactly what happens at each stage:

| Order event | Stock effect | Audit trail |
|---|---|---|
| **Placed** | `Product.currentStock` decremented immediately | None — this is a normal, expected pending-fulfillment movement, not a correction |
| **Cancelled** | Stock restored | `StockAdjustment` (`type: RETURN`) — this is an authenticated admin action, so there's a real `userId` to attribute it to |
| **Delivered** | **Not decremented again** | A real `Sale` + `SaleItem` rows are created instead, so the order shows up in your existing sales reporting / `DailySummary` |

**The one thing you must check before deploying this**: if your existing
POS checkout flow creates a `Sale` through a shared helper that *also*
decrements stock as a side effect (a `createSale()` function, a Prisma
middleware, anything like that), **do not let that same helper run for
delivered orders** — `deliverOrder()` in `lib/orderService.ts` creates the
`Sale` directly via `tx.sale.create(...)`, deliberately bypassing whatever
your POS-side stock deduction does, because stock was already removed at
order placement. If your real POS flow works differently than assumed
here, this is the integration point to double check first.

`SaleItem.costPrice` is pulled from the product's *current* cost price at
delivery time (not at order-placement time) — matters if your costs change
between when an order is placed and when it's actually delivered.

## Race conditions handled

Two customers ordering the last unit of the same product at the same time:
`createOrder()` checks stock once before the transaction (for a fast,
specific "only 2 left" error message) and **again inside the transaction**
right before decrementing — that second check is what actually prevents
overselling, not the first one.

## Things intentionally left out of this pass

- **Delivery zones / distance-based fees** — `deliveryFee` is currently one
  flat number per merchant, not zone- or distance-based.
- **SMS/WhatsApp notifications** on status change — the admin page updates
  status but doesn't notify the customer automatically. Given you mentioned
  delivering yourself for now, this may not matter yet, but it's the
  natural next addition once volume grows.
- **Customer accounts / order history** — checkout is guest-only, matching
  what you asked for (pay on delivery, you deliver). Revisit if repeat
  customers become common enough that "look up by phone every time" gets
  annoying.
- **Multi-item stock reservation timeout** — stock is decremented
  immediately and only restored on explicit cancellation. There's no
  "abandoned pending order auto-expires after 24h and releases stock" job.
  Worth adding once you see how often customers place an order and then
  never respond to confirmation.