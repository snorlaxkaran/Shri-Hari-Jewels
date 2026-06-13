import type { ShopSettings, UpdateShopSettingsInput } from "@/lib/types";
import { api } from "./client";

export const fetchSettings = async (): Promise<ShopSettings> => {
  const { data } = await api.get<ShopSettings>("/api/settings");
  return data;
};

export const updateSettings = async (
  input: UpdateShopSettingsInput,
): Promise<ShopSettings> => {
  const { data } = await api.patch<ShopSettings>("/api/settings", input);
  return data;
};
