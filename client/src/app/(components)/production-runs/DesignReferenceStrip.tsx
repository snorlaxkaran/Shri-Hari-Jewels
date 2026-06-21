"use client";

import type { ProductionRunDesignPhotos } from "@/lib/types";

type DesignReferenceStripProps = {
  photos?: ProductionRunDesignPhotos;
};

const photoLabel = (key: string, index?: number) => {
  if (key === "cad") return "CAD";
  if (key === "mold") return "Mold";
  if (key === "finished") return "Finished";
  return `Finished ${index! + 1}`;
};

export default function DesignReferenceStrip({ photos }: DesignReferenceStripProps) {
  if (!photos) return null;

  const entries: Array<{ key: string; url: string; index?: number }> = [];
  if (photos.cadFileUrl) entries.push({ key: "cad", url: photos.cadFileUrl });
  if (photos.moldPhotoUrl) entries.push({ key: "mold", url: photos.moldPhotoUrl });
  for (const [index, url] of (photos.finishedPhotoUrls ?? []).entries()) {
    entries.push({ key: "finished", url, index });
  }
  if (photos.finishedPhotoUrl) {
    entries.push({ key: "finished", url: photos.finishedPhotoUrl });
  }

  if (entries.length === 0) return null;

  return (
    <div className="surface-card p-4 space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
        Design references
      </h3>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {entries.map(({ key, url, index }) => (
          <figure key={`${key}-${index ?? 0}-${url.slice(0, 24)}`} className="shrink-0 w-28">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={photoLabel(key, index)}
              className="w-28 h-28 object-contain rounded-lg border border-zinc-200 bg-zinc-50"
            />
            <figcaption className="text-[10px] text-zinc-500 mt-1 text-center">
              {photoLabel(key, index)}
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}
