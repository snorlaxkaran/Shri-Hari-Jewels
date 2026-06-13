# Shri Hari Jewels — API Server

Express + Prisma + SQLite backend for the jewelry ERP.

## Setup

```bash
cd server
npm install
cp .env.example .env   # if .env doesn't exist
npm run db:push        # create/update tables
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
