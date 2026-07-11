# Shri Hari Jewels - API Server

Express + Prisma + PostgreSQL backend for the jewelry ERP.

## Number correctness (non-negotiable)

Every quantity, weight, price, and stock figure shown in the app must be **100% arithmetically correct** and tied to real inventory movements. This is not optional polish — wrong numbers break trust and operations.

**Rules we always follow:**

1. **Production metal** — When a production run is started with `N` sets, raw metal deducted = `perSetGrams × N`, where `perSetGrams` is the physical metal in the design BOM (motif weights × qty per set + casting metal). Deduction happens **immediately on run creation**, not at packaging/completion. Gold, silver, platinum, and rose gold all use the same code path.
2. **Weight resolution** — If a design element has no `weightGramsPerPc`, fall back to the linked motif library weight before calculating stock or deductions. Never silently treat missing weights as `0g` and skip deduction.
3. **Insufficient stock blocks the action** — Starting a production run fails if Raw Inventory does not have enough matching metal (`metalType` + `purity`). Warnings alone are not enough.
4. **Sets changes reconcile inventory** — If `setsOrdered` is edited on an existing run, metal already reserved is restored and re-deducted for the new set count.
5. **Run deletion restores metal** — Deleting a production run puts reserved metal back into the matching lots (via audit log reversal).
6. **Repairs** — Completed runs that were incorrectly marked as deducted without an audit trail are auto-repaired the next time the run is loaded.

When changing pricing, BOM, production, or inventory code, verify the math end-to-end: per-set → × sets → deduct from lots → UI totals match.

## Motifs API (404 fix)

If **Motif Library** shows "Could not load motifs" or Excel import returns **404**, the live API on Render has not been redeployed with the latest code.

1. Open [Render Dashboard](https://dashboard.render.com) → **shri-hari-jewels-api**
2. Click **Manual Deploy** → **Deploy latest commit**
3. Wait for the build to finish (watch logs for `Status enum migration complete` and `Deploy schema migration complete`)
4. Verify: open `https://shri-hari-jewels-api.onrender.com/api/health` — you should see `"features": { "motifs": true }`
5. Hard-refresh the app and open **Motifs** again

### Local development (both frontend + backend)

```bash
# Terminal 1 — API (requires DATABASE_URL in server/.env)
cd server
cp .env.example .env   # paste your Postgres URL from Render → Environment
npm run db:push
npm run dev

# Terminal 2 — Frontend
cd client
cp .env.local.example .env.local
npm run dev
```

Login at http://localhost:3000 — Motifs will call http://localhost:4000/api/motifs.


## API Endpoints

| Method | Path                       | Description               |
| ------ | -------------------------- | ------------------------- |
| GET    | `/api/health`              | Health check              |
| GET    | `/api/inventory`           | List all products         |
| POST   | `/api/inventory`           | Create product            |
| POST   | `/api/inventory/:id/units` | Add units to existing SKU |

## Database

- **Local dev:** SQLite file `prisma/dev.db` (gitignored) — fine for development only
- **Production:** Prisma Postgres (or any managed Postgres). **Never use SQLite on Render** — sales are lost when the server restarts after ~15 minutes idle.

View data: `npm run db:studio`

### Production setup (Prisma Postgres)

1. Create a database in [Prisma Data Platform](https://console.prisma.io)
2. Copy the **Postgres connection string** (`postgresql://...` or `prisma+postgres://...`)
3. In **Render** → `shri-hari-jewels-api` → **Environment** → set `DATABASE_URL` to that string
4. Redeploy, then run once locally (or via Render shell):

   ```bash
   cd server
   DATABASE_URL="your-postgres-url" npm run db:deploy
   DATABASE_URL="your-postgres-url" npm run db:seed
   ```

5. Verify persistence: open `https://your-api.onrender.com/api/health`  
   You should see `"database": { "kind": "postgresql", "persistent": true, ... }`

If you sell an item and `completedSales` / `soldUnits` go back to 0 after a few hours, `DATABASE_URL` is wrong or still pointing at SQLite.

## Environment

| Variable       | Default                 | Description       |
| -------------- | ----------------------- | ----------------- |
| `DATABASE_URL` | `postgresql://...` (prod) / `file:./dev.db` (local) | Database connection |
| `PORT`         | `4000`                  | API port          |
| `CLIENT_URL`   | `http://localhost:3000` | CORS origin       |
| `JWT_SECRET`   | (dev fallback)          | **Required in production** |

## Deploy to Render (production)

The repo includes a [`render.yaml`](../render.yaml) blueprint for one-click deploy.

1. Go to [Render Dashboard](https://dashboard.render.com) -> **New** -> **Blueprint**
2. Connect repo: `snorlaxkaran/Shri-Hari-Jewels`
3. Render creates `shri-hari-jewels-api` with env vars from the blueprint
4. After deploy, copy the API URL (e.g. `https://shri-hari-jewels-api.onrender.com`)
5. In **Vercel** → project settings → **Environment Variables**, add:

   ```
   NEXT_PUBLIC_API_URL=https://shri-hari-jewels-api.onrender.com
   ```

6. Redeploy the Vercel frontend

**Default login after seed:** `admin@shreehari.com` / `admin123`

**Default branches after seed:**
- Head Office (Admin) - Mumbai HQ
- Jaipur Store
- Delhi Store

Admins can add more branches from **Branches** in the app sidebar.

**Health check:** `GET /api/health`

### Render build fails on `Product.status` type change

If deploy logs show:

> Changed the type of `status` on the `Product` table … column would be dropped and recreated

The build is running plain `prisma db push` against a database that still has legacy **TEXT** (or old enum labels like `InStock`) in `Product.status`. **Do not use `--force-reset`** on production — it wipes all sales data.

**Fix:** In Render → **shri-hari-jewels-api** → **Settings** → **Build Command**, set:

```bash
npm install --include=dev && npm run build && npm run db:deploy && npm run db:seed-if-empty
```

`npm run db:deploy` runs safe SQL migrations first (`migrate-status-enums.ts`, `migrate-deploy-schema.ts`), then `prisma db push`. Commit and redeploy after updating [`render.yaml`](../render.yaml) if you use the blueprint.
