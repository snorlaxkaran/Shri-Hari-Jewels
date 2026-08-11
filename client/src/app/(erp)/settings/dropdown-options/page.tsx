"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, Plus } from "lucide-react";
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
import { getApiErrorMessage } from "@/lib/api/client";
import {
  ADMIN_DROPDOWN_FIELD_KEYS,
  dropdownFieldKeyLabel,
} from "@/lib/inventory/dropdown-options";
import type { DropdownOption } from "@/lib/types";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function DropdownOptionsSettingsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user ? canManageSettings(user.role) : false;

  const [options, setOptions] = useState<DropdownOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFieldKey, setActiveFieldKey] = useState<string>(ADMIN_DROPDOWN_FIELD_KEYS[0]);
  const [newValue, setNewValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [reordering, setReordering] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchDropdownOptions(undefined, false);
      setOptions(rows);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load dropdown options."));
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/settings");
    }
  }, [user, isAdmin, router]);

  useEffect(() => {
    if (isAdmin) {
      void load();
    }
  }, [isAdmin, load]);

  const grouped = useMemo(() => {
    const map = new Map<string, DropdownOption[]>();
    for (const fieldKey of ADMIN_DROPDOWN_FIELD_KEYS) {
      map.set(fieldKey, []);
    }
    for (const option of options) {
      if (!map.has(option.fieldKey)) {
        map.set(option.fieldKey, []);
      }
      map.get(option.fieldKey)!.push(option);
    }
    for (const [fieldKey, list] of map) {
      map.set(
        fieldKey,
        [...list].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value),
        ),
      );
    }
    return map;
  }, [options]);

  const activeOptions = grouped.get(activeFieldKey) ?? [];

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newValue.trim();
    if (!trimmed) return;

    setSubmitting(true);
    setError("");
    try {
      const created = await createDropdownOption({
        fieldKey: activeFieldKey,
        value: trimmed,
      });
      setOptions((prev) =>
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

  const toggleActive = async (option: DropdownOption) => {
    setError("");
    try {
      const updated = await updateDropdownOption(option.id, {
        active: !option.active,
      });
      setOptions((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update option."));
    }
  };

  const moveOption = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= activeOptions.length) return;

    const orderedIds = activeOptions.map((option) => option.id);
    const [moved] = orderedIds.splice(index, 1);
    orderedIds.splice(targetIndex, 0, moved!);

    setReordering(true);
    setError("");
    try {
      const reordered = await reorderDropdownOptions({
        fieldKey: activeFieldKey,
        orderedIds,
      });
      setOptions((prev) => {
        const others = prev.filter((item) => item.fieldKey !== activeFieldKey);
        return [...others, ...reordered];
      });
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reorder options."));
    } finally {
      setReordering(false);
    }
  };

  if (!user || !isAdmin) {
    return null;
  }

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Dropdown options"
        subtitle="Manage metal, purity, sub-category, and size lists used on stock entry"
      />

      <div className="mb-4">
        <Link href="/settings" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:underline">
          <ArrowLeft size={14} />
          Back to settings
        </Link>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-6 max-w-4xl">
        <nav className="surface-card p-3 space-y-1 h-fit">
          {ADMIN_DROPDOWN_FIELD_KEYS.map((fieldKey) => {
            const count = grouped.get(fieldKey)?.filter((option) => option.active).length ?? 0;
            return (
              <button
                key={fieldKey}
                type="button"
                onClick={() => setActiveFieldKey(fieldKey)}
                className={`w-full text-left rounded-lg px-3 py-2 text-sm ${
                  activeFieldKey === fieldKey
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {dropdownFieldKeyLabel(fieldKey)}
                <span className="ml-1 text-xs opacity-70">({count})</span>
              </button>
            );
          })}
        </nav>

        <div className="surface-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">
              {dropdownFieldKeyLabel(activeFieldKey)}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Deactivate values that should no longer appear on new stock entry. Existing products
              keep their stored values.
            </p>
          </div>

          <form onSubmit={handleAdd} className="flex gap-2">
            <div className="flex-1">
              <label className={labelClass}>Add value</label>
              <input
                className={fieldClass}
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                placeholder="New option…"
              />
            </div>
            <div className="flex items-end">
              <button
                type="submit"
                disabled={submitting || !newValue.trim()}
                className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
              >
                <Plus size={14} />
                {submitting ? "Adding…" : "Add"}
              </button>
            </div>
          </form>

          <ul className="divide-y divide-zinc-100 border border-zinc-200 rounded-lg">
            {activeOptions.length === 0 ? (
              <li className="px-4 py-6 text-sm text-zinc-500 text-center">No options yet.</li>
            ) : (
              activeOptions.map((option, index) => (
                <li
                  key={option.id}
                  className={`flex items-center gap-3 px-4 py-3 ${option.active ? "" : "opacity-60 bg-zinc-50"}`}
                >
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      disabled={index === 0 || reordering}
                      onClick={() => void moveOption(index, -1)}
                      className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                      aria-label="Move up"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      disabled={index === activeOptions.length - 1 || reordering}
                      onClick={() => void moveOption(index, 1)}
                      className="rounded p-0.5 text-zinc-400 hover:text-zinc-700 disabled:opacity-30"
                      aria-label="Move down"
                    >
                      <ArrowDown size={14} />
                    </button>
                  </div>
                  <span className="flex-1 text-sm font-medium text-zinc-900">{option.value}</span>
                  <button
                    type="button"
                    onClick={() => void toggleActive(option)}
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
        </div>
      </div>
    </div>
  );
}
