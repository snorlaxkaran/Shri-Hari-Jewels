import type { Customer as PrismaCustomer, Sale } from "@prisma/client";
import type { Customer } from "../../types.js";
import { getCustomerTier } from "./tier.js";

type CustomerWithSales = PrismaCustomer & { sales: Sale[] };

export const toCustomer = (customer: CustomerWithSales): Customer => {
  const totalSpent = customer.sales.reduce((sum, s) => sum + s.dealPrice, 0);
  const lastSale = customer.sales.sort(
    (a, b) => b.soldAt.getTime() - a.soldAt.getTime(),
  )[0];

  return {
    id: customer.id,
    name: customer.name,
    mobile: customer.mobile,
    email: customer.email ?? undefined,
    address: customer.address ?? undefined,
    city: customer.city ?? undefined,
    birthday: customer.birthday?.toISOString(),
    anniversary: customer.anniversary?.toISOString(),
    ringSize: customer.ringSize ?? undefined,
    preferences: customer.preferences ?? undefined,
    totalOrders: customer.sales.length,
    totalSpent,
    lastVisit: lastSale?.soldAt.toISOString(),
    tier: getCustomerTier(totalSpent),
    createdAt: customer.createdAt.toISOString(),
  };
};
