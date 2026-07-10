import type { EntryVoucher, EntryVoucherDetail, EntryVoucherStatus } from "@/lib/types";
import { api } from "./client";

export const fetchEntryVouchers = async (
  status?: EntryVoucherStatus,
): Promise<EntryVoucher[]> => {
  const { data } = await api.get<EntryVoucher[]>("/api/entry-vouchers", {
    params: status ? { status } : undefined,
  });
  return data;
};

export const fetchEntryVoucherById = async (
  id: string,
): Promise<EntryVoucherDetail> => {
  const { data } = await api.get<EntryVoucherDetail>(`/api/entry-vouchers/${id}`);
  return data;
};

export const updateEntryVoucherPrices = async (
  id: string,
  prices: Array<{ unitId: string; listPrice: number }>,
): Promise<EntryVoucherDetail> => {
  const { data } = await api.patch<EntryVoucherDetail>(
    `/api/entry-vouchers/${id}/prices`,
    { prices },
  );
  return data;
};

export const verifyEntryVoucher = async (
  id: string,
): Promise<EntryVoucherDetail> => {
  const { data } = await api.post<EntryVoucherDetail>(
    `/api/entry-vouchers/${id}/verify`,
  );
  return data;
};

export const deleteEntryVoucher = async (id: string): Promise<void> => {
  await api.delete(`/api/entry-vouchers/${id}`);
};
