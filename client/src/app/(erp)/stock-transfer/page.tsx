"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRightLeft, Calendar, ScanLine, Trash2 } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ItemCodeLink from "@/app/(components)/inventory/ItemCodeLink";
import BranchAutocomplete from "@/app/(components)/BranchAutocomplete";
import TransferTabs from "@/app/(components)/stock-transfer/TransferTabs";
import TransferCustomerDetailsCard, {
  type TransferBillingFormState,
} from "@/app/(components)/stock-transfer/TransferCustomerDetailsCard";
import { fetchCustomerBranches, fetchCustomers } from "@/lib/api/customers";
import { createStockTransfer } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  getTransferBillingWarnings,
  resolveBranchBillingDetails,
  toTransferBillingInput,
} from "@/lib/customers/resolve-branch-details";
import { useInventory } from "@/lib/inventory/inventory-context";
import type {
  Customer,
  CustomerBranch,
  InventoryItem,
  InventoryUnit,
  StockTransferDocumentType,
} from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type ScannedItem = {
  unit: InventoryUnit;
  product: InventoryItem;
};

const today = () => new Date().toISOString().slice(0, 10);

function StockTransferScanPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCustomerId = searchParams.get("customerId") ?? "";
  const presetCustomerBranchId = searchParams.get("customerBranchId") ?? "";
  const { items, hydrated, loading, refresh } = useInventory();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerBranches, setCustomerBranches] = useState<CustomerBranch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<CustomerBranch | null>(null);
  const [branchesLoading, setBranchesLoading] = useState(false);
  const [branchQuery, setBranchQuery] = useState("");
  const [transferDate, setTransferDate] = useState(today());
  const [docType, setDocType] =
    useState<StockTransferDocumentType>("Wholesale GST Invoice");
  const [notes, setNotes] = useState("");
  const [barcode, setBarcode] = useState("");
  const [scanned, setScanned] = useState<ScannedItem[]>([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [billingForm, setBillingForm] = useState<TransferBillingFormState>({
    gstNumber: "",
    panNumber: "",
    email: "",
    phone: "",
    address: "",
    placeOfSupplyState: "",
    placeOfSupplyStateCode: "",
    placeOfDeliveryState: "",
    placeOfDeliveryStateCode: "",
  });

  useEffect(() => {
    fetchCustomers()
      .then(setCustomers)
      .catch((err) => setError(getApiErrorMessage(err, "Could not load customers.")));
  }, []);

  useEffect(() => {
    if (presetCustomerId) {
      setCustomerId(presetCustomerId);
    }
  }, [presetCustomerId]);

  const loadBranches = useCallback(
    async (id: string, query?: string) => {
      setBranchesLoading(true);
      try {
        const branches = await fetchCustomerBranches(id, query);
        setCustomerBranches(branches);
        if (presetCustomerBranchId) {
          const presetBranch = branches.find(
            (branch) => branch.id === presetCustomerBranchId,
          );
          if (presetBranch) {
            setSelectedBranch(presetBranch);
            setBranchQuery(presetBranch.name);
          }
        } else if (!query?.trim() && branches.length === 1) {
          setSelectedBranch(branches[0]);
          setBranchQuery(branches[0].name);
        }
      } catch (err) {
        setError(getApiErrorMessage(err, "Could not load customer branches."));
      } finally {
        setBranchesLoading(false);
      }
    },
    [presetCustomerBranchId],
  );

  useEffect(() => {
    if (!customerId) {
      setCustomerBranches([]);
      setSelectedBranch(null);
      return;
    }
    loadBranches(customerId, branchQuery || undefined);
  }, [customerId, branchQuery, loadBranches]);

  const handleCustomerChange = (id: string) => {
    setCustomerId(id);
    setSelectedBranch(null);
    setBranchQuery("");
    setError("");
  };

  const allUnits = useMemo(
    () =>
      items.flatMap((product) =>
        product.units.map((unit) => ({
          unit,
          product,
        })),
      ),
    [items],
  );

  const totalValue = scanned.reduce(
    (sum, item) => sum + item.product.price,
    0,
  );

  const canSubmit =
    Boolean(customerId) &&
    Boolean(selectedBranch?.id) &&
    scanned.length > 0;

  const addBarcode = () => {
    const code = barcode.trim();
    if (!code) return;

    setError("");

    if (scanned.some((item) => item.unit.itemCode === code)) {
      setError("This item is already added.");
      return;
    }

    const found = allUnits.find((item) => item.unit.itemCode === code);
    if (!found) {
      setError("Item code not found in admin stock.");
      return;
    }

    if (found.unit.status !== "Available") {
      setError(`This item is ${found.unit.status} and cannot be transferred.`);
      return;
    }

    setScanned((prev) => [...prev, found]);
    setBarcode("");
  };

  const removeItem = (itemCode: string) => {
    setScanned((prev) => prev.filter((item) => item.unit.itemCode !== itemCode));
  };

  const handleSave = async () => {
    setError("");

    if (!customerId) {
      setError("Select a customer first.");
      return;
    }
    if (!selectedBranch) {
      setError("Select a customer branch.");
      return;
    }
    if (scanned.length === 0) {
      setError("Scan at least one item.");
      return;
    }

    setSaving(true);
    try {
      const result = await createStockTransfer({
        customerId,
        customerBranchId: selectedBranch.id,
        documentType: docType,
        transferDate,
        itemCodes: scanned.map((item) => item.unit.itemCode),
        notes: notes.trim() || undefined,
        billing: billingInput,
      });
      await refresh({ silent: true });
      router.push(`/stock-transfer/sent/${result.transfer.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save transfer."));
    } finally {
      setSaving(false);
    }
  };

  const selectedCustomer = customers.find((c) => c.id === customerId);

  const resolvedBilling = useMemo(() => {
    if (!selectedCustomer || !selectedBranch) return null;
    return resolveBranchBillingDetails(selectedCustomer, selectedBranch);
  }, [selectedCustomer, selectedBranch]);

  useEffect(() => {
    if (!resolvedBilling) return;
    setBillingForm({
      gstNumber: resolvedBilling.gstNumber ?? "",
      panNumber: resolvedBilling.panNumber ?? "",
      email: resolvedBilling.email ?? "",
      phone: resolvedBilling.phone ?? "",
      address: resolvedBilling.address ?? "",
      placeOfSupplyState: resolvedBilling.state ?? "",
      placeOfSupplyStateCode: resolvedBilling.stateCode ?? "",
      placeOfDeliveryState: resolvedBilling.state ?? "",
      placeOfDeliveryStateCode: resolvedBilling.stateCode ?? "",
    });
  }, [resolvedBilling]);

  const billingInput = useMemo(() => {
    if (!resolvedBilling) return undefined;
    return toTransferBillingInput(resolvedBilling, billingForm);
  }, [resolvedBilling, billingForm]);

  const billingWarnings = useMemo(() => {
    if (!billingInput) return [];
    return getTransferBillingWarnings(docType, billingInput);
  }, [billingInput, docType]);

  const updateBillingField = (
    field: keyof TransferBillingFormState,
    value: string,
  ) => {
    setBillingForm((prev) => ({ ...prev, [field]: value }));
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Scan & Send"
        subtitle="Scan item tags and send stock from Head Office to a customer branch"
      />

      <TransferTabs />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-5">
        <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-5">
          <div className="surface-card p-5 space-y-4">
          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Customer
            </label>
            {presetCustomerId && selectedCustomer ? (
              <div className="input-field w-full px-3 py-2 text-sm bg-zinc-50 text-zinc-900">
                {selectedCustomer.name}
              </div>
            ) : (
              <select
                value={customerId}
                onChange={(event) => handleCustomerChange(event.target.value)}
                className="input-field w-full px-3 py-2 text-sm"
              >
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Branch
            </label>
            <BranchAutocomplete
              branches={customerBranches}
              value={selectedBranch}
              onChange={setSelectedBranch}
              disabled={!customerId}
              loading={branchesLoading}
              placeholder={
                customerId
                  ? `Search ${selectedCustomer?.name ?? "customer"} branch…`
                  : "Select a customer first"
              }
              onQueryChange={setBranchQuery}
            />
          </div>

          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Date
            </label>
            <div className="relative">
              <Calendar
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                type="date"
                value={transferDate}
                onChange={(event) => setTransferDate(event.target.value)}
                className="input-field w-full pl-9 pr-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Document Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              {(["Wholesale GST Invoice", "Delivery Challan"] as const).map(
                (type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setDocType(type)}
                    className={`tab-btn text-left ${
                      docType === type ? "tab-btn-active" : "tab-btn-inactive"
                    }`}
                  >
                    {type}
                  </button>
                ),
              )}
            </div>
          </div>

          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Notes (optional)
            </label>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
              placeholder="Handle with care — stone-set items"
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>

          <div className="pt-2 border-t border-zinc-100">
            <p className="text-xs text-zinc-500">Items to send</p>
            <p className="text-2xl font-semibold text-zinc-900">
              {scanned.length}
            </p>
            <p className="text-sm text-zinc-500">{formatCurrency(totalValue)}</p>
          </div>
          </div>

          {resolvedBilling && selectedBranch ? (
            <TransferCustomerDetailsCard
              resolved={resolvedBilling}
              form={billingForm}
              warnings={billingWarnings}
              onChange={updateBillingField}
            />
          ) : (
            <div className="surface-card flex items-center justify-center p-8 text-sm text-zinc-400">
              Select a customer and branch to view billing details.
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="surface-card p-5">
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Scan or enter barcode tag
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <ScanLine
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={barcode}
                  onChange={(event) => {
                    setBarcode(event.target.value);
                    setError("");
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      addBarcode();
                    }
                  }}
                  placeholder="Scan item code"
                  className="input-field w-full pl-9 pr-4 py-2 text-sm"
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={addBarcode}
                disabled={!barcode.trim()}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                Add
              </button>
            </div>
          </div>

          <div className="surface-card overflow-hidden">
            <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-zinc-900">
                Scanned Items
              </h2>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving || !canSubmit}
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
              >
                <ArrowRightLeft size={16} />
                {saving ? "Saving..." : "Send to Customer Branch"}
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="bg-zinc-50 text-zinc-500">
                    <th className="text-left px-5 py-3 font-medium">Item Code</th>
                    <th className="text-left px-5 py-3 font-medium">Product</th>
                    <th className="text-left px-5 py-3 font-medium">SKU</th>
                    <th className="text-left px-5 py-3 font-medium">Metal</th>
                    <th className="text-left px-5 py-3 font-medium">Price</th>
                    <th className="text-left px-5 py-3 font-medium">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {scanned.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-5 py-10 text-center text-sm text-zinc-400"
                      >
                        Scan barcode tags to add items for transfer.
                      </td>
                    </tr>
                  ) : (
                    scanned.map(({ unit, product }) => (
                      <tr
                        key={unit.id}
                        className="border-t border-zinc-100 text-zinc-900"
                      >
                        <td className="px-5 py-3 font-mono text-xs">
                          <ItemCodeLink itemCode={unit.itemCode} className="text-xs" />
                        </td>
                        <td className="px-5 py-3">{product.name}</td>
                        <td className="px-5 py-3 font-mono text-xs">
                          {product.sku}
                        </td>
                        <td className="px-5 py-3">
                          {product.metal} {product.purity}
                        </td>
                        <td className="px-5 py-3">
                          {formatCurrency(product.price)}
                        </td>
                        <td className="px-5 py-3">
                          <button
                            type="button"
                            onClick={() => removeItem(unit.itemCode)}
                            className="p-1 text-zinc-400 hover:text-red-600"
                            aria-label={`Remove ${unit.itemCode}`}
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StockTransferScanPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <StockTransferScanPageContent />
    </Suspense>
  );
}
