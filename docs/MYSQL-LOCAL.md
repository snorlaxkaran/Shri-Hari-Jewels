# MySQL branch (local test only — not pushed to GitHub)

This folder is configured for **MySQL** so you can test on Hostinger-style hosting. Production on GitHub may still use **PostgreSQL** until you merge this work.

## Prerequisites

- MySQL 8.0+ (local XAMPP, Docker, or Hostinger remote DB for dev)
- Node 20+

## Setup

1. Create database and user:

```sql
CREATE DATABASE erp365 CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'erp365'@'localhost' IDENTIFIED BY 'your_password';
GRANT ALL ON erp365.* TO 'erp365'@'localhost';
FLUSH PRIVILEGES;
```

2. Copy `server/.env.mysql.example` → `server/.env` and set `DATABASE_URL`.

3. From `server/`:

```bash
npm install
npm run db:deploy:mysql
npm run db:seed-if-empty
npm run dev
```

4. Client: set `client/.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:4000` (or your API port).

## Notes

- **Do not** run `npm run db:deploy` on MySQL — it runs PostgreSQL-only migration scripts.
- List fields that were PostgreSQL `String[]` are stored as **JSON** in MySQL.
- `DIRECT_URL` is not used (Supabase pooler was PostgreSQL-only).
- Moving **existing Supabase data** to MySQL requires a custom ETL/export — not included here; this path is for **fresh DB + seed** or manual import.

## Revert to PostgreSQL

Restore `provider = "postgresql"` and `directUrl` in `prisma/schema.prisma`, revert `String[]` fields, and use your Supabase `DATABASE_URL` / `DIRECT_URL` again.
