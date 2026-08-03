"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Move, X, ZoomIn } from "lucide-react";
import {
  applyZoom,
  clampCropOffset,
  createInitialCropState,
  exportBannerCrop,
  HERO_BANNER_ASPECT,
  loadBannerImage,
  type BannerCropState,
} from "@/lib/storefront/banner-crop";

type BannerCropModalProps = {
  open: boolean;
  imageSrc: string;
  slotLabel: string;
  heroTitle?: string;
  heroSubtitle?: string;
  onClose: () => void;
  onSave: (croppedDataUrl: string) => void;
};

export default function BannerCropModal({
  open,
  imageSrc,
  slotLabel,
  heroTitle = "Timeless Elegance",
  heroSubtitle = "Discover handcrafted gold & diamond jewellery",
  onClose,
  onSave,
}: BannerCropModalProps) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<BannerCropState | null>(null);
  const [zoom, setZoom] = useState(1);
  const [dragging, setDragging] = useState(false);
  const [exporting, setExporting] = useState(false);
  const dragStart = useRef<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      initializedFor.current = null;
      setImage(null);
      setCrop(null);
      setZoom(1);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    loadBannerImage(imageSrc)
      .then((img) => {
        if (!cancelled) setImage(img);
      })
      .catch(() => {
        if (!cancelled) onClose();
      });
    return () => {
      cancelled = true;
    };
  }, [open, imageSrc, onClose]);

  useEffect(() => {
    if (!open || !frameRef.current) return;
    const node = frameRef.current;
    const update = () => {
      setFrameSize({ width: node.clientWidth, height: node.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, [open]);

  useEffect(() => {
    if (!image || frameSize.width === 0 || frameSize.height === 0) return;

    if (initializedFor.current !== imageSrc) {
      initializedFor.current = imageSrc;
      setZoom(1);
      setCrop(createInitialCropState(image, frameSize.width, frameSize.height, 1));
      return;
    }

    setCrop((prev) =>
      prev
        ? clampCropOffset(
            image.width,
            image.height,
            prev.scale,
            frameSize.width,
            frameSize.height,
            prev.offsetX,
            prev.offsetY,
          )
        : createInitialCropState(image, frameSize.width, frameSize.height, 1),
    );
  }, [image, imageSrc, frameSize.width, frameSize.height]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!crop || !image) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
    dragStart.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: crop.offsetX,
      offsetY: crop.offsetY,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !dragStart.current || !crop || !image || frameSize.width === 0) return;
    const dx = event.clientX - dragStart.current.x;
    const dy = event.clientY - dragStart.current.y;
    setCrop(
      clampCropOffset(
        image.width,
        image.height,
        crop.scale,
        frameSize.width,
        frameSize.height,
        dragStart.current.offsetX + dx,
        dragStart.current.offsetY + dy,
      ),
    );
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    setDragging(false);
    dragStart.current = null;
  };

  const handleApply = useCallback(async () => {
    if (!image || !crop || frameSize.width === 0) return;
    setExporting(true);
    try {
      const dataUrl = exportBannerCrop(image, frameSize.width, frameSize.height, crop);
      onSave(dataUrl);
      onClose();
    } finally {
      setExporting(false);
    }
  }, [crop, frameSize.height, frameSize.width, image, onClose, onSave]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="banner-crop-title"
        className="w-full max-w-4xl max-h-[94vh] overflow-y-auto rounded-xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 id="banner-crop-title" className="text-lg font-medium text-zinc-900">
              Adjust banner · {slotLabel}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              Drag to reposition and use zoom to crop. The preview matches your online store hero.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div
            ref={frameRef}
            className="relative w-full overflow-hidden rounded-lg border border-zinc-300 bg-zinc-900 select-none touch-none"
            style={{ aspectRatio: String(HERO_BANNER_ASPECT) }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
          >
            {image && crop && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageSrc}
                alt=""
                draggable={false}
                className="absolute max-w-none pointer-events-none"
                style={{
                  width: image.width * crop.scale,
                  height: image.height * crop.scale,
                  left: crop.offsetX,
                  top: crop.offsetY,
                }}
              />
            )}

            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(to bottom, rgb(0 0 0 / 0.35) 0%, rgb(0 0 0 / 0.55) 100%)",
              }}
            />

            <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-white pointer-events-none">
              <p className="text-[10px] uppercase tracking-[0.14em] text-white/70 mb-2">
                Fine jewellery · Hallmarked
              </p>
              <p className="font-serif text-2xl sm:text-3xl leading-tight">{heroTitle}</p>
              <p className="mt-2 text-sm text-white/85 max-w-md">{heroSubtitle}</p>
            </div>

            <div className="absolute top-3 left-3 flex items-center gap-1.5 rounded-full bg-black/45 px-2.5 py-1 text-[11px] text-white pointer-events-none">
              <Move size={12} />
              Store preview
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 shrink-0">
              <ZoomIn size={14} />
              Zoom
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => {
                const nextZoom = Number(e.target.value);
                setZoom(nextZoom);
                if (image && crop && frameSize.width > 0) {
                  setCrop(applyZoom(image, frameSize.width, frameSize.height, crop, nextZoom));
                }
              }}
              className="flex-1 accent-zinc-800"
            />
            <span className="text-xs text-zinc-500 w-10 text-right">{Math.round(zoom * 100)}%</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleApply()}
            disabled={!crop || exporting}
            className="btn-primary px-4 py-2 text-sm"
          >
            {exporting ? "Applying…" : "Apply banner"}
          </button>
        </div>
      </div>
    </div>
  );
}
