"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import {
  ACCEPTED_IMAGE_TYPES,
  processImageFile,
} from "@/lib/inventory/images";

type MotifImageUploadProps = {
  imageUrl?: string;
  onChange: (url: string | undefined) => void;
  disabled?: boolean;
};

export default function MotifImageUpload({
  imageUrl,
  onChange,
  disabled = false,
}: MotifImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingLabel, setProcessingLabel] = useState("");

  const handleFile = async (file: File) => {
    setError("");
    const sizeLabel = file.size > 1024 * 1024
      ? `${(file.size / 1024 / 1024).toFixed(1)} MB`
      : `${Math.round(file.size / 1024)} KB`;
    setProcessingLabel(`Processing ${file.name} (${sizeLabel})…`);
    setProcessing(true);
    try {
      const url = await processImageFile(file);
      onChange(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setProcessing(false);
      setProcessingLabel("");
    }
  };

  return (
    <div>
      <label className="text-xs block mb-1 text-zinc-500 font-medium">
        Motif image
      </label>

      {imageUrl ? (
        <div className="relative w-full max-w-xs aspect-[4/3] rounded-xl overflow-hidden border border-zinc-200 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageUrl}
            alt="Motif preview"
            className="w-full h-full object-cover"
          />
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(undefined)}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-white text-red-500 shadow opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="Remove image"
            >
              <X size={14} />
            </button>
          )}
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (disabled) return;
            const file = e.dataTransfer.files[0];
            if (file) void handleFile(file);
          }}
          onClick={() => !disabled && !processing && inputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors ${
            disabled
              ? "opacity-60 cursor-default"
              : "cursor-pointer hover:bg-zinc-50"
          } ${dragOver ? "border-blue-400 bg-blue-50/50" : "border-zinc-200"}`}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_IMAGE_TYPES.join(",")}
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <ImagePlus size={28} className="mx-auto mb-2 text-zinc-400" />
          <p className="text-sm font-medium text-zinc-700">
            {processing ? processingLabel || "Processing…" : "Click or drag image here"}
          </p>
          <p className="text-[11px] mt-1 text-zinc-400">JPG, PNG, WebP</p>
        </div>
      )}

      {error && <p className="text-xs mt-2 text-red-500">{error}</p>}
    </div>
  );
}
