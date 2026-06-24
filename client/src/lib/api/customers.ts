import type {
  Customer,
  CustomerDetail,
  NewCustomerInput,
  UpdateCustomerInput,
} from "@/lib/types";
import { api } from "./client";

export type CustomerLookupResponse =
  | { found: true; customer: Customer }
  | { found: false };

export const lookupCustomerByQuery = async (
  query: string,
): Promise<CustomerLookupResponse> => {
  const { data } = await api.get<CustomerLookupResponse>(
    "/api/customers/lookup",
    { params: { q: query.trim() } },
  );
  return data;
};

export const fetchCustomers = async (query?: string): Promise<Customer[]> => {
  const { data } = await api.get<Customer[]>("/api/customers", {
    params: query ? { q: query } : undefined,
  });
  return data;
};

export const createCustomer = async (
  input: NewCustomerInput,
): Promise<Customer> => {
  const { data } = await api.post<Customer>("/api/customers", input);
  return data;
};

export const fetchCustomer = async (id: string): Promise<CustomerDetail> => {
  const { data } = await api.get<CustomerDetail>(`/api/customers/${id}`);
  return data;
};

export const updateCustomer = async (
  id: string,
  input: UpdateCustomerInput,
): Promise<Customer> => {
  const { data } = await api.patch<Customer>(`/api/customers/${id}`, input);
  return data;
};
