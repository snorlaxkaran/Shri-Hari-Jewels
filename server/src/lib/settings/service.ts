import { prisma } from "../db.js";
import type { ShopSettings, UpdateShopSettingsInput } from "../../types.js";
import {
  validateGstIfPresent,
  validateIfscIfPresent,
  validatePanIfPresent,
  validatePincodeIfPresent,
} from "../validation/india.js";

const DEFAULT_INVOICE_TERMS =
  "Goods once sold will not be taken back. Subject to Jaipur jurisdiction only.";

const DEFAULT_SETTINGS: ShopSettings = {
  businessName: "Jewellery Business",
  address: null,
  addressLine1: null,
  addressLine2: null,
  city: null,
  state: null,
  pincode: null,
  country: "India",
  phone: null,
  email: null,
  upiVpa: null,
  panNumber: null,
  gstNumber: null,
  cinNumber: null,
  gstRegisteredName: null,
  goldHsnCode: "7113",
  silverHsnCode: "7113",
  imitationHsnCode: "71179010",
  invoiceTerms: DEFAULT_INVOICE_TERMS,
  registeredOfficeAddress: null,
  bankAccountName: null,
  bankAccountNumber: null,
  bankIfsc: null,
  bankName: null,
  goldMakingChargesPct: 17,
  silverMakingChargesPct: 17,
  makingChargesOverrideNote: null,
  metalWastageAlertPercent: 3,
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
  email: string | null;
  upiVpa: string | null;
  panNumber: string | null;
  gstNumber: string | null;
  cinNumber: string | null;
  gstRegisteredName: string | null;
  goldHsnCode: string | null;
  silverHsnCode: string | null;
  imitationHsnCode: string | null;
  invoiceTerms: string | null;
  registeredOfficeAddress: string | null;
  bankAccountName: string | null;
  bankAccountNumber: string | null;
  bankIfsc: string | null;
  bankName: string | null;
  goldMakingChargesPct?: { toString(): string } | number | null;
  silverMakingChargesPct?: { toString(): string } | number | null;
  makingChargesOverrideNote?: string | null;
  metalWastageAlertPercent?: { toString(): string } | number | null;
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
  email: settings.email,
  upiVpa: settings.upiVpa,
  panNumber: settings.panNumber,
  gstNumber: settings.gstNumber,
  cinNumber: settings.cinNumber,
  gstRegisteredName: settings.gstRegisteredName,
  goldHsnCode: settings.goldHsnCode ?? "7113",
  silverHsnCode: settings.silverHsnCode ?? "7113",
  imitationHsnCode: settings.imitationHsnCode ?? "71179010",
  invoiceTerms: settings.invoiceTerms ?? DEFAULT_INVOICE_TERMS,
  registeredOfficeAddress: settings.registeredOfficeAddress,
  bankAccountName: settings.bankAccountName,
  bankAccountNumber: settings.bankAccountNumber,
  bankIfsc: settings.bankIfsc,
  bankName: settings.bankName,
  goldMakingChargesPct: Number(settings.goldMakingChargesPct ?? 17),
  silverMakingChargesPct: Number(settings.silverMakingChargesPct ?? 17),
  makingChargesOverrideNote: settings.makingChargesOverrideNote ?? null,
  metalWastageAlertPercent: Number(settings.metalWastageAlertPercent ?? 3),
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

export const getShopSettingsByBranchId = async (
  branchId: string,
): Promise<ShopSettings> => {
  const branch = await prisma.branch.findUniqueOrThrow({
    where: { id: branchId },
    select: { organizationId: true },
  });
  return getShopSettings(branch.organizationId);
};

export const getShopSettings = async (organizationId: string): Promise<ShopSettings> => {
  const settings = await prisma.shopSettings.findUnique({
    where: { organizationId },
  });

  if (!settings) {
    const created = await prisma.shopSettings.create({
      data: { organizationId },
    });
    return toShopSettings(created);
  }

  return toShopSettings(settings);
};

export const updateShopSettings = async (
  organizationId: string,
  input: UpdateShopSettingsInput,
): Promise<ShopSettings> => {
  const validated = validateSettingsInput(input);

  const settings = await prisma.shopSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      businessName: input.businessName?.trim() || DEFAULT_SETTINGS.businessName,
      address: trimOrNull(input.address),
      addressLine1: trimOrNull(input.addressLine1),
      addressLine2: trimOrNull(input.addressLine2),
      city: trimOrNull(input.city),
      state: trimOrNull(input.state),
      pincode: validated.pincode,
      country: trimOrNull(input.country) ?? "India",
      phone: trimOrNull(input.phone),
      email: trimOrNull(input.email),
      upiVpa: trimOrNull(input.upiVpa),
      panNumber: validated.panNumber,
      gstNumber: validated.gstNumber,
      cinNumber: trimOrNull(input.cinNumber),
      gstRegisteredName: validated.gstRegisteredName,
      goldHsnCode: trimOrNull(input.goldHsnCode) ?? "7113",
      silverHsnCode: trimOrNull(input.silverHsnCode) ?? "7113",
      imitationHsnCode: trimOrNull(input.imitationHsnCode) ?? "71179010",
      invoiceTerms: trimOrNull(input.invoiceTerms) ?? DEFAULT_INVOICE_TERMS,
      registeredOfficeAddress: trimOrNull(input.registeredOfficeAddress),
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
      ...(input.email !== undefined && { email: trimOrNull(input.email) }),
      ...(input.upiVpa !== undefined && { upiVpa: trimOrNull(input.upiVpa) }),
      ...(input.panNumber !== undefined && { panNumber: validated.panNumber }),
      ...(input.gstNumber !== undefined && { gstNumber: validated.gstNumber }),
      ...(input.cinNumber !== undefined && { cinNumber: trimOrNull(input.cinNumber) }),
      ...(input.gstRegisteredName !== undefined && {
        gstRegisteredName: validated.gstRegisteredName,
      }),
      ...(input.goldHsnCode !== undefined && {
        goldHsnCode: trimOrNull(input.goldHsnCode) ?? "7113",
      }),
      ...(input.silverHsnCode !== undefined && {
        silverHsnCode: trimOrNull(input.silverHsnCode) ?? "7113",
      }),
      ...(input.imitationHsnCode !== undefined && {
        imitationHsnCode: trimOrNull(input.imitationHsnCode) ?? "71179010",
      }),
      ...(input.invoiceTerms !== undefined && {
        invoiceTerms: trimOrNull(input.invoiceTerms) ?? DEFAULT_INVOICE_TERMS,
      }),
      ...(input.registeredOfficeAddress !== undefined && {
        registeredOfficeAddress: trimOrNull(input.registeredOfficeAddress),
      }),
      ...(input.bankAccountName !== undefined && {
        bankAccountName: trimOrNull(input.bankAccountName),
      }),
      ...(input.bankAccountNumber !== undefined && {
        bankAccountNumber: trimOrNull(input.bankAccountNumber),
      }),
      ...(input.bankIfsc !== undefined && { bankIfsc: validated.bankIfsc }),
      ...(input.bankName !== undefined && { bankName: trimOrNull(input.bankName) }),
      ...(input.goldMakingChargesPct !== undefined && {
        goldMakingChargesPct: input.goldMakingChargesPct,
      }),
      ...(input.silverMakingChargesPct !== undefined && {
        silverMakingChargesPct: input.silverMakingChargesPct,
      }),
      ...(input.makingChargesOverrideNote !== undefined && {
        makingChargesOverrideNote: trimOrNull(input.makingChargesOverrideNote),
      }),
      ...(input.metalWastageAlertPercent !== undefined && {
        metalWastageAlertPercent: input.metalWastageAlertPercent,
      }),
    },
  });

  return toShopSettings(settings);
};
