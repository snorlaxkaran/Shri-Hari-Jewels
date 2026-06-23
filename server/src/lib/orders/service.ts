import { prisma } from "../db.js";
import type {
  NewOrderInput,
  Order,
  OrderStatus,
  UpdateOrderInput,
} from "../../types.js";
import { generateOrderNo } from "./order-no.js";
import { organizationBranchFilter } from "../branches/access.js";
import { toOrder } from "./mappers.js";

const ORDER_STATUSES: OrderStatus[] = [
  "Pending",
  "Designing",
  "Production",
  "QC",
  "Ready",
  "Delivered",
  "Cancelled",
];

export class OrderError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "OrderError";
  }
}

const orderInclude = { customer: true };

export const listOrders = async (organizationId: string): Promise<Order[]> => {
  const orders = await prisma.order.findMany({
    where: { branch: { organizationId } },
    include: orderInclude,
    orderBy: { createdAt: "desc" },
  });
  return orders.map(toOrder);
};

export const createOrder = async (
  input: NewOrderInput,
  branchId: string,
): Promise<Order> => {
  if (!input.description?.trim()) {
    throw new OrderError("Order description is required.");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer) throw new OrderError("Customer not found.", 404);

  const existing = await prisma.order.findMany({
    where: { branchId },
    select: { orderNo: true },
  });
  const orderNo = generateOrderNo(existing.map((o) => o.orderNo));

  const order = await prisma.order.create({
    data: {
      branchId,
      orderNo,
      customerId: input.customerId,
      description: input.description.trim(),
      estimatedTotal: input.estimatedTotal,
      notes: input.notes?.trim() || null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
    },
    include: orderInclude,
  });

  return toOrder(order);
};

export const updateOrder = async (
  id: string,
  input: UpdateOrderInput,
): Promise<Order> => {
  const existing = await prisma.order.findUnique({ where: { id } });
  if (!existing) throw new OrderError("Order not found.", 404);

  if (input.status && !ORDER_STATUSES.includes(input.status)) {
    throw new OrderError("Invalid order status.");
  }

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: input.status,
      paymentStatus: input.paymentStatus,
      description: input.description?.trim(),
      estimatedTotal: input.estimatedTotal,
      notes: input.notes?.trim(),
      dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
    },
    include: orderInclude,
  });

  return toOrder(order);
};

export const countPendingOrders = async (
  organizationId: string,
  branchId?: string,
): Promise<number> => {
  return prisma.order.count({
    where: {
      status: { notIn: ["Delivered", "Cancelled"] },
      ...organizationBranchFilter(organizationId, branchId),
    },
  });
};
