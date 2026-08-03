"use client";

import { useRef, useState } from "react";
import { Crop, ImagePlus, Trash2, Upload } from "lucide-react";
import {
  BANNER_SLOT_COUNT,
  HERO_BANNER_ASPECT,
  readBannerFile,
} from "@/lib/storefront/banner-crop";
import BannerCropModal from "./BannerCropModal";

type BannerCarouselEditorProps = {
  banners: string[];
  onChange: (banners: string[]) => void;
  heroTitle?: string;
  heroSubtitle?: string;
};

export default function BannerCarouselEditor({
  banners,
  onChange,
  heroTitle,
  heroSubtitle,
}: BannerCarouselEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [processingSlot, setProcessingSlot] = useState<number | null>(null);

  const slots = [...banners, ...Array(BANNER_SLOT_COUNT).fill("")]
    .slice(0, BANNER_SLOT_COUNT)
    .map((url) => url ?? "");

  const filledCount = slots.filter((url) => url.trim()).length;

  const updateSlot = (index: number, value: string) => {
    const next = [...slots];
    next[index] = value;
    onChange(next);
  };

  const openFilePicker = (index: number) => {
    setActiveSlot(index);
    setError("");
    inputRef.current?.click();
  };

  const handleFile = async (file: File) => {
    if (activeSlot === null) return;
    setProcessingSlot(activeSlot);
    setError("");
    try {
      const dataUrl = await readBannerFile(file);
      setCropSrc(dataUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to read image.");
      setActiveSlot(null);
    } finally {
      setProcessingSlot(null);
    }
  };

  const startRecrop = (index: number) => {
    const url = slots[index]?.trim();
    if (!url) return;
    setActiveSlot(index);
    setCropSrc(url);
  };

  const closeCrop = () => {
    setCropSrc(null);
    setActiveSlot(null);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <p className="text-xs text-zinc-500 mb-3">
        Upload up to {BANNER_SLOT_COUNT} hero banners. Each image can be repositioned and cropped
        with a live store preview before saving.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {slots.map((url, index) => {
          const hasBanner = Boolean(url.trim());
          return (
            <div key={index} className="rounded-xl border border-zinc-200 overflow-hidden bg-zinc-50">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 bg-white">
                <span className="text-xs font-medium text-zinc-600">Banner {index + 1}</span>
                {hasBanner && (
                  <span className="text-[10px] uppercase tracking-wide text-emerald-600">Ready</span>
                )}
              </div>

              {hasBanner ? (
                <div className="p-3 space-y-3">
                  <div
                    className="relative w-full overflow-hidden rounded-lg border border-zinc-200 bg-zinc-900"
                    style={{ aspectRatio: String(HERO_BANNER_ASPECT) }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Banner ${index + 1}`} className="w-full h-full object-cover" />
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        background:
                          "linear-gradient(to bottom, rgb(0 0 0 / 0.2) 0%, rgb(0 0 0 / 0.45) 100%)",
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => startRecrop(index)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <Crop size={13} />
                      Adjust crop
                    </button>
                    <button
                      type="button"
                      onClick={() => openFilePicker(index)}
                      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
                    >
                      <Upload size={13} />
                      Replace
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSlot(index, "")}
                      className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={13} />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => openFilePicker(index)}
                  disabled={processingSlot === index}
                  className="flex w-full flex-col items-center justify-center gap-2 p-8 text-center hover:bg-zinc-100/80 transition-colors disabled:opacity-60"
                >
                  <ImagePlus size={28} className="text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-700">
                    {processingSlot === index ? "Reading image…" : "Upload banner"}
                  </span>
                  <span className="text-[11px] text-zinc-400">JPG, PNG, WebP · max 8MB</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {filledCount > 0 && (
        <p className="text-xs text-zinc-500 mt-3">
          {filledCount} banner{filledCount === 1 ? "" : "s"} will rotate on your store homepage.
        </p>
      )}

      {error && <p className="text-xs mt-2 text-red-500">{error}</p>}

      {cropSrc !== null && activeSlot !== null && (
        <BannerCropModal
          open
          imageSrc={cropSrc}
          slotLabel={`Banner ${activeSlot + 1}`}
          heroTitle={heroTitle || "Timeless Elegance"}
          heroSubtitle={heroSubtitle || "Discover handcrafted gold & diamond jewellery"}
          onClose={closeCrop}
          onSave={(cropped) => {
            updateSlot(activeSlot, cropped);
            closeCrop();
          }}
        />
      )}
    </div>
  );
}
