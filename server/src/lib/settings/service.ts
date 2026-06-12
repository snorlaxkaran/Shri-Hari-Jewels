import { prisma } from "../db.js";
import type { ShopSettings, UpdateShopSettingsInput } from "../../types.js";

const DEFAULT_SETTINGS: ShopSettings = {
  businessName: "Shree Hari Jewels",
  address: null,
  phone: null,
  upiVpa: null,
};

export const getShopSettings = async (): Promise<ShopSettings> => {
  const settings = await prisma.shopSettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    const created = await prisma.shopSettings.create({
      data: { id: "default" },
    });
    return {
      businessName: created.businessName,
      address: created.address,
      phone: created.phone,
      upiVpa: created.upiVpa,
    };
  }

  return {
    businessName: settings.businessName,
    address: settings.address,
    phone: settings.phone,
    upiVpa: settings.upiVpa,
  };
};

export const updateShopSettings = async (
  input: UpdateShopSettingsInput,
): Promise<ShopSettings> => {
  const settings = await prisma.shopSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      businessName: input.businessName?.trim() || DEFAULT_SETTINGS.businessName,
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      upiVpa: input.upiVpa?.trim() || null,
    },
    update: {
      businessName: input.businessName?.trim(),
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      upiVpa: input.upiVpa?.trim() || null,
    },
  });

  return {
    businessName: settings.businessName,
    address: settings.address,
    phone: settings.phone,
    upiVpa: settings.upiVpa,
  };
};
