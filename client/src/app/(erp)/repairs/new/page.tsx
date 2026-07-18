"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import ImageUpload from "@/app/(components)/ImageUpload";
import CustomerLookupInput, {
  type CustomerLookupSelection,
} from "@/components/CustomerLookupInput";
import { createRepair } from "@/lib/api/repairs";
import { getApiErrorMessage } from "@/lib/api/client";
import type { PendingImage } from "@/lib/inventory/images";
import { parseMoneyInput } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function NewRepairPage() {
  const router = useRouter();
  const [customerSelection, setCustomerSelection] =
    useState<CustomerLookupSelection | null>(null);
  const [itemDescription, setItemDescription] = useState("");
  const [intakeCondition, setIntakeCondition] = useState("");
  const [requestedWork, setRequestedWork] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [estimatedReadyDate, setEstimatedReadyDate] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [photos, setPhotos] = useState<PendingImage[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSelection) {
      setError("Select or add a customer.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const repair = await createRepair({
        customerId: customerSelection.customerId,
        customerName: customerSelection.fields.name,
        customerMobile: customerSelection.fields.mobile,
        itemDescription,
        intakeCondition: intakeCondition.trim() || undefined,
        intakePhotoUrls: photos.map((p) => p.url),
        requestedWork,
        estimatedCost: estimatedCost.trim()
          ? parseMoneyInput(estimatedCost)
          : undefined,
        estimatedReadyDate: estimatedReadyDate || undefined,
        depositAmount: depositAmount.trim()
          ? parseMoneyInput(depositAmount)
          : undefined,
      });
      router.push(`/repairs/${repair.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create repair order."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page-content max-w-3xl">
      <Link
        href="/repairs"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4"
      >
        <ArrowLeft size={16} />
        Back to repairs
      </Link>

      <PageHeader
        title="New Repair"
        subtitle="Intake at counter — photos, condition notes, and requested work"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="surface-card p-5 space-y-4">
          <CustomerLookupInput onSelectionChange={setCustomerSelection} />

          <div>
            <label className={labelClass}>Item description</label>
            <input
              className={fieldClass}
              value={itemDescription}
              onChange={(e) => setItemDescription(e.target.value)}
              placeholder="Gold ring, 3 stones, size 14"
              required
            />
          </div>

          <div>
            <label className={labelClass}>Intake condition notes</label>
            <textarea
              className={`${fieldClass} min-h-[80px]`}
              value={intakeCondition}
              onChange={(e) => setIntakeCondition(e.target.value)}
              placeholder="Scratches on band, one prong loose, missing small stone…"
            />
          </div>

          <ImageUpload images={photos} onChange={setPhotos} />

          <div>
            <label className={labelClass}>Requested work</label>
            <textarea
              className={`${fieldClass} min-h-[80px]`}
              value={requestedWork}
              onChange={(e) => setRequestedWork(e.target.value)}
              placeholder="Resize from 14 to 16, tighten 2 prongs"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className={labelClass}>Initial estimate (optional)</label>
              <input
                className={fieldClass}
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <label className={labelClass}>Estimated ready date</label>
              <input
                type="date"
                className={fieldClass}
                value={estimatedReadyDate}
                onChange={(e) => setEstimatedReadyDate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Deposit collected</label>
              <input
                className={fieldClass}
                value={depositAmount}
                onChange={(e) => setDepositAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/repairs" className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {submitting ? "Saving…" : "Create repair order"}
          </button>
        </div>
      </form>
    </div>
  );
}
