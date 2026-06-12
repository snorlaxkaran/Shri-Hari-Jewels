import type {
  RecordCartSaleInput,
  RecordCartSaleResult,
  RecordSaleInput,
  RecordSaleResult,
  Sale,
  SaleUnitLookup,
  SalesAnalytics,
} from "@/lib/types";
import { api } from "./client";

export const fetchSalesAnalytics = async (): Promise<SalesAnalytics> => {
  const { data } = await api.get<SalesAnalytics>("/api/sales/analytics");
  return data;
};

export const fetchSales = async (): Promise<Sale[]> => {
  const { data } = await api.get<Sale[]>("/api/sales");
  return data;
};

export const lookupSaleUnit = async (
  itemCode: string,
): Promise<SaleUnitLookup> => {
  const { data } = await api.get<SaleUnitLookup>(
    `/api/sales/lookup/${encodeURIComponent(itemCode.trim())}`,
  );
  return data;
};

export const recordSale = async (
  input: RecordSaleInput,
): Promise<RecordSaleResult> => {
  const { data } = await api.post<RecordSaleResult>("/api/sales", input);
  return data;
};

export const confirmSalePayment = async (
  saleId: string,
  paymentRef?: string,
): Promise<RecordSaleResult | RecordCartSaleResult> => {
  const { data } = await api.post<RecordSaleResult | RecordCartSaleResult>(
    `/api/sales/${saleId}/confirm`,
    { paymentRef },
  );
  return data;
};

export const cancelPendingSale = async (saleId: string): Promise<void> => {
  await api.post(`/api/sales/${saleId}/cancel`);
};

export const pollSaleStatus = async (
  saleId: string,
): Promise<RecordSaleResult | RecordCartSaleResult> => {
  const { data } = await api.get<RecordSaleResult | RecordCartSaleResult>(
    `/api/sales/${saleId}/status`,
  );
  return data;
};

export const recordCartSale = async (
  input: RecordCartSaleInput,
): Promise<RecordCartSaleResult> => {
  const { data } = await api.post<RecordCartSaleResult>("/api/sales/cart", input);
  return data;
};
