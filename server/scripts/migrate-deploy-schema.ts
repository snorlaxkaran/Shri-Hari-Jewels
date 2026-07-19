/**
 * Idempotent schema updates applied before `prisma db push` on Render.
 * Handles new feature tables/columns and legacy Product.status TEXT → enum.
 *
 * Run: npx tsx scripts/migrate-deploy-schema.ts
 */
import { migrationPrisma as prisma } from "./migration-prisma.js";

const tableExists = async (table: string): Promise<boolean> => {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND lower(table_name) = lower(${table})
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
};

const enumExists = async (enumName: string): Promise<boolean> => {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1 FROM pg_type WHERE lower(typname) = lower(${enumName})
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
};

const columnExists = async (table: string, column: string): Promise<boolean> => {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND lower(table_name) = lower(${table})
        AND lower(column_name) = lower(${column})
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
};

const run = async (label: string, sql: string) => {
  console.log(label);
  await prisma.$executeRawUnsafe(sql);
};

const ensureProductStockStatusEnum = async () => {
  await run(
    "Ensure Product.status uses ProductStockStatus enum…",
    `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStockStatus') THEN
        CREATE TYPE "ProductStockStatus" AS ENUM ('In Stock', 'Low Stock', 'Out of Stock');
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Product'
          AND column_name = 'status'
          AND udt_name IN ('text', 'varchar', 'character varying')
      ) THEN
        ALTER TABLE "Product"
          ALTER COLUMN "status" TYPE "ProductStockStatus"
          USING (
            CASE TRIM("status"::text)
              WHEN 'InStock' THEN 'In Stock'::"ProductStockStatus"
              WHEN 'LowStock' THEN 'Low Stock'::"ProductStockStatus"
              WHEN 'OutOfStock' THEN 'Out of Stock'::"ProductStockStatus"
              ELSE TRIM("status"::text)::"ProductStockStatus"
            END
          );
      END IF;
    END $$;
    `,
  );
};

const ensureInventoryUnitInTransit = async () => {
  if (!(await enumExists("InventoryUnitStatus"))) {
    console.log(
      "Skip InventoryUnitStatus.InTransit — enum not found yet (fresh DB; db push will create it).",
    );
    return;
  }

  await run(
    "Ensure InventoryUnitStatus includes InTransit…",
    `
    DO $$
    BEGIN
      ALTER TYPE "InventoryUnitStatus" ADD VALUE 'InTransit';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `,
  );
};

const ensureInventoryUnitTransferred = async () => {
  if (!(await enumExists("InventoryUnitStatus"))) {
    console.log(
      "Skip InventoryUnitStatus.Transferred — enum not found yet (fresh DB; db push will create it).",
    );
    return;
  }

  await run(
    "Ensure InventoryUnitStatus includes Transferred…",
    `
    DO $$
    BEGIN
      ALTER TYPE "InventoryUnitStatus" ADD VALUE 'Transferred';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `,
  );
};

const ensureInvoiceItemTable = async () => {
  await run(
    "Ensure InvoiceItem table…",
    `
    CREATE TABLE IF NOT EXISTS "InvoiceItem" (
      "id" TEXT NOT NULL,
      "invoiceId" TEXT NOT NULL,
      "saleId" TEXT,
      "itemCode" TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      "sku" TEXT NOT NULL,
      "hsnCode" TEXT,
      "metal" TEXT NOT NULL DEFAULT 'Base Metal',
      "listPrice" DECIMAL(12,2) NOT NULL,
      "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
      "amount" DECIMAL(12,2) NOT NULL,
      CONSTRAINT "InvoiceItem_pkey" PRIMARY KEY ("id")
    )
    `,
  );

  const itemIndexes = [
    `CREATE UNIQUE INDEX IF NOT EXISTS "InvoiceItem_saleId_key" ON "InvoiceItem"("saleId")`,
    `CREATE INDEX IF NOT EXISTS "InvoiceItem_invoiceId_idx" ON "InvoiceItem"("invoiceId")`,
  ];
  for (const sql of itemIndexes) {
    await run(`Apply: ${sql.slice(0, 60)}…`, sql);
  }

  await run(
    "Ensure InvoiceItem foreign keys…",
    `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceItem_invoiceId_fkey') THEN
        ALTER TABLE "InvoiceItem"
          ADD CONSTRAINT "InvoiceItem_invoiceId_fkey"
          FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InvoiceItem_saleId_fkey') THEN
        ALTER TABLE "InvoiceItem"
          ADD CONSTRAINT "InvoiceItem_saleId_fkey"
          FOREIGN KEY ("saleId") REFERENCES "Sale"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
    `,
  );
};

