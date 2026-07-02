"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { ChevronDown, Pencil, X } from "lucide-react";
import type { Customer, CustomerDetail } from "@/lib/types";
import { fetchCustomer } from "@/lib/api/customers";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageCustomers } from "@/lib/auth/permissions";
import { useCustomers } from "@/lib/customers/customers-context";
import { formatCurrency, formatDate } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api/client";
import StatusBadge from "@/app/(components)/StatusBadge";
import CustomerBranchesTab from "@/app/(components)/CustomerDetailPanel/CustomerBranchesTab";
import {
  formatCustomerBillingAddress,
  hasCustomerFinancialData,
} from "@/app/(components)/CustomerFinancialFields";

const EditCustomerModal = dynamic(() => import("@/app/(components)/EditCustomerModal"), { ssr: false });

type PanelTab = "profile" | "branches";

type CustomerDetailPanelProps = {
  customerId: string | null;
  onClose: () => void;
};

export default function CustomerDetailPanel({
  customerId,
  onClose,
}: CustomerDetailPanelProps) {
  const { user } = useAuth();
  const { updateCustomer } = useCustomers();
  const canManage = user ? canManageCustomers(user.role) : false;
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editOpen, setEditOpen] = useState(false);
  const [financialOpen, setFinancialOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<PanelTab>("profile");

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);
    setError("");
    fetchCustomer(customerId)
      .then(setDetail)
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load customer.")))
      .finally(() => setLoading(false));
  }, [customerId]);

  if (!customerId) return null;

  const billingAddress = detail ? formatCustomerBillingAddress(detail) : null;
  const showFinancial = detail ? hasCustomerFinancialData(detail) : false;

  return (
    <>
      <div className="fixed inset-0 z-50 flex justify-end">
        <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-hidden />
        <div className="relative w-full max-w-lg h-full overflow-y-auto border-l border-zinc-200 bg-white shadow-2xl">
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 bg-white">
            <h2 className="text-base font-semibold text-zinc-900">Customer Profile</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600">
              <X size={18} />
            </button>
          </div>

          <div className="p-5 space-y-5">
            {loading && <p className="text-sm text-zinc-400">Loading…</p>}
            {error && <p className="text-xs text-red-600">{error}</p>}

            {detail && (
              <>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full avatar text-lg">
                      {detail.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-zinc-900">{detail.name}</p>
                      <p className="text-sm text-zinc-500">{detail.mobile}</p>
                    </div>
                  </div>
                  <StatusBadge status={detail.tier} />
                </div>

                <div className="flex gap-2 border-b border-zinc-200">
                  {(["profile", "branches"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                      className={`tab-btn capitalize ${
                        activeTab === tab ? "tab-btn-active" : "tab-btn-inactive"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                {activeTab === "branches" ? (
                  <CustomerBranchesTab
                    customerId={detail.id}
                    customerName={detail.name}
                    canManage={canManage}
                  />
                ) : (
                  <>
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setEditOpen(true)}
                    className="btn-secondary w-full flex items-center justify-center gap-1.5 px-3 py-2 text-xs"
                  >
                    <Pencil size={14} /> Edit Customer
                  </button>
                )}

                <dl className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    ["Email", detail.email ?? "—"],
                    ["Ring Size", detail.ringSize ?? "—"],
                    ["Birthday", detail.birthday ? formatDate(detail.birthday) : "—"],
                    ["Anniversary", detail.anniversary ? formatDate(detail.anniversary) : "—"],
                    ["Total Orders", String(detail.totalOrders)],
                    ["Total Spent", formatCurrency(detail.totalSpent)],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs text-zinc-400">{label}</dt>
                      <dd className="font-medium text-zinc-900">{value}</dd>
                    </div>
                  ))}
                </dl>

                {showFinancial && (
                  <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setFinancialOpen((prev) => !prev)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-zinc-50 hover:bg-zinc-100"
                    >
                      <span className="text-xs font-medium text-zinc-600">Billing, Tax & Bank Details</span>
                      <ChevronDown
                        size={16}
                        className={`text-zinc-400 transition-transform ${financialOpen ? "rotate-180" : ""}`}
                      />
                    </button>
                    {financialOpen && (
                      <dl className="grid grid-cols-2 gap-3 p-3 text-sm border-t border-zinc-200">
                        {[
                          ["PAN", detail.panNumber],
                          ["GST Number", detail.gstNumber],
                          ["GST Registered Name", detail.gstRegisteredName],
                          ["Billing Address", billingAddress],
                          ["Bank", detail.bankName],
                          ["Account Name", detail.bankAccountName],
                          ["Account No.", detail.bankAccountNumber],
                          ["IFSC", detail.bankIfsc],
                        ]
                          .filter(([, value]) => value)
                          .map(([label, value]) => (
                            <div
                              key={label}
                              className={label === "Billing Address" ? "col-span-2" : ""}
                            >
                              <dt className="text-xs text-zinc-400">{label}</dt>
                              <dd className="font-medium text-zinc-900">{value}</dd>
                            </div>
                          ))}
                      </dl>
                    )}
                  </div>
                )}

                {detail.preferences && (
                  <div>
                    <p className="text-xs text-zinc-400 mb-1">Preferences</p>
                    <p className="text-sm text-zinc-700">{detail.preferences}</p>
                  </div>
                )}

                <div>
                  <p className="text-sm font-semibold text-zinc-900 mb-3">Purchase History</p>
                  {detail.sales.length === 0 ? (
                    <p className="text-sm text-zinc-400">No purchases yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-80 overflow-y-auto">
                      {detail.sales.map((sale) => (
                        <div key={sale.id} className="rounded-lg border border-zinc-200 p-3 text-xs">
                          <div className="flex justify-between gap-2 mb-1">
                            <span className="font-mono font-medium text-zinc-800">{sale.itemCode}</span>
                            <span className="font-semibold text-zinc-900">{formatCurrency(sale.dealPrice)}</span>
                          </div>
                          <p className="text-zinc-600">{sale.productName}</p>
                          <p className="text-zinc-400 mt-1">
                            {formatDate(sale.soldAt)} · {sale.paymentMode}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {detail && editOpen && (
        <EditCustomerModal
          open={editOpen}
          customer={detail as Customer}
          onClose={() => setEditOpen(false)}
          onSubmit={async (input) => {
            const updated = await updateCustomer(detail.id, input);
            setDetail((prev) => (prev ? { ...prev, ...updated } : prev));
            const refreshed = await fetchCustomer(detail.id);
            setDetail(refreshed);
          }}
        />
      )}
    </>
  );
}
