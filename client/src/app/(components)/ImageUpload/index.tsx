"use client";

import { useRef, useState } from "react";
import { ImagePlus, Star, X } from "lucide-react";
import { v4 as uuid } from "uuid";
import {
  ACCEPTED_IMAGE_TYPES,
  MAX_PRODUCT_IMAGES,
  type PendingImage,
  processImageFile,
  validateImageCount,
} from "@/lib/inventory/images";

type ImageUploadProps = {
  images: PendingImage[];
  onChange: (images: PendingImage[]) => void;
};

export default function ImageUpload({ images, onChange }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const [processing, setProcessing] = useState(false);

  const primaryId = images[0]?.id;

  const addFiles = async (files: FileList | File[]) => {
    setError("");
    const fileArray = Array.from(files);
    const countError = validateImageCount(images.length, fileArray.length);
    if (countError) {
      setError(countError);
      return;
    }

    setProcessing(true);
    try {
      const newImages: PendingImage[] = [];
      for (const file of fileArray) {
        const url = await processImageFile(file);
        newImages.push({ id: uuid(), name: file.name, url, file });
      }
      onChange([...images, ...newImages]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image.");
    } finally {
      setProcessing(false);
    }
  };

  const removeImage = (id: string) => {
    onChange(images.filter((img) => img.id !== id));
    setError("");
  };

  const setPrimary = (id: string) => {
    const idx = images.findIndex((img) => img.id === id);
    if (idx <= 0) return;
    const reordered = [...images];
    const [selected] = reordered.splice(idx, 1);
    reordered.unshift(selected);
    onChange(reordered);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <label className="text-xs block mb-1 text-zinc-500 font-medium">
        Product Photos
        <span className="font-normal text-zinc-400">
          {" "}
          (optional, up to {MAX_PRODUCT_IMAGES})
        </span>
      </label>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !processing && inputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-5 text-center cursor-pointer transition-colors ${
          dragOver
            ? "border-zinc-400 bg-zinc-100"
            : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <ImagePlus size={28} className="mx-auto mb-2 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-700">
          {processing ? "Processing…" : "Click or drag photos here"}
        </p>
        <p className="text-[11px] mt-1 text-zinc-400">
          JPG, PNG, WebP · max {MAX_PRODUCT_IMAGES} photos
        </p>
      </div>

      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mt-3">
          {images.map((img, index) => (
            <div
              key={img.id}
              className="relative aspect-square rounded-lg overflow-hidden border border-zinc-200 group"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.url}
                alt={img.name}
                className="w-full h-full object-cover"
              />
              {img.id === primaryId && (
                <span className="absolute top-1 left-1 text-[9px] font-medium px-1.5 py-0.5 rounded bg-zinc-900 text-white">
                  Cover
                </span>
              )}
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPrimary(img.id);
                    }}
                    className="p-1.5 rounded-full bg-white text-zinc-700"
                    title="Set as cover"
                    aria-label="Set as cover photo"
                  >
                    <Star size={13} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(img.id);
                  }}
                  className="p-1.5 rounded-full bg-white text-red-500"
                  title="Remove"
                  aria-label="Remove photo"
                >
                  <X size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && <p className="text-xs mt-2 text-red-500">{error}</p>}
    </div>
  );
}
