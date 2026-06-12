"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import StatusBadge from "@/app/(components)/StatusBadge";
import { customers } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Search } from "lucide-react";

export default function CustomersPage() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.phone.includes(search) ||
          c.city.toLowerCase().includes(search.toLowerCase()),
      ),
    [search],
  );

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${filtered.length} registered customers`}
        action={
          <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
            <Plus size={16} />
            Add Customer
          </button>
        }
      />

      <div className="relative mb-4 max-w-md">
        <Search
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or city…"
          className="input-field w-full pl-9 pr-4 py-2 text-sm"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((customer) => (
          <div key={customer.id} className="surface-card p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold bg-zinc-900 text-white">
                  {customer.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm text-zinc-900">
                    {customer.name}
                  </p>
                  <p className="text-xs text-zinc-400">{customer.city}</p>
                </div>
              </div>
              <StatusBadge status={customer.tier} />
            </div>
            <div className="space-y-1.5 text-xs text-zinc-500">
              <p>{customer.phone}</p>
              <p>{customer.email}</p>
            </div>
            <div className="flex justify-between mt-4 pt-3 border-t border-zinc-100 text-xs">
              <div>
                <p className="text-zinc-400">Orders</p>
                <p className="font-semibold text-zinc-900">
                  {customer.totalOrders}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Total Spent</p>
                <p className="font-semibold text-zinc-900">
                  {formatCurrency(customer.totalSpent)}
                </p>
              </div>
              <div>
                <p className="text-zinc-400">Last Visit</p>
                <p className="font-semibold text-zinc-900">
                  {formatDate(customer.lastVisit)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
