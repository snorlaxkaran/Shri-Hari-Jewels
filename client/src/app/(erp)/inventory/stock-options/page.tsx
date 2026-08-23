"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageSettings } from "@/lib/auth/permissions";
import {
  createDropdownOption,
  fetchDropdownOptions,
  reorderDropdownOptions,
  updateDropdownOption,
} from "@/lib/api/dropdown-options";
import { createVendor, fetchVendors } from "@/lib/api/vendors";
import {
  createStoneType,
  fetchStoneTypes,
  updateStoneType,
} from "@/lib/api/stone-types";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  categorySizeFieldKey,
} from "@/lib/inventory/dropdown-options";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/inventory/categories";
import { categoryHasSizeOptions } from "@/lib/inventory/category-sizes";
import type { DropdownOption, StoneType, Vendor } from "@/lib/types";

type TabId = "categorySize" | "vendor" | "stone" | "subCategory" | "metal" | "purity";

const TABS: { id: TabId; label: string }[] = [
  { id: "categorySize", label: "Category sizes" },
  { id: "vendor", label: "Vendors" },
  { id: "stone", label: "Stone names" },
  { id: "subCategory", label: "Sub categories" },
  { id: "metal", label: "Metal types" },
  { id: "purity", label: "Purity grades" },
];

