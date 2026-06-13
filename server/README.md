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

- **SQLite** file: `prisma/dev.db` (local, gitignored)
- View data: `npm run db:studio`

## Environment

| Variable       | Default                 | Description       |
| -------------- | ----------------------- | ----------------- |
| `DATABASE_URL` | `file:./dev.db`         | SQLite connection |
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
