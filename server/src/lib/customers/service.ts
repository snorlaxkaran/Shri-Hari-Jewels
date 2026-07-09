import { prisma } from "../db.js";
import type {
  Customer,
  CustomerDepartmentContact,
  CustomerDetail,
  NewCustomerDeptContactInput,
  NewCustomerInput,
  UpdateCustomerDeptContactInput,
  UpdateCustomerInput,
} from "../../types.js";
import { toSale } from "../sales/mappers.js";
import { toCustomer } from "./mappers.js";
import { validateCustomerFinancialFields } from "./validation.js";
import { writeAuditLog } from "../audit/service.js";
import type { CustomerDepartmentContact as PrismaDeptContact } from "@prisma/client";

export class CustomerError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "CustomerError";
  }
}

const GST_LOOKUP_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;

export const detectQueryType = (
  q: string,
): "gstNumber" | "email" | "mobile" | "fuzzy" => {
  const trimmed = q.trim();
  if (GST_LOOKUP_REGEX.test(trimmed.toUpperCase())) return "gstNumber";
  if (trimmed.includes("@")) return "email";
  if (/^\d{10}$/.test(trimmed)) return "mobile";
  return "fuzzy";
};

export type CustomerLookupResponse =
  | { found: true; customer: Customer }
  | { found: false };

export const lookupCustomer = async (
  organizationId: string,
  q: string,
): Promise<CustomerLookupResponse> => {
  const trimmed = q.trim();
  if (!trimmed) return { found: false };

  const queryType = detectQueryType(trimmed);

  if (queryType === "fuzzy") {
    const customers = await prisma.customer.findMany({
      where: {
        organizationId,
        OR: [
          { name: { contains: trimmed } },
          { mobile: { contains: trimmed } },
          { email: { contains: trimmed } },
          { companyName: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      include: customerInclude,
      orderBy: { name: "asc" },
      take: 5,
    });
    if (customers.length === 1) {
      return { found: true, customer: toCustomer(customers[0]) };
    }
    return { found: false };
  }

  const customer = await prisma.customer.findFirst({
    where: {
      organizationId,
      OR: [
        { mobile: trimmed },
        { email: trimmed },
        { gstNumber: { equals: trimmed, mode: "insensitive" } },
      ],
    },
    include: customerInclude,
  });

  if (!customer) return { found: false };
  return { found: true, customer: toCustomer(customer) };
};

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
      deptContacts: { orderBy: { department: "asc" } },
    },
  });
  if (!customer) return null;

  const base = toCustomer({ ...customer, sales: customer.sales });
  return {
    ...base,
    sales: customer.sales.map(toSale),
    deptContacts: customer.deptContacts.map(toDeptContact),
  };
};

