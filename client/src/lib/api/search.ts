import { api } from "./client";

export type SearchResult = {
  type: "product" | "customer" | "sale" | "invoice" | "order";
  id: string;
  label: string;
  sublabel?: string;
  href: string;
};

export const globalSearch = async (q: string): Promise<SearchResult[]> => {
  const { data } = await api.get<{ results: SearchResult[] }>("/api/search", {
    params: { q },
  });
  return data.results;
};
