"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import { createExpense } from "@/lib/api/expenses";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ExpenseCategory } from "@/lib/types";
import { parseMoneyInput } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

const categories: ExpenseCategory[] = [
  "Tools",
  "Pantry",
  "Stationery",
  "Maintenance",
  "Transport",
  "Miscellaneous",
];

export default function NewExpensePage() {
  const router = useRouter();
  const [category, setCategory] = useState<ExpenseCategory>("Tools");
  const [description, setDescription] = useState("");
  const [requestedAmount, setRequestedAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await createExpense({
        category,
        description,
        requestedAmount: requestedAmount.trim()
          ? parseMoneyInput(requestedAmount)
          : undefined,
      });
      router.push("/expenses");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to submit expense request."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content max-w-xl">
      <Link
        href="/expenses"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4"
      >
        <ArrowLeft size={16} />
        Back to expenses
      </Link>

      <PageHeader
        title="Request Cash"
        subtitle="Quick petty cash request — category, what you need, estimated amount"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="surface-card p-5 space-y-4">
        <div>
          <label className={labelClass}>Category</label>
          <select
            className={fieldClass}
            value={category}
            onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
            required
          >
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelClass}>What do you need?</label>
          <input
            className={fieldClass}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Plier for casting bench, 2kg milk and tea leaves…"
            required
          />
        </div>

        <div>
          <label className={labelClass}>Estimated amount (optional)</label>
          <input
            className={fieldClass}
            value={requestedAmount}
            onChange={(e) => setRequestedAmount(e.target.value)}
            placeholder="200"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/expenses" className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit request"}
          </button>
        </div>
      </form>
    </div>
  );
}