export const createCustomer = async (
  organizationId: string,
  input: NewCustomerInput,
  actor?: { id?: string; name: string },
): Promise<Customer> => {
  const name = input.name.trim();
  const mobile = input.mobile.trim();

  if (!name) throw new CustomerError("Customer name is required.");
  if (!mobile) throw new CustomerError("Mobile number is required.");

  const existing = await prisma.customer.findUnique({
    where: { organizationId_mobile: { organizationId, mobile } },
  });
  if (existing) {
    throw new CustomerError(
      "A customer with this mobile number already exists.",
      409,
    );
  }

  const financial = validateFinancialFields(input);

  const customer = await prisma.customer.create({
    data: {
      organizationId,
      name,
      mobile,
      companyName: trimOrNull(input.companyName),
      ownerName: trimOrNull(input.ownerName),
      contactPersonName: trimOrNull(input.contactPersonName),
      customerType: input.customerType?.trim() || "Individual Buyer",
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

  if (actor) {
    await writeAuditLog({
      organizationId,
      entityType: "Customer",
      entityId: customer.id,
      action: "CREATED",
      after: { name: customer.name, mobile: customer.mobile, gstNumber: customer.gstNumber },
      actor,
    });
  }

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
        { companyName: { contains: q, mode: "insensitive" } },
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
  actor?: { id?: string; name: string },
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
      ...(input.companyName !== undefined && {
        companyName: trimOrNull(input.companyName),
      }),
      ...(input.ownerName !== undefined && {
        ownerName: trimOrNull(input.ownerName),
      }),
      ...(input.contactPersonName !== undefined && {
        contactPersonName: trimOrNull(input.contactPersonName),
      }),
      ...(input.customerType !== undefined && {
        customerType: input.customerType.trim() || "Individual Buyer",
      }),
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

  if (actor) {
    await writeAuditLog({
      organizationId,
      entityType: "Customer",
      entityId: id,
      action: "UPDATED",
      before: {
        name: existing.name,
        gstNumber: existing.gstNumber,
        panNumber: existing.panNumber,
        companyName: existing.companyName,
      },
      after: {
        name: customer.name,
        gstNumber: customer.gstNumber,
        panNumber: customer.panNumber,
        companyName: customer.companyName,
      },
      actor,
    });
  }

  return toCustomer(customer);
};

const toDeptContact = (row: PrismaDeptContact): CustomerDepartmentContact => ({
  id: row.id,
  customerId: row.customerId,
  department: row.department,
  personName: row.personName,
  email: row.email ?? undefined,
  phone: row.phone ?? undefined,
  createdByUserId: row.createdByUserId ?? undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const listDeptContacts = async (
  customerId: string,
  organizationId: string,
): Promise<CustomerDepartmentContact[]> => {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
  });
  if (!customer) throw new CustomerError("Customer not found.", 404);

  const contacts = await prisma.customerDepartmentContact.findMany({
    where: { customerId },
    orderBy: { department: "asc" },
  });
  return contacts.map(toDeptContact);
};

export const getDeptContact = async (
  contactId: string,
  organizationId: string,
): Promise<CustomerDepartmentContact> => {
  const contact = await prisma.customerDepartmentContact.findFirst({
    where: {
      id: contactId,
      customer: { organizationId },
    },
  });
  if (!contact) throw new CustomerError("Department contact not found.", 404);
  return toDeptContact(contact);
};

export const addDeptContact = async (
  customerId: string,
  organizationId: string,
  input: NewCustomerDeptContactInput,
  createdByUserId: string,
): Promise<CustomerDepartmentContact> => {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
  });
  if (!customer) throw new CustomerError("Customer not found.", 404);

  const department = input.department.trim();
  const personName = input.personName.trim();
  if (!department) throw new CustomerError("Department is required.");
  if (!personName) throw new CustomerError("Person name is required.");

  const contact = await prisma.customerDepartmentContact.create({
    data: {
      customerId,
      department,
      personName,
      email: trimOrNull(input.email),
      phone: trimOrNull(input.phone),
      createdByUserId,
    },
  });
  return toDeptContact(contact);
};

export const updateDeptContact = async (
  contactId: string,
  organizationId: string,
  input: UpdateCustomerDeptContactInput,
): Promise<CustomerDepartmentContact> => {
  const existing = await prisma.customerDepartmentContact.findFirst({
    where: {
      id: contactId,
      customer: { organizationId },
    },
  });
  if (!existing) throw new CustomerError("Department contact not found.", 404);

  if (input.personName !== undefined && !input.personName.trim()) {
    throw new CustomerError("Person name is required.");
  }
  if (input.department !== undefined && !input.department.trim()) {
    throw new CustomerError("Department is required.");
  }

  const contact = await prisma.customerDepartmentContact.update({
    where: { id: contactId },
    data: {
      ...(input.department !== undefined && {
        department: input.department.trim(),
      }),
      ...(input.personName !== undefined && {
        personName: input.personName.trim(),
      }),
      ...(input.email !== undefined && { email: trimOrNull(input.email) }),
      ...(input.phone !== undefined && { phone: trimOrNull(input.phone) }),
    },
  });
  return toDeptContact(contact);
};

export const deleteDeptContact = async (
  contactId: string,
  organizationId: string,
): Promise<void> => {
  const existing = await prisma.customerDepartmentContact.findFirst({
    where: {
      id: contactId,
      customer: { organizationId },
    },
  });
  if (!existing) throw new CustomerError("Department contact not found.", 404);

  await prisma.customerDepartmentContact.delete({ where: { id: contactId } });
};

export type BulkCustomerImportRow = {
  name: string;
  mobile: string;
  email?: string;
  companyName?: string;
  gstNumber?: string;
};

export const bulkImportCustomers = async (
  organizationId: string,
  rows: BulkCustomerImportRow[],
  actor?: { id?: string; name: string },
): Promise<{ created: number; errors: string[] }> => {
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      await createCustomer(
        organizationId,
        {
          name: row.name,
          mobile: row.mobile,
          email: row.email,
          companyName: row.companyName,
          gstNumber: row.gstNumber,
        },
        actor,
      );
      created++;
    } catch (error) {
      errors.push(
        `Row ${i + 1} (${row.mobile}): ${error instanceof Error ? error.message : "Failed"}`,
      );
    }
  }

  return { created, errors };
};
