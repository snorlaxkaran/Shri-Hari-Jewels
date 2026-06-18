import type { Customer, Order as PrismaOrder } from "@prisma/client";
import type { Order } from "../../types.js";
import { moneyToNumber } from "../money.js";

type OrderWithCustomer = PrismaOrder & { customer: Customer };

export const toOrder = (order: OrderWithCustomer): Order => ({
  id: order.id,
  orderNo: order.orderNo,
  customerId: order.customerId,
  customerName: order.customer.name,
  customerMobile: order.customer.mobile,
  description: order.description,
  estimatedTotal:
    order.estimatedTotal != null
      ? moneyToNumber(order.estimatedTotal)
      : undefined,
  status: order.status as Order["status"],
  paymentStatus: order.paymentStatus as Order["paymentStatus"],
  notes: order.notes ?? undefined,
  dueDate: order.dueDate?.toISOString(),
  createdAt: order.createdAt.toISOString(),
});
