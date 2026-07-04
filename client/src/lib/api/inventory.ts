import type {
  BulkStockImportResult,
  InventoryItem,
  LegacyStockImportRow,
  NewProductInput,
  PartialAcceptTransferInput,
  StockTransfer,
  StockTransferDocumentType,
  StockTransferStatus,
  UpdateProductInput,
} from "@/lib/types";
import { api } from "./client";

export const fetchInventory = async (options?: {
  sortBy?: "createdAt" | "weightGrams" | "price" | "category";
  sortOrder?: "asc" | "desc";
}): Promise<InventoryItem[]> => {
  const { data } = await api.get<InventoryItem[]>("/api/inventory", {
    params: {
      _t: Date.now(),
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
    },
    headers: { "Cache-Control": "no-cache" },
  });
  return data;
};

export const createProduct = async (
  input: NewProductInput,
): Promise<InventoryItem> => {
  const { data } = await api.post<InventoryItem>("/api/inventory", input);
  return data;
};

export const importLegacyStock = async (
  rows: LegacyStockImportRow[],
): Promise<BulkStockImportResult> => {
  const { data } = await api.post<BulkStockImportResult>(
    "/api/inventory/import",
    { rows },
  );
  return data;
};

export const addProductUnits = async (
  productId: string,
  quantity: number,
): Promise<InventoryItem> => {
  const { data } = await api.post<InventoryItem>(
    `/api/inventory/${productId}/units`,
    { quantity },
  );
  return data;
};

export const updateProduct = async (
  productId: string,
  input: UpdateProductInput,
): Promise<InventoryItem> => {
  const { data } = await api.patch<InventoryItem>(
    `/api/inventory/${productId}`,
    input,
  );
  return data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await api.delete(`/api/inventory/${productId}`);
};

export const deleteInventoryUnit = async (
  unitId: string,
): Promise<InventoryItem> => {
  const { data } = await api.delete<InventoryItem>(
    `/api/inventory/units/${unitId}`,
  );
  return data;
};

export const transferInventoryUnits = async (
  productId: string,
  input: { unitIds: string[]; toBranchId: string },
): Promise<InventoryItem> => {
  const { data } = await api.post<InventoryItem>(
    `/api/inventory/${productId}/transfer`,
    input,
  );
  return data;
};

export const createStockTransfer = async (input: {
  customerId: string;
  customerBranchId: string;
  documentType: StockTransferDocumentType;
  transferDate: string;
  itemCodes: string[];
  notes?: string;
  billing?: {
    recipientGstNumber?: string;
    recipientGstRegisteredName?: string;
    recipientPanNumber?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    recipientAddress?: string;
    placeOfSupplyState?: string;
    placeOfSupplyStateCode?: string;
    placeOfDeliveryState?: string;
    placeOfDeliveryStateCode?: string;
  };
}): Promise<{ transfer: StockTransfer; products: InventoryItem[] }> => {
  const { data } = await api.post<{
    transfer: StockTransfer;
    products: InventoryItem[];
  }>(
    "/api/inventory/transfers",
    input,
  );
  return data;
};

export const fetchStockTransfers = async (): Promise<StockTransfer[]> => {
  const { data } = await api.get<StockTransfer[]>("/api/inventory/transfers");
  return data;
};

export const fetchSentStockTransfers = async (): Promise<StockTransfer[]> => {
  const { data } = await api.get<StockTransfer[]>("/api/inventory/transfers/sent");
  return data;
};

export const fetchIncomingStockTransfers = async (
  status?: StockTransferStatus,
): Promise<StockTransfer[]> => {
  const { data } = await api.get<StockTransfer[]>(
    "/api/inventory/transfers/incoming",
    { params: status ? { status } : undefined },
  );
  return data;
};

export const fetchIncomingTransferCount = async (): Promise<number> => {
  const { data } = await api.get<{ count: number }>(
    "/api/inventory/transfers/incoming/count",
  );
  return data.count;
};

export const fetchStockTransferById = async (
  id: string,
): Promise<StockTransfer> => {
  const { data } = await api.get<StockTransfer>(`/api/inventory/transfers/${id}`);
  return data;
};

export const acceptStockTransfer = async (id: string): Promise<StockTransfer> => {
  const { data } = await api.post<StockTransfer>(
    `/api/inventory/transfers/${id}/accept`,
  );
  return data;
};

export const rejectStockTransfer = async (
  id: string,
  reason: string,
): Promise<StockTransfer> => {
  const { data } = await api.post<StockTransfer>(
    `/api/inventory/transfers/${id}/reject`,
    { reason },
  );
  return data;
};

export const partialAcceptStockTransfer = async (
  id: string,
  input: PartialAcceptTransferInput,
): Promise<StockTransfer> => {
  const { data } = await api.post<StockTransfer>(
    `/api/inventory/transfers/${id}/partial-accept`,
    input,
  );
  return data;
};

export const cancelStockTransfer = async (id: string): Promise<StockTransfer> => {
  const { data } = await api.post<StockTransfer>(
    `/api/inventory/transfers/${id}/cancel`,
  );
  return data;
};

export const saveTransferShipping = async (
  id: string,
  input: {
    contactPersonName: string;
    contactPersonPhone: string;
    courierCompany: string;
    dispatchDate: string;
  },
): Promise<StockTransfer> => {
  const { data } = await api.patch<StockTransfer>(
    `/api/inventory/transfers/${id}/shipping`,
    input,
  );
  return data;
};