const ensureInvoiceGstHeaderSchema = async () => {
  if (!(await tableExists("Invoice"))) {
    console.log("Skip Invoice GST header migration — Invoice table not found yet.");
    return;
  }

  console.log("Ensure Invoice GST header columns and backfill…");

  await ensureInvoiceItemTable();

  const invoiceColumnAlters = [
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(12,2)`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "taxableValue" DECIMAL(12,2)`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "cgst" DECIMAL(12,2)`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sgst" DECIMAL(12,2)`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "igst" DECIMAL(12,2)`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "roundOff" DECIMAL(12,2)`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "cartGroupId" TEXT`,
    `ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "placeOfSupply" TEXT`,
  ];
  for (const sql of invoiceColumnAlters) {
    await run(`Apply: ${sql.slice(0, 60)}…`, sql);
  }

  if (await tableExists("InvoiceItem")) {
    const itemColumnAlters = [
      `ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "hsnCode" TEXT`,
      `ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "metal" TEXT`,
      `UPDATE "InvoiceItem" SET "metal" = 'Base Metal' WHERE "metal" IS NULL`,
    ];
    for (const sql of itemColumnAlters) {
      await run(`Apply: ${sql.slice(0, 60)}…`, sql);
    }

    const hasLegacyListPrice = await columnExists("Invoice", "listPrice");
    if (hasLegacyListPrice) {
      await run(
        "Migrate legacy Invoice line columns into InvoiceItem…",
        `
        INSERT INTO "InvoiceItem" (
          "id",
          "invoiceId",
          "saleId",
          "itemCode",
          "productName",
          "sku",
          "hsnCode",
          "metal",
          "listPrice",
          "discount",
          "amount"
        )
        SELECT
          gen_random_uuid()::text,
          i."id",
          i."saleId",
          COALESCE(i."itemCode", 'LEGACY'),
          COALESCE(i."productName", 'Item'),
          COALESCE(i."sku", 'LEGACY'),
          NULL,
          'Base Metal',
          COALESCE(i."listPrice", i."total", 0),
          COALESCE(i."discount", 0),
          COALESCE(i."total", 0)
        FROM "Invoice" i
        WHERE NOT EXISTS (
          SELECT 1 FROM "InvoiceItem" ii WHERE ii."invoiceId" = i."id"
        )
        `,
      );
    }

    await run(
      "Backfill Invoice subtotal and taxableValue from line items…",
      `
      UPDATE "Invoice" i
      SET
        "subtotal" = COALESCE(
          i."subtotal",
          (
            SELECT COALESCE(SUM(ii."listPrice"), 0)
            FROM "InvoiceItem" ii
            WHERE ii."invoiceId" = i."id"
          )
        ),
        "taxableValue" = COALESCE(
          i."taxableValue",
          (
            SELECT COALESCE(SUM(ii."amount"), 0)
            FROM "InvoiceItem" ii
            WHERE ii."invoiceId" = i."id"
          )
        )
      WHERE i."subtotal" IS NULL OR i."taxableValue" IS NULL
      `,
    );
  }

  if (await columnExists("Invoice", "listPrice")) {
    await run(
      "Backfill Invoice headers from legacy listPrice/total columns…",
      `
      UPDATE "Invoice"
      SET
        "subtotal" = COALESCE("subtotal", "listPrice", "total", 0),
        "taxableValue" = COALESCE(
          "taxableValue",
          GREATEST(COALESCE("total", 0) - COALESCE("discount", 0), 0),
          "total",
          0
        )
      WHERE "subtotal" IS NULL OR "taxableValue" IS NULL
      `,
    );
  }

  await run(
    "Backfill remaining Invoice GST header values…",
    `
    UPDATE "Invoice"
    SET
      "subtotal" = COALESCE("subtotal", "total", 0),
      "taxableValue" = COALESCE("taxableValue", "total", 0),
      "discount" = COALESCE("discount", 0),
      "cgst" = COALESCE("cgst", 0),
      "sgst" = COALESCE("sgst", 0),
      "igst" = COALESCE("igst", 0),
      "roundOff" = COALESCE("roundOff", 0)
    WHERE
      "subtotal" IS NULL
      OR "taxableValue" IS NULL
      OR "discount" IS NULL
      OR "cgst" IS NULL
      OR "sgst" IS NULL
      OR "igst" IS NULL
      OR "roundOff" IS NULL
    `,
  );

  const notNullAlters = [
    `ALTER TABLE "Invoice" ALTER COLUMN "subtotal" SET DEFAULT 0`,
    `ALTER TABLE "Invoice" ALTER COLUMN "taxableValue" SET DEFAULT 0`,
    `ALTER TABLE "Invoice" ALTER COLUMN "discount" SET DEFAULT 0`,
    `ALTER TABLE "Invoice" ALTER COLUMN "cgst" SET DEFAULT 0`,
    `ALTER TABLE "Invoice" ALTER COLUMN "sgst" SET DEFAULT 0`,
    `ALTER TABLE "Invoice" ALTER COLUMN "igst" SET DEFAULT 0`,
    `ALTER TABLE "Invoice" ALTER COLUMN "roundOff" SET DEFAULT 0`,
    `ALTER TABLE "Invoice" ALTER COLUMN "subtotal" SET NOT NULL`,
    `ALTER TABLE "Invoice" ALTER COLUMN "taxableValue" SET NOT NULL`,
    `ALTER TABLE "Invoice" ALTER COLUMN "discount" SET NOT NULL`,
    `ALTER TABLE "Invoice" ALTER COLUMN "cgst" SET NOT NULL`,
    `ALTER TABLE "Invoice" ALTER COLUMN "sgst" SET NOT NULL`,
    `ALTER TABLE "Invoice" ALTER COLUMN "igst" SET NOT NULL`,
    `ALTER TABLE "Invoice" ALTER COLUMN "roundOff" SET NOT NULL`,
  ];
  for (const sql of notNullAlters) {
    await run(`Apply: ${sql.slice(0, 60)}…`, sql);
  }

  if (await tableExists("InvoiceItem") && (await columnExists("InvoiceItem", "metal"))) {
    const itemNotNullAlters = [
      `UPDATE "InvoiceItem" SET "metal" = 'Base Metal' WHERE "metal" IS NULL`,
      `ALTER TABLE "InvoiceItem" ALTER COLUMN "metal" SET DEFAULT 'Base Metal'`,
      `ALTER TABLE "InvoiceItem" ALTER COLUMN "metal" SET NOT NULL`,
    ];
    for (const sql of itemNotNullAlters) {
      await run(`Apply: ${sql.slice(0, 60)}…`, sql);
    }
  }

  if (await tableExists("InvoiceItem") && (await tableExists("Sale"))) {
    await run(
      "Backfill InvoiceItem rows from cart-group sales…",
      `
      INSERT INTO "InvoiceItem" (
        "id",
        "invoiceId",
        "saleId",
        "itemCode",
        "productName",
        "sku",
        "hsnCode",
        "metal",
        "listPrice",
        "discount",
        "amount"
      )
      SELECT
        gen_random_uuid()::text,
        i."id",
        s."id",
        s."itemCode",
        s."productName",
        s."sku",
        NULL,
        COALESCE(p."metal", s."category", 'Base Metal'),
        s."listPrice",
        COALESCE(s."discount", 0),
        s."dealPrice"
      FROM "Invoice" i
      INNER JOIN "Sale" s ON s."cartGroupId" = i."cartGroupId"
      LEFT JOIN "Product" p ON p."id" = s."productId"
      WHERE i."cartGroupId" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "InvoiceItem" ii WHERE ii."invoiceId" = i."id"
        )
        AND NOT EXISTS (
          SELECT 1 FROM "InvoiceItem" ii WHERE ii."saleId" = s."id"
        )
      `,
    );

    await run(
      "Recompute legacy Invoice GST header values when missing…",
      `
      UPDATE "Invoice" i
      SET
        "cgst" = CASE
          WHEN COALESCE(i."placeOfSupply", ss."state", '') ILIKE COALESCE(ss."state", '')
            AND COALESCE(i."placeOfSupply", ss."state", '') <> ''
          THEN ROUND(i."taxableValue" * 0.015, 2)
          ELSE 0
        END,
        "sgst" = CASE
          WHEN COALESCE(i."placeOfSupply", ss."state", '') ILIKE COALESCE(ss."state", '')
            AND COALESCE(i."placeOfSupply", ss."state", '') <> ''
          THEN ROUND(i."taxableValue" * 0.015, 2)
          ELSE 0
        END,
        "igst" = CASE
          WHEN COALESCE(i."placeOfSupply", ss."state", '') ILIKE COALESCE(ss."state", '')
            AND COALESCE(i."placeOfSupply", ss."state", '') <> ''
          THEN 0
          ELSE ROUND(i."taxableValue" * 0.03, 2)
        END
      FROM "ShopSettings" ss
      INNER JOIN "Branch" b ON b."organizationId" = ss."organizationId"
      WHERE i."branchId" = b."id"
        AND i."taxableValue" > 0
        AND COALESCE(i."cgst", 0) = 0
        AND COALESCE(i."sgst", 0) = 0
        AND COALESCE(i."igst", 0) = 0
      `,
    );

    await run(
      "Recompute legacy Invoice payable totals from GST…",
      `
      UPDATE "Invoice"
      SET
        "total" = ROUND(
          "taxableValue" + COALESCE("cgst", 0) + COALESCE("sgst", 0) + COALESCE("igst", 0)
        ),
        "roundOff" = ROUND(
          "taxableValue" + COALESCE("cgst", 0) + COALESCE("sgst", 0) + COALESCE("igst", 0)
        ) - (
          "taxableValue" + COALESCE("cgst", 0) + COALESCE("sgst", 0) + COALESCE("igst", 0)
        )
      WHERE "taxableValue" > 0
        AND ABS(
          "total" - (
            "taxableValue" + COALESCE("cgst", 0) + COALESCE("sgst", 0) + COALESCE("igst", 0)
          )
        ) < 0.01
        AND (COALESCE("cgst", 0) + COALESCE("sgst", 0) + COALESCE("igst", 0)) > 0
      `,
    );
  }
};

const ensureTransferInvoiceSchema = async () => {
  const alters = [
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "contactPersonName" TEXT`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "contactPersonPhone" TEXT`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "courierCompany" TEXT`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "dispatchDate" TIMESTAMP(3)`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "invoiceNo" TEXT`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "invoicedAt" TIMESTAMP(3)`,
    `ALTER TABLE "StockTransferItem" ADD COLUMN IF NOT EXISTS "weightGrams" DECIMAL(10,3)`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "stockTransferId" TEXT`,
    `ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "saleSource" TEXT NOT NULL DEFAULT 'Direct'`,
  ];

  for (const sql of alters) {
    await run(`Apply: ${sql.slice(0, 72).replace(/\s+/g, " ")}…`, sql);
  }
};

