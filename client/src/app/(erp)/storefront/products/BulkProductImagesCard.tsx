"use client";

import { useRef, useState } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  MAX_PRODUCT_IMAGES,
  parseSkuImageFilename,
} from "@/lib/inventory/images";
import { uploadBulkProductImages } from "@/lib/inventory/bulk-product-images";

export default function BulkProductImagesCard() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<"replace" | "merge">("replace");
  const [fileCount, setFileCount] = useState(0);
  const [progress, setProgress] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [uploading, setUploading] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setErrors([]);
    setSummary("");
    setFileCount(files.length);
    setProgress("Processing images…");

    try {
      const result = await uploadBulkProductImages(
        [...files],
        mode,
        (done, total) => setProgress(`Uploaded ${done} of ${total} images…`),
      );
      setErrors(result.errors);
      const parts = [`${result.updated} SKU(s) updated`];
      if (result.errors.length > 0) {
        parts.push(`${result.errors.length} issue(s) — see below`);
      }
      setSummary(parts.join(", ") + ".");
    } catch (err) {
      setErrors([getApiErrorMessage(err, "Upload failed.")]);
    } finally {
      setUploading(false);
      setProgress("");
    }
  };

  return (
    <section className="surface-card p-5 space-y-4">
      <div className="flex items-start gap-2">
        <ImageIcon size={18} className="text-zinc-600 mt-0.5 shrink-0" />
        <div>
          <h2 className="font-semibold">Bulk product photos</h2>
          <p className="text-sm text-zinc-500 mt-1 max-w-3xl">
            Select many files at once. Name each file{" "}
            <code className="text-xs bg-zinc-100 px-1 rounded">SKU0001_1.jpg</code> through{" "}
            <code className="text-xs bg-zinc-100 px-1 rounded">SKU0001_{MAX_PRODUCT_IMAGES}.jpg</code>.
            Index <strong>1</strong> is the shop thumbnail. Images are resized to 1200×1810 px.
            SKUs must already exist in central stock.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="image-import-mode"
            checked={mode === "replace"}
            onChange={() => setMode("replace")}
          />
          Replace all photos per SKU
        </label>
        <label className="inline-flex items-center gap-2">
          <input
            type="radio"
            name="image-import-mode"
            checked={mode === "merge"}
            onChange={() => setMode("merge")}
          />
          Merge by index (keep other slots)
        </label>
      </div>

      <div
        onClick={() => !uploading && fileRef.current?.click()}
        className="rounded-xl border-2 border-dashed border-zinc-200 p-6 text-center cursor-pointer hover:bg-zinc-50"
      >
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={(e) => {
            void handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <Upload size={24} className="mx-auto mb-2 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-700">
          {uploading ? progress || "Uploading…" : "Choose photos (multi-select)"}
        </p>
        {fileCount > 0 && !uploading && (
          <p className="text-xs text-zinc-400 mt-1">Last batch: {fileCount} file(s)</p>
        )}
      </div>

      {errors.length > 0 && (
        <div className="max-h-40 overflow-y-auto text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {errors.slice(0, 40).map((err, i) => (
            <p key={`${err}-${i}`}>{err}</p>
          ))}
          {errors.length > 40 && (
            <p>…and {errors.length - 40} more.</p>
          )}
        </div>
      )}

      {summary && (
        <p className="text-sm text-green-800 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {summary}
        </p>
      )}

      {uploading && (
        <p className="text-xs text-zinc-500 inline-flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" />
          {progress}
        </p>
      )}

      <p className="text-[11px] text-zinc-400">
        Tip: invalid names are skipped. Example valid names:{" "}
        {["SKU0001_1.jpg", "SKU0100_8.webp"].map((name) => {
          const ok = parseSkuImageFilename(name);
          return ok ? name : null;
        }).filter(Boolean).join(", ")}
      </p>
    </section>
  );
}
