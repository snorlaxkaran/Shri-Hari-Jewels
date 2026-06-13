import { prisma } from "../db.js";
import type {
  Customer,
  CustomerDetail,
  NewCustomerInput,
  UpdateCustomerInput,
} from "../../types.js";
import { toSale } from "../sales/mappers.js";
import { toCustomer } from "./mappers.js";

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

export const listCustomers = async (): Promise<Customer[]> => {
  const customers = await prisma.customer.findMany({
    include: customerInclude,
    orderBy: { createdAt: "desc" },
  });
  return customers.map(toCustomer);
};

export const getCustomer = async (id: string): Promise<Customer | null> => {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: customerInclude,
  });
  return customer ? toCustomer(customer) : null;
};

export const getCustomerDetail = async (
  id: string,
): Promise<CustomerDetail | null> => {
  const customer = await prisma.customer.findUnique({
    where: { id },
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
  input: NewCustomerInput,
): Promise<Customer> => {
  const name = input.name.trim();
  const mobile = input.mobile.trim();

  if (!name) throw new CustomerError("Customer name is required.");
  if (!mobile) throw new CustomerError("Mobile number is required.");

  const existing = await prisma.customer.findUnique({ where: { mobile } });
  if (existing) {
    throw new CustomerError("A customer with this mobile number already exists.");
  }

  const customer = await prisma.customer.create({
    data: {
      name,
      mobile,
      email: input.email?.trim() || null,
      address: input.address?.trim() || null,
      city: input.city?.trim() || null,
      birthday: input.birthday ? new Date(input.birthday) : null,
      anniversary: input.anniversary ? new Date(input.anniversary) : null,
      ringSize: input.ringSize?.trim() || null,
      preferences: input.preferences?.trim() || null,
    },
    include: customerInclude,
  });

  return toCustomer(customer);
};

export const searchCustomers = async (query: string): Promise<Customer[]> => {
  const q = query.trim();
  if (!q) return listCustomers();

  const customers = await prisma.customer.findMany({
    where: {
      OR: [
        { name: { contains: q } },
        { mobile: { contains: q } },
        { city: { contains: q } },
        { email: { contains: q } },
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
  input: UpdateCustomerInput,
): Promise<Customer> => {
  const existing = await prisma.customer.findUnique({ where: { id } });
  if (!existing) throw new CustomerError("Customer not found.", 404);

  if (input.mobile !== undefined) {
    const mobile = input.mobile.trim();
    if (!mobile) throw new CustomerError("Mobile number is required.");
    if (mobile !== existing.mobile) {
      const clash = await prisma.customer.findUnique({ where: { mobile } });
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

  const customer = await prisma.customer.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.mobile !== undefined && { mobile: input.mobile.trim() }),
      ...(input.email !== undefined && {
        email: input.email?.trim() || null,
      }),
      ...(input.address !== undefined && {
        address: input.address?.trim() || null,
      }),
      ...(input.city !== undefined && { city: input.city?.trim() || null }),
      ...(input.birthday !== undefined && {
        birthday: input.birthday ? new Date(input.birthday) : null,
      }),
      ...(input.anniversary !== undefined && {
        anniversary: input.anniversary ? new Date(input.anniversary) : null,
      }),
      ...(input.ringSize !== undefined && {
        ringSize: input.ringSize?.trim() || null,
      }),
      ...(input.preferences !== undefined && {
        preferences: input.preferences?.trim() || null,
      }),
    },
    include: customerInclude,
  });

  return toCustomer(customer);
};