const ensureStockTransferStatus = async () => {
  await run(
    "Ensure StockTransferStatus enum…",
    `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockTransferStatus') THEN
        CREATE TYPE "StockTransferStatus" AS ENUM ('Pending', 'Accepted', 'Rejected', 'PartiallyAccepted');
      END IF;
    END $$;
    `,
  );

  const alters = [
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "goldMakingChargesPct" DECIMAL(5,2) NOT NULL DEFAULT 17.00`,
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "silverMakingChargesPct" DECIMAL(5,2) NOT NULL DEFAULT 17.00`,
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "makingChargesOverrideNote" TEXT`,
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "email" TEXT`,
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "cinNumber" TEXT`,
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "goldHsnCode" TEXT DEFAULT '7113'`,
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "silverHsnCode" TEXT DEFAULT '7113'`,
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "imitationHsnCode" TEXT DEFAULT '71179010'`,
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "invoiceTerms" TEXT`,
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "registeredOfficeAddress" TEXT`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "status" "StockTransferStatus" NOT NULL DEFAULT 'Pending'`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "acceptedById" TEXT`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "acceptedByName" TEXT`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3)`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT`,
    `ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "notes" TEXT`,
    `ALTER TABLE "StockTransferItem" ADD COLUMN IF NOT EXISTS "accepted" BOOLEAN NOT NULL DEFAULT true`,
  ];

  for (const sql of alters) {
    await run(`Apply: ${sql.slice(0, 60)}…`, sql);
  }

  await run(
    "Ensure MetalMarketRate table…",
    `
    CREATE TABLE IF NOT EXISTS "MetalMarketRate" (
      "id" TEXT NOT NULL,
      "metalType" TEXT NOT NULL,
      "purity" TEXT NOT NULL,
      "ratePerGram" DECIMAL(12,2) NOT NULL,
      "source" TEXT NOT NULL,
      "fetchedAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MetalMarketRate_pkey" PRIMARY KEY ("id")
    )
    `,
  );

  await run(
    "Ensure StockTransfer indexes…",
    `CREATE INDEX IF NOT EXISTS "StockTransfer_status_idx" ON "StockTransfer"("status")`,
  );
  await run(
    "Ensure StockTransfer branch/status index…",
    `CREATE INDEX IF NOT EXISTS "StockTransfer_toBranchId_status_idx" ON "StockTransfer"("toBranchId", "status")`,
  );
  await run(
    "Ensure MetalMarketRate index…",
    `CREATE INDEX IF NOT EXISTS "MetalMarketRate_metalType_purity_fetchedAt_idx" ON "MetalMarketRate"("metalType", "purity", "fetchedAt")`,
  );

  await run(
    "Backfill accepted stock transfers…",
    `
    UPDATE "StockTransfer"
    SET "status" = 'Accepted', "acceptedAt" = COALESCE("acceptedAt", "createdAt")
    WHERE "status" = 'Pending' AND "acceptedAt" IS NULL;
    `,
  );
};

const ensureInventoryUnitStaffHold = async () => {
  await run(
    "Ensure InventoryUnit staff hold columns…",
    `ALTER TABLE "InventoryUnit" ADD COLUMN IF NOT EXISTS "heldForCustomerName" TEXT`,
  );
  await run(
    "Ensure InventoryUnit.heldForCustomerId column…",
    `ALTER TABLE "InventoryUnit" ADD COLUMN IF NOT EXISTS "heldForCustomerId" TEXT`,
  );
  await run(
    "Ensure InventoryUnit.heldAt column…",
    `ALTER TABLE "InventoryUnit" ADD COLUMN IF NOT EXISTS "heldAt" TIMESTAMP(3)`,
  );
  await run(
    "Ensure InventoryUnit.heldByName column…",
    `ALTER TABLE "InventoryUnit" ADD COLUMN IF NOT EXISTS "heldByName" TEXT`,
  );
  await run(
    "Ensure InventoryUnit.holdNotes column…",
    `ALTER TABLE "InventoryUnit" ADD COLUMN IF NOT EXISTS "holdNotes" TEXT`,
  );
};

const ensureInventoryUnitListPrice = async () => {
  await run(
    "Ensure InventoryUnit.listPrice column…",
    `ALTER TABLE "InventoryUnit" ADD COLUMN IF NOT EXISTS "listPrice" DECIMAL(12,2)`,
  );

  await run(
    "Backfill InventoryUnit.listPrice from product price…",
    `
    UPDATE "InventoryUnit" AS u
    SET "listPrice" = p."price"
    FROM "Product" AS p
    WHERE u."productId" = p."id"
      AND u."listPrice" IS NULL;
    `,
  );

  await run(
    "Backfill sold/reserved unit prices from sale records…",
    `
    UPDATE "InventoryUnit" AS u
    SET "listPrice" = s."listPrice"
    FROM "Sale" AS s
    WHERE s."unitId" = u."id"
      AND u."status" IN ('Sold', 'Reserved');
    `,
  );
};

const DEFAULT_ORG_ID = "org-shree-hari-jewels";

const ensureMultiTenantOrganizations = async () => {
  console.log("Ensure Organization table and tenant columns…");

  const statements = [
    `CREATE TABLE IF NOT EXISTS "Organization" (
      "id" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "emailDomain" TEXT,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
    )`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Organization_slug_key" ON "Organization"("slug")`,
    `INSERT INTO "Organization" ("id", "name", "slug", "emailDomain", "active", "createdAt", "updatedAt")
     VALUES (
       '${DEFAULT_ORG_ID}',
       'Shree Hari Jewels',
       'shree-hari-jewels',
       'shreehari.com',
       true,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
     )
     ON CONFLICT ("id") DO NOTHING`,
    `ALTER TABLE "Branch" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`,
    `UPDATE "Branch" SET "organizationId" = '${DEFAULT_ORG_ID}' WHERE "organizationId" IS NULL`,
    `ALTER TABLE "Branch" ALTER COLUMN "organizationId" SET NOT NULL`,
    `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`,
    `UPDATE "User"
     SET "organizationId" = '${DEFAULT_ORG_ID}'
     WHERE "organizationId" IS NULL AND "role" <> 'SuperAdmin'`,
    `ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`,
    `UPDATE "Customer" SET "organizationId" = '${DEFAULT_ORG_ID}' WHERE "organizationId" IS NULL`,
    `ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL`,
    `ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`,
    `UPDATE "ShopSettings" SET "organizationId" = '${DEFAULT_ORG_ID}' WHERE "organizationId" IS NULL`,
    `ALTER TABLE "ShopSettings" ALTER COLUMN "organizationId" SET NOT NULL`,
    `ALTER TABLE "ShopSettings" ALTER COLUMN "id" DROP DEFAULT`,
    `DROP INDEX IF EXISTS "Customer_mobile_key"`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Customer_organizationId_mobile_key"
     ON "Customer"("organizationId", "mobile")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ShopSettings_organizationId_key"
     ON "ShopSettings"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "Branch_organizationId_idx" ON "Branch"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "User_organizationId_idx" ON "User"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "Customer_organizationId_idx" ON "Customer"("organizationId")`,
  ];

  for (const sql of statements) {
    await run(`Apply: ${sql.slice(0, 72).replace(/\s+/g, " ")}…`, sql);
  }

  await run(
    "Ensure Organization foreign keys…",
    `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Branch_organizationId_fkey'
      ) THEN
        ALTER TABLE "Branch"
          ADD CONSTRAINT "Branch_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'User_organizationId_fkey'
      ) THEN
        ALTER TABLE "User"
          ADD CONSTRAINT "User_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ShopSettings_organizationId_fkey'
      ) THEN
        ALTER TABLE "ShopSettings"
          ADD CONSTRAINT "ShopSettings_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Customer_organizationId_fkey'
      ) THEN
        ALTER TABLE "Customer"
          ADD CONSTRAINT "Customer_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
    `,
  );
};

const ensureOrgScopedInventoryIdentifiers = async () => {
  console.log(
    "Ensure org-scoped design codes, SKUs, barcodes, and run numbers…",
  );

  const tenantTables = ["Design", "Product", "InventoryUnit", "ProductionRun"];

  for (const table of tenantTables) {
    await run(
      `Add ${table}.organizationId if missing…`,
      `ALTER TABLE "${table}" ADD COLUMN IF NOT EXISTS "organizationId" TEXT`,
    );
    await run(
      `Backfill ${table}.organizationId from branch…`,
      `
      UPDATE "${table}" AS t
      SET "organizationId" = b."organizationId"
      FROM "Branch" AS b
      WHERE t."branchId" = b."id"
        AND t."organizationId" IS NULL
      `,
    );
    await run(
      `Fallback ${table}.organizationId for orphaned rows…`,
      `
      UPDATE "${table}"
      SET "organizationId" = '${DEFAULT_ORG_ID}'
      WHERE "organizationId" IS NULL
      `,
    );
    await run(
      `Set ${table}.organizationId NOT NULL…`,
      `ALTER TABLE "${table}" ALTER COLUMN "organizationId" SET NOT NULL`,
    );
  }

  const dropLegacyIndexes = [
    "Design_code_key",
    "Product_sku_key",
    "InventoryUnit_itemCode_key",
    "ProductionRun_runNo_key",
  ];
  for (const index of dropLegacyIndexes) {
    await run(`Drop legacy index ${index}…`, `DROP INDEX IF EXISTS "${index}"`);
  }

  const compositeIndexes = [
    `CREATE UNIQUE INDEX IF NOT EXISTS "Design_organizationId_code_key"
       ON "Design"("organizationId", "code")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "Product_organizationId_sku_key"
       ON "Product"("organizationId", "sku")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "InventoryUnit_organizationId_itemCode_key"
       ON "InventoryUnit"("organizationId", "itemCode")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "ProductionRun_organizationId_runNo_key"
       ON "ProductionRun"("organizationId", "runNo")`,
    `CREATE INDEX IF NOT EXISTS "Design_organizationId_idx" ON "Design"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "Product_organizationId_idx" ON "Product"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "InventoryUnit_organizationId_idx" ON "InventoryUnit"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "ProductionRun_organizationId_idx" ON "ProductionRun"("organizationId")`,
  ];
  for (const sql of compositeIndexes) {
    await run(`Apply: ${sql.slice(0, 72).replace(/\s+/g, " ")}…`, sql);
  }

  await run(
    "Ensure org-scoped inventory foreign keys…",
    `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Design_organizationId_fkey'
      ) THEN
        ALTER TABLE "Design"
          ADD CONSTRAINT "Design_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Product_organizationId_fkey'
      ) THEN
        ALTER TABLE "Product"
          ADD CONSTRAINT "Product_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'InventoryUnit_organizationId_fkey'
      ) THEN
        ALTER TABLE "InventoryUnit"
          ADD CONSTRAINT "InventoryUnit_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ProductionRun_organizationId_fkey'
      ) THEN
        ALTER TABLE "ProductionRun"
          ADD CONSTRAINT "ProductionRun_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$;
    `,
  );
};

const main = async () => {
  if (!(await tableExists("Product"))) {
    console.log(
      "Fresh database detected — skipping legacy deploy migrations (prisma db push will create schema).",
    );
    return;
  }

  await ensureProductStockStatusEnum();
  await ensureInventoryUnitInTransit();
  await ensureInventoryUnitTransferred();
  await ensureStockTransferStatus();
  await ensureTransferInvoiceSchema();
  await ensureInvoiceGstHeaderSchema();
  await ensureInventoryUnitListPrice();
  await ensureInventoryUnitStaffHold();
  await ensureMultiTenantOrganizations();
  await ensureOrgScopedInventoryIdentifiers();
  await ensureTenantStorefront();
  console.log("Deploy schema migration complete."  );
};

const ensureStorefrontTables = async () => {
  console.log("Ensure storefront tables…");

  await run(
    "Ensure StorefrontSettings table…",
    `
    CREATE TABLE IF NOT EXISTS "StorefrontSettings" (
      "id" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "enabled" BOOLEAN NOT NULL DEFAULT false,
      "tagline" TEXT,
      "heroTitle" TEXT,
      "heroSubtitle" TEXT,
      "aboutText" TEXT,
      "primaryColor" TEXT NOT NULL DEFAULT '#b8860b',
      "accentColor" TEXT NOT NULL DEFAULT '#1a1a1a',
      "logoUrl" TEXT,
      "bannerUrl" TEXT,
      "contactEmail" TEXT,
      "contactPhone" TEXT,
      "instagramUrl" TEXT,
      "facebookUrl" TEXT,
      "whatsappNumber" TEXT,
      "shippingNote" TEXT,
      "returnPolicy" TEXT,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StorefrontSettings_pkey" PRIMARY KEY ("id")
    )
    `,
  );

  await run(
    "Ensure StorefrontCollection table…",
    `
    CREATE TABLE IF NOT EXISTS "StorefrontCollection" (
      "id" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "name" TEXT NOT NULL,
      "slug" TEXT NOT NULL,
      "description" TEXT,
      "imageUrl" TEXT,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      "active" BOOLEAN NOT NULL DEFAULT true,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "StorefrontCollection_pkey" PRIMARY KEY ("id")
    )
    `,
  );

  await run(
    "Ensure StorefrontCollectionProduct table…",
    `
    CREATE TABLE IF NOT EXISTS "StorefrontCollectionProduct" (
      "id" TEXT NOT NULL,
      "collectionId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "sortOrder" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "StorefrontCollectionProduct_pkey" PRIMARY KEY ("id")
    )
    `,
  );

  await run(
    "Ensure WebOrder table…",
    `
    CREATE TABLE IF NOT EXISTS "WebOrder" (
      "id" TEXT NOT NULL,
      "organizationId" TEXT NOT NULL,
      "branchId" TEXT NOT NULL,
      "orderNo" TEXT NOT NULL,
      "customerId" TEXT,
      "customerName" TEXT NOT NULL,
      "customerEmail" TEXT,
      "customerMobile" TEXT NOT NULL,
      "addressLine1" TEXT NOT NULL,
      "addressLine2" TEXT,
      "city" TEXT NOT NULL,
      "state" TEXT NOT NULL,
      "pincode" TEXT NOT NULL,
      "country" TEXT NOT NULL DEFAULT 'India',
      "status" "WebOrderStatus" NOT NULL DEFAULT 'Pending',
      "paymentStatus" "WebOrderPaymentStatus" NOT NULL DEFAULT 'Unpaid',
      "totalAmount" DECIMAL(12,2) NOT NULL,
      "notes" TEXT,
      "erpOrderId" TEXT,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "WebOrder_pkey" PRIMARY KEY ("id")
    )
    `,
  );

  await run(
    "Ensure WebOrderItem table…",
    `
    CREATE TABLE IF NOT EXISTS "WebOrderItem" (
      "id" TEXT NOT NULL,
      "webOrderId" TEXT NOT NULL,
      "productId" TEXT NOT NULL,
      "productSku" TEXT NOT NULL,
      "productName" TEXT NOT NULL,
      "quantity" INTEGER NOT NULL DEFAULT 1,
      "unitPrice" DECIMAL(12,2) NOT NULL,
      "lineTotal" DECIMAL(12,2) NOT NULL,
      "reservedUnitIds" JSONB NOT NULL DEFAULT '[]',
      CONSTRAINT "WebOrderItem_pkey" PRIMARY KEY ("id")
    )
    `,
  );

  const indexes = [
    `CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontSettings_organizationId_key" ON "StorefrontSettings"("organizationId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontCollection_organizationId_slug_key" ON "StorefrontCollection"("organizationId", "slug")`,
    `CREATE INDEX IF NOT EXISTS "StorefrontCollection_organizationId_idx" ON "StorefrontCollection"("organizationId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "StorefrontCollectionProduct_collectionId_productId_key" ON "StorefrontCollectionProduct"("collectionId", "productId")`,
    `CREATE INDEX IF NOT EXISTS "StorefrontCollectionProduct_collectionId_idx" ON "StorefrontCollectionProduct"("collectionId")`,
    `CREATE INDEX IF NOT EXISTS "StorefrontCollectionProduct_productId_idx" ON "StorefrontCollectionProduct"("productId")`,
    `CREATE UNIQUE INDEX IF NOT EXISTS "WebOrder_organizationId_orderNo_key" ON "WebOrder"("organizationId", "orderNo")`,
    `CREATE INDEX IF NOT EXISTS "WebOrder_organizationId_idx" ON "WebOrder"("organizationId")`,
    `CREATE INDEX IF NOT EXISTS "WebOrder_branchId_idx" ON "WebOrder"("branchId")`,
    `CREATE INDEX IF NOT EXISTS "WebOrder_status_idx" ON "WebOrder"("status")`,
    `CREATE INDEX IF NOT EXISTS "WebOrder_createdAt_idx" ON "WebOrder"("createdAt")`,
    `CREATE INDEX IF NOT EXISTS "WebOrderItem_webOrderId_idx" ON "WebOrderItem"("webOrderId")`,
    `CREATE INDEX IF NOT EXISTS "WebOrderItem_productId_idx" ON "WebOrderItem"("productId")`,
  ];
  for (const sql of indexes) {
    await run(`Apply: ${sql.slice(0, 72).replace(/\s+/g, " ")}…`, sql);
  }

  await run(
    "Ensure storefront foreign keys…",
    `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StorefrontSettings_organizationId_fkey') THEN
        ALTER TABLE "StorefrontSettings"
          ADD CONSTRAINT "StorefrontSettings_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StorefrontCollection_organizationId_fkey') THEN
        ALTER TABLE "StorefrontCollection"
          ADD CONSTRAINT "StorefrontCollection_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StorefrontCollectionProduct_collectionId_fkey') THEN
        ALTER TABLE "StorefrontCollectionProduct"
          ADD CONSTRAINT "StorefrontCollectionProduct_collectionId_fkey"
          FOREIGN KEY ("collectionId") REFERENCES "StorefrontCollection"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'StorefrontCollectionProduct_productId_fkey') THEN
        ALTER TABLE "StorefrontCollectionProduct"
          ADD CONSTRAINT "StorefrontCollectionProduct_productId_fkey"
          FOREIGN KEY ("productId") REFERENCES "Product"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebOrder_organizationId_fkey') THEN
        ALTER TABLE "WebOrder"
          ADD CONSTRAINT "WebOrder_organizationId_fkey"
          FOREIGN KEY ("organizationId") REFERENCES "Organization"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebOrder_branchId_fkey') THEN
        ALTER TABLE "WebOrder"
          ADD CONSTRAINT "WebOrder_branchId_fkey"
          FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebOrder_customerId_fkey') THEN
        ALTER TABLE "WebOrder"
          ADD CONSTRAINT "WebOrder_customerId_fkey"
          FOREIGN KEY ("customerId") REFERENCES "Customer"("id")
          ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebOrderItem_webOrderId_fkey') THEN
        ALTER TABLE "WebOrderItem"
          ADD CONSTRAINT "WebOrderItem_webOrderId_fkey"
          FOREIGN KEY ("webOrderId") REFERENCES "WebOrder"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'WebOrderItem_productId_fkey') THEN
        ALTER TABLE "WebOrderItem"
          ADD CONSTRAINT "WebOrderItem_productId_fkey"
          FOREIGN KEY ("productId") REFERENCES "Product"("id")
          ON DELETE RESTRICT ON UPDATE CASCADE;
      END IF;
    END $$;
    `,
  );
};

