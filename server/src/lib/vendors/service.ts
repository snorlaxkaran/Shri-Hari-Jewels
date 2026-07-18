import { prisma } from "../db.js";
import type { NewVendorInput, UpdateVendorInput, Vendor } from "../../types.js";
import { moneyToNumber, toMoney } from "../money.js";

export class VendorError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "VendorError";
  }
}

const toVendor = (row: {
  id: string;
  organizationId: string;
  name: string;
  gstNumber: string | null;
  panNumber: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  openingBalance: { toString(): string };
  createdAt: Date;
}): Vendor => ({
  id: row.id,
  organizationId: row.organizationId,
  name: row.name,
  gstNumber: row.gstNumber ?? undefined,
  panNumber: row.panNumber ?? undefined,
  address: row.address ?? undefined,
  phone: row.phone ?? undefined,
  email: row.email ?? undefined,
  openingBalance: moneyToNumber(row.openingBalance.toString()),
  createdAt: row.createdAt.toISOString(),
});

export const listVendors = async (organizationId: string): Promise<Vendor[]> => {
  const rows = await prisma.vendor.findMany({
    where: { organizationId },
    orderBy: { name: "asc" },
  });
  return rows.map(toVendor);
};

export const getVendor = async (
  id: string,
  organizationId: string,
): Promise<Vendor | null> => {
  const row = await prisma.vendor.findFirst({ where: { id, organizationId } });
  return row ? toVendor(row) : null;
};

export const createVendor = async (
  organizationId: string,
  input: NewVendorInput,
): Promise<Vendor> => {
  if (!input.name?.trim()) throw new VendorError("Vendor name is required.");

  const row = await prisma.vendor.create({
    data: {
      organizationId,
      name: input.name.trim(),
      gstNumber: input.gstNumber?.trim() || null,
      panNumber: input.panNumber?.trim() || null,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      openingBalance: toMoney(input.openingBalance ?? 0),
    },
  });
  return toVendor(row);
};

export const updateVendor = async (
  id: string,
  organizationId: string,
  input: UpdateVendorInput,
): Promise<Vendor> => {
  const existing = await prisma.vendor.findFirst({ where: { id, organizationId } });
  if (!existing) throw new VendorError("Vendor not found.", 404);

  const row = await prisma.vendor.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      gstNumber: input.gstNumber === undefined ? undefined : input.gstNumber?.trim() || null,
      panNumber: input.panNumber === undefined ? undefined : input.panNumber?.trim() || null,
      address: input.address === undefined ? undefined : input.address?.trim() || null,
      phone: input.phone === undefined ? undefined : input.phone?.trim() || null,
      email: input.email === undefined ? undefined : input.email?.trim() || null,
      openingBalance:
        input.openingBalance === undefined ? undefined : toMoney(input.openingBalance),
    },
  });
  return toVendor(row);
};
