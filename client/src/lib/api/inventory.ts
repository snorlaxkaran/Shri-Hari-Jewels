import type {
  BulkStockImportResult,
  InventoryItem,
  ItemCodeHistory,
  LegacyStockImportRow,
  NewProductInput,
  PartialAcceptTransferInput,
  StockTransfer,
  StockTransferDocumentType,
  StockTransferStatus,
  UpdateProductInput,
  UpdateUnitHallmarkInput,
} from "@/lib/types";
import { openShareUrlInTab, preparePdfViewerTab } from "@/lib/open-pdf";
import { api, API_BASE_URL, getAuthToken } from "./client";

export const fetchInventory = async (options?: {
  sortBy?: "createdAt" | "weightGrams" | "price" | "category";
  sortOrder?: "asc" | "desc";
  hallmarkStatus?: "missing";
}): Promise<InventoryItem[]> => {
  const { data } = await api.get<InventoryItem[]>("/api/inventory", {
    params: {
      _t: Date.now(),
      sortBy: options?.sortBy,
      sortOrder: options?.sortOrder,
      hallmarkStatus: options?.hallmarkStatus,
    },
    headers: { "Cache-Control": "no-cache" },
    timeout: 60000,
  });
  return data;
};

export const fetchItemCodeHistory = async (
  itemCode: string,
): Promise<ItemCodeHistory> => {
  const { data } = await api.get<ItemCodeHistory>(
    `/api/inventory/item/${encodeURIComponent(itemCode.trim())}/history`,
  );
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
  const hasImages = (input.images?.length ?? 0) > 0;
  const { data } = await api.patch<InventoryItem>(
    `/api/inventory/${productId}`,
    input,
    { timeout: hasImages ? 60000 : 15000 },
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

export const holdInventoryUnit = async (
  unitId: string,
  input: { customerName: string; customerId?: string; notes?: string },
): Promise<InventoryItem> => {
  const { data } = await api.post<InventoryItem>(
    `/api/inventory/units/${unitId}/hold`,
    input,
  );
  return data;
};

export const releaseInventoryUnitHold = async (
  unitId: string,
): Promise<InventoryItem> => {
  const { data } = await api.post<InventoryItem>(
    `/api/inventory/units/${unitId}/release-hold`,
  );
  return data;
};

export const updateUnitHallmark = async (
  unitId: string,
  input: UpdateUnitHallmarkInput,
): Promise<{ itemCode: string; huid: string; hallmarkCenter?: string }> => {
  const { data } = await api.patch<{ itemCode: string; huid: string; hallmarkCenter?: string }>(
    `/api/inventory/units/${unitId}/hallmark`,
    input,
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
  customerId?: string;
  customerBranchId?: string;
  internalBranchId?: string;
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

export const fetchProformaTransfers = async (): Promise<StockTransfer[]> => {
  const { data } = await api.get<StockTransfer[]>(
    "/api/inventory/transfers/proforma",
  );
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

export const fetchIncomingStockTransfer = async (
  id: string,
): Promise<StockTransfer> => {
  const { data } = await api.get<StockTransfer>(
    `/api/inventory/transfers/${id}/incoming`,
  );
  return data;
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

export const scanReceiveStockTransfer = async (
  id: string,
  itemCode: string,
): Promise<{
  transfer: StockTransfer;
  scannedItem: StockTransfer["items"][number];
  allVerified: boolean;
}> => {
  const { data } = await api.post<{
    transfer: StockTransfer;
    scannedItem: StockTransfer["items"][number];
    allVerified: boolean;
  }>(`/api/inventory/transfers/${id}/scan-receive`, { itemCode });
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

type TransferDownloadMeta = Pick<
  StockTransfer,
  "documentType" | "invoiceNo" | "transferNo"
> & {
  shareToken?: string;
};

const openTransferShareUrl = (
  shareToken: string,
  tab?: Window | null,
): string => {
  const shareUrl = buildTransferSharePageUrl(shareToken);
  openShareUrlInTab(shareUrl, tab);
  return shareUrl;
};

const fetchTransferShareTokenFromDownload = async (
  transferId: string,
): Promise<string | null> => {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/transfers/${transferId}/invoice/download`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${getAuthToken()}`,
      },
    },
  );
  if (!response.ok) return null;
  const meta = parseTransferDownloadHeader(
    response.headers.get("X-Transfer-Data"),
  );
  return meta?.shareToken ?? null;
};

const parseTransferDownloadHeader = (
  header: string | null,
): TransferDownloadMeta | null => {
  if (!header) return null;
  try {
    const json = new TextDecoder().decode(
      Uint8Array.from(atob(header), (c) => c.charCodeAt(0)),
    );
    return JSON.parse(json) as TransferDownloadMeta;
  } catch {
    try {
      return JSON.parse(header) as TransferDownloadMeta;
    } catch {
      return null;
    }
  }
};

export const generateTransferInvoice = async (
  id: string,
  input: {
    contactPersonName: string;
    contactPersonPhone: string;
    courierCompany: string;
    dispatchDate: string;
  },
): Promise<{ transfer: StockTransfer; shareToken: string | null }> => {
  const response = await fetch(
    `${API_BASE_URL}/api/inventory/transfers/${id}/invoice`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getAuthToken()}`,
      },
      body: JSON.stringify(input),
    },
  );
  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const err = (await response.json()) as { error?: string };
      throw new Error(err.error ?? `Failed to generate invoice (${response.status}).`);
    }
    const text = await response.text();
    throw new Error(
      text.trim().slice(0, 200) || `Failed to generate invoice (${response.status}).`,
    );
  }
  const transferHeader = response.headers.get("X-Transfer-Data");
  const headerMeta = parseTransferDownloadHeader(transferHeader);
  await response.blob();
  const transfer = headerMeta
    ? ({ ...headerMeta, id } as StockTransfer)
    : await fetchStockTransferById(id);
  return {
    transfer,
    shareToken: headerMeta?.shareToken ?? null,
  };
};

export type TransferShareLink = {
  token: string;
  expiresAt: string;
  documentType: StockTransferDocumentType;
  transferNo: string;
  invoiceNo: string | null;
  shareUrl: string;
};

export const buildTransferSharePageUrl = (token: string): string => {
  const encoded = encodeURIComponent(token);
  if (typeof window !== "undefined") {
    return `${window.location.origin}/t/${encoded}`;
  }
  return `/t/${encoded}`;
};

export const getTransferShareLink = async (
  transferId: string,
): Promise<TransferShareLink> => {
  const { data } = await api.get<{
    token: string;
    expiresAt: string;
    documentType: StockTransferDocumentType;
    transferNo: string;
    invoiceNo: string | null;
  }>(`/api/inventory/transfers/${transferId}/share-token`);
  return {
    ...data,
    shareUrl: buildTransferSharePageUrl(data.token),
  };
};

export const openTransferInvoicePdf = async (
  id: string,
  tab?: Window | null,
): Promise<string> => {
  try {
    const { shareUrl } = await getTransferShareLink(id);
    openShareUrlInTab(shareUrl, tab);
    return shareUrl;
  } catch {
    const shareToken = await fetchTransferShareTokenFromDownload(id);
    if (shareToken) {
      return openTransferShareUrl(shareToken, tab);
    }
    throw new Error("Could not open share link for this document.");
  }
};

export const openTransferShareToken = (
  shareToken: string,
  tab?: Window | null,
): string => openTransferShareUrl(shareToken, tab);

/** @deprecated Use openTransferInvoicePdf */
export const redownloadTransferInvoice = openTransferInvoicePdf;
