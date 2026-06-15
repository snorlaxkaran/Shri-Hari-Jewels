# Shri Hari Jewels - API Server

Express + Prisma + SQLite backend for the jewelry ERP.

## Setup

```bash
cd server
npm install
cp .env.example .env   # if .env doesn't exist
npm run db:push        # create/update tables
npm run db:seed        # create default admin and sample data
npm run dev            # http://localhost:4000
```

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
   DATABASE_URL="your-postgres-url" npm run db:push
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
