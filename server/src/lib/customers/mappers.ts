import type { Customer as PrismaCustomer, Sale } from "@prisma/client";
import type { Customer } from "../../types.js";
import { moneyToNumber, sumMoney } from "../money.js";
import { getCustomerTier } from "./tier.js";

type CustomerWithSales = PrismaCustomer & { sales: Sale[] };

export const toCustomer = (customer: CustomerWithSales): Customer => {
  const totalSpent = moneyToNumber(
    sumMoney(customer.sales.map((s) => s.dealPrice)),
  );
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
    billingAddressLine1: customer.billingAddressLine1 ?? undefined,
    billingAddressLine2: customer.billingAddressLine2 ?? undefined,
    billingCity: customer.billingCity ?? undefined,
    billingState: customer.billingState ?? undefined,
    billingPincode: customer.billingPincode ?? undefined,
    billingCountry: customer.billingCountry ?? undefined,
    panNumber: customer.panNumber ?? undefined,
    gstNumber: customer.gstNumber ?? undefined,
    gstRegisteredName: customer.gstRegisteredName ?? undefined,
    bankAccountName: customer.bankAccountName ?? undefined,
    bankAccountNumber: customer.bankAccountNumber ?? undefined,
    bankIfsc: customer.bankIfsc ?? undefined,
    bankName: customer.bankName ?? undefined,
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
