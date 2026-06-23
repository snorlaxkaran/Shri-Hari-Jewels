import { prisma } from "../db.js";
import type {
  Customer,
  CustomerDetail,
  NewCustomerInput,
  UpdateCustomerInput,
} from "../../types.js";
import { toSale } from "../sales/mappers.js";
import { toCustomer } from "./mappers.js";
import { validateCustomerFinancialFields } from "./validation.js";

export class CustomerError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "CustomerError";
  }
}

const customerInclude = { sales: true };

const trimOrNull = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const validateFinancialFields = (input: NewCustomerInput | UpdateCustomerInput) => {
  try {
    return validateCustomerFinancialFields(input);
  } catch (error) {
    throw new CustomerError(
      error instanceof Error ? error.message : "Invalid customer financial details.",
    );
  }
};

export const listCustomers = async (organizationId: string): Promise<Customer[]> => {
  const customers = await prisma.customer.findMany({
    where: { organizationId },
    include: customerInclude,
    orderBy: { createdAt: "desc" },
  });
  return customers.map(toCustomer);
};

export const getCustomer = async (
  id: string,
  organizationId: string,
): Promise<Customer | null> => {
  const customer = await prisma.customer.findFirst({
    where: { id, organizationId },
    include: customerInclude,
  });
  return customer ? toCustomer(customer) : null;
};

export const getCustomerDetail = async (
  id: string,
  organizationId: string,
): Promise<CustomerDetail | null> => {
  const customer = await prisma.customer.findFirst({
    where: { id, organizationId },
    include: {
      sales: { orderBy: { soldAt: "desc" } },
    },
  });
  if (!customer) return null;

  const base = toCustomer({ ...customer, sales: customer.sales });
  return {
    ...base,
    sales: customer.sales.map(toSale),
  };
};

export const createCustomer = async (
  organizationId: string,
  input: NewCustomerInput,
): Promise<Customer> => {
  const name = input.name.trim();
  const mobile = input.mobile.trim();

  if (!name) throw new CustomerError("Customer name is required.");
  if (!mobile) throw new CustomerError("Mobile number is required.");

  const existing = await prisma.customer.findUnique({
    where: { organizationId_mobile: { organizationId, mobile } },
  });
  if (existing) {
    throw new CustomerError("A customer with this mobile number already exists.");
  }

  const financial = validateFinancialFields(input);

  const customer = await prisma.customer.create({
    data: {
      organizationId,
      name,
      mobile,
      email: trimOrNull(input.email),
      address: trimOrNull(input.address),
      city: trimOrNull(input.city),
      billingAddressLine1: financial.billingAddressLine1,
      billingAddressLine2: financial.billingAddressLine2,
      billingCity: financial.billingCity,
      billingState: financial.billingState,
      billingPincode: financial.billingPincode,
      billingCountry: financial.billingCountry,
      panNumber: financial.panNumber,
      gstNumber: financial.gstNumber,
      gstRegisteredName: financial.gstRegisteredName,
      bankAccountName: financial.bankAccountName,
      bankAccountNumber: financial.bankAccountNumber,
      bankIfsc: financial.bankIfsc,
      bankName: financial.bankName,
      birthday: input.birthday ? new Date(input.birthday) : null,
      anniversary: input.anniversary ? new Date(input.anniversary) : null,
      ringSize: trimOrNull(input.ringSize),
      preferences: trimOrNull(input.preferences),
    },
    include: customerInclude,
  });

  return toCustomer(customer);
};

export const searchCustomers = async (
  organizationId: string,
  query: string,
): Promise<Customer[]> => {
  const q = query.trim();
  if (!q) return listCustomers(organizationId);

  const customers = await prisma.customer.findMany({
    where: {
      organizationId,
      OR: [
        { name: { contains: q } },
        { mobile: { contains: q } },
        { city: { contains: q } },
        { billingCity: { contains: q } },
        { email: { contains: q } },
        { gstNumber: { contains: q, mode: "insensitive" } },
      ],
    },
    include: customerInclude,
    orderBy: { name: "asc" },
    take: 20,
  });

  return customers.map(toCustomer);
};

