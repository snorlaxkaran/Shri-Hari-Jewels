"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageCustomers } from "@/lib/auth/permissions";
import { useCustomers } from "@/lib/customers/customers-context";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus, Search } from "lucide-react";

const CustomerDetailPanel = dynamic(
  () => import("@/app/(components)/CustomerDetailPanel"),
  { ssr: false },
);

export default function CustomersPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CustomersPageContent />
    </Suspense>
  );
}

function CustomersPageContent() {
  const { user } = useAuth();
  const { customers, hydrated, loading, error } = useCustomers();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canManage = user ? canManageCustomers(user.role) : false;

  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected) {
      setSelectedId(selected);
    }
  }, [searchParams]);

  const filtered = useMemo(
    () =>
      customers.filter(
        (c) =>
          c.name.toLowerCase().includes(search.toLowerCase()) ||
          c.mobile.includes(search) ||
          (c.billingCity ?? c.city ?? "").toLowerCase().includes(search.toLowerCase()),
      ),
    [customers, search],
  );

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Customers"
        subtitle={`${filtered.length} registered customers`}
        action={
          canManage ? (
            <Link
              href="/customers/new"
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              Add Customer
            </Link>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="relative mb-4 max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, phone, or city…"
          className="input-field w-full pl-9 pr-4 py-2 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          {canManage
            ? "No customers yet. Add your first customer to get started."
            : "No customers found."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((customer) => (
            <button
              key={customer.id}
              type="button"
              onClick={() => setSelectedId(customer.id)}
              className={`surface-card p-5 text-left hover:border-zinc-300 transition-colors w-full ${
                selectedId === customer.id ? "ring-2 ring-zinc-300 border-zinc-300" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full avatar text-sm">
                    {customer.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-zinc-900">{customer.name}</p>
                    <p className="text-xs text-zinc-400">{customer.billingCity ?? customer.city ?? "—"}</p>
                  </div>
                </div>
                <StatusBadge status={customer.tier} />
              </div>
              <div className="space-y-1.5 text-xs text-zinc-500">
                <p>{customer.mobile}</p>
                {customer.email && <p>{customer.email}</p>}
              </div>
              <div className="flex justify-between mt-4 pt-3 border-t border-zinc-100 text-xs">
                <div>
                  <p className="text-zinc-400">Purchases</p>
                  <p className="font-semibold text-zinc-900">{customer.totalOrders}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Total Spent</p>
                  <p className="font-semibold text-zinc-900">{formatCurrency(customer.totalSpent)}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Last Visit</p>
                  <p className="font-semibold text-zinc-900">
                    {customer.lastVisit ? formatDate(customer.lastVisit) : "—"}
                  </p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {selectedId && (
        <CustomerDetailPanel
          customerId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
