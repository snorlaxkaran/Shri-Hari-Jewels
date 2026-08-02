"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Search } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageSettings } from "@/lib/auth/permissions";
import { fetchProductBySku, renameProductSku } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import type { InventoryItem } from "@/lib/types";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function SkuRenamePage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user ? canManageSettings(user.role) : false;

  const [fromSku, setFromSku] = useState("");
  const [toSku, setToSku] = useState("");
  const [product, setProduct] = useState<InventoryItem | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !isAdmin) {
      router.replace("/settings");
    }
  }, [user, isAdmin, router]);

  const handleLookup = async () => {
    setLookupError("");
    setSuccess("");
    setProduct(null);
    const sku = fromSku.trim();
    if (!sku) {
      setLookupError("Enter the current SKU to look up.");
      return;
    }
    setLookupLoading(true);
    try {
      const found = await fetchProductBySku(sku);
      setProduct(found);
      setFromSku(found.sku);
    } catch (err) {
      setLookupError(getApiErrorMessage(err, "Could not find that SKU."));
    } finally {
      setLookupLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) {
      setSubmitError("Look up a SKU first.");
      return;
    }
    setSubmitError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const updated = await renameProductSku(product.id, toSku.trim());
      setSuccess(
        `SKU updated to ${updated.sku}. ${updated.units.length} piece(s) keep their original item codes.`,
      );
      setProduct(updated);
      setFromSku(updated.sku);
      setToSku("");
    } catch (err) {
      setSubmitError(getApiErrorMessage(err, "Could not rename SKU."));
    } finally {
      setSubmitting(false);
    }
  };

  if (user && !isAdmin) {
    return null;
  }

  const sampleCodes = product?.units.slice(0, 5).map((u) => u.itemCode) ?? [];

  return (
    <div className="page-content max-w-2xl">
      <Link
        href="/settings"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 mb-4"
      >
        <ArrowLeft size={16} />
        Back to settings
      </Link>

      <PageHeader
        title="Rename SKU"
        subtitle="Admin only — changes the catalog SKU for all pieces under that product. Item codes (barcodes) never change."
      />

      <div className="surface-card p-5 mb-4 text-sm text-zinc-600 leading-relaxed">
        <p className="font-medium text-zinc-900 mb-2">How it works</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Example: change <span className="font-mono">SMNK0011</span> →{" "}
            <span className="font-mono">SMNK0012</span> for every piece tagged with that SKU.
          </li>
          <li>
            Each piece keeps its lifelong item code (e.g.{" "}
            <span className="font-mono">SMNK0011-003</span> stays exactly as printed on the tag).
          </li>
          <li>Past invoices and sales records keep the SKU snapshot from the time of sale.</li>
        </ul>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="surface-card p-5 space-y-4">
          <div>
            <label className={labelClass}>Current SKU</label>
            <div className="flex gap-2">
              <input
                value={fromSku}
                onChange={(e) => {
                  setFromSku(e.target.value.toUpperCase());
                  setProduct(null);
                  setLookupError("");
                }}
                placeholder="SMNK0011"
                className={fieldClass}
                autoFocus
              />
              <button
                type="button"
                onClick={() => void handleLookup()}
                disabled={lookupLoading}
                className="btn-secondary shrink-0 px-4"
              >
                {lookupLoading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                Look up
              </button>
            </div>
            {lookupError ? <p className="mt-2 text-sm text-red-600">{lookupError}</p> : null}
          </div>

          {product ? (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 text-sm space-y-2">
              <p>
                <span className="text-zinc-500">Product:</span>{" "}
                <span className="font-medium">{product.name}</span>
              </p>
              <p>
                <span className="text-zinc-500">Pieces:</span>{" "}
                <span className="font-medium">{product.units.length}</span>
              </p>
              {sampleCodes.length > 0 ? (
                <p>
                  <span className="text-zinc-500">Sample item codes (unchanged):</span>{" "}
                  <span className="font-mono text-xs">{sampleCodes.join(", ")}</span>
                  {product.units.length > 5 ? " …" : ""}
                </p>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className={labelClass}>New SKU</label>
            <input
              value={toSku}
              onChange={(e) => setToSku(e.target.value.toUpperCase())}
              placeholder="SMNK0012"
              className={fieldClass}
              disabled={!product}
            />
          </div>
        </div>

        {submitError ? <div className="alert-error">{submitError}</div> : null}
        {success ? (
          <div className="px-4 py-3 rounded-lg text-sm border border-green-200 bg-green-50 text-green-800">
            {success}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!product || !toSku.trim() || submitting}
          className="btn-primary inline-flex items-center gap-2"
        >
          {submitting ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <ArrowRight size={16} />
          )}
          Rename SKU
        </button>
      </form>
    </div>
  );
}
