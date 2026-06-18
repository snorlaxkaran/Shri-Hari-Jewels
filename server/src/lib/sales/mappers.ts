import type { Sale as PrismaSale } from "@prisma/client";
import type { PaymentMode, Sale } from "../../types.js";
import { moneyToNumber } from "../money.js";

export const toSale = (sale: PrismaSale): Sale => ({
  id: sale.id,
  itemCode: sale.itemCode,
  productId: sale.productId,
  productName: sale.productName,
  sku: sale.sku,
  category: sale.category,
  listPrice: moneyToNumber(sale.listPrice),
  discount: moneyToNumber(sale.discount),
  dealPrice: moneyToNumber(sale.dealPrice),
  paymentMode: sale.paymentMode as PaymentMode,
  paymentStatus: sale.paymentStatus as Sale["paymentStatus"],
  paymentRef: sale.paymentRef ?? undefined,
  cartGroupId: sale.cartGroupId ?? undefined,
  customerId: sale.customerId ?? undefined,
  customerPhone: sale.customerPhone,
  customerName: sale.customerName ?? undefined,
  soldAt: sale.soldAt.toISOString(),
});