const ensureTenantStorefront = async () => {
  console.log("Ensure tenant storefront schema and demo org backfill…");

  await run(
    "Ensure WebOrder enums…",
    `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebOrderStatus') THEN
        CREATE TYPE "WebOrderStatus" AS ENUM ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled');
      END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'WebOrderPaymentStatus') THEN
        CREATE TYPE "WebOrderPaymentStatus" AS ENUM ('Unpaid', 'Paid', 'Refunded');
      END IF;
    END $$;
    `,
  );

  const alters = [
    `ALTER TABLE "Organization" ADD COLUMN IF NOT EXISTS "customDomain" TEXT`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "publishedToStorefront" BOOLEAN NOT NULL DEFAULT false`,
    `ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "storefrontDescription" TEXT`,
  ];
  for (const sql of alters) {
    await run(`Apply: ${sql.slice(0, 60)}…`, sql);
  }

  await run(
    "Ensure Organization.customDomain index…",
    `CREATE UNIQUE INDEX IF NOT EXISTS "Organization_customDomain_key" ON "Organization"("customDomain")`,
  );

  await ensureStorefrontTables();

  if (await tableExists("WebOrderItem")) {
    await run(
      "Ensure WebOrderItem.reservedUnitIds column…",
      `ALTER TABLE "WebOrderItem" ADD COLUMN IF NOT EXISTS "reservedUnitIds" JSONB NOT NULL DEFAULT '[]'`,
    );
  }

  await run(
    "Backfill StorefrontSettings rows…",
    `
    INSERT INTO "StorefrontSettings" ("id", "organizationId", "enabled", "primaryColor", "accentColor", "updatedAt")
    SELECT gen_random_uuid()::text, o."id", false, '#b8860b', '#1a1a1a', NOW()
    FROM "Organization" o
    WHERE NOT EXISTS (
      SELECT 1 FROM "StorefrontSettings" s WHERE s."organizationId" = o."id"
    )
    `,
  );

  await run(
    "Enable demo org storefront…",
    `
    UPDATE "StorefrontSettings" s
    SET
      "enabled" = true,
      "tagline" = COALESCE(s."tagline", 'Fine handcrafted jewellery since generations'),
      "heroTitle" = COALESCE(s."heroTitle", 'Timeless Elegance'),
      "heroSubtitle" = COALESCE(s."heroSubtitle", 'Discover our exclusive collection of gold and diamond jewellery'),
      "aboutText" = COALESCE(s."aboutText", 'Shree Hari Jewels brings you the finest handcrafted jewellery, blending traditional artistry with contemporary design.'),
      "updatedAt" = NOW()
    FROM "Organization" o
    WHERE s."organizationId" = o."id"
      AND o."slug" = 'shree-hari-jewels'
    `,
  );

  await run(
    "Publish in-stock products for demo org…",
    `
    UPDATE "Product" p
    SET
      "publishedToStorefront" = true,
      "storefrontDescription" = COALESCE(p."storefrontDescription", 'Handcrafted jewellery piece from our collection.')
    FROM "Organization" o
    WHERE p."organizationId" = o."id"
      AND o."slug" = 'shree-hari-jewels'
      AND p."stock" > 0
      AND p."publishedToStorefront" = false
    `,
  );
};

main()
  .catch((error) => {
    console.error("Deploy schema migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