export const updateCustomer = async (
  id: string,
  organizationId: string,
  input: UpdateCustomerInput,
): Promise<Customer> => {
  const existing = await prisma.customer.findFirst({ where: { id, organizationId } });
  if (!existing) throw new CustomerError("Customer not found.", 404);

  if (input.mobile !== undefined) {
    const mobile = input.mobile.trim();
    if (!mobile) throw new CustomerError("Mobile number is required.");
    if (mobile !== existing.mobile) {
      const clash = await prisma.customer.findUnique({
        where: { organizationId_mobile: { organizationId, mobile } },
      });
      if (clash) {
        throw new CustomerError(
          "A customer with this mobile number already exists.",
        );
      }
    }
  }

  if (input.name !== undefined && !input.name.trim()) {
    throw new CustomerError("Customer name is required.");
  }

  const hasFinancialUpdate =
    input.panNumber !== undefined ||
    input.gstNumber !== undefined ||
    input.gstRegisteredName !== undefined ||
    input.billingAddressLine1 !== undefined ||
    input.billingAddressLine2 !== undefined ||
    input.billingCity !== undefined ||
    input.billingState !== undefined ||
    input.billingPincode !== undefined ||
    input.billingCountry !== undefined ||
    input.bankAccountName !== undefined ||
    input.bankAccountNumber !== undefined ||
    input.bankIfsc !== undefined ||
    input.bankName !== undefined;

  const financial = hasFinancialUpdate
    ? validateFinancialFields({
        panNumber: input.panNumber ?? existing.panNumber,
        gstNumber: input.gstNumber ?? existing.gstNumber,
        gstRegisteredName: input.gstRegisteredName ?? existing.gstRegisteredName,
        billingAddressLine1:
          input.billingAddressLine1 ?? existing.billingAddressLine1,
        billingAddressLine2:
          input.billingAddressLine2 ?? existing.billingAddressLine2,
        billingCity: input.billingCity ?? existing.billingCity,
        billingState: input.billingState ?? existing.billingState,
        billingPincode: input.billingPincode ?? existing.billingPincode,
        billingCountry: input.billingCountry ?? existing.billingCountry,
        bankAccountName: input.bankAccountName ?? existing.bankAccountName,
        bankAccountNumber:
          input.bankAccountNumber ?? existing.bankAccountNumber,
        bankIfsc: input.bankIfsc ?? existing.bankIfsc,
        bankName: input.bankName ?? existing.bankName,
      })
    : null;

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.mobile !== undefined && { mobile: input.mobile.trim() }),
      ...(input.email !== undefined && {
        email: trimOrNull(input.email),
      }),
      ...(input.address !== undefined && {
        address: trimOrNull(input.address),
      }),
      ...(input.city !== undefined && { city: trimOrNull(input.city) }),
      ...(financial && {
        billingAddressLine1: financial.billingAddressLine1,
        billingAddressLine2: financial.billingAddressLine2,
        billingCity: financial.billingCity,
        billingState: financial.billingState,
        billingPincode: financial.billingPincode,
        billingCountry: financial.billingCountry,
        panNumber: financial.panNumber,
        gstNumber: financial.gstNumber,
        gstRegisteredName: financial.gstRegisteredName,
        bankAccountName: financial.bankAccountName,
        bankAccountNumber: financial.bankAccountNumber,
        bankIfsc: financial.bankIfsc,
        bankName: financial.bankName,
      }),
      ...(input.birthday !== undefined && {
        birthday: input.birthday ? new Date(input.birthday) : null,
      }),
      ...(input.anniversary !== undefined && {
        anniversary: input.anniversary ? new Date(input.anniversary) : null,
      }),
      ...(input.ringSize !== undefined && {
        ringSize: trimOrNull(input.ringSize),
      }),
      ...(input.preferences !== undefined && {
        preferences: trimOrNull(input.preferences),
      }),
    },
    include: customerInclude,
  });

  return toCustomer(customer);
};
