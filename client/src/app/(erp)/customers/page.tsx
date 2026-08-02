"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import ListPageShell from "@/app/(components)/ListPageShell";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageCustomers } from "@/lib/auth/permissions";
import { useCustomers } from "@/lib/customers/customers-context";
import { CUSTOMER_TYPES } from "@/lib/customers/constants";
import { CustomerTypeBadge } from "@/lib/customers/badges";
import { formatCurrency, formatDate } from "@/lib/format";
import { Plus } from "lucide-react";

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
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const canManage = user ? canManageCustomers(user.role) : false;

  useEffect(() => {
    const selected = searchParams.get("selected");
    if (selected) {
      setSelectedId(selected);
    }
  }, [searchParams]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return customers.filter((c) => {
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.mobile.includes(search) ||
        (c.companyName ?? "").toLowerCase().includes(q) ||
        (c.billingCity ?? c.city ?? "").toLowerCase().includes(q);
      const matchesType = typeFilter === "All Types" || c.customerType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [customers, search, typeFilter]);

  return (
    <ListPageShell
      title="Customers"
      subtitle={`${filtered.length} registered customers`}
      loading={!hydrated || loading}
      error={error || null}
      searchPlaceholder="Search by name, company, phone, or city…"
      searchValue={search}
      onSearchChange={setSearch}
      filterValue={typeFilter}
      filterOptions={[
        { value: "All Types", label: "All Types" },
        ...CUSTOMER_TYPES.map((type) => ({ value: type, label: type })),
      ]}
      onFilterChange={setTypeFilter}
      countLabel={`${filtered.length} customers`}
      isEmpty={filtered.length === 0}
      emptyMessage={
        canManage
          ? "No customers yet. Add your first customer to get started."
          : "No customers found."
      }
      action={
        canManage ? (
          <Link href="/customers/new" className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Add Customer
          </Link>
        ) : undefined
      }
    >
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
            <div className="flex items-start justify-between mb-3 gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full avatar text-sm shrink-0">
                  {customer.name.charAt(0)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-zinc-900 truncate">{customer.name}</p>
                  {customer.companyName && (
                    <p className="text-xs text-zinc-500 truncate">{customer.companyName}</p>
                  )}
                  <p className="text-xs text-zinc-400">
                    {customer.billingCity ?? customer.city ?? "—"}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                <CustomerTypeBadge type={customer.customerType ?? "Individual Buyer"} />
                <StatusBadge status={customer.tier} />
              </div>
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

      {selectedId && (
        <CustomerDetailPanel
          customerId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </ListPageShell>
  );
}
