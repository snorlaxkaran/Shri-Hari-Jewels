import type { Prisma } from "@prisma/client";

export const WEB_ORDER_EVENT = {
  ORDER_PLACED: "order_placed",
  PAYMENT_RECEIVED: "payment_received",
  STATUS_UPDATED: "status_updated",
  PAYMENT_STATUS_UPDATED: "payment_status_updated",
} as const;

export const recordWebOrderEvent = async (
  tx: Prisma.TransactionClient,
  webOrderId: string,
  type: string,
  message: string,
  meta?: Prisma.InputJsonValue,
): Promise<void> => {
  await tx.webOrderEvent.create({
    data: {
      webOrderId,
      type,
      message,
      meta: meta ?? undefined,
    },
  });
};