const SIZE_CATEGORIES = PRODUCT_CATEGORIES.filter((category) =>
  categoryHasSizeOptions(category),
);

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function StockEntryOptionsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user ? canManageSettings(user.role) : false;

  const [activeTab, setActiveTab] = useState<TabId>("categorySize");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);

  const [dropdownOptions, setDropdownOptions] = useState<DropdownOption[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stoneTypes, setStoneTypes] = useState<StoneType[]>([]);

  const [sizeCategory, setSizeCategory] = useState<ProductCategory>(
    SIZE_CATEGORIES[0] ?? "Rings",
  );
  const [newValue, setNewValue] = useState("");

  const activeDropdownFieldKey = useMemo(() => {
    if (activeTab === "categorySize") return categorySizeFieldKey(sizeCategory);
    if (activeTab === "subCategory") return "subCategory";
    if (activeTab === "metal") return "metal";
    if (activeTab === "purity") return "purity";
    return null;
  }, [activeTab, sizeCategory]);

  const activeDropdownOptions = useMemo(() => {
    if (!activeDropdownFieldKey) return [];
    return dropdownOptions
      .filter((option) => option.fieldKey === activeDropdownFieldKey)
      .sort(
        (a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value),
      );
  }, [dropdownOptions, activeDropdownFieldKey]);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [options, vendorRows, stoneRows] = await Promise.all([
        fetchDropdownOptions(undefined, false),
        fetchVendors(),
        fetchStoneTypes(false),
      ]);
      setDropdownOptions(options);
      setVendors(vendorRows);
      setStoneTypes(stoneRows);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load stock entry options."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/inventory");
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      void load();
    }
  }, [isAdmin, load]);

  const handleAddDropdown = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeDropdownFieldKey) return;
    const trimmed = newValue.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError("");
    try {
      const created = await createDropdownOption({
        fieldKey: activeDropdownFieldKey,
        value: trimmed,
      });
      setDropdownOptions((prev) =>
        [...prev.filter((item) => item.id !== created.id), created].sort(
          (a, b) =>
            a.fieldKey.localeCompare(b.fieldKey) ||
            a.sortOrder - b.sortOrder ||
            a.value.localeCompare(b.value),
        ),
      );
      setNewValue("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add option."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newValue.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError("");
    try {
      const created = await createVendor({ name: trimmed });
      setVendors((prev) =>
        [...prev.filter((item) => item.id !== created.id), created].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setNewValue("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add vendor."));
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddStone = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newValue.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError("");
    try {
      const created = await createStoneType({ name: trimmed });
      setStoneTypes((prev) =>
        [...prev.filter((item) => item.id !== created.id), created].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setNewValue("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add stone name."));
    } finally {
      setSubmitting(false);
    }
  };

  const toggleDropdownActive = async (option: DropdownOption) => {
    setError("");
    try {
      const updated = await updateDropdownOption(option.id, {
        active: !option.active,
      });
      setDropdownOptions((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update option."));
    }
  };

  const toggleStoneActive = async (stone: StoneType) => {
    setError("");
    try {
      const updated = await updateStoneType(stone.id, { isActive: !stone.isActive });
      setStoneTypes((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update stone name."));
    }
  };

  const moveDropdownOption = async (index: number, direction: -1 | 1) => {
    if (!activeDropdownFieldKey) return;
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= activeDropdownOptions.length) return;

    const orderedIds = activeDropdownOptions.map((option) => option.id);
    const [moved] = orderedIds.splice(index, 1);
    orderedIds.splice(targetIndex, 0, moved!);

    setReordering(true);
    setError("");
    try {
      const reordered = await reorderDropdownOptions({
        fieldKey: activeDropdownFieldKey,
        orderedIds,
      });
      setDropdownOptions((prev) => {
        const others = prev.filter((item) => item.fieldKey !== activeDropdownFieldKey);
        return [...others, ...reordered];
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reorder options."));
    } finally {
      setReordering(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    if (activeTab === "vendor") return void handleAddVendor(e);
    if (activeTab === "stone") return void handleAddStone(e);
    return void handleAddDropdown(e);
  };

  const tabDescription = () => {
    switch (activeTab) {
      case "categorySize":
        return "Ring and bangle sizes shown on stock entry when the matching category is selected.";
      case "vendor":
        return "Vendor names appear in the stock entry vendor dropdown.";
      case "stone":
        return "Stone names appear in the stock entry stone dropdown.";
      case "subCategory":
        return "Sub categories for stock entry and product classification.";
      case "metal":
        return "Metal types available on stock entry.";
      case "purity":
        return "Purity grades available on stock entry.";
      default:
        return "";
    }
  };

  const addPlaceholder = () => {
    switch (activeTab) {
      case "categorySize":
        return sizeCategory === "Rings" ? "e.g. 12" : "e.g. 2|6";
      case "vendor":
        return "Vendor name";
      case "stone":
        return "Stone name (e.g. Ruby, Emerald)";
      default:
        return "New option…";
    }
  };

  if (!user || !isAdmin) return null;
  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Stock entry options"
        subtitle="Manage dropdown lists used when adding stock — category sizes, vendors, stone names, and more"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 max-w-4xl">
        <nav className="surface-card p-3 space-y-1 h-fit">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setNewValue("");
              }}
              className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                activeTab === tab.id
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="surface-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              {TABS.find((tab) => tab.id === activeTab)?.label}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">{tabDescription()}</p>
          </div>

          {activeTab === "categorySize" && (
            <div>
              <label className={labelClass}>Category</label>
              <select
                value={sizeCategory}
                onChange={(e) => setSizeCategory(e.target.value as ProductCategory)}
                className={fieldClass}
              >
                {SIZE_CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          )}

          {(activeTab === "categorySize" ||
            activeTab === "subCategory" ||
            activeTab === "metal" ||
            activeTab === "purity" ||
            activeTab === "vendor" ||
            activeTab === "stone") && (
            <form onSubmit={handleSubmit} className="dropdown-add-panel flex-wrap">
              <div className="flex-1 min-w-[200px]">
                <label className={labelClass}>Add value</label>
                <input
                  className={fieldClass}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                  placeholder={addPlaceholder()}
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={submitting || !newValue.trim()}
                  className="dropdown-add-panel-save inline-flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <Plus size={14} />
                  {submitting ? "Adding…" : "Add"}
                </button>
              </div>
            </form>
          )}

          {(activeTab === "categorySize" ||
            activeTab === "subCategory" ||
            activeTab === "metal" ||
            activeTab === "purity") && (
            <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
              {activeDropdownOptions.length === 0 ? (
                <li className="px-4 py-6 text-sm text-zinc-500 text-center">
                  No options yet. Use the + Add button above.
                </li>
              ) : (
                activeDropdownOptions.map((option, index) => (
                  <li
                    key={option.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      option.active ? "" : "opacity-60 bg-zinc-50"
                    }`}
                  >
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={index === 0 || reordering}
                        onClick={() => void moveDropdownOption(index, -1)}
                        className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={index === activeDropdownOptions.length - 1 || reordering}
                        onClick={() => void moveDropdownOption(index, 1)}
                        className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                        aria-label="Move down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                    <span className="flex-1 text-sm font-medium text-zinc-900">
                      {option.value}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleDropdownActive(option)}
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        option.active
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {option.active ? "Active" : "Inactive"}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

          {activeTab === "vendor" && (
            <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
              {vendors.length === 0 ? (
                <li className="px-4 py-6 text-sm text-zinc-500 text-center">
                  No vendors yet. Type a name and click Add.
                </li>
              ) : (
                vendors.map((vendor) => (
                  <li key={vendor.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex-1 text-sm font-medium text-zinc-900">
                      {vendor.name}
                    </span>
                    {vendor.gstNumber && (
                      <span className="text-xs text-zinc-500">{vendor.gstNumber}</span>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}

          {activeTab === "stone" && (
            <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
              {stoneTypes.length === 0 ? (
                <li className="px-4 py-6 text-sm text-zinc-500 text-center">
                  No stone names yet. Type a name and click Add.
                </li>
              ) : (
                stoneTypes.map((stone) => (
                  <li
                    key={stone.id}
                    className={`flex items-center gap-3 px-4 py-3 ${
                      stone.isActive ? "" : "opacity-60 bg-zinc-50"
                    }`}
                  >
                    <span className="flex-1 text-sm font-medium text-zinc-900">
                      {stone.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => void toggleStoneActive(stone)}
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        stone.isActive
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-zinc-200 text-zinc-600"
                      }`}
                    >
                      {stone.isActive ? "Active" : "Inactive"}
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}

        </div>
      </div>
    </div>
  );
}
