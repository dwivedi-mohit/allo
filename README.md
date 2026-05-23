# Allo Inventory — Reservation System

An inventory and order-fulfillment platform for multi-warehouse retail brands. Implements **temporary reservations** to handle the race condition between checkout and payment confirmation — stock is held for 10 minutes while payment processes, then either confirmed or released.

**Live demo:** https://allo-inventory-opal.vercel.app

---

## How to run locally

### Prerequisites

- Node.js 18+
- npm
- A PostgreSQL database (Supabase, Neon, etc.)

### Setup

1. **Clone and install**

```bash
git clone <repo-url>
cd allo-inventory
npm install
```

2. **Set environment variables**

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (for idempotency) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token |

For **local development**, use the direct Supabase connection on port 5432. For **Vercel production**, use the transaction mode pooler on port 6543 with `?pgbouncer=true`.

Example local `.env`:

```
DATABASE_URL="postgresql://postgres:password@db.xxxx.supabase.co:5432/postgres"
UPSTASH_REDIS_REST_URL="https://xxxx.upstash.io"
UPSTASH_REDIS_REST_TOKEN="xxxx"
```

3. **Run migrations**

```bash
npm run db:migrate
```

4. **Seed the database**

```bash
npm run db:seed
```

5. **Start the dev server**

```bash
npm run dev
```

Open http://localhost:3000.

---

## Architecture

### Data model

```
Product ──┐
          ├── Stock ──── Warehouse
          │     (total, reserved)
          │
Reservation ──┘
  (status: PENDING | CONFIRMED | RELEASED)
  (expiresAt, confirmedAt, releasedAt)
```

- **Stock** has a unique constraint on `(productId, warehouseId)`.
- **Reservation** has an index on `(status, expiresAt)` for efficient expiry queries.
- **IdempotencyCache** stores request results for idempotency key lookups.

### Reservation flow

```
1. User clicks "Reserve" on product page
       │
       ▼
2. POST /api/reservations
   ┌─────────────────────────────────────┐
   │ Prisma $transaction:                │
   │  • SELECT ... FOR UPDATE (lock row) │
   │  • Check available ≥ quantity       │
   │  • If yes: increment reserved,      │
   │    create Reservation (PENDING)     │
   │  • If no: throw ReservationError    │
   │    (→ 409 response)                 │
   └─────────────────────────────────────┘
       │
       ▼
3. User on checkout page
   (countdown timer, confirm/cancel buttons)
       │
       ├── Confirm → POST /confirm
       │   ┌──────────────────────────────┐
       │   │ $transaction (FOR UPDATE):   │
       │   │  • Check not expired (→ 410) │
       │   │  • Check not released (→ 409)│
       │   │  • Set status=CONFIRMED      │
       │   │  • Decrement reserved on     │
       │   │    Stock                     │
       │   └──────────────────────────────┘
       │
       └── Cancel → POST /release
           ┌──────────────────────────────┐
           │ $transaction (FOR UPDATE):   │
           │  • Same checks               │
           │  • Set status=RELEASED       │
           │  • Decrement reserved on     │
           │    Stock                     │
           └──────────────────────────────┘
```

### Concurrency correctness

The core challenge: two simultaneous requests for the last unit must not both succeed.

**Solution:** Use PostgreSQL row-level locks (`SELECT ... FOR UPDATE`) inside a Prisma interactive transaction. The first request acquires the lock on the `Stock` row, checks availability, and reserves. The second request blocks on the lock, then re-checks availability and finds 0 available, returning 409.

This guarantees exactly one succeeds under any concurrency level — no race window exists between the check and the update.

### Reservation expiry

Expired reservations are cleaned up via two mechanisms:

1. **Lazy cleanup (primary):** Every `GET /api/products` call runs a `$transaction` that atomically locks all expired `PENDING` reservations, sets them to `RELEASED`, and decrements `reserved` on the corresponding `Stock` rows. This ensures data is always consistent without background infra.

2. **Vercel Cron job (safety net):** `/api/cron/release-expired` runs once daily (midnight UTC) via Vercel Cron Jobs. It calls the same cleanup logic. On the Hobby plan, only daily schedules are supported.

**Trade-off:** The lazy cleanup means the product listing page may have slightly stale data between requests, but the reservation endpoints themselves always read current state inside their transactions.

### Idempotency (bonus)

The `POST /api/reservations` and `POST /api/reservations/:id/confirm` endpoints support the `Idempotency-Key` header.

**How it works:**
1. Client sends a request with header `Idempotency-Key: <uuid>`.
2. Server checks Redis (Upstash) for a cached response with that key.
3. If found → returns the cached response (status + body).
4. If not found → processes the request, caches the result in Redis with a 1-hour TTL.

This allows safe retries on network failures without double-charging or double-reserving.

**Storage:** Redis is used for fast lookups and automatic TTL-based expiry. The key prefix is `idempotency:` followed by the client-provided key.

**Important:** Error responses (409, 410) are also cached so retries don't succeed where the original request failed.

---

## API endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List products with available stock per warehouse |
| GET | `/api/warehouses` | List warehouses |
| POST | `/api/reservations` | Reserve units (body: `productId`, `warehouseId`, `quantity`) → 201 or 409 |
| GET | `/api/reservations/:id` | Get reservation details |
| POST | `/api/reservations/:id/confirm` | Confirm reservation → 200 or 410 (expired) or 409 (already released) |
| POST | `/api/reservations/:id/release` | Release reservation → 200 or 410 (expired) or 409 (already confirmed) |
| GET | `/api/cron/release-expired` | Release all expired reservations (cron job) |

---

## Trade-offs & future improvements

### What I'd do differently with more time

1. **Testing.** Add integration tests with a test database to verify concurrency behavior under load.

2. **Better error UX.** Toast notifications, optimistic UI updates, and loading skeletons.

3. **Authentication.** The current system has no auth — anyone can create reservations. In production, we'd add Clerk/Auth0 and link reservations to users.

4. **Rate limiting.** Protect endpoints from abuse (especially the cron endpoint).

5. **Database migrations.** Add a migration for the idempotency cache table (currently unused since we use Redis).

6. **Monitoring.** Add logging, error tracking (Sentry), and dashboard metrics for reservation conversion rates.

7. **Soft-delete stock.** Instead of immediately releasing stock on expiry, add a grace period where expired reservations can be re-activated.

8. **Batch expiry.** The current `FOR UPDATE` on all expired rows could be slow with millions of reservations. A paginated approach or `SKIP LOCKED` would scale better.

9. **Edge cases.** Handle quantity > 1 reservations, partial confirms, and multi-item cart reservations.

### Why Prisma `$queryRaw` instead of Prisma Client for the locking?

Prisma Client's `update()` with `where` doesn't support `FOR UPDATE` natively. Using raw SQL inside a transaction gives us precise control over the lock acquisition order, which is essential for correctness.

### Why not use Prisma's `update` with a condition?

Prisma's `updateMany` doesn't return the affected row count in a useful way for this use case. Using `SELECT ... FOR UPDATE` + explicit check + `UPDATE` is the most reliable pattern.
