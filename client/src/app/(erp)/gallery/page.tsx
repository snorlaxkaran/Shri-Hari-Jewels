"use client";

import { useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import FilterPill from "@/app/(components)/ui/FilterPill";
import { galleryItems } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";

export default function GalleryPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const categories = [
    "All",
    ...new Set(galleryItems.map((i) => i.category)),
  ];

  const filtered =
    activeCategory === "All"
      ? galleryItems
      : galleryItems.filter((i) => i.category === activeCategory);

  return (
    <div>
      <PageHeader
        title="Gallery"
        subtitle={`${filtered.length} product images`}
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {categories.map((c) => (
          <FilterPill
            key={c}
            label={c}
            active={activeCategory === c}
            onClick={() => setActiveCategory(c)}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {filtered.map((item) => (
          <div
            key={item.id}
            className="surface-card overflow-hidden group cursor-pointer hover:shadow-md transition-shadow"
          >
            <div
              className="aspect-square flex items-center justify-center transition-transform group-hover:scale-[1.02] bg-gradient-to-br from-zinc-50 to-zinc-100"
            >
              <div
                className="w-16 h-16 rounded-full bg-zinc-200 shadow-sm"
                style={{
                  background: `linear-gradient(145deg, ${item.imageColor}33, ${item.imageColor}66)`,
                }}
              />
            </div>
            <div className="p-3">
              <p className="text-xs font-medium truncate text-zinc-900">
                {item.name}
              </p>
              <p className="text-[11px] text-zinc-400">{item.category}</p>
              <p className="text-xs font-semibold mt-1 text-zinc-700">
                {formatCurrency(item.price)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
