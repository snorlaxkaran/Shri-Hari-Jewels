/**
 * Converts legacy TEXT (or wrong-label enum) status columns before `db push`.
 * Safe to run repeatedly — skips columns already using the target enum + labels.
 *
 * Run: npx tsx scripts/migrate-status-enums.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type ColumnConversion = {
  table: string;
  column: string;
  enumName: string;
  values: string[];
  usingSql: string;
};

const CONVERSIONS: ColumnConversion[] = [
  {
    table: "Product",
    column: "status",
    enumName: "ProductStockStatus",
    values: ["In Stock", "Low Stock", "Out of Stock"],
    usingSql: `CASE TRIM("status"::text)
      WHEN 'InStock' THEN 'In Stock'::"ProductStockStatus"
      WHEN 'LowStock' THEN 'Low Stock'::"ProductStockStatus"
      WHEN 'OutOfStock' THEN 'Out of Stock'::"ProductStockStatus"
      ELSE TRIM("status"::text)::"ProductStockStatus"
    END`,
  },
  {
    table: "InventoryUnit",
    column: "status",
    enumName: "InventoryUnitStatus",
    values: ["Available", "Reserved", "Sold", "InTransit"],
    usingSql: `TRIM("status"::text)::"InventoryUnitStatus"`,
  },
  {
    table: "Order",
    column: "status",
    enumName: "OrderStatus",
    values: [
      "Pending",
      "Designing",
      "Production",
      "QC",
      "Ready",
      "Delivered",
      "Cancelled",
    ],
    usingSql: `TRIM("status"::text)::"OrderStatus"`,
  },
  {
    table: "Order",
    column: "paymentStatus",
    enumName: "OrderPaymentStatus",
    values: ["Unpaid", "Partial", "Paid"],
    usingSql: `TRIM("paymentStatus"::text)::"OrderPaymentStatus"`,
  },
  {
    table: "ProductionRun",
    column: "status",
    enumName: "ProductionRunStatusEnum",
    values: ["Open", "In Progress", "Completed", "Cancelled"],
    usingSql: `CASE TRIM("status"::text)
      WHEN 'InProgress' THEN 'In Progress'::"ProductionRunStatusEnum"
      ELSE TRIM("status"::text)::"ProductionRunStatusEnum"
    END`,
  },
  {
    table: "WorkOrder",
    column: "status",
    enumName: "WorkOrderStatus",
    values: ["Open", "In Production", "QC", "Completed", "Cancelled"],
    usingSql: `CASE TRIM("status"::text)
      WHEN 'InProduction' THEN 'In Production'::"WorkOrderStatus"
      ELSE TRIM("status"::text)::"WorkOrderStatus"
    END`,
  },
  {
    table: "Sale",
    column: "paymentStatus",
    enumName: "SalePaymentStatus",
    values: ["Pending", "Completed"],
    usingSql: `TRIM("paymentStatus"::text)::"SalePaymentStatus"`,
  },
  {
    table: "StoneLot",
    column: "status",
    enumName: "StoneLotStatus",
    values: ["In Stock", "Reserved", "Issued"],
    usingSql: `CASE TRIM("status"::text)
      WHEN 'InStock' THEN 'In Stock'::"StoneLotStatus"
      ELSE TRIM("status"::text)::"StoneLotStatus"
    END`,
  },
];

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

const normalizeTypeName = (type: string | null): string =>
  type?.replace(/"/g, "").toLowerCase() ?? "";

const isStringColumnType = (type: string): boolean => {
  const normalized = normalizeTypeName(type);
  return (
    normalized === "text" ||
    normalized === "varchar" ||
    normalized === "character varying"
  );
};

const isTargetEnumType = (
  currentType: string | null,
  enumName: string,
): boolean => normalizeTypeName(currentType) === enumName.toLowerCase();

const getColumnType = async (
  table: string,
  column: string,
): Promise<string | null> => {
  const rows = await prisma.$queryRaw<Array<{ udt_name: string }>>`
    SELECT c.udt_name
    FROM information_schema.columns c
    WHERE c.table_schema = 'public'
      AND lower(c.table_name) = lower(${table})
      AND lower(c.column_name) = lower(${column})
  `;
  return rows[0]?.udt_name ?? null;
};

const getEnumLabels = async (enumName: string): Promise<string[]> => {
  const rows = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE lower(t.typname) = lower(${enumName})
    ORDER BY e.enumsortorder
  `;
  return rows.map((row) => row.enumlabel);
};

const enumLabelsMatch = (actual: string[], expected: string[]): boolean =>
  actual.length === expected.length &&
  expected.every((value, index) => actual[index] === value);

const ensureEnum = async (enumName: string, values: string[]) => {
  const enumValues = values.map(quote).join(", ");
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      CREATE TYPE "${enumName}" AS ENUM (${enumValues});
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
};

const recreateEnumColumn = async (conversion: ColumnConversion) => {
  const { table, column, enumName, values, usingSql } = conversion;

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "${table}" ALTER COLUMN "${column}" DROP DEFAULT;
  `).catch(() => undefined);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "${table}"
    ALTER COLUMN "${column}" TYPE TEXT
    USING "${column}"::text;
  `);

  await prisma.$executeRawUnsafe(`DROP TYPE IF EXISTS "${enumName}";`);

  const enumValues = values.map(quote).join(", ");
  await prisma.$executeRawUnsafe(`
    CREATE TYPE "${enumName}" AS ENUM (${enumValues});
  `);

  await prisma.$executeRawUnsafe(`
    ALTER TABLE "${table}"
    ALTER COLUMN "${column}" TYPE "${enumName}"
    USING (${usingSql});
  `);
};

const convertColumn = async (conversion: ColumnConversion) => {
  const currentType = await getColumnType(conversion.table, conversion.column);
  if (!currentType) {
    console.log(
      `Skip ${conversion.table}.${conversion.column} — column not found yet.`,
    );
    return;
  }

  if (isTargetEnumType(currentType, conversion.enumName)) {
    const labels = await getEnumLabels(conversion.enumName);
    if (enumLabelsMatch(labels, conversion.values)) {
      console.log(
        `Skip ${conversion.table}.${conversion.column} — enum labels already correct.`,
      );
      return;
    }

    console.log(
      `Fixing ${conversion.table}.${conversion.column} enum labels (${labels.join(", ")} -> ${conversion.values.join(", ")})...`,
    );
    await recreateEnumColumn(conversion);
    console.log(`Fixed ${conversion.table}.${conversion.column}.`);
    return;
  }

  console.log(
    `Converting ${conversion.table}.${conversion.column} (${currentType} -> ${conversion.enumName})...`,
  );

  if (!isStringColumnType(currentType)) {
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "${conversion.table}"
      ALTER COLUMN "${conversion.column}" TYPE TEXT
      USING "${conversion.column}"::text;
    `);
  }

  await ensureEnum(conversion.enumName, conversion.values);
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "${conversion.table}"
    ALTER COLUMN "${conversion.column}" TYPE "${conversion.enumName}"
    USING (${conversion.usingSql});
  `);

  console.log(`Converted ${conversion.table}.${conversion.column}.`);
};

const verifyEnumColumns = async () => {
  const failures: string[] = [];

  for (const conversion of CONVERSIONS) {
    const currentType = await getColumnType(conversion.table, conversion.column);
    if (!currentType) continue;

    if (isStringColumnType(currentType)) {
      failures.push(
        `${conversion.table}.${conversion.column} is still ${currentType}`,
      );
      continue;
    }

    if (!isTargetEnumType(currentType, conversion.enumName)) {
      failures.push(
        `${conversion.table}.${conversion.column} is ${currentType}, expected ${conversion.enumName}`,
      );
      continue;
    }

    const labels = await getEnumLabels(conversion.enumName);
    if (!enumLabelsMatch(labels, conversion.values)) {
      failures.push(
        `${conversion.table}.${conversion.column} labels [${labels.join(", ")}] != [${conversion.values.join(", ")}]`,
      );
    }
  }

  if (failures.length > 0) {
    throw new Error(
      `Status enum verification failed before db push:\n- ${failures.join("\n- ")}`,
    );
  }
};

const addEnumValueIfMissing = async (
  enumName: string,
  value: string,
): Promise<void> => {
  const labels = await getEnumLabels(enumName);
  if (labels.includes(value)) return;

  console.log(`Adding ${enumName}.${value}…`);
  await prisma.$executeRawUnsafe(`
    DO $$ BEGIN
      ALTER TYPE "${enumName}" ADD VALUE '${value.replace(/'/g, "''")}';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
  `);
};

const main = async () => {
  for (const conversion of CONVERSIONS) {
    await convertColumn(conversion);
  }

  if (await getColumnType("InventoryUnit", "status")) {
    await ensureEnum("InventoryUnitStatus", [
      "Available",
      "Reserved",
      "Sold",
      "InTransit",
    ]);
    await addEnumValueIfMissing("InventoryUnitStatus", "InTransit");
  }

  await verifyEnumColumns();
  console.log("Status enum migration complete.");
};

main()
  .catch((error) => {
    console.error("Status enum migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
