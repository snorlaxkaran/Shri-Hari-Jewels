"use client";

import PageHeader from "@/app/(components)/PageHeader";
import { collections } from "@/lib/mock-data";
import { Layers, Plus, Star } from "lucide-react";

export default function CollectionsPage() {
  return (
    <div>
      <PageHeader
        title="Collections"
        subtitle={`${collections.length} curated collections`}
        action={
          <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
            <Plus size={16} />
            New Collection
          </button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {collections.map((col) => (
          <div
            key={col.id}
            className="surface-card overflow-hidden hover:shadow-md transition-shadow"
          >
            <div className="h-32 flex items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200">
              <Layers size={40} className="text-zinc-400" strokeWidth={1.5} />
            </div>
            <div className="p-5">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-sm text-zinc-900">
                  {col.name}
                </h3>
                {col.featured && (
                  <Star size={14} className="text-zinc-700 fill-zinc-700" />
                )}
              </div>
              <p className="text-xs mb-3 text-zinc-500">{col.description}</p>
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">{col.itemCount} items</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
                  {col.season}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
