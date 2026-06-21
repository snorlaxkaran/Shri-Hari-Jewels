import type { MarketRatesCurrent, OverrideMarketRatesInput } from "@/lib/types";
import { api } from "./client";

export const fetchCurrentMarketRates = async (): Promise<MarketRatesCurrent> => {
  const { data } = await api.get<MarketRatesCurrent>("/api/market-rates/current");
  return data;
};

export const refreshMarketRates = async (): Promise<MarketRatesCurrent> => {
  const { data } = await api.post<MarketRatesCurrent>("/api/market-rates/refresh");
  return data;
};

export const overrideMarketRates = async (
  input: OverrideMarketRatesInput,
): Promise<MarketRatesCurrent> => {
  const { data } = await api.post<MarketRatesCurrent>(
    "/api/market-rates/override",
    input,
  );
  return data;
};
