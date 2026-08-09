# Server scripts

Operational scripts under `server/scripts/`. Prefer fixing write-path invariants in application code over re-running repair scripts.

## Ongoing health checks (safe to schedule)

| npm script | Script | Purpose |
|------------|--------|---------|
| `db:audit` | `run-erp-audit.ts` | Read-only ERP integrity report (stock drift, sales alignment) |
| `db:verify-unit-pricing` | `verify-unit-pricing.ts` | Manual per-piece pricing verification |

Run `db:audit` proactively (e.g. weekly on staging/production) to catch drift before users do.

## Repair / backfill (run only when audit finds issues)

| npm script | Script | Purpose |
|------------|--------|---------|
| `db:apply-audit-fixes` | `apply-erp-audit-fixes.ts` | Applies fixes suggested by audit |
| `db:repair-inventory-weights` | `repair-inventory-weights.ts` | Fixes SKU/weight on completed production-run inventory |
| `db:backfill-missing-wholesale-sales` | `backfill-missing-wholesale-sales.ts` | Creates missing Sale rows for wholesale transfers |
| `db:backfill-wholesale-sale-branches` | `backfill-wholesale-sale-branches.ts` | Branch attribution for wholesale sales |
| `db:sync-motif-prices` | `sync-motif-prices.ts` | Recalculate motif prices from market rates |

Review audit output before running apply/repair scripts. These should become unnecessary as test coverage and write-time invariants improve.

## One-time migrations (historical)

`migrate-*.ts`, `migration-prisma.ts` — schema/data migrations tied to specific releases. Do not re-run unless upgrading an old database.

## Destructive

| npm script | Script | Purpose |
|------------|--------|---------|
| `db:reset-shreehari` | `reset-shreehari-data.ts` | Wipes one org's operational data — use with extreme care |
