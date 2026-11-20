import type { Prisma } from "@prisma/client";
import { isMysqlDatabaseUrl } from "../coerce-string-array.js";

type TransactionClient = Prisma.TransactionClient;

/** Pessimistic row lock — must run inside an open transaction. */
export const lockMetalLotForUpdate = async (
  tx: TransactionClient,
  lotId: string,
): Promise<void> => {
  if (isMysqlDatabaseUrl()) {
    await tx.$executeRawUnsafe("SELECT id FROM `MetalLot` WHERE id = ? FOR UPDATE", lotId);
    return;
  }
  await tx.$queryRaw`SELECT id FROM "MetalLot" WHERE id = ${lotId} FOR UPDATE`;
};

/** Lock multiple lots in stable order to avoid deadlocks. */
export const lockMetalLotsForUpdate = async (
  tx: TransactionClient,
  lotIds: string[],
): Promise<void> => {
  const uniqueSorted = [...new Set(lotIds)].sort();
  for (const lotId of uniqueSorted) {
    await lockMetalLotForUpdate(tx, lotId);
  }
};

export const lockStoneLotForUpdate = async (
  tx: TransactionClient,
  lotId: string,
): Promise<void> => {
  if (isMysqlDatabaseUrl()) {
    await tx.$executeRawUnsafe(
      "SELECT id FROM `CertifiedStoneLot` WHERE id = ? FOR UPDATE",
      lotId,
    );
    return;
  }
  await tx.$queryRaw`SELECT id FROM "CertifiedStoneLot" WHERE id = ${lotId} FOR UPDATE`;
};
