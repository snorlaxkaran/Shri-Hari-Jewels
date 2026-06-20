import { prisma } from "../db.js";
import type { ShopSettings, UpdateShopSettingsInput } from "../../types.js";
import {
  validateGstIfPresent,
  validateIfscIfPresent,
  validatePanIfPresent,
  validatePincodeIfPresent,
} from "../validation/india.js";

const DEFAULT_SETTINGS: ShopSettings = {
  businessName: "Shree Hari Jewels",
  address: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  pincode: null,
  country: "India",
  phone: null,
  upiVpa: null,
  panNumber: null,
  gstNumber: null,
  gstRegisteredName: null,
  bankAccountName: null,
  bankAccountNumber: null,
  bankIfsc: null,
  bankName: null,
};

const trimOrNull = (value: string | undefined): string | null => {
  if (value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toShopSettings = (settings: {
  businessName: string;
  address: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  country: string | null;
  phone: string | null;
  upiVpa: string | null;
  panNumber: string | null;
  gstNumber: string | null;
  gstRegisteredName: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
}): ShopSettings => ({
  businessName: settings.businessName,
  address: settings.address,
  addressLine1: settings.addressLine1,
  addressLine2: settings.addressLine2,
  city: settings.city,
  state: settings.state,
  pincode: settings.pincode,
  country: settings.country,
  phone: settings.phone,
  upiVpa: settings.upiVpa,
  panNumber: settings.panNumber,
  gstNumber: settings.gstNumber,
  gstRegisteredName: settings.gstRegisteredName,
  bankAccountName: settings.bankAccountName,
  bankAccountNumber: settings.bankAccountNumber,
  bankIfsc: settings.bankIfsc,
  bankName: settings.bankName,
});

const validateSettingsInput = (input: UpdateShopSettingsInput) => {
  try {
    return {
      panNumber: validatePanIfPresent(input.panNumber),
      gstNumber: validateGstIfPresent(input.gstNumber),
      gstRegisteredName: trimOrNull(input.gstRegisteredName),
      pincode: validatePincodeIfPresent(input.pincode),
      bankIfsc: validateIfscIfPresent(input.bankIfsc),
    };
  } catch (error) {
    throw new Error(
      error instanceof Error ? error.message : "Invalid shop settings.",
    );
  }
};

export const getShopSettings = async (): Promise<ShopSettings> => {
  const settings = await prisma.shopSettings.findUnique({
    where: { id: "default" },
  });

  if (!settings) {
    const created = await prisma.shopSettings.create({
      data: { id: "default" },
    });
    return toShopSettings(created);
  }

  return toShopSettings(settings);
};

export const updateShopSettings = async (
  input: UpdateShopSettingsInput,
): Promise<ShopSettings> => {
  const validated = validateSettingsInput(input);

  const settings = await prisma.shopSettings.upsert({
    where: { id: "default" },
    create: {
      id: "default",
      businessName: input.businessName?.trim() || DEFAULT_SETTINGS.businessName,
      address: trimOrNull(input.address),
      addressLine1: trimOrNull(input.addressLine1),
      addressLine2: trimOrNull(input.addressLine2),
      city: trimOrNull(input.city),
      state: trimOrNull(input.state),
      pincode: validated.pincode,
      country: trimOrNull(input.country) ?? "India",
      phone: trimOrNull(input.phone),
      upiVpa: trimOrNull(input.upiVpa),
      panNumber: validated.panNumber,
      gstNumber: validated.gstNumber,
      gstRegisteredName: validated.gstRegisteredName,
      bankAccountName: trimOrNull(input.bankAccountName),
      bankAccountNumber: trimOrNull(input.bankAccountNumber),
      bankIfsc: validated.bankIfsc,
      bankName: trimOrNull(input.bankName),
    },
    update: {
      ...(input.businessName !== undefined && {
        businessName: input.businessName.trim(),
      }),
      ...(input.address !== undefined && { address: trimOrNull(input.address) }),
      ...(input.addressLine1 !== undefined && {
        addressLine1: trimOrNull(input.addressLine1),
      }),
      ...(input.addressLine2 !== undefined && {
        addressLine2: trimOrNull(input.addressLine2),
      }),
      ...(input.city !== undefined && { city: trimOrNull(input.city) }),
      ...(input.state !== undefined && { state: trimOrNull(input.state) }),
      ...(input.pincode !== undefined && { pincode: validated.pincode }),
      ...(input.country !== undefined && {
        country: trimOrNull(input.country) ?? "India",
      }),
      ...(input.phone !== undefined && { phone: trimOrNull(input.phone) }),
      ...(input.upiVpa !== undefined && { upiVpa: trimOrNull(input.upiVpa) }),
      ...(input.panNumber !== undefined && { panNumber: validated.panNumber }),
      ...(input.gstNumber !== undefined && { gstNumber: validated.gstNumber }),
      ...(input.gstRegisteredName !== undefined && {
        gstRegisteredName: validated.gstRegisteredName,
      }),
      ...(input.bankAccountName !== undefined && {
        bankAccountName: trimOrNull(input.bankAccountName),
      }),
      ...(input.bankAccountNumber !== undefined && {
        bankAccountNumber: trimOrNull(input.bankAccountNumber),
      }),
      ...(input.bankIfsc !== undefined && { bankIfsc: validated.bankIfsc }),
      ...(input.bankName !== undefined && { bankName: trimOrNull(input.bankName) }),
    },
  });

  return toShopSettings(settings);
};
